const fs = require("node:fs");

function readBounds(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      ["x", "y", "width", "height"].every((key) =>
        Number.isSafeInteger(value[key]),
      ) &&
      value.width > 0 &&
      value.height > 0
    )
      return value;
  } catch {}
  return null;
}

function fitBounds(bounds, area) {
  const width = Math.min(Math.max(bounds.width, 360), area.width);
  const height = Math.min(Math.max(bounds.height, 560), area.height);
  return {
    width,
    height,
    x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(bounds.y, area.y + area.height - height)),
  };
}

function anchoredBounds(anchor, area) {
  return fitBounds(
    {
      width: 548,
      height: Math.min(868, area.height - 16),
      x: anchor.x + anchor.width - 548,
      y: anchor.y + anchor.height + 6,
    },
    area,
  );
}

function writeBounds(file, bounds) {
  const { x, y, width, height } = bounds;
  try {
    fs.writeFileSync(`${file}.tmp`, JSON.stringify({ x, y, width, height }), {
      mode: 0o600,
    });
    fs.renameSync(`${file}.tmp`, file);
  } catch (error) {
    // Placement is a preference; a read-only directory must not prevent opening the app.
    console.warn(
      "Could not save window placement:",
      error.code || "unknown error",
    );
  }
}

module.exports = { readBounds, fitBounds, anchoredBounds, writeBounds };
