/*
 * Larpcord local avatar decoration thumbnail in the original profile-editor
 * decoration tile. Purely cosmetic, never patches entitlements or profile data.
 * SPDX-License-Identifier: GPL-3.0-or-later.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";

import { getShopSelection, subscribeShop } from "./ShopCatalog";

const logger = new Logger("LarpcordDecorationTile");
type Mount = { tile: HTMLElement; host: HTMLElement; root: Root; originalPosition: string; };
let mounted: Mount | undefined;

function findDecorationTile(heading: HTMLElement, rail: HTMLElement) {
    const header = heading.getBoundingClientRect();
    const area = rail.getBoundingClientRect();
    let best: HTMLElement | undefined;
    let score = Number.POSITIVE_INFINITY;
    for (const el of rail.querySelectorAll<HTMLElement>("button,[role='button'],div")) {
        if (el.contains(heading) || el.closest("[data-larpcord-local-decoration]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 65 || r.width > 165 || r.height < 65 || r.height > 170) continue;
        if (r.top < header.bottom + 4 || r.top > header.bottom + 180) continue;
        if (r.left < area.left + 3 || r.right > area.right + 4) continue;
        const candidate = (r.top - header.bottom) * 3 + (r.left - area.left) + Math.abs(r.width - 100);
        if (candidate < score) {score = candidate;best = el;}
    }
    return best;
}
function LocalDecorationPreview({ userId }: { userId: string; }) {
    const [, rerender] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => subscribeShop(rerender), []);
    const decoration = getShopSelection(userId, "decoration");
    const thumbnail = decoration?.previewUrl ?? decoration?.animatedPreviewUrl;
    if (!thumbnail) return null;
    return (
        <span className="larpcord-local-decoration-preview" aria-hidden="true" title={decoration?.name}>
            <img src={thumbnail} loading="lazy" draggable={false} alt="" />
            <small>LOCAL PREVIEW</small>
        </span>
    );
}
export function scanNativeDecorationTile(heading: HTMLElement, rail: HTMLElement, userId: string) {
    const tile = findDecorationTile(heading, rail);
    if (mounted?.tile === tile && mounted.host.isConnected) return;
    stopNativeDecorationTile();
    if (!tile) return;
    const oldPosition = tile.style.position;
    if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
    const host = document.createElement("span");
    host.dataset.larpcordLocalDecoration = "true";
    host.className = "larpcord-decoration-tile-host";
    tile.appendChild(host);
    try {
        const root = createRoot(host);
        mounted = { tile, host, root, originalPosition: oldPosition };
        root.render(<LocalDecorationPreview userId={userId} />);
    } catch (error) {
        logger.warn("Couldn't mount local decoration preview", error);
        host.remove();
        tile.style.position = oldPosition;
    }
}
export function stopNativeDecorationTile() {
    if (!mounted) return;
    const last = mounted;
    mounted = undefined;
    queueMicrotask(() => {
        last.root.unmount();
        last.host.remove();
        if (last.tile.style.position === "relative") last.tile.style.position = last.originalPosition;
    });
}
