const fs = require("node:fs");
const path = require("node:path");

// A menu-bar app that is not running is invisible, so a packaged build registers itself to open at
// login the first time it runs. The marker keeps a later "Start at login" opt-out from being undone.
function ensureLoginItem({ app, demo, dir, env = process.env }) {
  // IT can set SECOND_CHAIR_NO_LOGIN_ITEM when it manages login items itself, for example via MDM.
  if (demo || !app.isPackaged || env.SECOND_CHAIR_NO_LOGIN_ITEM) return false;
  const marker = path.join(dir, "login-item-configured");
  if (fs.existsSync(marker)) return false;
  if (!app.getLoginItemSettings().openAtLogin)
    app.setLoginItemSettings({ openAtLogin: true });
  fs.writeFileSync(marker, new Date().toISOString(), { mode: 0o600 });
  return true;
}

module.exports = { ensureLoginItem };
