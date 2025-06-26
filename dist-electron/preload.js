"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
console.log("Preload script starting...");
const { shell } = require("electron");
const PROCESSING_EVENTS = {
  //global states
  UNAUTHORIZED: "procesing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",
  OUT_OF_CREDITS: "out-of-credits",
  API_KEY_INVALID: "api-key-invalid",
  //states for generating the initial solution
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",
  RESET: "reset",
  //states for processing the debugging
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success",
  DEBUG_ERROR: "debug-error"
};
console.log("Preload script is running");
const electronAPI = {
  // Original methods
  openSubscriptionPortal: async (authData) => {
    return electron.ipcRenderer.invoke("open-subscription-portal", authData);
  },
  openSettingsPortal: () => electron.ipcRenderer.invoke("open-settings-portal"),
  updateContentDimensions: (dimensions) => electron.ipcRenderer.invoke("update-content-dimensions", dimensions),
  clearStore: () => electron.ipcRenderer.invoke("clear-store"),
  getScreenshots: () => electron.ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path) => electron.ipcRenderer.invoke("delete-screenshot", path),
  toggleMainWindow: async () => {
    console.log("toggleMainWindow called from preload");
    try {
      const result = await electron.ipcRenderer.invoke("toggle-window");
      console.log("toggle-window result:", result);
      return result;
    } catch (error) {
      console.error("Error in toggleMainWindow:", error);
      throw error;
    }
  },
  // Event listeners
  onScreenshotTaken: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on("screenshot-taken", subscription);
    return () => {
      electron.ipcRenderer.removeListener("screenshot-taken", subscription);
    };
  },
  onResetView: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("reset-view", subscription);
    return () => {
      electron.ipcRenderer.removeListener("reset-view", subscription);
    };
  },
  onSolutionStart: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription);
    };
  },
  onDebugStart: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription);
    };
  },
  onDebugSuccess: (callback) => {
    electron.ipcRenderer.on("debug-success", (_event, data) => callback(data));
    return () => {
      electron.ipcRenderer.removeListener(
        "debug-success",
        (_event, data) => callback(data)
      );
    };
  },
  onDebugError: (callback) => {
    const subscription = (_, error) => callback(error);
    electron.ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription);
    };
  },
  onSolutionError: (callback) => {
    const subscription = (_, error) => callback(error);
    electron.ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
    return () => {
      electron.ipcRenderer.removeListener(
        PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        subscription
      );
    };
  },
  onProcessingNoScreenshots: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
    };
  },
  onOutOfCredits: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription);
    };
  },
  onProblemExtracted: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
    return () => {
      electron.ipcRenderer.removeListener(
        PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        subscription
      );
    };
  },
  onSolutionSuccess: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
    return () => {
      electron.ipcRenderer.removeListener(
        PROCESSING_EVENTS.SOLUTION_SUCCESS,
        subscription
      );
    };
  },
  onUnauthorized: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription);
    };
  },
  // External URL handler
  openLink: (url) => shell.openExternal(url),
  triggerScreenshot: () => electron.ipcRenderer.invoke("trigger-screenshot"),
  triggerProcessScreenshots: () => electron.ipcRenderer.invoke("trigger-process-screenshots"),
  triggerReset: () => electron.ipcRenderer.invoke("trigger-reset"),
  triggerMoveLeft: () => electron.ipcRenderer.invoke("trigger-move-left"),
  triggerMoveRight: () => electron.ipcRenderer.invoke("trigger-move-right"),
  triggerMoveUp: () => electron.ipcRenderer.invoke("trigger-move-up"),
  triggerMoveDown: () => electron.ipcRenderer.invoke("trigger-move-down"),
  onSubscriptionUpdated: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("subscription-updated", subscription);
    return () => {
      electron.ipcRenderer.removeListener("subscription-updated", subscription);
    };
  },
  onSubscriptionPortalClosed: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("subscription-portal-closed", subscription);
    return () => {
      electron.ipcRenderer.removeListener("subscription-portal-closed", subscription);
    };
  },
  onReset: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.RESET, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.RESET, subscription);
    };
  },
  startUpdate: () => electron.ipcRenderer.invoke("start-update"),
  installUpdate: () => electron.ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (callback) => {
    const subscription = (_, info) => callback(info);
    electron.ipcRenderer.on("update-available", subscription);
    return () => {
      electron.ipcRenderer.removeListener("update-available", subscription);
    };
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_, info) => callback(info);
    electron.ipcRenderer.on("update-downloaded", subscription);
    return () => {
      electron.ipcRenderer.removeListener("update-downloaded", subscription);
    };
  },
  // 🆕 新的积分管理方法
  creditsGet: () => electron.ipcRenderer.invoke("credits:get"),
  creditsCheck: (params) => electron.ipcRenderer.invoke("credits:check", params),
  creditsDeduct: (params) => electron.ipcRenderer.invoke("credits:deduct", params),
  creditsRefund: (params) => electron.ipcRenderer.invoke("credits:refund", params),
  // 🆕 兼容旧系统的方法（逐步废弃）
  decrementCredits: () => electron.ipcRenderer.invoke("decrement-credits"),
  onCreditsUpdated: (callback) => {
    const subscription = (_event, credits) => callback(credits);
    electron.ipcRenderer.on("credits-updated", subscription);
    return () => {
      electron.ipcRenderer.removeListener("credits-updated", subscription);
    };
  },
  getPlatform: () => process.platform,
  // New methods for OpenAI API integration
  getConfig: () => electron.ipcRenderer.invoke("get-config"),
  updateConfig: (config) => electron.ipcRenderer.invoke("update-config", config),
  onShowSettings: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("show-settings-dialog", subscription);
    return () => {
      electron.ipcRenderer.removeListener("show-settings-dialog", subscription);
    };
  },
  checkApiKey: () => electron.ipcRenderer.invoke("check-api-key"),
  validateApiKey: (apiKey) => electron.ipcRenderer.invoke("validate-api-key", apiKey),
  openExternal: (url) => electron.ipcRenderer.invoke("openExternal", url),
  onApiKeyInvalid: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on(PROCESSING_EVENTS.API_KEY_INVALID, subscription);
    return () => {
      electron.ipcRenderer.removeListener(PROCESSING_EVENTS.API_KEY_INVALID, subscription);
    };
  },
  removeListener: (eventName, callback) => {
    electron.ipcRenderer.removeListener(eventName, callback);
  },
  onDeleteLastScreenshot: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("delete-last-screenshot", subscription);
    return () => {
      electron.ipcRenderer.removeListener("delete-last-screenshot", subscription);
    };
  },
  deleteLastScreenshot: () => electron.ipcRenderer.invoke("delete-last-screenshot"),
  // 添加控制鼠标事件穿透的方法
  setIgnoreMouseEvents: (ignore, options) => {
    return electron.ipcRenderer.invoke("set-ignore-mouse-events", ignore, options);
  },
  // 新增：区域性穿透API
  setIgnoreMouseEventsExcept: (exceptRegions) => {
    return electron.ipcRenderer.invoke("set-ignore-mouse-events-except", exceptRegions);
  },
  // 新增：显示设置对话框
  showSettings: () => {
    return electron.ipcRenderer.send("show-settings-dialog");
  },
  // Web Authentication methods
  webAuthLogin: () => electron.ipcRenderer.invoke("web-auth-login"),
  webAuthLogout: () => electron.ipcRenderer.invoke("web-auth-logout"),
  webAuthStatus: () => electron.ipcRenderer.invoke("web-auth-status"),
  webSyncConfig: () => electron.ipcRenderer.invoke("web-sync-config"),
  webUpdateConfig: (config) => electron.ipcRenderer.invoke("web-update-config", config),
  webGetAIModels: () => electron.ipcRenderer.invoke("web-get-ai-models"),
  webGetLanguages: () => electron.ipcRenderer.invoke("web-get-languages"),
  webCheckConnection: () => electron.ipcRenderer.invoke("web-check-connection"),
  // Web Authentication event listeners
  onWebAuthStatus: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on("web-auth-status", subscription);
    return () => {
      electron.ipcRenderer.removeListener("web-auth-status", subscription);
    };
  },
  onConfigUpdated: (callback) => {
    const subscription = (_, config) => callback(config);
    electron.ipcRenderer.on("config-updated", subscription);
    return () => {
      electron.ipcRenderer.removeListener("config-updated", subscription);
    };
  },
  // 添加通知事件监听器
  onNotification: (callback) => {
    const subscription = (_, notification) => callback(notification);
    electron.ipcRenderer.on("show-notification", subscription);
    return () => {
      electron.ipcRenderer.removeListener("show-notification", subscription);
    };
  },
  // 添加清除通知事件监听器
  onClearNotification: (callback) => {
    const subscription = () => callback();
    electron.ipcRenderer.on("clear-notification", subscription);
    return () => {
      electron.ipcRenderer.removeListener("clear-notification", subscription);
    };
  }
};
console.log(
  "About to expose electronAPI with methods:",
  Object.keys(electronAPI)
);
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
console.log("electronAPI exposed to window");
electron.ipcRenderer.on("restore-focus", () => {
  const activeElement = document.activeElement;
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus();
  }
});
exports.PROCESSING_EVENTS = PROCESSING_EVENTS;
//# sourceMappingURL=preload.js.map
