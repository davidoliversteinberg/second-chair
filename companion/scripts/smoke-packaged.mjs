// Launch a packaged Mac build and check what a colleague's first run depends on:
// a valid signature, native code matching the CPU, and a server that answers.
import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const app = path.resolve(
  process.argv[2] || "release/mac-arm64/Second Chair.app",
);
const cpu = process.arch === "arm64" ? "arm64" : "x86_64";
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};
const run = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

try {
  run("codesign", ["--verify", "--deep", "--strict", app]);
  console.log("ok: signature is valid (ad-hoc or Developer ID)");
} catch (error) {
  fail(`signature check: ${error.stderr || error.message}`.trim());
}

const binaries = [
  path.join(app, "Contents/MacOS/Second Chair"),
  ...run("find", [
    app,
    "-path",
    "*claude-agent-sdk*",
    "-name",
    "claude",
    "-type",
    "f",
  ])
    .split("\n")
    .filter(Boolean),
];
for (const binary of binaries) {
  const kind = run("file", [binary]);
  if (kind.includes(cpu))
    console.log(
      `ok: ${path.basename(path.dirname(binary))}/${path.basename(binary)} is ${cpu}`,
    );
  else fail(`${binary} is not ${cpu}: ${kind.trim()}`);
}

const probe = net.createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-smoke-"));
const child = spawn(binaries[0], [], {
  env: {
    ...process.env,
    PORT: String(port),
    SECOND_CHAIR_DATA_DIR: dataDir,
    SECOND_CHAIR_NO_LOGIN_ITEM: "1",
  },
  stdio: "ignore",
});
let exited = false;
child.on("exit", () => (exited = true));
try {
  let state;
  for (let i = 0; i < 40 && !state && !exited; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    state = await fetch(`http://127.0.0.1:${port}/api/state`)
      .then((response) => response.json())
      .catch(() => undefined);
  }
  if (!state)
    fail(
      exited ? "the app exited before it answered" : "the app never answered",
    );
  else
    console.log(
      `ok: app answered on port ${port} (chat ${state.agent}${state.account ? `, signed in as ${state.account} with ${state.connectors.length} sources` : ", not signed in to Claude on this machine"})`,
    );
  // Claude sign-in is checked a few seconds after start; wait for it so a failure is not missed.
  for (
    let i = 0;
    i < 40 && state && !state.account && !state.claudeError;
    i++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    state = await fetch(`http://127.0.0.1:${port}/api/state`)
      .then((response) => response.json())
      .catch(() => state);
  }
  if (state?.claudeError)
    fail(`Claude connector check failed: ${state.claudeError}`);
  else if (state?.account)
    console.log(
      `ok: signed in as ${state.account}; ${state.connectors.length} sources: ${state.connectors.map((c) => `${c.name} (${c.status})`).join(", ")}`,
    );
  else
    console.log(
      "note: Claude is not signed in on this machine, so chat stays off (expected in CI)",
    );
  // The window's renderer process proves the UI actually started, not just the server.
  await new Promise((resolve) => setTimeout(resolve, 2000));
  const processes = run("ps", ["-axo", "command="]);
  if (processes.includes("Second Chair Helper (Renderer)"))
    console.log("ok: window renderer is running");
  else fail("no renderer process; the window did not start");
} finally {
  // The app writes to its data folder while shutting down, so wait for it to exit first.
  if (!exited) {
    child.kill();
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    if (!exited) child.kill("SIGKILL");
  }
  fs.rmSync(dataDir, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
}
