/*
 * The native nameplate tile in Discord's own Profile Editor.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Never mutate a User, UserStore, subscription or purchase. A pointer-events
 * free React layer makes local Shop nameplates immediately visible over the
 * original nameplate preview tile. Removing the plugin restores the tile.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";

import { getShopSelection, subscribeShop } from "./ShopCatalog";
import { getSelectedAsset, subscribe } from "./storage";
import { NameplateArtwork } from "./NameplateArtwork";

const logger = new Logger("NexcordNameplate");
type Mount = {
    root: Root;
    host: HTMLElement;
    tile: HTMLElement;
    oldPosition: string;
};
let current: Mount | undefined;

function findNameplateTile(heading: HTMLElement, rail: HTMLElement): HTMLElement | undefined {
    const title = heading.getBoundingClientRect();
    const railRect = rail.getBoundingClientRect();
    let nextHeadingTop = railRect.bottom;

    const walker = document.createTreeWalker(rail, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.textContent?.trim() !== "Avatar & Decoration") continue;
        const rect = node.parentElement?.getBoundingClientRect();
        if (rect && rect.top > title.bottom) nextHeadingTop = Math.min(nextHeadingTop, rect.top);
    }

    let best: HTMLElement | undefined;
    let bestScore = -Infinity;
    for (const tile of rail.querySelectorAll<HTMLElement>("div,button,[role='button']")) {
        if (tile.closest("[data-nexcord-nameplate-host]")) continue;
        const rect = tile.getBoundingClientRect();
        if (rect.width < 110 || rect.width > railRect.width - 6) continue;
        if (rect.height < 30 || rect.height > 85) continue;
        if (rect.top < title.bottom + 3 || rect.bottom > nextHeadingTop - 3) continue;
        if (rect.left < railRect.left + 2 || rect.right > railRect.right + 3) continue;
        if (tile.contains(heading)) continue;
        // Prioritise the wide, ~44px-tall nameplate tile immediately beneath
        // its label, never its grandchildren or the entire editor sidebar.
        const score = -Math.abs(rect.width - (railRect.width - 30)) * 2
            - Math.abs(rect.height - 44)
            - (rect.top - title.bottom) * 1.5;
        if (score > bestScore) {
            best = tile;
            bestScore = score;
        }
    }
    return best;
}

function SelectedNameplate({ userId }: { userId: string; }) {
    const [, refresh] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => {
        const stopShop = subscribeShop(refresh);
        const stopCustom = subscribe(refresh);
        return () => {
            stopShop();
            stopCustom();
        };
    }, []);
    const chosenShop = getShopSelection(userId, "nameplate");
    const chosenCustom = getSelectedAsset(userId, "nameplate");
    if (!chosenShop && !chosenCustom) return null;
    return (
        <div className="nexcord-nameplate-native-preview" aria-hidden="true">
            {chosenShop
                ? <NameplateArtwork item={chosenShop} userId={userId} />
                : <img className="nexcord-nameplate-custom-preview" src={chosenCustom!.dataUrl} alt="" />}
        </div>
    );
}

export function scanNativeNameplate(heading: HTMLElement, rail: HTMLElement, userId: string) {
    const tile = findNameplateTile(heading, rail);
    if (!tile) return;
    if (current?.tile === tile && current.host.isConnected) return;
    stopNativeNameplate();

    const host = document.createElement("span");
    host.dataset.nexcordNameplateHost = "true";
    host.className = "nexcord-nameplate-native-host";
    const oldPosition = tile.style.position;
    if (getComputedStyle(tile).position === "static") tile.style.position = "relative";
    tile.appendChild(host);
    try {
        const root = createRoot(host);
        current = { root, host, tile, oldPosition };
        root.render(<SelectedNameplate userId={userId} />);
    } catch (error) {
        logger.error("Could not mount local nameplate preview", error);
        host.remove();
        tile.style.position = oldPosition;
    }
}

export function stopNativeNameplate() {
    if (!current) return;
    const old = current;
    current = undefined;
    queueMicrotask(() => {
        old.root.unmount();
        old.host.remove();
        if (old.tile.style.position === "relative") old.tile.style.position = old.oldPosition;
    });
}
