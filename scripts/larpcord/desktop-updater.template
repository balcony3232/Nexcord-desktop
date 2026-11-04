/*
 * Larpcord Windows native updater, GPL-3.0-or-later.
 * Replaces Equibop's auto-updater so this standalone fork never polls
 * or installs updates published by another project.
 */
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { IpcEvents } from "shared/IpcEvents";

const REPO = "https://github.com/balcony3232/Nexcord-desktop";
const CHECK = "LARPCORD_UPDATE_CHECK";
const INSTALL = "LARPCORD_UPDATE_INSTALL";
const PROGRESS = "LARPCORD_UPDATE_PROGRESS";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowPrerelease = true; // v0.x builds are GitHub prereleases.
autoUpdater.allowDowngrade = false; // Never install a lower version.

let availableVersion: string | null = null;
let checking: Promise<UpdateState> | null = null;
let installing = false;

type UpdateState = {
    currentVersion: string;
    latestVersion: string;
    available: boolean;
    releaseUrl: string;
};

function requireWindowsBuild() {
    if (process.platform !== "win32" || !app.isPackaged) {
        throw new Error("The Larpcord updater is available in the installed Windows app only.");
    }
}

function emitProgress(percent: number) {
    const value = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
    for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
            window.webContents.send(PROGRESS, value);
        }
    }
}

autoUpdater.on("download-progress", progress => emitProgress(progress.percent));

// The legacy buttons are not used for Larpcord; prevent upstream popups.
ipcMain.handle(IpcEvents.UPDATER_IS_OUTDATED, () => false);
ipcMain.handle(IpcEvents.UPDATER_OPEN, () => false);

ipcMain.handle(CHECK, async (): Promise<UpdateState> => {
    requireWindowsBuild();
    if (installing) throw new Error("An update is already being installed.");
    if (checking) return checking;

    checking = (async () => {
        // app-update.yml is embedded at packaging time and points at our
        // own GitHub publisher. Never use the upstream Equibop update feed.
        const result = await autoUpdater.checkForUpdates();
        const latestVersion = result?.updateInfo?.version ?? app.getVersion();
        const available = Boolean(result?.isUpdateAvailable) && latestVersion !== app.getVersion();
        availableVersion = available ? latestVersion : null;
        return {
            currentVersion: app.getVersion(),
            latestVersion,
            available,
            releaseUrl: REPO + "/releases"
        };
    })();

    try {
        return await checking;
    } finally {
        checking = null;
    }
});

ipcMain.handle(INSTALL, async () => {
    requireWindowsBuild();
    if (checking) throw new Error("Finish checking for updates first.");
    if (installing) throw new Error("An update is already being installed.");
    if (!availableVersion) throw new Error("Check for updates before installing.");

    const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: ["Cancel", "Download and install"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
        title: "Update Larpcord",
        message: `Install Larpcord v${availableVersion}?`,
        detail: "Larpcord will download and verify the installer from the project's GitHub release, then close to install. This preview build is unsigned. Save any unsent messages before continuing."
    });
    if (response !== 1) return { started: false };

    installing = true;
    try {
        // Electron-updater validates the hashes in latest.yml and chooses
        // the matching NSIS installer. It does not execute arbitrary URLs.
        await autoUpdater.downloadUpdate();
        autoUpdater.quitAndInstall(false, true);
        return { started: true };
    } catch (error) {
        installing = false;
        throw error;
    }
});
