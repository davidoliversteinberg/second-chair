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

let window,
  tray,
  companion,
  quitting = false;
const demo = process.argv.includes("--demo");
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => show());
  app
    .whenReady()
    .then(async () => {
      const { startCompanion } = await import("../server/index.mjs");
      companion = await startCompanion({
        port: Number(process.env.PORT || 4318),
        demo,
        dataDir: demo
          ? fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-desktop-demo-"))
          : process.env.SECOND_CHAIR_DATA_DIR || app.getPath("userData"),
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
        path.join(__dirname, "../assets/trayTemplate.png"),
      );
      icon.setTemplateImage(true);
      tray = new Tray(icon);
      tray.setToolTip("Second Chair");
      window = new BrowserWindow({
        width: 548,
        height: 868,
        show: false,
        frame: false,
        resizable: true,
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
      await window.loadURL(companion.baseURL + "/?native=1");
      tray.on("click", () => (window.isVisible() ? window.hide() : show()));
      tray.on("right-click", () =>
        tray.popUpContextMenu(
          Menu.buildFromTemplate([
            { label: "Open Second Chair", click: show },
            {
              label: "Open your desk in browser",
              click: () => shell.openExternal(companion.baseURL),
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
function show() {
  if (!window || !tray) return;
  const anchor = tray.getBounds();
  const area = screen.getDisplayNearestPoint({
    x: anchor.x,
    y: anchor.y,
  }).workArea;
  const width = Math.min(548, area.width);
  const height = Math.min(868, area.height - 16);
  window.setBounds({
    width,
    height,
    x: Math.max(
      area.x,
      Math.min(anchor.x + anchor.width - width, area.x + area.width - width),
    ),
    y: Math.max(
      area.y,
      Math.min(anchor.y + anchor.height + 6, area.y + area.height - height),
    ),
  });
  window.show();
  window.focus();
}
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  if (companion) void companion.close();
});
