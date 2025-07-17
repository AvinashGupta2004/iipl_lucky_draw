// noinspection JSUnresolvedReference,ExceptionCaughtLocallyJS

import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { join } from "path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import icon from "../../resources/favicon.ico";
import { Worker } from "worker_threads";
import workerPath from "./Controller?modulePath"; // This path should point to your Controller.js
import excel from "exceljs";
import fs from "fs";

let mainWindow = null;
let databasePath = null;
let workerInstance = null;
let workbookPath = null;
let loggedInUserInfo = null;

let messageIdCounter = 0;
const pendingWorkerMessages = new Map();

let inventoryCouponNumbers = [];
let problematicNumbers = [];

if (is.dev) {
  databasePath = join(__dirname, "../../resources/app_data.db");
  workbookPath = join(__dirname, "../../resources/couponInventory.xlsx");
} else {
  databasePath = join(
    process.resourcesPath,
    "app.asar.unpacked",
    "resources",
    "app_data.db",
  );
  workbookPath = join(
    process.resourcesPath,
    "app.asar.unpacked",
    "resources",
    "couponInventory.xlsx",
  );
}
function setupWorkerThread() {
  workerInstance = new Worker(workerPath, {
    workerData: {
      dbPath: databasePath,
    },
  });
  workerInstance.on("message", (message) => {
    const { id, success, result, error } = message;
    if (pendingWorkerMessages.has(id)) {
      const { resolve, reject } = pendingWorkerMessages.get(id);
      pendingWorkerMessages.delete(id);
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error));
      }
    }
  });

  workerInstance.on("error", (err) => {
    console.error("Worker error:", err);
    dialog.showErrorBox(
      "Worker Error",
      `Worker thread crashed: ${err.message}`,
    );
  });

  workerInstance.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Worker stopped with exit code ${code}`);
    }
  });
}

function sendToWorker(method, ...args) {
  return new Promise((resolve, reject) => {
    const id = messageIdCounter++;
    pendingWorkerMessages.set(id, { resolve, reject });
    workerInstance.postMessage({ id, method, args });
  });
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    fullscreen: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contentSecurityPolicy: `
        default-src 'self';
        script-src 'self';
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data:;
        connect-src 'self';
      `,
    },
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url).then();
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]).then();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html")).then();
  }
}

async function generateFinalNumberJSON() {
  let mainPrizeNumbers = new Set();
  let consolationPrizeNumbers = new Set();
  const requirementsResult = await sendToWorker("getRequirements");
  if (!requirementsResult.success) {
    throw new Error(requirementsResult.error);
  }
  let requirements = requirementsResult.data;

  let mainPrizes = requirements.main_prize_count;
  let consPrizes = requirements.consolation_prize_count;

  while (mainPrizeNumbers.size < mainPrizes) {
    const index = Math.floor(Math.random() * inventoryCouponNumbers.length);
    mainPrizeNumbers.add(
      inventoryCouponNumbers[index].Coupon_Numbers.toString().padStart(
        requirements.total_digits,
        "0",
      ),
    );
  }
  while (consolationPrizeNumbers.size < consPrizes) {
    const index = Math.floor(Math.random() * inventoryCouponNumbers.length);
    if (
      !mainPrizeNumbers.has(
        inventoryCouponNumbers[index].Coupon_Numbers.toString().padStart(
          requirements.total_digits,
          "0",
        ),
      )
    ) {
      consolationPrizeNumbers.add(
        inventoryCouponNumbers[index].Coupon_Numbers.toString().padStart(
          requirements.total_digits,
          "0",
        ),
      );
    }
  }
  return {
    mainPrizeNumbers: [...mainPrizeNumbers],
    consolationPrizeNumbers: [...consolationPrizeNumbers],
  };
}

app.whenReady().then(() => {
  // Set app user model id for windows
  setupWorkerThread();
  electronApp.setAppUserModelId("com.electron");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  ipcMain.handle("app-close", () => {
    const closeDialogResponse = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      title: "Close the Application?",
      message: "Are you sure you want to close the Application?",
      buttons: ["Yes", "No"],
      defaultId: 1,
      cancelId: 1,
    });
    if (closeDialogResponse === 0) {
      app.quit();
    }
  });

  ipcMain.handle("app-minimize", () => {
    mainWindow.minimize(!mainWindow.isMinimized);
  });

  ipcMain.handle("register-user", async (_, { userName, userPassword }) => {
    try {
      const hashResult = await sendToWorker("hashPassword", userPassword);
      if (!hashResult.success) {
        throw new Error(hashResult.error);
      }
      const hash = hashResult.hash;

      const insertResult = await sendToWorker("insertUser", {
        userName,
        hash,
      });
      if (insertResult.success) {
        dialog.showMessageBoxSync(mainWindow, {
          type: "info",
          title: "Admin registered Successfully",
          message: "User credentials were registered Successfully!",
          detail: `Your User ID is ${insertResult.id}`,
        });
        return true;
      } else {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Error",
          message: "Some error occurred",
        });
        return false;
      }
    } catch (err) {
      console.error("Registration error:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: "An unexpected error occurred during registration.",
      });
      return false;
    }
  });
  function filterDates(logData, fromDateStr, toDateStr) {
    // Convert all strings to Date objects for comparison
    const fromDate = parseYYYYMMDD(fromDateStr);
    const toDate = parseYYYYMMDD(toDateStr);
    if (!fromDate && !toDate) return null;
    return logData.filter((log) => {
      const currentDate = parseDDMMYYYY(log.run_dt.split(" ")[0]);
      return currentDate >= fromDate && currentDate <= toDate;
    });
  }
  function parseYYYYMMDD(dateStr) {
    if (dateStr === "") return null;
    const [year, month, day] = dateStr.toString().split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  function parseDDMMYYYY(dateStr) {
    if (dateStr === "") return null;
    const [day, month, year] = dateStr.toString().split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  ipcMain.handle("login-user", async (_, { userID, userPassword }) => {
    try {
      const userResult = await sendToWorker("getUser", userID);
      if (!userResult.success) {
        throw new Error(userResult.error);
      }
      const user = userResult.data;

      if (user && user.userID) {
        const compareResult = await sendToWorker(
          "comparePassword",
          userPassword,
          user.password,
        );
        if (!compareResult.success) {
          throw new Error(compareResult.error);
        }

        if (compareResult.result) {
          loggedInUserInfo = user;
          return true;
        } else {
          dialog.showMessageBoxSync(mainWindow, {
            type: "error",
            title: "Login Failed",
            message: "Invalid credentials",
          });
          return false;
        }
      } else {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Login Failed",
          message: "User not found or invalid userID",
        });
        return false;
      }
    } catch (err) {
      console.error("Login error:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: "An error occurred during login.",
      });
      return false;
    }
  });

  ipcMain.handle("update-requirements", async (_, data) => {
    try {
      const result = await sendToWorker("updateRequirements", data);
      if (result.success) {
        return true;
      } else {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Error",
          message: `Failed to save settings: ${result.error}`,
        });
        return false;
      }
    } catch (err) {
      console.error("Update requirements error:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: "An unexpected error occurred while saving settings.",
      });
      return false;
    }
  });

  ipcMain.handle("load-coupon-inventory", async () => {
    try {
      problematicNumbers = [];
      await sendToWorker("reloadDatabase");
      const requirementsResult = await sendToWorker("getRequirements");
      if (!requirementsResult.success || !requirementsResult.data) {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Configuration Error",
          message:
            "Please configure the requirements first before loading coupons",
        });
        return false;
      }
      const requirements = requirementsResult.data;
      const prizeCheckResult = await sendToWorker(
        "checkPrizeNumbersAlongCoupons",
      );
      if (!prizeCheckResult.success) {
        throw new Error(prizeCheckResult.error);
      }
      if (!prizeCheckResult.data) {
        const response = dialog.showMessageBoxSync(mainWindow, {
          type: "warning",
          title: "Existing Data Found",
          message:
            "Previous draw data exists. Loading new coupons will clear all existing data. Continue?",
          buttons: ["Continue", "Cancel"],
          defaultId: 1,
        });

        if (response !== 0) return false; // User cancelled

        const clearResult = await sendToWorker("clearCoupons");
        if (!clearResult.success) {
          throw new Error("Failed to clear existing data");
        }
        // Reload after clearing
        await sendToWorker("reloadDatabase");
      }
      const couponsResult = await sendToWorker("getCoupons");
      if (!couponsResult.success) {
        throw new Error(couponsResult.error);
      }
      if (couponsResult.data.length === 0) {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Empty Inventory",
          message: "No coupon numbers found in the database",
        });
        return false;
      }
      inventoryCouponNumbers = couponsResult.data;
      const invalidCoupons = inventoryCouponNumbers.filter(
        ({ Coupon_Numbers }) => {
          const value = Coupon_Numbers;
          return (
            isNaN(value) ||
            value < requirements.min_range ||
            value > requirements.max_range ||
            String(value).length > requirements.total_digits
          );
        },
      );
      if (invalidCoupons.length > 0) {
        problematicNumbers = invalidCoupons.map((c) => c.Coupon_Numbers);
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Validation Failed",
          message: `${invalidCoupons.length} coupon numbers don't meet requirements`,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Coupon load error:", error);

      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Loading Failed",
        message: "Could not load coupon inventory",
        detail: error.message,
      });

      return false;
    }
  });

  ipcMain.handle("get-requirements", async () => {
    const result = await sendToWorker("getRequirements");
    if (result.success) {
      return result.data;
    } else {
      console.error("Error getting requirements:", result.error);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: `Failed to retrieve requirements: ${result.error}`,
      });
      return null;
    }
  });

  ipcMain.handle("alert-false-integrity", async () => {
    dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Operation not allowed",
      message:
        "There are some problems related to integrity of coupon numbers. Please recheck the numbers and try again!",
    });
  });

  ipcMain.handle("is-navigation-allowed", async () => {
    const requirementsResult = await sendToWorker("getRequirements");
    if (!requirementsResult.success) {
      throw new Error(requirementsResult.error);
    }
    const requirements = requirementsResult.data;

    const checkPrizesResult = await sendToWorker(
      "checkPrizeNumbersAlongCoupons",
    );
    if (!checkPrizesResult.success) {
      throw new Error(checkPrizesResult.error);
    }
    const getCouponsResult = await sendToWorker("getCoupons");

    if (getCouponsResult.data.length === 0) {
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Empty Inventory",
        message:
          "Coupon Inventory is empty. Please fill it with Coupon Numbers",
      });
      return false;
    }
    const arePrizesClear = checkPrizesResult.data;

    if (arePrizesClear) {
      let totalPrizes =
        requirements.main_prize_count + requirements.consolation_prize_count;
      if (totalPrizes > inventoryCouponNumbers.length) {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Operation not allowed",
          message:
            "Coupon Numbers provided in data source are not sufficient as per Requirements.",
          detail: `Total Prizes in requirements: ${totalPrizes} \nNumbers in data source: ${inventoryCouponNumbers.length}`,
        });
        return false;
      } else {
        return true;
      }
    } else {
      let response = dialog.showMessageBoxSync(mainWindow, {
        type: "warning",
        title: "New Session",
        message:
          "Some draw prizes already found in data source. This operation will remove all previous data stored in the data source. Continue?",
        buttons: ["Yes", "No"],
        defaultId: 1,
        cancelId: 1,
      });
      if (response === 0) {
        // User clicked Yes, clear prizes and coupons
        await sendToWorker("clearCoupons");
        dialog.showMessageBoxSync(mainWindow, {
          type: "info",
          title: "Data Cleared",
          message: "Previous coupon data has been cleared.",
        });

        return true; // Allow navigation after clearing
      } else {
        return false; // User clicked No, prevent navigation
      }
    }
  });

  ipcMain.handle("get-final-numbers", async () => {
    return await generateFinalNumberJSON();
  });

  ipcMain.handle("generate-error-script", (_, requirements) => {
    dialog.showMessageBoxSync(mainWindow, {
      type: "info",
      title: "Welcome Admin",
      message: "Requirements is getting loaded",
      detail: JSON.stringify(requirements),
    });
  });

  ipcMain.handle("game-completed-dialog", () => {
    dialog.showMessageBoxSync(mainWindow, {
      type: "info",
      title: "Operation Complete",
      message: "Draw for all prizes has been over !!",
    });
  });

  ipcMain.handle("update-prizes", async (_, finalNumbers) => {
    try {
      // if the event name is same, we will overwrite the data for it, otherwise we will append the data
      const requirementsResult = await sendToWorker("getRequirements");
      if (!requirementsResult.success) {
        throw new Error(requirementsResult.error);
      }
      //checking whether the event name is previously recorded or not!
      let recordedEventNames = await sendToWorker("getLastRecordedEventNames");
      const requirements = requirementsResult.data;
      if (recordedEventNames.includes(requirements.event_name)) {
        await sendToWorker("clearPrizesForEventName", requirements.event_name);
      }
      for (const [index, value] of finalNumbers.mainPrizeNumbers.entries()) {
        await sendToWorker(
          "insertFinalNumbers",
          loggedInUserInfo.userID,
          requirements.event_name,
          `Main-Prize-${index + 1}`,
          value,
        );
      }
      for (const [
        index,
        value,
      ] of finalNumbers.consolationPrizeNumbers.entries()) {
        await sendToWorker(
          "insertFinalNumbers",
          loggedInUserInfo.userID,
          requirements.event_name,
          `Consolation-Prize-${index + 1}`,
          value,
        );
      }
      return { success: true };
    } catch (err) {
      console.error("Error updating prizes:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: `Failed to update prizes: ${err.message}`,
      });
      return { success: false, error: err.message };
    }
  });
  ipcMain.handle("update-coupons", async (_, finalNumbers) => {
    try {
      const requirementsResult = await sendToWorker("getRequirements");
      if (!requirementsResult.success) {
        throw new Error(requirementsResult.error);
      }
      const requirements = requirementsResult.data;

      for (const [index, value] of finalNumbers.mainPrizeNumbers.entries()) {
        const paddedValue = value
          .toString()
          .padStart(requirements.total_digits, "0");
        await sendToWorker("updateCoupons", paddedValue, index + 1);
      }
      for (const value of finalNumbers.consolationPrizeNumbers) {
        const paddedValue = value
          .toString()
          .padStart(requirements.total_digits, "0");
        await sendToWorker(
          "updateCoupons",
          paddedValue,
          requirements.main_prize_count + 1,
        );
      }
      return { success: true };
    } catch (err) {
      console.error("Error updating coupons:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: `Failed to update coupons: ${err.message}`,
      });
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("load-from-excel", async () => {
    try {
      if (!fs.existsSync(workbookPath)) {
        return { success: false, message: "Excel file not found" };
      }

      let workbook = new excel.Workbook();
      let buffer = fs.readFileSync(workbookPath);
      await workbook.xlsx.load(buffer);
      let worksheet = workbook.worksheets[0];
      if (!worksheet || worksheet.actualRowCount <= 1) {
        dialog.showMessageBoxSync(mainWindow, {
          type: "error",
          title: "Excel Sheet Error",
          message:
            "Either Excel Sheet is empty or it is not loaded properly. Please check the Excel Sheet conditions as specified and try again!",
        });
        return { success: false, message: "Empty worksheet" };
      }

      let requirements = await sendToWorker("getRequirements");
      if (!requirements.success) {
        return { success: false, message: "Failed to get requirements" };
      }

      let loadedCouponNumbers = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
        if (rowIndex !== 1) {
          // row.eachCell((cell, colNumber) => {
          //   if (cell.value && colNumber === 0) {
          //     loadedCouponNumbers.push(
          //       cell.value
          //         .toString()
          //         .padStart(requirements.data.total_digits, "0"),
          //     );
          //   }
          // });
          const cellValue = row.getCell(1).value;
          if (cellValue !== null && cellValue !== undefined) {
            loadedCouponNumbers.push(
              cellValue.toString().padStart(requirements.total_digits, "0"),
            );
          }
        }
      });

      if (loadedCouponNumbers.length === 0) {
        return { success: false, message: "No valid coupon numbers found" };
      }

      const insertResult = await sendToWorker(
        "insertCoupons",
        loadedCouponNumbers,
      );
      if (!insertResult.success) {
        return { success: false, message: insertResult.error };
      }
      return { success: true, count: loadedCouponNumbers.length };
    } catch (err) {
      console.error("Error loading from excel:", err);
      dialog.showMessageBoxSync(mainWindow, {
        type: "error",
        title: "Error",
        message: `Failed to load from excel: ${err.message}`,
      });
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle("open-excel-file", async () => {
    await shell.openPath(workbookPath);
  });

  ipcMain.handle("browse-excel", async () => {
    try {
      let filePath = dialog.showOpenDialogSync(mainWindow, {
        properties: ["openFile"],
        filters: [
          { name: "Excel Files", extensions: ["xlsx"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!filePath || filePath.length === 0) {
        return { success: false, message: "No file selected" };
      }

      fs.copyFileSync(filePath[0], workbookPath);
      return { success: true, message: "Excel file loaded successfully" };
    } catch (err) {
      console.error("Error browsing excel:", err);
      dialog.showErrorBox(
        "Can't load the Excel File",
        "Couldn't copy the excel file. Either the selected file is not loaded properly or is Open in another program.",
      );
      return { success: false, message: err.message };
    }
  });
  ipcMain.handle("get-draw-run-log", async () => {
    return await sendToWorker("getDrawRunLog", loggedInUserInfo);
  });
  ipcMain.handle("coupon-count", () => {
    return problematicNumbers.length > 0 ? 0 : inventoryCouponNumbers.length;
  });
  ipcMain.handle("get-filtered-logs", async (_, data) => {
    try {
      let logs = await sendToWorker("getDrawRunLog", loggedInUserInfo);
      return filterDates(logs, data.fromDate, data.toDate);
    } catch (err) {
      console.error(err);
      return null;
    }
  });

  ipcMain.handle("error-dialog", (_, error, totalPrizes, couponCount) => {
    dialog.showMessageBoxSync(mainWindow, {
      type: "error",
      title: "Error",
      message: error,
      detail: `Total Prizes in requirements: ${totalPrizes}\nTotal Coupon Numbers loaded: ${couponCount}`,
    });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Ensure worker is terminated when the app quits
    if (workerInstance) {
      workerInstance.terminate();
    }
    app.quit();
  }
});
