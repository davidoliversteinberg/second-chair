const net = require("node:net");

// 4318 is also the default OpenTelemetry HTTP port, so a developer machine can already be using it.
// Return the preferred port when it is free, otherwise 0 so the OS assigns one.
function freePort(preferred) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(0));
    probe.listen(preferred, "127.0.0.1", () =>
      probe.close(() => resolve(preferred)),
    );
  });
}

module.exports = { freePort };
