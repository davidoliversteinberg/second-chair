import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import loginItem from "../electron/login-item.cjs";
import port from "../electron/port.cjs";

function fakeApp({ isPackaged = true, openAtLogin = false } = {}) {
  const calls = [];
  return {
    isPackaged,
    calls,
    getLoginItemSettings: () => ({ openAtLogin }),
    setLoginItemSettings: (settings) => calls.push(settings),
  };
}
function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-boot-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("a packaged app opens at login on first run, then respects the user's opt-out", (t) => {
  const dir = tempDir(t);
  const first = fakeApp();
  assert.equal(
    loginItem.ensureLoginItem({ app: first, demo: false, dir }),
    true,
  );
  assert.deepEqual(first.calls, [{ openAtLogin: true }]);
  // The user later turns "Start at login" off; the next launch must not turn it back on.
  const later = fakeApp({ openAtLogin: false });
  assert.equal(
    loginItem.ensureLoginItem({ app: later, demo: false, dir }),
    false,
  );
  assert.deepEqual(later.calls, []);
});

test("sample mode and unpackaged runs never register a login item", (t) => {
  const dir = tempDir(t);
  const sample = fakeApp();
  loginItem.ensureLoginItem({ app: sample, demo: true, dir });
  const dev = fakeApp({ isPackaged: false });
  loginItem.ensureLoginItem({ app: dev, demo: false, dir });
  assert.deepEqual([...sample.calls, ...dev.calls], []);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test("IT can opt a machine out of the login item with an environment variable", (t) => {
  const dir = tempDir(t);
  const app = fakeApp();
  const env = { SECOND_CHAIR_NO_LOGIN_ITEM: "1" };
  assert.equal(
    loginItem.ensureLoginItem({ app, demo: false, dir, env }),
    false,
  );
  assert.deepEqual(app.calls, []);
  assert.deepEqual(fs.readdirSync(dir), []);
});

test("an existing login item is left alone but still recorded as configured", (t) => {
  const dir = tempDir(t);
  const app = fakeApp({ openAtLogin: true });
  assert.equal(loginItem.ensureLoginItem({ app, demo: false, dir }), true);
  assert.deepEqual(app.calls, []);
});

test("a busy preferred port falls back to an OS-assigned one instead of failing", async (t) => {
  const taken = net.createServer();
  await new Promise((resolve) => taken.listen(0, "127.0.0.1", resolve));
  t.after(() => taken.close());
  const busy = taken.address().port;
  assert.equal(await port.freePort(busy), 0);
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const free = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  assert.equal(await port.freePort(free), free);
});
