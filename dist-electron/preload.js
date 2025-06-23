"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCESSING_EVENTS = void 0;
console.log("Preload script starting...");
const electron_1 = require("electron");
const { shell } = require("electron");
exports.PROCESSING_EVENTS = {
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
// At the top of the file
console.log("Preload script is running");
const electronAPI = {
    // Original methods
    openSubscriptionPortal: async (authData) => {
        return electron_1.ipcRenderer.invoke("open-subscription-portal", authData);
    },
    openSettingsPortal: () => electron_1.ipcRenderer.invoke("open-settings-portal"),
    updateContentDimensions: (dimensions) => electron_1.ipcRenderer.invoke("update-content-dimensions", dimensions),
    clearStore: () => electron_1.ipcRenderer.invoke("clear-store"),
    getScreenshots: () => electron_1.ipcRenderer.invoke("get-screenshots"),
    deleteScreenshot: (path) => electron_1.ipcRenderer.invoke("delete-screenshot", path),
    toggleMainWindow: async () => {
        console.log("toggleMainWindow called from preload");
        try {
            const result = await electron_1.ipcRenderer.invoke("toggle-window");
            console.log("toggle-window result:", result);
            return result;
        }
        catch (error) {
            console.error("Error in toggleMainWindow:", error);
            throw error;
        }
    },
    // Event listeners
    onScreenshotTaken: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("screenshot-taken", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("screenshot-taken", subscription);
        };
    },
    onResetView: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("reset-view", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("reset-view", subscription);
        };
    },
    onSolutionStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_START, subscription);
        };
    },
    onDebugStart: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_START, subscription);
        };
    },
    onDebugSuccess: (callback) => {
        electron_1.ipcRenderer.on("debug-success", (_event, data) => callback(data));
        return () => {
            electron_1.ipcRenderer.removeListener("debug-success", (_event, data) => callback(data));
        };
    },
    onDebugError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.DEBUG_ERROR, subscription);
        };
    },
    onSolutionError: (callback) => {
        const subscription = (_, error) => callback(error);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription);
        };
    },
    onProcessingNoScreenshots: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.NO_SCREENSHOTS, subscription);
        };
    },
    onOutOfCredits: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.OUT_OF_CREDITS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.OUT_OF_CREDITS, subscription);
        };
    },
    onProblemExtracted: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription);
        };
    },
    onSolutionSuccess: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription);
        };
    },
    onUnauthorized: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.UNAUTHORIZED, subscription);
        };
    },
    // External URL handler
    openLink: (url) => shell.openExternal(url),
    triggerScreenshot: () => electron_1.ipcRenderer.invoke("trigger-screenshot"),
    triggerProcessScreenshots: () => electron_1.ipcRenderer.invoke("trigger-process-screenshots"),
    triggerReset: () => electron_1.ipcRenderer.invoke("trigger-reset"),
    triggerMoveLeft: () => electron_1.ipcRenderer.invoke("trigger-move-left"),
    triggerMoveRight: () => electron_1.ipcRenderer.invoke("trigger-move-right"),
    triggerMoveUp: () => electron_1.ipcRenderer.invoke("trigger-move-up"),
    triggerMoveDown: () => electron_1.ipcRenderer.invoke("trigger-move-down"),
    onSubscriptionUpdated: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("subscription-updated", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("subscription-updated", subscription);
        };
    },
    onSubscriptionPortalClosed: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("subscription-portal-closed", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("subscription-portal-closed", subscription);
        };
    },
    onReset: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.RESET, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.RESET, subscription);
        };
    },
    startUpdate: () => electron_1.ipcRenderer.invoke("start-update"),
    installUpdate: () => electron_1.ipcRenderer.invoke("install-update"),
    onUpdateAvailable: (callback) => {
        const subscription = (_, info) => callback(info);
        electron_1.ipcRenderer.on("update-available", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("update-available", subscription);
        };
    },
    onUpdateDownloaded: (callback) => {
        const subscription = (_, info) => callback(info);
        electron_1.ipcRenderer.on("update-downloaded", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("update-downloaded", subscription);
        };
    },
    // 🆕 新的积分管理方法
    creditsGet: () => electron_1.ipcRenderer.invoke("credits:get"),
    creditsCheck: (params) => electron_1.ipcRenderer.invoke("credits:check", params),
    creditsDeduct: (params) => electron_1.ipcRenderer.invoke("credits:deduct", params),
    creditsRefund: (params) => electron_1.ipcRenderer.invoke("credits:refund", params),
    // 🆕 兼容旧系统的方法（逐步废弃）
    decrementCredits: () => electron_1.ipcRenderer.invoke("decrement-credits"),
    onCreditsUpdated: (callback) => {
        const subscription = (_event, credits) => callback(credits);
        electron_1.ipcRenderer.on("credits-updated", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("credits-updated", subscription);
        };
    },
    getPlatform: () => process.platform,
    // New methods for OpenAI API integration
    getConfig: () => electron_1.ipcRenderer.invoke("get-config"),
    updateConfig: (config) => electron_1.ipcRenderer.invoke("update-config", config),
    onShowSettings: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("show-settings-dialog", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("show-settings-dialog", subscription);
        };
    },
    checkApiKey: () => electron_1.ipcRenderer.invoke("check-api-key"),
    validateApiKey: (apiKey) => electron_1.ipcRenderer.invoke("validate-api-key", apiKey),
    openExternal: (url) => electron_1.ipcRenderer.invoke("openExternal", url),
    onApiKeyInvalid: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on(exports.PROCESSING_EVENTS.API_KEY_INVALID, subscription);
        return () => {
            electron_1.ipcRenderer.removeListener(exports.PROCESSING_EVENTS.API_KEY_INVALID, subscription);
        };
    },
    removeListener: (eventName, callback) => {
        electron_1.ipcRenderer.removeListener(eventName, callback);
    },
    onDeleteLastScreenshot: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("delete-last-screenshot", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("delete-last-screenshot", subscription);
        };
    },
    deleteLastScreenshot: () => electron_1.ipcRenderer.invoke("delete-last-screenshot"),
    // 添加控制鼠标事件穿透的方法
    setIgnoreMouseEvents: (ignore, options) => {
        return electron_1.ipcRenderer.invoke('set-ignore-mouse-events', ignore, options);
    },
    // 新增：区域性穿透API
    setIgnoreMouseEventsExcept: (exceptRegions) => {
        return electron_1.ipcRenderer.invoke('set-ignore-mouse-events-except', exceptRegions);
    },
    // 新增：显示设置对话框
    showSettings: () => {
        return electron_1.ipcRenderer.send('show-settings-dialog');
    },
    // Web Authentication methods
    webAuthLogin: () => electron_1.ipcRenderer.invoke("web-auth-login"),
    webAuthLogout: () => electron_1.ipcRenderer.invoke("web-auth-logout"),
    webAuthStatus: () => electron_1.ipcRenderer.invoke("web-auth-status"),
    webSyncConfig: () => electron_1.ipcRenderer.invoke("web-sync-config"),
    webUpdateConfig: (config) => electron_1.ipcRenderer.invoke("web-update-config", config),
    webGetAIModels: () => electron_1.ipcRenderer.invoke("web-get-ai-models"),
    webGetLanguages: () => electron_1.ipcRenderer.invoke("web-get-languages"),
    webCheckConnection: () => electron_1.ipcRenderer.invoke("web-check-connection"),
    // Web Authentication event listeners
    onWebAuthStatus: (callback) => {
        const subscription = (_, data) => callback(data);
        electron_1.ipcRenderer.on("web-auth-status", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("web-auth-status", subscription);
        };
    },
    onConfigUpdated: (callback) => {
        const subscription = (_, config) => callback(config);
        electron_1.ipcRenderer.on("config-updated", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("config-updated", subscription);
        };
    },
    // 添加通知事件监听器
    onNotification: (callback) => {
        const subscription = (_, notification) => callback(notification);
        electron_1.ipcRenderer.on("show-notification", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("show-notification", subscription);
        };
    },
    // 添加清除通知事件监听器
    onClearNotification: (callback) => {
        const subscription = () => callback();
        electron_1.ipcRenderer.on("clear-notification", subscription);
        return () => {
            electron_1.ipcRenderer.removeListener("clear-notification", subscription);
        };
    },
};
// Before exposing the API
console.log("About to expose electronAPI with methods:", Object.keys(electronAPI));
// Expose the API
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
console.log("electronAPI exposed to window");
// Add this focus restoration handler
electron_1.ipcRenderer.on("restore-focus", () => {
    // Try to focus the active element if it exists
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.focus === "function") {
        activeElement.focus();
    }
});
// Remove auth-callback handling - no longer needed
