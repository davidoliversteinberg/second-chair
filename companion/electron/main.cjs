const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  Notification,
  nativeImage,
  shell,
  screen,
  ipcMain,
  powerMonitor,
  dialog,
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
const { ensureLoginItem } = require("./login-item.cjs");
const { openDesk } = require("./desk.cjs");
const { freePort } = require("./port.cjs");

let window,
  tray,
  companion,
  placementFile,
  restoredBounds,
  placementTimer,
  bootError = null,
  booting = false,
  positioned = false,
  quitting = false;
const demo = process.argv.includes("--demo");
if (!app.requestSingleInstanceLock()) app.quit();
else {
  // A second launch retries a failed start instead of leaving the menu bar empty.
  app.on("second-instance", () => (companion ? show() : void boot()));
  app
    .whenReady()
    .then(() => {
      // The icon comes first: nothing that can fail while starting the server may hide it.
      createTray();
      ipcMain.handle("second-chair:open-desk", (event) => {
        if (
          !window ||
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          new URL(event.senderFrame.url).origin !== companion?.baseURL
        )
          throw new Error("Untrusted window");
        return openDesk({
          baseURL: companion.baseURL,
          openExternal: shell.openExternal,
        });
      });
      powerMonitor.on("resume", () => {
        companion?.poll();
        void companion?.refreshSources();
        if (window && !window.isDestroyed())
          window.webContents.send("second-chair:wake");
      });
      return boot();
    })
    .catch((error) => {
      console.error(error.message);
      app.quit();
    });
}
function createTray() {
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "../assets/tray.png"),
  );
  // Keep the official two-color O; a monochrome alpha mask would fill its center.
  icon.setTemplateImage(false);
  tray = new Tray(icon);
  tray.setToolTip("Second Chair");
  if (icon.isEmpty()) tray.setTitle("Second Chair");
  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(__dirname, "../assets/icon.png"));
    app.dock.hide();
  }
  tray.on("click", () => {
    if (!companion || !window) return tray.popUpContextMenu(trayMenu());
    window.isVisible() ? window.hide() : show();
  });
  tray.on("right-click", () => tray.popUpContextMenu(trayMenu()));
}
function trayMenu() {
  const startAtLogin = {
    label: "Start at login",
    type: "checkbox",
    checked: app.getLoginItemSettings().openAtLogin,
    enabled: app.isPackaged && !demo,
    click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
  };
  const quit = { label: "Quit Second Chair", click: () => app.quit() };
  if (!companion)
    return Menu.buildFromTemplate([
      {
        label: bootError
          ? `Couldn't start: ${bootError}`
          : "Second Chair is starting…",
        enabled: false,
      },
      { label: "Try again", enabled: !booting, click: () => void boot() },
      startAtLogin,
      { type: "separator" },
      quit,
    ]);
  return Menu.buildFromTemplate([
    { label: "Open Second Chair", click: () => show() },
    {
      label: "Move window back to menu bar",
      click: () => show({ reset: true }),
    },
    {
      label: "Open your desk in browser",
      click: async () => {
        const result = await openDesk({
          baseURL: companion.baseURL,
          openExternal: shell.openExternal,
        });
        if (!result.ok)
          dialog.showErrorBox(
            "Couldn’t open your desk",
            `${result.error}\n\n${result.url}`,
          );
      },
    },
    startAtLogin,
    { type: "separator" },
    quit,
  ]);
}
async function boot() {
  if (booting || companion) return;
  booting = true;
  tray.setToolTip("Second Chair is starting…");
  try {
    const { startCompanion } = await import("../server/index.mjs");
    const dataDir = demo
      ? fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-desktop-demo-"))
      : process.env.SECOND_CHAIR_DATA_DIR || app.getPath("userData");
    try {
      ensureLoginItem({ app, demo, dir: dataDir });
    } catch (error) {
      console.error(`Start at login unavailable: ${error.message}`);
    }
    placementFile = path.join(dataDir, "window-bounds.json");
    restoredBounds = readBounds(placementFile);
    companion = await startCompanion({
      port: await freePort(Number(process.env.PORT || 4318)),
      demo,
      login: !demo,
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
    await openWindow();
    bootError = null;
    tray.setTitle("");
    tray.setToolTip("Second Chair");
    show();
  } catch (error) {
    bootError = error.message;
    if (window && !window.isDestroyed()) window.destroy();
    window = null;
    if (companion) await companion.close().catch(() => {});
    companion = null;
    tray.setTitle(" !");
    tray.setToolTip(`Second Chair couldn't start: ${error.message}`);
    console.error(error.message);
    if (Notification.isSupported())
      new Notification({
        title: "Second Chair couldn't start",
        body: "Click the O in the menu bar for details.",
      }).show();
  } finally {
    booting = false;
  }
}
async function openWindow() {
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
      preload: path.join(__dirname, "preload.cjs"),
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
      void shell
        .openExternal(url)
        .catch(() =>
          dialog.showErrorBox(
            "Couldn’t open link",
            "Try opening this address in your browser:\n" + url,
          ),
        );
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
