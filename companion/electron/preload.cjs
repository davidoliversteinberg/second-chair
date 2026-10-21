const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("secondChair", {
  onNavigate: (callback) => {
    const listener = (_event, tab) => callback(tab);
    ipcRenderer.on("second-chair:navigate", listener);
    return () => ipcRenderer.removeListener("second-chair:navigate", listener);
  },
  openDesk: () => ipcRenderer.invoke("second-chair:open-desk"),
});
