import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import state from "../electron/window-state.cjs";
const area = { x: 0, y: 25, width: 1440, height: 875 };
test("chosen position and size survive a save/reload without returning to the tray", (t) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), "second-chair-window-test-"),
  );
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "window.json"),
    chosen = { x: 100, y: 50, width: 620, height: 700 };
  state.writeBounds(file, chosen);
  assert.deepEqual(state.fitBounds(state.readBounds(file), area), chosen);
  fs.writeFileSync(file, '{"x":0,"y":0,"width":-2,"height":600}');
  assert.equal(state.readBounds(file), null);
  fs.writeFileSync(file, "broken");
  assert.equal(state.readBounds(file), null);
});
test("off-screen bounds return to the available display, including displays left of the primary", () => {
  assert.deepEqual(
    state.fitBounds({ x: 2000, y: 1200, width: 800, height: 700 }, area),
    { x: 640, y: 200, width: 800, height: 700 },
  );
  const left = { x: -1280, y: 25, width: 1280, height: 775 };
  assert.deepEqual(
    state.fitBounds({ x: -1100, y: 60, width: 548, height: 700 }, left),
    { x: -1100, y: 60, width: 548, height: 700 },
  );
  const initial = state.anchoredBounds(
    { x: 1400, y: 0, width: 22, height: 25 },
    area,
  );
  assert.ok(
    initial.y >= area.y && initial.y + initial.height <= area.y + area.height,
  );
  assert.ok(initial.x >= area.x && initial.x + initial.width <= area.width);
});
