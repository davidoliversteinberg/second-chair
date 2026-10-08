const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  shell,
  screen,
} = require("electron");
const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const {
  readBounds,
  fitBounds,
  anchoredBounds,
  writeBounds,
} = require("./window-state.cjs");

let window,
  tray,
  companion,
  placementFile,
  restoredBounds,
  placementTimer,
  positioned = false,
  quitting = false;
const demo = process.argv.includes("--demo");
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => show());
  app
    .whenReady()
    .then(async () => {
      const { startCompanion } = await import("../server/index.mjs");
      const dataDir = demo
        ? fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-desktop-demo-"))
        : process.env.SECOND_CHAIR_DATA_DIR || app.getPath("userData");
      placementFile = path.join(dataDir, "window-bounds.json");
      restoredBounds = readBounds(placementFile);
      companion = await startCompanion({
        port: Number(process.env.PORT || 4318),
        demo,
        dataDir,
        notify: (alerts, settings) => {
          if (!Notification.isSupported()) return false;
          const notice = new Notification({
            title:
              alerts.length === 1
                ? "Second Chair has an update"
                : `${alerts.length} things need your attention`,
            body: settings.showPreview
              ? alerts[0].title
              : "Open Second Chair to review your findings.",
            silent: false,
          });
          notice.on("click", () => show());
          notice.show();
          return true;
        },
      });
      const icon = nativeImage.createFromPath(
        path.join(__dirname, "../assets/tray.png"),
      );
      // Keep the official two-color O; a monochrome alpha mask would fill its center.
      icon.setTemplateImage(false);
      tray = new Tray(icon);
      tray.setToolTip("Second Chair");
      if (process.platform === "darwin") {
        app.dock.setIcon(path.join(__dirname, "../assets/icon.png"));
      }
      window = new BrowserWindow({
        width: 548,
        height: 868,
        show: false,
        frame: false,
        resizable: true,
        movable: true,
        minWidth: 360,
        minHeight: 560,
        backgroundColor: "#ffffff",
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });
      window.webContents.session.setPermissionRequestHandler(
        (_wc, _permission, callback) => callback(false),
      );
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (
          url.startsWith("https://") ||
          new URL(url).origin === companion.baseURL
        ) {
          // Source links require an explicit confirmation in the app UI before this opens.
          void shell.openExternal(url);
        }
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (new URL(url).origin !== companion.baseURL) event.preventDefault();
      });
      window.on("close", (event) => {
        if (!quitting) {
          event.preventDefault();
          window.hide();
        }
      });
      const schedulePlacementSave = () => {
        if (!positioned) return;
        clearTimeout(placementTimer);
        placementTimer = setTimeout(savePlacement, 150);
      };
      window.on("move", schedulePlacementSave);
      window.on("resize", schedulePlacementSave);
      window.on("hide", savePlacement);
      await window.loadURL(companion.baseURL + "/?native=1");
      tray.on("click", () => (window.isVisible() ? window.hide() : show()));
      tray.on("right-click", () =>
        tray.popUpContextMenu(
          Menu.buildFromTemplate([
            { label: "Open Second Chair", click: () => show() },
            {
              label: "Move window back to menu bar",
              click: () => show({ reset: true }),
            },
            {
              label: "Open your desk in browser",
              click: () => shell.openExternal(companion.baseURL + "/?desk=1"),
            },
            {
              label: "Start at login",
              type: "checkbox",
              checked: app.getLoginItemSettings().openAtLogin,
              enabled: app.isPackaged && !demo,
              click: (item) =>
                app.setLoginItemSettings({ openAtLogin: item.checked }),
            },
            { type: "separator" },
            { label: "Quit Second Chair", click: () => app.quit() },
          ]),
        ),
      );
      if (process.platform === "darwin") app.dock.hide();
      show();
    })
    .catch((error) => {
      console.error(error.message);
      app.quit();
    });
}
function savePlacement() {
  clearTimeout(placementTimer);
  if (positioned && window && !window.isDestroyed())
    writeBounds(placementFile, window.getBounds());
}
function show({ reset = false } = {}) {
  if (!window || !tray) return;
  const anchor = tray.getBounds();
  const existing = reset
    ? null
    : positioned
      ? window.getBounds()
      : restoredBounds;
  const area = existing
    ? screen.getDisplayMatching(existing).workArea
    : screen.getDisplayNearestPoint({ x: anchor.x, y: anchor.y }).workArea;
  window.setMinimumSize(Math.min(360, area.width), Math.min(560, area.height));
  window.setBounds(
    existing ? fitBounds(existing, area) : anchoredBounds(anchor, area),
  );
  positioned = true;
  savePlacement();
  window.show();
  window.focus();
}
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  savePlacement();
  if (companion) void companion.close();
});
