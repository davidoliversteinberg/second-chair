const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("secondChair", {
  openDesk: () => ipcRenderer.invoke("second-chair:open-desk"),
});
