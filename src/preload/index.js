import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";
const api = {
  appClose: async () => {
    await ipcRenderer.invoke("app-close");
  },
  appMinimize: async () => {
    await ipcRenderer.invoke("app-minimize");
  },
  registerUser: async (data) => {
    await ipcRenderer.invoke("register-user", data);
  },
  loginUser: async (data) => {
    return await ipcRenderer.invoke("login-user", data);
  },
  saveSettings: async (data) => {
    return await ipcRenderer.invoke("update-requirements", data);
  },
  loadCouponInventory: async () => {
    return await ipcRenderer.invoke("load-coupon-inventory");
  },
  getRequirements: async () => {
    return await ipcRenderer.invoke("get-requirements");
  },
  getActivityLog: async () => {
    return await ipcRenderer.invoke("get-draw-run-log");
  },
  getFilteredActivityLog: async (data) => {
    return await ipcRenderer.invoke("get-filtered-logs", data);
  },
  alertFalseIntegrity: async () => {
    await ipcRenderer.invoke("alert-false-integrity");
  },
  isNavigationAllowed: async () => {
    return await ipcRenderer.invoke("is-navigation-allowed");
  },
  generateErrorScript: async (requirements) => {
    await ipcRenderer.invoke("generate-error-script", requirements);
  },
  getFinalNumbers: async () => {
    return await ipcRenderer.invoke("get-final-numbers");
  },
  gameCompletedDialog: async () => {
    await ipcRenderer.invoke("game-completed-dialog");
  },
  updatePrizesTable: async (finalNumbers) => {
    await ipcRenderer.invoke("update-prizes", finalNumbers);
  },
  updateCouponsTable: async (finalNumbers) => {
    await ipcRenderer.invoke("update-coupons", finalNumbers);
  },
  openExcelFile: async () => {
    await ipcRenderer.invoke("open-excel-file");
  },
  loadExcelFile: async () => {
    return await ipcRenderer.invoke("load-from-excel");
  },
  browseExcelFile: async () => {
    return await ipcRenderer.invoke("browse-excel");
  },
  couponCount: async () => {
    return await ipcRenderer.invoke("coupon-count");
  },
  errorDialog: async (error, totalPrizes, couponCount) => {
    await ipcRenderer.invoke("error-dialog", error, totalPrizes, couponCount);
  },
  loadImageDirectoryPath: async () => {
    return await ipcRenderer.invoke("get-image-directory-path");
  },
  selectLeftImage: async () => {
    await ipcRenderer.invoke("select-left-image");
  },
  selectRightImage: async () => {
    await ipcRenderer.invoke("select-right-image");
  }
};
const electronStoreAPIs = {
  get: async (key) => {
    return await ipcRenderer.invoke("get-localStorage", key);
  },
  set: async (key, value) =>
    await ipcRenderer.invoke("set-localStorage", { key, value }),
  delete: async (key) => await ipcRenderer.invoke("delete-localStorage", key),
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("electronStore", electronStoreAPIs);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
