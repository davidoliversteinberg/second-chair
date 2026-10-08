import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Claude names a connector's tools mcp__<server>__<tool>, with the server name made identifier-safe.
export const toolName = (server, tool) =>
  `mcp__${server.replace(/[^a-zA-Z0-9_-]/g, "_")}__${tool}`;

// A tool is usable by chat only when its server says it is read-only. A missing hint is not
// permission: unknown tools stay out of the model's context and cannot be called.
export function summarize(servers) {
  return servers.map((server) => {
    const read = [],
      other = [];
    for (const tool of server.tools || []) {
      const hints = tool.annotations || {};
      (hints.readOnly === true && hints.destructive !== true
        ? read
        : other
      ).push(tool.name);
    }
    return {
      name: server.name.replace(/^claude\.ai /, ""),
      server: server.name,
      status: server.status,
      readTools: read.map((tool) => toolName(server.name, tool)),
      otherTools: other.map((tool) => toolName(server.name, tool)),
    };
  });
}

export function toolPolicy(connectors) {
  const connected = connectors.filter((c) => c.status === "connected");
  return {
    allowed: connected.flatMap((c) => c.readTools),
    blocked: connectors.flatMap((c) => c.otherTools),
  };
}

// In a packaged app the SDK finds its bundled Claude binary inside app.asar, which the OS cannot
// run a program from. The same file is unpacked beside it; point the SDK there.
export function claudeExecutable() {
  try {
    const sdk = createRequire(import.meta.url).resolve(
      "@anthropic-ai/claude-agent-sdk",
    );
    const binary = path.join(
      path.dirname(sdk),
      "..",
      `claude-agent-sdk-${process.platform}-${process.arch}`,
      "claude",
    );
    const unpacked = binary.replace(
      `app.asar${path.sep}`,
      `app.asar.unpacked${path.sep}`,
    );
    return fs.existsSync(unpacked) ? unpacked : undefined;
  } catch {
    return undefined;
  }
}

export function claudeEnv() {
  // The login lives in the user's own Claude config and keychain. Without HOME and USER the
  // binary reports "tokenSource: none" and every connector looks signed out.
  return {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    LOGNAME: process.env.LOGNAME,
    TMPDIR: process.env.TMPDIR,
    CLAUDE_AGENT_SDK_CLIENT_APP: "second-chair/0.3.1",
  };
}

export function agentDir(dataDir) {
  const cwd = path.join(dataDir, "agent");
  fs.mkdirSync(cwd, { recursive: true, mode: 0o700 });
  return cwd;
}

// Connectors load a moment after the process starts: an empty list or a pending one is not the
// answer yet. Chat waits for this before asking its question, or Claude sees no sources at all.
export async function settledServers(q, tries = 24) {
  let servers = await q.mcpServerStatus();
  for (
    let i = 0;
    i < tries &&
    (!servers.length || servers.some((s) => s.status === "pending"));
    i++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    servers = await q.mcpServerStatus();
  }
  return servers;
}

async function withIdleQuery(dataDir, use) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  // A session that never sends a message: the status calls need no model request or cost.
  const idle = (async function* () {
    await new Promise((resolve) =>
      controller.signal.addEventListener("abort", resolve, { once: true }),
    );
  })();
  const q = query({
    prompt: idle,
    options: {
      cwd: agentDir(dataDir),
      abortController: controller,
      settingSources: [],
      tools: [],
      permissionMode: "dontAsk",
      env: claudeEnv(),
      pathToClaudeCodeExecutable: claudeExecutable(),
    },
  });
  try {
    return await use(q);
  } finally {
    clearTimeout(timer);
    controller.abort();
    q.close();
  }
}

// What this person's Claude login can reach right now. Reads status only; sends no prompt.
export async function discoverCapabilities({ dataDir }) {
  return withIdleQuery(dataDir, async (q) => {
    // Wait for the process to finish starting; before that, status calls come back empty.
    await q.initializationResult();
    const account = await q.accountInfo();
    const servers = await settledServers(q);
    return {
      checkedAt: new Date().toISOString(),
      account: { email: account.email, organization: account.organization },
      loggedIn: Boolean(account.email),
      connectors: summarize(servers),
    };
  });
}

// Ask Claude to re-dial one connector, for the "Reconnect" case. Needs the person to approve
// sign-in in their browser if the connector's session truly expired.
export async function reconnect({ dataDir, server }) {
  return withIdleQuery(dataDir, (q) => q.reconnectMcpServer(server));
}

// Sources a person has actually connected are the ones worth watching. One that was connected
// and now needs sign-in or has failed gets a note; a source that was never connected does not,
// and a briefly "pending" one is left alone.
export function trackSources(known, connectors) {
  const next = { ...known },
    down = [],
    back = [];
  for (const c of connectors) {
    const was = next[c.name];
    if (c.status === "connected") {
      if (was && !was.connected) back.push(c.name);
      next[c.name] = { connected: true, drops: was?.drops || 0 };
    } else if (
      was?.connected &&
      (c.status === "needs-auth" || c.status === "failed")
    ) {
      next[c.name] = { connected: false, drops: was.drops + 1 };
      down.push(c.name);
    }
  }
  return { known: next, down, back };
}

export const sourceKey = (name) =>
  "source-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export function sourceAlert(name, revision, now) {
  return {
    id: sourceKey(name),
    revision,
    title: `${name} needs you to sign in`,
    summary: `Second Chair could not reach ${name}, so reports and chat cannot read it until it reconnects.`,
    why: "A source that quietly disconnects makes a quiet inbox look like good news.",
    nextStep: `Open Claude, go to Settings → Connectors, and choose Reconnect for ${name}.`,
    priority: "attention",
    kind: "observed",
    project: "Second Chair",
    updatedAt: now,
    source: { label: "Claude connectors" },
  };
}
