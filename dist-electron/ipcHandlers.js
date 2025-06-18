"use strict";
// ipcHandlers.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeIpcHandlers = initializeIpcHandlers;
const electron_1 = require("electron");
const ConfigHelper_1 = require("./ConfigHelper");
const SimpleAuthManager_1 = require("./SimpleAuthManager");
function initializeIpcHandlers(deps) {
    console.log("Initializing IPC handlers");
    // Configuration handlers
    electron_1.ipcMain.handle("get-config", () => {
        return ConfigHelper_1.configHelper.loadConfig();
    });
    electron_1.ipcMain.handle("update-config", (_event, updates) => {
        return ConfigHelper_1.configHelper.updateConfig(updates);
    });
    electron_1.ipcMain.handle("check-api-key", () => {
        // API key is now built-in, always available
        return true;
    });
    electron_1.ipcMain.handle("validate-api-key", async (_event, apiKey) => {
        // API key is now built-in, always valid
        return {
            valid: true,
            error: null
        };
    });
    // Credits handlers
    electron_1.ipcMain.handle("set-initial-credits", async (_event, credits) => {
        const mainWindow = deps.getMainWindow();
        if (!mainWindow)
            return;
        try {
            // Set the credits in a way that ensures atomicity
            await mainWindow.webContents.executeJavaScript(`window.__CREDITS__ = ${credits}`);
            mainWindow.webContents.send("credits-updated", credits);
        }
        catch (error) {
            console.error("Error setting initial credits:", error);
            throw error;
        }
    });
    electron_1.ipcMain.handle("decrement-credits", async () => {
        const mainWindow = deps.getMainWindow();
        if (!mainWindow)
            return;
        try {
            const currentCredits = await mainWindow.webContents.executeJavaScript("window.__CREDITS__");
            if (currentCredits > 0) {
                const newCredits = currentCredits - 1;
                await mainWindow.webContents.executeJavaScript(`window.__CREDITS__ = ${newCredits}`);
                mainWindow.webContents.send("credits-updated", newCredits);
            }
        }
        catch (error) {
            console.error("Error decrementing credits:", error);
        }
    });
    // Screenshot queue handlers
    electron_1.ipcMain.handle("get-screenshot-queue", () => {
        return deps.getScreenshotQueue();
    });
    electron_1.ipcMain.handle("get-extra-screenshot-queue", () => {
        return deps.getExtraScreenshotQueue();
    });
    electron_1.ipcMain.handle("delete-screenshot", async (event, path) => {
        return deps.deleteScreenshot(path);
    });
    electron_1.ipcMain.handle("get-image-preview", async (event, path) => {
        return deps.getImagePreview(path);
    });
    // Screenshot processing handlers
    electron_1.ipcMain.handle("process-screenshots", async () => {
        // API key is now built-in, no need to check
        await deps.processingHelper?.processScreenshots();
    });
    // Window dimension handlers
    electron_1.ipcMain.handle("update-content-dimensions", async (event, { width, height }) => {
        if (width && height) {
            deps.setWindowDimensions(width, height);
        }
    });
    electron_1.ipcMain.handle("set-window-dimensions", (event, width, height) => {
        deps.setWindowDimensions(width, height);
    });
    // Screenshot management handlers
    electron_1.ipcMain.handle("get-screenshots", async () => {
        try {
            let previews = [];
            const currentView = deps.getView();
            if (currentView === "queue") {
                const queue = deps.getScreenshotQueue();
                previews = await Promise.all(queue.map(async (path) => ({
                    path,
                    preview: await deps.getImagePreview(path)
                })));
            }
            else {
                const extraQueue = deps.getExtraScreenshotQueue();
                previews = await Promise.all(extraQueue.map(async (path) => ({
                    path,
                    preview: await deps.getImagePreview(path)
                })));
            }
            return previews;
        }
        catch (error) {
            console.error("Error getting screenshots:", error);
            throw error;
        }
    });
    // Screenshot trigger handlers
    electron_1.ipcMain.handle("trigger-screenshot", async () => {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
            try {
                const screenshotPath = await deps.takeScreenshot();
                const preview = await deps.getImagePreview(screenshotPath);
                mainWindow.webContents.send("screenshot-taken", {
                    path: screenshotPath,
                    preview
                });
                return { success: true };
            }
            catch (error) {
                console.error("Error triggering screenshot:", error);
                return { error: "Failed to trigger screenshot" };
            }
        }
        return { error: "No main window available" };
    });
    electron_1.ipcMain.handle("take-screenshot", async () => {
        try {
            const screenshotPath = await deps.takeScreenshot();
            const preview = await deps.getImagePreview(screenshotPath);
            return { path: screenshotPath, preview };
        }
        catch (error) {
            console.error("Error taking screenshot:", error);
            return { error: "Failed to take screenshot" };
        }
    });
    // Web Authentication handlers
    electron_1.ipcMain.handle("web-auth-login", async () => {
        try {
            const success = await SimpleAuthManager_1.simpleAuthManager.login();
            return { success };
        }
        catch (error) {
            console.error("Failed to open web login:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("web-auth-logout", async () => {
        try {
            await SimpleAuthManager_1.simpleAuthManager.logout();
            return { success: true };
        }
        catch (error) {
            console.error("Failed to logout:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("web-auth-status", async () => {
        try {
            const isAuthenticated = await SimpleAuthManager_1.simpleAuthManager.isAuthenticated();
            const user = SimpleAuthManager_1.simpleAuthManager.getCurrentUser();
            return {
                authenticated: isAuthenticated,
                user: user
            };
        }
        catch (error) {
            console.error("Failed to check auth status:", error);
            return {
                authenticated: false,
                user: null,
                error: error.message
            };
        }
    });
    electron_1.ipcMain.handle("web-sync-config", async () => {
        try {
            const config = await SimpleAuthManager_1.simpleAuthManager.refreshUserConfig();
            return { success: true, config: config };
        }
        catch (error) {
            console.error("Failed to sync config:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("web-update-config", async (_event, configUpdates) => {
        try {
            // 简化版：不支持更新Web配置，只返回当前配置
            const config = SimpleAuthManager_1.simpleAuthManager.getUserConfig();
            return { success: true, config: config };
        }
        catch (error) {
            console.error("Failed to update web config:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("web-get-ai-models", async () => {
        try {
            // 简化版：返回固定的AI模型列表
            const models = [
                'claude-3-5-sonnet-20241022',
                'gpt-4o',
                'gemini-2.0-flash'
            ];
            return { success: true, models: models };
        }
        catch (error) {
            console.error("Failed to get AI models:", error);
            return { success: false, error: error.message, models: [] };
        }
    });
    electron_1.ipcMain.handle("web-get-languages", async () => {
        try {
            // 简化版：返回固定的语言列表
            const languages = ['python', 'javascript', 'java', 'cpp', 'go', 'rust'];
            return { success: true, languages: languages };
        }
        catch (error) {
            console.error("Failed to get languages:", error);
            return { success: false, error: error.message, languages: [] };
        }
    });
    // Handle notification actions
    electron_1.ipcMain.handle("handle-notification-action", async (_event, action) => {
        try {
            console.log("Handling notification action:", action);
            switch (action) {
                case 'open-web-login':
                    const success = await SimpleAuthManager_1.simpleAuthManager.login();
                    return { success };
                case 'open-startup-guide':
                    // Open startup guide or documentation
                    await electron_1.shell.openExternal('https://github.com/your-repo/startup-guide');
                    return { success: true };
                default:
                    console.log("Unknown notification action:", action);
                    return { success: false, error: "Unknown action" };
            }
        }
        catch (error) {
            console.error("Failed to handle notification action:", error);
            return { success: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("web-check-connection", async () => {
        try {
            // 简化版：检查认证状态作为连接状态
            const connected = await SimpleAuthManager_1.simpleAuthManager.isAuthenticated();
            return { connected: connected };
        }
        catch (error) {
            console.error("Failed to check web connection:", error);
            return { connected: false, error: error.message };
        }
    });
    electron_1.ipcMain.handle("open-external-url", (event, url) => {
        electron_1.shell.openExternal(url);
    });
    // Open external URL handler
    electron_1.ipcMain.handle("openLink", (event, url) => {
        try {
            console.log(`Opening external URL: ${url}`);
            electron_1.shell.openExternal(url);
            return { success: true };
        }
        catch (error) {
            console.error(`Error opening URL ${url}:`, error);
            return { success: false, error: `Failed to open URL: ${error}` };
        }
    });
    // Settings portal handler
    electron_1.ipcMain.handle("open-settings-portal", () => {
        const mainWindow = deps.getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send("show-settings-dialog");
            return { success: true };
        }
        return { success: false, error: "Main window not available" };
    });
    // Window management handlers
    electron_1.ipcMain.handle("toggle-window", () => {
        try {
            deps.toggleMainWindow();
            return { success: true };
        }
        catch (error) {
            console.error("Error toggling window:", error);
            return { error: "Failed to toggle window" };
        }
    });
    electron_1.ipcMain.handle("reset-queues", async () => {
        try {
            deps.clearQueues();
            return { success: true };
        }
        catch (error) {
            console.error("Error resetting queues:", error);
            return { error: "Failed to reset queues" };
        }
    });
    // Process screenshot handlers
    electron_1.ipcMain.handle("trigger-process-screenshots", async () => {
        try {
            // API key is now built-in, no need to check
            await deps.processingHelper?.processScreenshots();
            return { success: true };
        }
        catch (error) {
            console.error("Error processing screenshots:", error);
            return { error: "Failed to process screenshots" };
        }
    });
    // Reset handlers
    electron_1.ipcMain.handle("trigger-reset", () => {
        try {
            // First cancel any ongoing requests
            deps.processingHelper?.cancelOngoingRequests();
            // Clear all queues immediately
            deps.clearQueues();
            // Reset view to queue
            deps.setView("queue");
            // Get main window and send reset events
            const mainWindow = deps.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                // Send reset events in sequence
                mainWindow.webContents.send("reset-view");
                mainWindow.webContents.send("reset");
            }
            return { success: true };
        }
        catch (error) {
            console.error("Error triggering reset:", error);
            return { error: "Failed to trigger reset" };
        }
    });
    // Window movement handlers
    electron_1.ipcMain.handle("trigger-move-left", () => {
        try {
            deps.moveWindowLeft();
            return { success: true };
        }
        catch (error) {
            console.error("Error moving window left:", error);
            return { error: "Failed to move window left" };
        }
    });
    electron_1.ipcMain.handle("trigger-move-right", () => {
        try {
            deps.moveWindowRight();
            return { success: true };
        }
        catch (error) {
            console.error("Error moving window right:", error);
            return { error: "Failed to move window right" };
        }
    });
    electron_1.ipcMain.handle("trigger-move-up", () => {
        try {
            deps.moveWindowUp();
            return { success: true };
        }
        catch (error) {
            console.error("Error moving window up:", error);
            return { error: "Failed to move window up" };
        }
    });
    electron_1.ipcMain.handle("trigger-move-down", () => {
        try {
            deps.moveWindowDown();
            return { success: true };
        }
        catch (error) {
            console.error("Error moving window down:", error);
            return { error: "Failed to move window down" };
        }
    });
    // Delete last screenshot handler
    electron_1.ipcMain.handle("delete-last-screenshot", async () => {
        try {
            const queue = deps.getView() === "queue"
                ? deps.getScreenshotQueue()
                : deps.getExtraScreenshotQueue();
            if (queue.length === 0) {
                return { success: false, error: "No screenshots to delete" };
            }
            // Get the last screenshot in the queue
            const lastScreenshot = queue[queue.length - 1];
            // Delete it
            const result = await deps.deleteScreenshot(lastScreenshot);
            // Notify the renderer about the change
            const mainWindow = deps.getMainWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("screenshot-deleted", { path: lastScreenshot });
            }
            return result;
        }
        catch (error) {
            console.error("Error deleting last screenshot:", error);
            return { success: false, error: "Failed to delete last screenshot" };
        }
    });
    // 处理显示设置对话框的请求
    electron_1.ipcMain.on("show-settings-dialog", () => {
        const mainWindow = deps.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("show-settings-dialog");
        }
    });
}
