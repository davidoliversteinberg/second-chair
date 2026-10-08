import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startCompanion } from "../server/index.mjs";
import { Store } from "../server/store.mjs";
import { alertSchema } from "../server/schema.mjs";
import { reportedUsage } from "../server/usage.mjs";
import desk from "../electron/desk.cjs";

test("desk opens the active port only after identifying a healthy companion", async () => {
  const opened = [];
  const result = await desk.openDesk({
    baseURL: "http://127.0.0.1:49231",
    fetchHealth: async (url) => {
      assert.equal(String(url), "http://127.0.0.1:49231/api/health");
      return { ok: true, json: async () => ({ service: "second-chair" }) };
    },
    openExternal: async (url) => opened.push(url),
  });
  assert.equal(result.ok, true);
  assert.deepEqual(opened, ["http://127.0.0.1:49231/?desk=1"]);
});

test("desk reports an unavailable service or failed browser launch without silent success", async () => {
  for (const service of ["unrelated-app", null]) {
    const result = await desk.openDesk({
      baseURL: "http://127.0.0.1:4318",
      fetchHealth: async () => {
        if (!service) throw new Error("offline");
        return { ok: true, json: async () => ({ service }) };
      },
      openExternal: async () => assert.fail("must not open an unhealthy desk"),
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /reopen/);
  }
  const result = await desk.openDesk({
    baseURL: "http://127.0.0.1:4318",
    fetchHealth: async () => ({
      ok: true,
      json: async () => ({ service: "second-chair" }),
    }),
    openExternal: async () => {
      throw new Error("browser missing");
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /browser/);
});

test("old findings remain valid; action destinations are separate and HTTPS only", () => {
  const alert = {
    id: "test",
    revision: 1,
    title: "Review request",
    summary: "A request arrived",
    why: "Review it",
    nextStep: "Find the item",
    priority: "attention",
    kind: "observed",
    project: "Sample",
    updatedAt: new Date().toISOString(),
    source: { label: "Evidence email", url: "https://example.com/email" },
  };
  assert.ok(alertSchema.safeParse(alert).success);
  alert.action = {
    label: "Open artifact",
    url: "https://example.com/artifact",
    steps: ["Review the access request.", "Use the verified sharing controls."],
  };
  const parsed = alertSchema.parse(alert);
  assert.notEqual(parsed.source.url, parsed.action.url);
  alert.action.url = "javascript:alert(1)";
  assert.equal(alertSchema.safeParse(alert).success, false);
});

test("usage and history survive restart; cumulative resumed usage is replaced rather than double-counted", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-recovery-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let turn = 0;
  async function* reply() {
    yield { sessionId: "same-session" };
    yield { text: "Test reply" };
    yield {
      usage: reportedUsage({
        modelUsage: {
          model: {
            inputTokens: ++turn * 100,
            outputTokens: turn * 10,
            cacheReadInputTokens: 20,
            cacheCreationInputTokens: 5,
            costUSD: turn * 0.01,
          },
        },
      }),
    };
  }
  let app = await startCompanion({
    port: 0,
    dataDir: dir,
    apiKey: "test",
    reply,
  });
  t.after(() => app.close());
  const state = await (await fetch(app.baseURL + "/api/state", { headers: { Connection: "close" } })).json();
  let chatId;
  for (let i = 0; i < 2; i++) {
    const response = await fetch(app.baseURL + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
          Connection: "close",
        "X-Second-Chair-Token": state.token,
      },
      body: JSON.stringify({ text: "Test", ...(chatId ? { chatId } : {}) }),
    });
    chatId = (await response.json()).chatId;
    for (let j = 0; j < 50 && app.store.state.chats[0].busy; j++)
      await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(app.store.state.usage[chatId].input, 200);
  assert.equal(new Store(dir).state.usage[chatId].costUsd, 0.02);
  const oldPort = Number(new URL(app.baseURL).port);
  await app.close();
  app = await startCompanion({
    port: oldPort,
    dataDir: dir,
    apiKey: "test",
    reply,
  });
  const fresh = await (await fetch(app.baseURL + "/api/state", { headers: { Connection: "close" } })).json();
  assert.notEqual(fresh.token, state.token);
  assert.equal(fresh.chats[0].messages.length, 4);
  assert.equal(fresh.usage[chatId].output, 20);
  const health = await (await fetch(app.baseURL + "/api/health")).json();
  assert.equal(health.service, "second-chair");
  assert.equal(health.token, undefined);
  assert.equal(health.chats, undefined);
  assert.equal(reportedUsage({}), null);
});
