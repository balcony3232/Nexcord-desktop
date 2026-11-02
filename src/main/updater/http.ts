/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { createHash } from "crypto";
import { copyFileSync, writeFileSync } from "original-fs";

import gitHash from "~git-hash";
import gitRemote from "~git-remote";

import { Updater } from ".";
import { ASAR_FILE } from "./common";

const API_BASE = `https://api.github.com/repos/${gitRemote}`;
let PendingUpdate: { url: string; digest: string; hash: string; } | null = null;

async function githubGet<T = any>(endpoint: string) {
    return fetchJson<T>(API_BASE + endpoint, {
        headers: {
            Accept: "application/vnd.github+json",
            // "All API requests MUST include a valid User-Agent header.
            // Requests with no User-Agent header will be rejected."
            "User-Agent": VENCORD_USER_AGENT
        }
    });
}

async function listUpdates() {
    const outdated = await fetchUpdate();
    if (!outdated || !PendingUpdate) return [];
    const remoteHash = PendingUpdate.hash;
    try {
        const data = await githubGet(`/compare/${gitHash}...${remoteHash}`);
        return data.commits.map((c: any) => ({
            hash: c.sha,
            author: c.author?.login ?? c.commit?.author?.name ?? "Unknown Author",
            message: c.commit.message.split("\n")[0]
        }));
    } catch {
        return [{ hash: remoteHash, author: "Nexcord", message: "New Nexcord development preview" }];
    }
}

async function fetchUpdate() {
    // Nexcord early builds are pre-releases, not GitHub's /releases/latest.
    const data = await githubGet("/releases/tags/nexcord-dev");
    const hash = String(data.name).slice(String(data.name).lastIndexOf(" ") + 1);
    if (!/^[0-9a-f]{12,40}$/i.test(hash)) throw new Error("Invalid Nexcord release revision");
    if (gitHash.startsWith(hash)) {
        PendingUpdate = null;
        return false;
    }
    const asset = data.assets.find((a: any) => a.name === ASAR_FILE);
    if (!asset || typeof asset.browser_download_url !== "string"
        || !/^sha256:[0-9a-f]{64}$/i.test(asset.digest ?? "")) {
        throw new Error("Nexcord preview has no verified desktop asset");
    }
    PendingUpdate = { url: asset.browser_download_url, digest: asset.digest, hash };
    return true;
}

async function applyUpdate() {
    if (!PendingUpdate) return true;
    const update = PendingUpdate;
    const data = await fetchBuffer(update.url);
    const digest = "sha256:" + createHash("sha256").update(data).digest("hex");
    if (digest.toLowerCase() !== update.digest.toLowerCase()) {
        throw new Error("Downloaded Nexcord update failed SHA-256 verification");
    }

    // original-fs bypasses Electron's ASAR filesystem interception.
    // In this standalone desktop bundle, __dirname is the .asar archive path.
    // Save a recovery copy before overwriting it, as upstream's updater does.
    copyFileSync(__dirname, __dirname + ".previous");
    try {
        writeFileSync(__dirname, data, { flush: true });
    } catch (error) {
        try { copyFileSync(__dirname + ".previous", __dirname); } catch { /* Keep the backup for the installer. */ }
        throw error;
    }
    PendingUpdate = null;
    return true;
}

const HttpUpdater: Updater = {
    getRepo: async () => `https://github.com/${gitRemote}`,
    listUpdates,
    fetchUpdate,
    applyUpdate
};

export default HttpUpdater;
