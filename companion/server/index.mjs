import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { Store, scanInbox } from "./store.mjs";
import { chatSchema } from "./schema.mjs";
import { claudeReply, claudeLoginReply } from "./agent.mjs";
import {
  discoverCapabilities,
  reconnect,
  trackSources,
  sourceAlert,
  sourceKey,
} from "./capabilities.mjs";
import { seedDemo } from "./demo.mjs";
import { chatContext, byAttention } from "./context.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export async function startCompanion({
  port = 4318,
  demo = false,
  dataDir = process.env.SECOND_CHAIR_DATA_DIR ||
    path.join(os.homedir(), ".second-chair-companion"),
  inbox = process.env.SECOND_CHAIR_INBOX || path.join(dataDir, "inbox"),
  apiKey = process.env.ANTHROPIC_API_KEY,
  notify = () => false,
  reply = claudeReply,
  login = false,
  discover = discoverCapabilities,
  loginReply = claudeLoginReply,
  reconnectServer = reconnect,
  healthMs = 15 * 60 * 1000,
  pollMs = 30000,
  staticDir = path.join(here, "../dist/client"),
} = {}) {
  fs.mkdirSync(inbox, { recursive: true, mode: 0o700 });
  const startedAt = new Date().toISOString();
  const instanceId = randomUUID();
  const token = randomBytes(32).toString("hex");
  const store = new Store(dataDir, { notify, demo });
  if (demo) seedDemo(store);
  const runs = new Map();
  const clients = new Set();
  let baseURL;
  // What the person's own Claude login can reach. Chat runs on it, so no API key is needed.
  let capabilities = null;
  let refreshing = false;
  let claudeError = null;
  const knownFile = path.join(dataDir, "connectors.json");
  let known = {};
  try {
    known = JSON.parse(fs.readFileSync(knownFile, "utf8"));
  } catch {
    // First run, or an unreadable file: start from nothing rather than guess.
  }
  const chatReady = () => Boolean(capabilities?.loggedIn || apiKey);
  function snapshot() {
    return {
      ...store.state,
      chats: store.state.chats.map(({ sessionId, ...chat }) => chat),
      alerts: [...store.state.alerts].sort(byAttention),
      demo,
      inbox,
      runtime: {
        startedAt,
        instanceId,
        baseURL,
        pollMs,
        healthMs: login ? healthMs : null,
        lastConnectorCheck: capabilities?.checkedAt || null,
        backgroundContentScans: false,
      },
      agent: demo ? "demo" : chatReady() ? "ready" : "unconfigured",
      account: capabilities?.account?.email || null,
      claudeError,
      connectors: (capabilities?.connectors || [])
        .filter((c) => known[c.name])
        .map((c) => ({
          name: c.name,
          status: c.status,
          readTools: c.readTools.length,
        })),
    };
  }
  const publish = () => {
    for (const res of clients)
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
  };
  store.on("change", publish);
  const poll = () => {
    if (demo) {
      store.tick();
      return;
    }
    scanInbox(store, inbox);
  };
  const interval = setInterval(poll, pollMs);
  interval.unref();
  if (!demo) poll();

  // Keep the sources alive: look at them regularly, retry a failed one, and say so early when
  // one needs the person to sign in, instead of letting it fade into a quiet inbox.
  async function refreshSources() {
    if (!login || demo || refreshing) return;
    refreshing = true;
    try {
      capabilities = await discover({ dataDir });
      const now = new Date().toISOString();
      const result = trackSources(known, capabilities.connectors);
      known = result.known;
      fs.writeFileSync(knownFile, JSON.stringify(known), { mode: 0o600 });
      const connected = Object.values(known).filter((k) => k.connected);
      if (Object.keys(known).length)
        store.ingest({
          schemaVersion: 1,
          producer: "second-chair-sources",
          checkedAt: now,
          status: result.down.length ? "partial" : "ok",
          coverage: `${connected.length} of ${Object.keys(known).length} connected sources reachable`,
          alerts: result.down.map((name) =>
            sourceAlert(name, known[name].drops, now),
          ),
        });
      for (const name of result.back) {
        const key = "second-chair-sources:" + sourceKey(name);
        if (store.state.alerts.some((a) => a.key === key))
          store.action(key, "resolve");
      }
      for (const c of capabilities.connectors)
        if (known[c.name] && c.status === "failed")
          void reconnectServer({ dataDir, server: c.server }).catch(() => {});
      claudeError = null;
    } catch (error) {
      // Keep the last good picture; a missed check is not a disconnected source. Say why, though.
      claudeError = error.message;
    } finally {
      refreshing = false;
      publish();
    }
  }
  const health = setInterval(refreshSources, healthMs);
  health.unref();
  void refreshSources();

  async function chatRun(chat, request, controller) {
    const answer = {
      role: "assistant",
      text: "",
      createdAt: new Date().toISOString(),
    };
    chat.messages.push(answer);
    store.save();
    try {
      if (demo) {
        answer.text =
          "This is a sample conversation, not a live Claude reply. In the sample brief, confirm the upload limit first: it affects the design you will review. Then choose the empty-state direction. Connect Claude to ask questions about your own reports.";
      } else {
        const context = chatContext(store.state);
        const args = {
          ...request,
          context,
          sessionId: chat.sessionId,
          dataDir,
          signal: controller.signal,
        };
        const run = capabilities?.loggedIn
          ? loginReply({ ...args, capabilities })
          : reply({ ...args, apiKey });
        for await (const event of run) {
          if (event.sessionId) chat.sessionId = event.sessionId;
          if (event.text) answer.text += event.text;
          if (event.usage) {
            store.state.usage[chat.id] = {
              ...event.usage,
              updatedAt: new Date().toISOString(),
            };
            // Persist accounting even if the process stops before the last text chunk.
            store.save();
          }
          // Stream to windows, persist at completion to avoid a disk write per token.
          publish();
        }
        if (!answer.text.trim())
          throw new Error("Claude returned no text. Try again.");
      }
    } catch (error) {
      chat.error = controller.signal.aborted
        ? "Reply stopped. Any partial response is kept."
        : error.message;
      if (!answer.text) chat.messages.pop();
    } finally {
      chat.busy = false;
      runs.delete(chat.id);
      store.save();
    }
  }
  async function body(req) {
    if (req.headers["content-type"]?.split(";")[0] !== "application/json")
      throw new Error("JSON required");
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 64000) throw new Error("Request too large");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  }
  const server = http.createServer(async (req, res) => {
    const send = (code, value) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://www.optimizely.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
    );
    if (
      req.headers.host !== new URL(baseURL).host ||
      (req.headers.origin && req.headers.origin !== baseURL)
    )
      return send(403, { error: "Local requests only" });
    try {
      const url = new URL(req.url, baseURL);
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(200, {
          service: "second-chair",
          instanceId,
          startedAt,
          lastPoll: store.state.lastPoll,
        });
      if (req.method === "GET" && url.pathname === "/api/state")
        return send(200, { ...snapshot(), token });
      if (req.method === "GET" && url.pathname === "/api/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          Connection: "keep-alive",
        });
        res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (req.method === "POST" && url.pathname.startsWith("/api/")) {
        if (req.headers["x-second-chair-token"] !== token)
          return send(403, { error: "Reload the app before trying again" });
        const value = await body(req);
        if (url.pathname === "/api/settings") {
          store.settings(value);
          store.tick();
          return send(200, snapshot());
        }
        if (url.pathname === "/api/alert") {
          store.action(value.key, value.action);
          return send(200, snapshot());
        }
        if (url.pathname === "/api/connections/check") {
          void refreshSources();
          return send(202, { ok: true });
        }
        if (url.pathname === "/api/check") {
          poll();
          void refreshSources();
          return send(200, snapshot());
        }
        if (url.pathname === "/api/chat/stop") {
          runs.get(value.chatId)?.abort();
          return send(200, { ok: true });
        }
        if (url.pathname === "/api/chat/delete") {
          if (runs.has(value.chatId))
            return send(409, {
              error: "Stop the reply before deleting this chat",
            });
          store.state.chats = store.state.chats.filter(
            (c) => c.id !== value.chatId,
          );
          store.save();
          return send(200, snapshot());
        }
        if (url.pathname === "/api/chat") {
          const request = chatSchema.parse(value);
          if (!demo && !chatReady()) {
            void refreshSources();
            return send(503, {
              error:
                "Chat turns on when Claude is signed in. Open the Claude app and sign in with your company login; Second Chair checks connections every 15 minutes, or use Check connections now in Source health. Your reports work without it.",
            });
          }
          if (runs.size)
            return send(409, {
              error: "Wait for the current reply, or stop it first",
            });
          let chat = request.chatId
            ? store.state.chats.find((c) => c.id === request.chatId)
            : null;
          if (request.chatId && !chat)
            return send(404, { error: "Chat not found" });
          if (!chat) {
            chat = {
              id: randomUUID(),
              title: request.text.slice(0, 70),
              messages: [],
            };
            store.state.chats.unshift(chat);
          }
          chat.error = null;
          chat.busy = true;
          chat.updatedAt = new Date().toISOString();
          chat.messages.push({
            role: "user",
            text: request.text,
            attachment: request.attachment,
            createdAt: chat.updatedAt,
          });
          const controller = new AbortController();
          runs.set(chat.id, controller);
          store.save();
          send(202, { chatId: chat.id });
          void chatRun(chat, request, controller);
          return;
        }
        return send(404, { error: "Unknown action" });
      }
      if (req.method !== "GET")
        return send(405, { error: "Method not allowed" });
      const relative =
        url.pathname === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).slice(1);
      const file = path.resolve(staticDir, relative);
      if (
        !file.startsWith(path.resolve(staticDir) + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      )
        return send(404, { error: "Not found. Run npm run build first." });
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".ico": "image/x-icon",
      };
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      send(400, {
        error:
          error.name === "ZodError"
            ? "Invalid input. Check the field lengths and format."
            : error.message,
      });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  baseURL = `http://127.0.0.1:${server.address().port}`;
  return {
    baseURL,
    store,
    poll,
    refreshSources,
    close: async () => {
      clearInterval(interval);
      clearInterval(health);
      for (const run of runs.values()) run.abort();
      for (const client of clients) client.end();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const demo = process.argv.includes("--demo");
  const app = await startCompanion({
    port: Number(process.env.PORT || 4318),
    demo,
    login: !demo,
    ...(demo
      ? {
          dataDir: fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-demo-")),
        }
      : {}),
  });
  console.log(`Second Chair ${demo ? "(sample data)" : ""}: ${app.baseURL}`);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
