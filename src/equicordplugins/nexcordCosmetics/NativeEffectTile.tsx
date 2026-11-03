/*
 * Nexcord: show selected local effect in Discord's existing profile-editor
 * "Profile Effect & Frame" tile, without touching native user data or Save.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Logger } from "@utils/Logger";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";

import { getShopSelection, subscribeShop } from "./ShopCatalog";

const logger = new Logger("NexcordEffectTile");
interface Mounted {
    tile: HTMLElement;
    host: HTMLElement;
    root: Root;
    originalPosition: string;
}
let mounted: Mounted | undefined;

function findEffectTile(heading: HTMLElement, rail: HTMLElement): HTMLElement | undefined {
    const header = heading.getBoundingClientRect();
    const bounds = rail.getBoundingClientRect();
    const candidates: Array<{ el: HTMLElement; score: number; }> = [];
    for (const el of rail.querySelectorAll<HTMLElement>("button,div,[role='button']")) {
        const rect = el.getBoundingClientRect();
        if (rect.width < 60 || rect.width > 150 || rect.height < 60 || rect.height > 150) continue;
        if (rect.top < header.bottom + 5 || rect.top > header.bottom + 170) continue;
        if (rect.left < bounds.left + 4 || rect.right > bounds.right + 4) continue;
        if (rect.bottom > bounds.bottom + 8) continue;
        if (el.contains(heading) || el.closest("[data-nexcord-effect-tile]")) continue;
        // Profile Effect is the left of the two native tiles; prefer the one
        // closest to the heading, not the frame tile to its right.
        const score = (rect.top - header.bottom) * 3
            + (rect.left - bounds.left) * 2
            + Math.abs(rect.width - 95)
            + Math.abs(rect.height - 95);
        candidates.push({ el, score });
    }
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0]?.el;
}

function LocalEffectPreview({ userId }: { userId: string; }) {
    const [, refresh] = React.useReducer((x: number) => x + 1, 0);
    React.useEffect(() => subscribeShop(refresh), []);
    const effect = getShopSelection(userId, "effect");
    const thumbnail = effect?.previewUrl ?? effect?.animatedPreviewUrl;
    if (!effect || !thumbnail) return null;
    return (
        <div className="nexcord-local-effect-preview" aria-hidden="true" title={effect.name}>
            <img src={thumbnail} draggable={false} alt="" />
            <span>My Custom</span>
        </div>
    );
}

export function scanNativeEffectTile(heading: HTMLElement, rail: HTMLElement, userId: string) {
    const tile = findEffectTile(heading, rail);
    if (mounted && mounted.tile === tile && mounted.host.isConnected) return;
    stopNativeEffectTile();
    if (!tile) return;

    const originalPosition = tile.style.position;
    if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
    const host = document.createElement("span");
    host.className = "nexcord-effect-tile-host";
    host.dataset.nexcordEffectTile = "true";
    tile.appendChild(host);
    try {
        const root = createRoot(host);
        mounted = { tile, host, root, originalPosition };
        root.render(<LocalEffectPreview userId={userId} />);
    } catch (error) {
        logger.warn("Could not mount selected effect thumbnail", error);
        host.remove();
        tile.style.position = originalPosition;
    }
}
export function stopNativeEffectTile() {
    if (!mounted) return;
    const old = mounted;
    mounted = undefined;
    queueMicrotask(() => {
        old.root.unmount();
        old.host.remove();
        if (old.tile.style.position === "relative") old.tile.style.position = old.originalPosition;
    });
}
