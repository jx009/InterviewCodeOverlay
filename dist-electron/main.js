"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.state = void 0;
exports.createWindow = createWindow;
exports.hideMainWindow = hideMainWindow;
exports.showMainWindow = showMainWindow;
exports.toggleMainWindow = toggleMainWindow;
exports.setWindowDimensions = setWindowDimensions;
exports.moveWindowHorizontal = moveWindowHorizontal;
exports.moveWindowVertical = moveWindowVertical;
exports.getMainWindow = getMainWindow;
exports.getView = getView;
exports.setView = setView;
exports.getScreenshotHelper = getScreenshotHelper;
exports.getProblemInfo = getProblemInfo;
exports.setProblemInfo = setProblemInfo;
exports.getScreenshotQueue = getScreenshotQueue;
exports.getExtraScreenshotQueue = getExtraScreenshotQueue;
exports.clearQueues = clearQueues;
exports.takeScreenshot = takeScreenshot;
exports.getImagePreview = getImagePreview;
exports.deleteScreenshot = deleteScreenshot;
exports.setHasDebugged = setHasDebugged;
exports.getHasDebugged = getHasDebugged;
exports.isVisible = isVisible;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ipcHandlers_1 = require("./ipcHandlers");
const ProcessingHelper_1 = require("./ProcessingHelper");
const ScreenshotHelper_1 = require("./ScreenshotHelper");
const shortcuts_1 = require("./shortcuts");
const autoUpdater_1 = require("./autoUpdater");
const ConfigHelper_1 = require("./ConfigHelper");
const dotenv = __importStar(require("dotenv"));
// Constants
const isDev = process.env.NODE_ENV === "development";
// Application State
const state = {
    // Window management properties
    mainWindow: null,
    isWindowVisible: false,
    windowPosition: null,
    windowSize: null,
    screenWidth: 0,
    screenHeight: 0,
    step: 0,
    currentX: 0,
    currentY: 0,
    // Application helpers
    screenshotHelper: null,
    shortcutsHelper: null,
    processingHelper: null,
    // View and state management
    view: "queue",
    problemInfo: null,
    hasDebugged: false,
    // Processing events
    PROCESSING_EVENTS: {
        UNAUTHORIZED: "processing-unauthorized",
        NO_SCREENSHOTS: "processing-no-screenshots",
        OUT_OF_CREDITS: "out-of-credits",
        API_KEY_INVALID: "api-key-invalid",
        INITIAL_START: "initial-start",
        PROBLEM_EXTRACTED: "problem-extracted",
        SOLUTION_SUCCESS: "solution-success",
        INITIAL_SOLUTION_ERROR: "solution-error",
        DEBUG_START: "debug-start",
        DEBUG_SUCCESS: "debug-success",
        DEBUG_ERROR: "debug-error"
    }
};
exports.state = state;
// Initialize helpers
function initializeHelpers() {
    state.screenshotHelper = new ScreenshotHelper_1.ScreenshotHelper(state.view);
    state.processingHelper = new ProcessingHelper_1.ProcessingHelper({
        getScreenshotHelper,
        getMainWindow,
        getView,
        setView,
        getProblemInfo,
        setProblemInfo,
        getScreenshotQueue,
        getExtraScreenshotQueue,
        clearQueues,
        takeScreenshot,
        getImagePreview,
        deleteScreenshot,
        setHasDebugged,
        getHasDebugged,
        PROCESSING_EVENTS: state.PROCESSING_EVENTS
    });
    state.shortcutsHelper = new shortcuts_1.ShortcutsHelper({
        getMainWindow,
        takeScreenshot,
        getImagePreview,
        processingHelper: state.processingHelper,
        clearQueues,
        setView,
        isVisible: () => state.isWindowVisible,
        toggleMainWindow,
        moveWindowLeft: () => moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
        moveWindowRight: () => moveWindowHorizontal((x) => Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)),
        moveWindowUp: () => moveWindowVertical((y) => y - state.step),
        moveWindowDown: () => moveWindowVertical((y) => y + state.step)
    });
}
// Auth callback handler
// Register the interview-coder protocol
if (process.platform === "darwin") {
    electron_1.app.setAsDefaultProtocolClient("interview-coder");
}
else {
    electron_1.app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
        path_1.default.resolve(process.argv[1] || "")
    ]);
}
// Handle the protocol. In this case, we choose to show an Error Box.
if (process.defaultApp && process.argv.length >= 2) {
    electron_1.app.setAsDefaultProtocolClient("interview-coder", process.execPath, [
        path_1.default.resolve(process.argv[1])
    ]);
}
// Force Single Instance Lock
const gotTheLock = electron_1.app.requestSingleInstanceLock();
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("second-instance", (event, commandLine) => {
        // Someone tried to run a second instance, we should focus our window.
        if (state.mainWindow) {
            if (state.mainWindow.isMinimized())
                state.mainWindow.restore();
            state.mainWindow.focus();
            // Protocol handler removed - no longer using auth callbacks
        }
    });
}
// Auth callback removed as we no longer use Supabase authentication
// Window management functions
async function createWindow() {
    if (state.mainWindow) {
        if (state.mainWindow.isMinimized())
            state.mainWindow.restore();
        state.mainWindow.focus();
        return;
    }
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    state.screenWidth = workArea.width;
    state.screenHeight = workArea.height;
    state.step = 60;
    state.currentY = 50;
    const windowSettings = {
        width: 800,
        height: 600,
        minWidth: 750,
        minHeight: 550,
        x: state.currentX,
        y: 50,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: isDev
                ? path_1.default.join(__dirname, "../dist-electron/preload.js")
                : path_1.default.join(__dirname, "preload.js"),
            scrollBounce: true
        },
        show: true,
        frame: false,
        transparent: true,
        fullscreenable: false,
        hasShadow: false,
        opacity: 1.0, // Start with full opacity
        backgroundColor: "#00000000",
        focusable: true,
        skipTaskbar: true,
        type: "panel",
        paintWhenInitiallyHidden: true,
        titleBarStyle: "hidden",
        enableLargerThanScreen: true,
        movable: true
    };
    state.mainWindow = new electron_1.BrowserWindow(windowSettings);
    // Add more detailed logging for window events
    state.mainWindow.webContents.on("did-finish-load", () => {
        console.log("Window finished loading");
    });
    state.mainWindow.webContents.on("did-fail-load", async (event, errorCode, errorDescription) => {
        console.error("Window failed to load:", errorCode, errorDescription);
        if (isDev) {
            // In development, retry loading after a short delay
            console.log("Retrying to load development server...");
            setTimeout(() => {
                state.mainWindow?.loadURL("http://localhost:54321").catch((error) => {
                    console.error("Failed to load dev server on retry:", error);
                });
            }, 1000);
        }
    });
    if (isDev) {
        // In development, load from the dev server
        console.log("Loading from development server: http://localhost:54321");
        state.mainWindow.loadURL("http://localhost:54321").catch((error) => {
            console.error("Failed to load dev server, falling back to local file:", error);
            // Fallback to local file if dev server is not available
            const indexPath = path_1.default.join(__dirname, "../dist/index.html");
            console.log("Falling back to:", indexPath);
            if (fs_1.default.existsSync(indexPath)) {
                state.mainWindow.loadFile(indexPath);
            }
            else {
                console.error("Could not find index.html in dist folder");
            }
        });
    }
    else {
        // In production, load from the built files
        const indexPath = path_1.default.join(__dirname, "../dist/index.html");
        console.log("Loading production build:", indexPath);
        if (fs_1.default.existsSync(indexPath)) {
            state.mainWindow.loadFile(indexPath);
        }
        else {
            console.error("Could not find index.html in dist folder");
        }
    }
    // Configure window behavior
    state.mainWindow.webContents.setZoomFactor(1);
    if (isDev) {
        state.mainWindow.webContents.openDevTools();
    }
    state.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        console.log("Attempting to open URL:", url);
        try {
            const parsedURL = new URL(url);
            const hostname = parsedURL.hostname;
            const allowedHosts = ["google.com", "supabase.co"];
            if (allowedHosts.includes(hostname) || hostname.endsWith(".google.com") || hostname.endsWith(".supabase.co")) {
                electron_1.shell.openExternal(url);
                return { action: "deny" }; // Do not open this URL in a new Electron window
            }
        }
        catch (error) {
            console.error("Invalid URL %d in setWindowOpenHandler: %d", url, error);
            return { action: "deny" }; // Deny access as URL string is malformed or invalid
        }
        return { action: "allow" };
    });
    // Enhanced screen capture resistance
    state.mainWindow.setContentProtection(true);
    state.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
    });
    state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    // Additional screen capture resistance settings
    if (process.platform === "darwin") {
        // Prevent window from being captured in screenshots
        state.mainWindow.setHiddenInMissionControl(true);
        state.mainWindow.setWindowButtonVisibility(false);
        state.mainWindow.setBackgroundColor("#00000000");
        // Prevent window from being included in window switcher
        state.mainWindow.setSkipTaskbar(true);
        // Disable window shadow
        state.mainWindow.setHasShadow(false);
    }
    // Prevent the window from being captured by screen recording
    state.mainWindow.webContents.setBackgroundThrottling(false);
    state.mainWindow.webContents.setFrameRate(60);
    // Set up window listeners
    state.mainWindow.on("move", handleWindowMove);
    state.mainWindow.on("resize", handleWindowResize);
    state.mainWindow.on("closed", handleWindowClosed);
    // Initialize window state
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.windowSize = { width: bounds.width, height: bounds.height };
    state.currentX = bounds.x;
    state.currentY = bounds.y;
    state.isWindowVisible = true;
    // Set initial window state
    const savedOpacity = ConfigHelper_1.configHelper.getOpacity();
    console.log(`Initial opacity from config: ${savedOpacity}`);
    // Force window to be visible initially and then set proper state
    state.mainWindow.show(); // Use show() instead of showInactive()
    state.mainWindow.focus(); // Ensure window has focus
    if (savedOpacity <= 0.1) {
        console.log('Initial opacity too low, will hide after showing');
        // Show window first, then hide it
        setTimeout(() => {
            if (state.mainWindow && !state.mainWindow.isDestroyed()) {
                hideMainWindow();
            }
        }, 100);
    }
    else {
        console.log(`Setting initial opacity to ${savedOpacity}`);
        state.mainWindow.setOpacity(savedOpacity);
        state.isWindowVisible = true;
    }
    // Ensure window is always on top and visible on all workspaces
    state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    state.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
    });
    console.log(`Window created and shown. Visible: ${state.isWindowVisible}, Position: (${state.currentX}, ${state.currentY})`);
}
function handleWindowMove() {
    if (!state.mainWindow)
        return;
    const bounds = state.mainWindow.getBounds();
    state.windowPosition = { x: bounds.x, y: bounds.y };
    state.currentX = bounds.x;
    state.currentY = bounds.y;
}
function handleWindowResize() {
    if (!state.mainWindow)
        return;
    const bounds = state.mainWindow.getBounds();
    state.windowSize = { width: bounds.width, height: bounds.height };
}
function handleWindowClosed() {
    state.mainWindow = null;
    state.isWindowVisible = false;
    state.windowPosition = null;
    state.windowSize = null;
}
// Window visibility functions
function hideMainWindow() {
    if (!state.mainWindow?.isDestroyed()) {
        const bounds = state.mainWindow.getBounds();
        state.windowPosition = { x: bounds.x, y: bounds.y };
        state.windowSize = { width: bounds.width, height: bounds.height };
        state.mainWindow.setIgnoreMouseEvents(true, { forward: true });
        state.mainWindow.setOpacity(0);
        state.isWindowVisible = false;
        console.log('Window hidden, opacity set to 0');
    }
}
function showMainWindow() {
    if (!state.mainWindow?.isDestroyed()) {
        if (state.windowPosition && state.windowSize) {
            state.mainWindow.setBounds({
                ...state.windowPosition,
                ...state.windowSize
            });
        }
        state.mainWindow.setIgnoreMouseEvents(false);
        state.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
        state.mainWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true
        });
        state.mainWindow.setContentProtection(true);
        state.mainWindow.setOpacity(0); // Set opacity to 0 before showing
        state.mainWindow.showInactive(); // Use showInactive instead of show+focus
        state.mainWindow.setOpacity(1); // Then set opacity to 1 after showing
        state.isWindowVisible = true;
        console.log('Window shown with showInactive(), opacity set to 1');
    }
}
function toggleMainWindow() {
    console.log(`Toggling window. Current state: ${state.isWindowVisible ? 'visible' : 'hidden'}`);
    if (state.isWindowVisible) {
        hideMainWindow();
    }
    else {
        showMainWindow();
    }
}
// Window movement functions
function moveWindowHorizontal(updateFn) {
    if (!state.mainWindow)
        return;
    state.currentX = updateFn(state.currentX);
    state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
}
function moveWindowVertical(updateFn) {
    if (!state.mainWindow)
        return;
    const newY = updateFn(state.currentY);
    // Allow window to go 2/3 off screen in either direction
    const maxUpLimit = (-(state.windowSize?.height || 0) * 2) / 3;
    const maxDownLimit = state.screenHeight + ((state.windowSize?.height || 0) * 2) / 3;
    // Log the current state and limits
    console.log({
        newY,
        maxUpLimit,
        maxDownLimit,
        screenHeight: state.screenHeight,
        windowHeight: state.windowSize?.height,
        currentY: state.currentY
    });
    // Only update if within bounds
    if (newY >= maxUpLimit && newY <= maxDownLimit) {
        state.currentY = newY;
        state.mainWindow.setPosition(Math.round(state.currentX), Math.round(state.currentY));
    }
}
// Window dimension functions
function setWindowDimensions(width, height) {
    if (!state.mainWindow?.isDestroyed()) {
        const [currentX, currentY] = state.mainWindow.getPosition();
        const primaryDisplay = electron_1.screen.getPrimaryDisplay();
        const workArea = primaryDisplay.workAreaSize;
        const maxWidth = Math.floor(workArea.width * 0.5);
        state.mainWindow.setBounds({
            x: Math.min(currentX, workArea.width - maxWidth),
            y: currentY,
            width: Math.min(width + 32, maxWidth),
            height: Math.ceil(height)
        });
    }
}
// Environment setup
function loadEnvVariables() {
    if (isDev) {
        console.log("Loading env variables from:", path_1.default.join(process.cwd(), ".env"));
        dotenv.config({ path: path_1.default.join(process.cwd(), ".env") });
    }
    else {
        console.log("Loading env variables from:", path_1.default.join(process.resourcesPath, ".env"));
        dotenv.config({ path: path_1.default.join(process.resourcesPath, ".env") });
    }
    console.log("Environment variables loaded for open-source version");
}
// Initialize application
async function initializeApp() {
    try {
        // Set custom cache directory to prevent permission issues
        const appDataPath = path_1.default.join(electron_1.app.getPath('appData'), 'interview-coder-v1');
        const sessionPath = path_1.default.join(appDataPath, 'session');
        const tempPath = path_1.default.join(appDataPath, 'temp');
        const cachePath = path_1.default.join(appDataPath, 'cache');
        // Create directories if they don't exist
        for (const dir of [appDataPath, sessionPath, tempPath, cachePath]) {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
            }
        }
        electron_1.app.setPath('userData', appDataPath);
        electron_1.app.setPath('sessionData', sessionPath);
        electron_1.app.setPath('temp', tempPath);
        electron_1.app.setPath('cache', cachePath);
        loadEnvVariables();
        // Configuration file setup (API key is now built-in)
        console.log("Using built-in API configuration.");
        initializeHelpers();
        (0, ipcHandlers_1.initializeIpcHandlers)({
            getMainWindow,
            setWindowDimensions,
            getScreenshotQueue,
            getExtraScreenshotQueue,
            deleteScreenshot,
            getImagePreview,
            processingHelper: state.processingHelper,
            PROCESSING_EVENTS: state.PROCESSING_EVENTS,
            takeScreenshot,
            getView,
            toggleMainWindow,
            clearQueues,
            setView,
            moveWindowLeft: () => moveWindowHorizontal((x) => Math.max(-(state.windowSize?.width || 0) / 2, x - state.step)),
            moveWindowRight: () => moveWindowHorizontal((x) => Math.min(state.screenWidth - (state.windowSize?.width || 0) / 2, x + state.step)),
            moveWindowUp: () => moveWindowVertical((y) => y - state.step),
            moveWindowDown: () => moveWindowVertical((y) => y + state.step)
        });
        await createWindow();
        state.shortcutsHelper?.registerGlobalShortcuts();
        // Initialize auto-updater regardless of environment
        (0, autoUpdater_1.initAutoUpdater)();
        console.log("Auto-updater initialized in", isDev ? "development" : "production", "mode");
    }
    catch (error) {
        console.error("Failed to initialize application:", error);
        electron_1.app.quit();
    }
}
// Auth callback handling removed - no longer needed
electron_1.app.on("open-url", (event, url) => {
    console.log("open-url event received:", url);
    event.preventDefault();
});
// Handle second instance (removed auth callback handling)
electron_1.app.on("second-instance", (event, commandLine) => {
    console.log("second-instance event received:", commandLine);
    // Focus or create the main window
    if (!state.mainWindow) {
        createWindow();
    }
    else {
        if (state.mainWindow.isMinimized())
            state.mainWindow.restore();
        state.mainWindow.focus();
    }
});
// Prevent multiple instances of the app
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("window-all-closed", () => {
        if (process.platform !== "darwin") {
            electron_1.app.quit();
            state.mainWindow = null;
        }
    });
}
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// State getter/setter functions
function getMainWindow() {
    return state.mainWindow;
}
function getView() {
    return state.view;
}
function setView(view) {
    state.view = view;
    state.screenshotHelper?.setView(view);
}
function getScreenshotHelper() {
    return state.screenshotHelper;
}
function getProblemInfo() {
    return state.problemInfo;
}
function setProblemInfo(problemInfo) {
    state.problemInfo = problemInfo;
}
function getScreenshotQueue() {
    return state.screenshotHelper?.getScreenshotQueue() || [];
}
function getExtraScreenshotQueue() {
    return state.screenshotHelper?.getExtraScreenshotQueue() || [];
}
function clearQueues() {
    state.screenshotHelper?.clearQueues();
    state.problemInfo = null;
    setView("queue");
}
async function takeScreenshot() {
    if (!state.mainWindow)
        throw new Error("No main window available");
    return (state.screenshotHelper?.takeScreenshot(() => hideMainWindow(), () => showMainWindow()) || "");
}
async function getImagePreview(filepath) {
    return state.screenshotHelper?.getImagePreview(filepath) || "";
}
async function deleteScreenshot(path) {
    return (state.screenshotHelper?.deleteScreenshot(path) || {
        success: false,
        error: "Screenshot helper not initialized"
    });
}
function setHasDebugged(value) {
    state.hasDebugged = value;
}
function getHasDebugged() {
    return state.hasDebugged;
}
function isVisible() {
    return state.isWindowVisible;
}
electron_1.app.whenReady().then(initializeApp);
