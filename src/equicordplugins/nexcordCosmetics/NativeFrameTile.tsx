/*
 * Frame artwork within the existing right-side native Profile Editor tile.
 * Pure visual layer: never consumes native tile clicks or changes purchases.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Logger } from "@utils/Logger";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";
import { getShopSelection, subscribeShop } from "./ShopCatalog";

const logger = new Logger("LarpcordFrameTile");
type Mount = { tile: HTMLElement; host: HTMLElement; root: Root; originalPosition: string };
let active: Mount | undefined;

function findFrameTile(heading: HTMLElement, rail: HTMLElement): HTMLElement | undefined {
    const headingRect = heading.getBoundingClientRect();
    const bounds = rail.getBoundingClientRect();
    const options: { node: HTMLElement; rect: DOMRect }[] = [];
    for (const node of rail.querySelectorAll<HTMLElement>("button,[role=button],div")) {
        if (node.contains(heading) || node.closest("[data-larpcord-frame-tile]")) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width < 62 || rect.width > 150 || rect.height < 62 || rect.height > 150) continue;
        if (rect.top < headingRect.bottom + 6 || rect.top > headingRect.bottom + 175) continue;
        if (rect.left < bounds.left + 3 || rect.right > bounds.right + 4) continue;
        options.push({ node, rect });
    }
    // Current Discord editor has two side-by-side slots. Prefer the right-most
    // slot of the first row, not the effect tile on the left or unrelated tiles.
    if (options.length < 2) return;
    const firstRow = Math.min(...options.map(option => option.rect.top));
    const row = options.filter(option => Math.abs(option.rect.top - firstRow) < 18);
    const distinctLeft = [...new Set(row.map(option => Math.round(option.rect.left / 8)))].sort((a,b) => a-b);
    if (distinctLeft.length < 2) return;
    const rightX = distinctLeft[distinctLeft.length-1]*8;
    return row.filter(option => Math.abs(option.rect.left-rightX)<10)
        .sort((a,b) => Math.abs(a.rect.width-95)-Math.abs(b.rect.width-95))[0]?.node;
}

function FrameTileArtwork({ userId }: { userId: string }) {
    const [, update] = React.useReducer((n: number) => n+1,0);
    React.useEffect(() => subscribeShop(update), []);
    const frame = getShopSelection(userId,"frame");
    const src = frame?.previewUrl ?? frame?.animatedPreviewUrl;
    if (!frame || !src) return null;
    return (
        <span className="larpcord-native-frame-tile-preview" aria-hidden="true">
            <img src={src} loading="lazy" draggable={false} alt=""/>
        </span>
    );
}

export function scanNativeFrameTile(heading: HTMLElement, rail: HTMLElement, userId: string) {
    const tile = findFrameTile(heading,rail);
    if (active && active.tile === tile && active.host.isConnected) return;
    stopNativeFrameTile();
    if (!tile) return;
    const originalPosition = tile.style.position;
    if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
    const host = document.createElement("span");
    host.dataset.larpcordFrameTile = "true";
    host.className = "larpcord-frame-tile-host";
    tile.appendChild(host);
    try {
        const root = createRoot(host);
        active = {tile,host,root,originalPosition};
        root.render(<FrameTileArtwork userId={userId}/>);
    } catch (error) {
        logger.warn("Could not mount profile frame preview tile", error);
        host.remove();
        tile.style.position = originalPosition;
    }
}
export function stopNativeFrameTile() {
    if (!active) return;
    const value = active;
    active = undefined;
    queueMicrotask(() => {
        value.root.unmount();
        value.host.remove();
        if (value.tile.style.position === "relative") value.tile.style.position = value.originalPosition;
    });
}
