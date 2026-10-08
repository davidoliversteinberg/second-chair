import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startCompanion } from "../server/index.mjs";
import { loginOptions } from "../server/agent.mjs";
import {
  summarize,
  toolPolicy,
  toolName,
  claudeEnv,
  trackSources,
} from "../server/capabilities.mjs";

const tool = (name, annotations) => ({ name, annotations });
const servers = [
  {
    name: "claude.ai Microsoft 365",
    status: "connected",
    tools: [
      tool("outlook_calendar_search", { readOnly: true }),
      tool("send_mail", { readOnly: false }),
      tool("unlabelled_tool"),
    ],
  },
  {
    name: "claude.ai Optimizely Analytics",
    status: "connected",
    tools: [tool("find_metrics"), tool("delete_dashboard_tile")],
  },
  {
    name: "claude.ai Figma",
    status: "connected",
    tools: [
      tool("get_design_context", { readOnly: true }),
      tool("odd", { readOnly: true, destructive: true }),
    ],
  },
  { name: "claude.ai Slack", status: "needs-auth" },
];
function directory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-login-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const wait = async (check) => {
  for (let i = 0; i < 100 && !check(); i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(check(), "condition was not reached in time");
};

test("only tools a connector marks read-only are usable; everything else is hidden", () => {
  const connectors = summarize(servers);
  const policy = toolPolicy(connectors);
  assert.deepEqual(policy.allowed.sort(), [
    "mcp__claude_ai_Figma__get_design_context",
    "mcp__claude_ai_Microsoft_365__outlook_calendar_search",
  ]);
  // Unlabelled and destructive tools, even on a connected server, are blocked rather than guessed.
  for (const blocked of [
    "mcp__claude_ai_Microsoft_365__send_mail",
    "mcp__claude_ai_Microsoft_365__unlabelled_tool",
    "mcp__claude_ai_Optimizely_Analytics__find_metrics",
    "mcp__claude_ai_Optimizely_Analytics__delete_dashboard_tile",
    "mcp__claude_ai_Figma__odd",
  ])
    assert.ok(policy.blocked.includes(blocked), blocked);
  assert.equal(
    toolName("claude.ai Atlassian Rovo", "search"),
    "mcp__claude_ai_Atlassian_Rovo__search",
  );
});

test("a source that is not connected contributes no usable tools", () => {
  const policy = toolPolicy(
    summarize([
      {
        name: "claude.ai Slack",
        status: "needs-auth",
        tools: [tool("search", { readOnly: true })],
      },
    ]),
  );
  assert.deepEqual(policy.allowed, []);
});

test("chat runs on the login: no built-in tools, no write tools, no API key", (t) => {
  const connectors = summarize(servers);
  const options = loginOptions({
    dataDir: directory(t),
    sessionId: "s1",
    abortController: new AbortController(),
    policy: toolPolicy(connectors),
  });
  // ToolSearch only finds connector tools; it reads and changes nothing itself.
  assert.deepEqual(options.tools, ["ToolSearch"]);
  assert.deepEqual(options.settingSources, []);
  assert.equal(options.permissionMode, "dontAsk");
  assert.equal(options.resume, "s1");
  assert.ok(options.maxBudgetUsd <= 2);
  assert.equal(options.canUseTool, undefined);
  assert.equal(options.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(options.env.CLAUDE_CONFIG_DIR, undefined);
  assert.ok(options.allowedTools.every((n) => !/send|delete|create/.test(n)));
  // Without HOME and USER the Claude binary cannot find the login and every source looks signed out.
  assert.ok(claudeEnv().HOME);
  assert.ok("USER" in claudeEnv());
});

test("a source that was connected and drops is flagged; pending, never-connected and recovery are handled", () => {
  const status = (name, state) => ({ name, status: state });
  let { known, down, back } = trackSources({}, [
    status("Microsoft 365", "connected"),
    status("Slack", "needs-auth"),
  ]);
  assert.deepEqual([down, back], [[], []]);
  assert.deepEqual(Object.keys(known), ["Microsoft 365"]);
  ({ known, down, back } = trackSources(known, [
    status("Microsoft 365", "pending"),
  ]));
  assert.deepEqual([down, back], [[], []]);
  ({ known, down, back } = trackSources(known, [
    status("Microsoft 365", "needs-auth"),
  ]));
  assert.deepEqual(down, ["Microsoft 365"]);
  ({ known, down, back } = trackSources(known, [
    status("Microsoft 365", "needs-auth"),
  ]));
  assert.deepEqual(
    down,
    [],
    "a source already known to be down is not re-announced",
  );
  ({ known, down, back } = trackSources(known, [
    status("Microsoft 365", "connected"),
  ]));
  assert.deepEqual(back, ["Microsoft 365"]);
  assert.equal(known["Microsoft 365"].drops, 1);
});

test("chat works with no API key through the Claude login, and says what to do when it is not signed in", async (t) => {
  let signedIn = false;
  let connectors = summarize(servers);
  const calls = [];
  async function* loginReply(args) {
    calls.push(args);
    yield { sessionId: "login-session" };
    yield { text: "Your week is light." };
  }
  const app = await startCompanion({
    port: 0,
    dataDir: directory(t),
    apiKey: "",
    login: true,
    discover: async () => ({
      loggedIn: signedIn,
      account: signedIn ? { email: "someone@example.com" } : {},
      connectors: signedIn ? connectors : [],
    }),
    loginReply,
  });
  t.after(() => app.close());
  const state = async () => (await fetch(app.baseURL + "/api/state")).json();
  const post = async (route, body) =>
    fetch(app.baseURL + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": (await state()).token,
      },
      body: JSON.stringify(body),
    });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal((await state()).agent, "unconfigured");
  const refused = await post("chat", { text: "What is my week?" });
  assert.equal(refused.status, 503);
  const message = (await refused.json()).error;
  assert.match(message, /signed in/);
  assert.doesNotMatch(message, /ANTHROPIC_API_KEY/);
  signedIn = true;
  await post("check", {});
  for (let i = 0; i < 100 && (await state()).agent !== "ready"; i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  const ready = await state();
  assert.equal(ready.agent, "ready");
  assert.equal(ready.account, "someone@example.com");
  assert.deepEqual(ready.connectors.map((c) => c.name).sort(), [
    "Figma",
    "Microsoft 365",
    "Optimizely Analytics",
  ]);
  assert.equal((await post("chat", { text: "What is my week?" })).status, 202);
  await wait(() => app.store.state.chats[0]?.busy === false);
  assert.equal(
    app.store.state.chats[0].messages.at(-1).text,
    "Your week is light.",
  );
  assert.equal(calls[0].capabilities.connectors.length, 4);
});

test("a source that drops raises one note, and it clears when the source returns", async (t) => {
  let state = "connected";
  const app = await startCompanion({
    port: 0,
    dataDir: directory(t),
    login: true,
    discover: async () => ({
      loggedIn: true,
      account: { email: "someone@example.com" },
      connectors: summarize([
        {
          name: "claude.ai Microsoft 365",
          status: state,
          tools: [tool("outlook_calendar_search", { readOnly: true })],
        },
      ]),
    }),
  });
  t.after(() => app.close());
  const key = "second-chair-sources:source-microsoft-365";
  const alert = () => app.store.state.alerts.find((a) => a.key === key);
  const check = async () => {
    const snapshot = await (await fetch(app.baseURL + "/api/state")).json();
    await fetch(app.baseURL + "/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": snapshot.token,
      },
      body: "{}",
    });
  };
  await wait(() => app.store.state.sources["second-chair-sources"]);
  assert.equal(alert(), undefined);
  state = "needs-auth";
  await check();
  await wait(() => alert());
  assert.match(alert().title, /Microsoft 365 needs you to sign in/);
  assert.equal(alert().state, "new");
  state = "connected";
  await check();
  await wait(() => alert().state === "resolved");
});
