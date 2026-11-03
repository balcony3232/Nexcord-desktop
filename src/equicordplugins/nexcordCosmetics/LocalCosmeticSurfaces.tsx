/*
 * Local presentation of chosen cosmetics in self popouts and member rows.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This adds visual layers only; it never overwrites user objects,
 * subscription state, Discord stores or collectible entitlements.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";

import { mountLocalEffectCard, stopLocalEffectCard } from "./EffectCardOverlay";
import { NameplateArtwork, NameplateBackdrop } from "./NameplateArtwork";
import { getShopSelection, subscribeShop } from "./ShopCatalog";
import { getSelectedAsset, subscribe as subscribeCustom } from "./storage";

const logger = new Logger("NexcordLocalSurfaces");

interface Host {
    node: HTMLElement;
    root: Root;
    parent: HTMLElement;
    oldPosition?: string;
}
let observer: MutationObserver | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;
let popout: { shell: HTMLElement; host: Host; } | undefined;
const memberHosts = new Map<HTMLElement, Host>();

function LocalNameplate({ userId, backdropOnly }: { userId: string; backdropOnly?: boolean; }) {
    const [, update] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => {
        const a = subscribeShop(update);
        const b = subscribeCustom(update);
        return () => { a(); b(); };
    }, []);

    const selected = getShopSelection(userId, "nameplate");
    const custom = getSelectedAsset(userId, "nameplate");
    if (selected) return backdropOnly
        ? <NameplateBackdrop item={selected} />
        : <NameplateArtwork item={selected} userId={userId} compact />;
    if (custom) return <img src={custom.dataUrl} draggable={false} alt=""
        className="nexcord-local-custom-nameplate" />;
    return null;
}

function exactText(container: HTMLElement, wanted: string): HTMLElement[] {
    const result: HTMLElement[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.textContent?.trim() !== wanted) continue;
        const parent = node.parentElement;
        if (parent && !parent.closest("[data-nexcord-local-surface]")) result.push(parent);
    }
    return result;
}

/** Self profile popouts contain these controls; regular user popouts do not. */
function findSelfPopout(): HTMLElement | undefined {
    const editElements = exactText(document.body, "Switch Accounts");
    for (const textNode of editElements) {
        let parent: HTMLElement | null = textNode;
        for (let depth = 0; depth < 15 && parent; depth++, parent = parent.parentElement) {
            const rect = parent.getBoundingClientRect();
            if (rect.width < 265 || rect.width > 435 || rect.height < 350 || rect.height > 1120) continue;
            const text = parent.textContent ?? "";
            if (!text.includes("Edit Profile") || !text.includes("Switch Accounts")
                || !text.includes("Copy User ID")) continue;
            // Exclude hidden popouts or the entire Discord window.
            if (!rect.width || !rect.height || rect.right < 0 || rect.bottom < 0) continue;
            return parent;
        }
    }
}

function findNameHeading(shell: HTMLElement, userId: string): HTMLElement | undefined {
    const user = UserStore.getUser(userId) ?? UserStore.getCurrentUser();
    if (!user) return;
    const names = [...new Set([user.globalName, user.username].filter((x): x is string => !!x))];
    const shellBox = shell.getBoundingClientRect();
    const candidates = names.flatMap(name => exactText(shell, name))
        .filter(el => {
            const r = el.getBoundingClientRect();
            return r.top >= shellBox.top + 60 && r.top < shellBox.top + 345
                && r.left >= shellBox.left + 9 && r.left < shellBox.left + 155;
        });
    candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    if (!candidates.length) return;

    let target = candidates[0];
    // Prefer a whole name block (display name + username) over the text span.
    for (let depth = 0; depth < 4 && target.parentElement && target.parentElement !== shell; depth++) {
        const next = target.parentElement;
        const box = next.getBoundingClientRect();
        const text = next.textContent ?? "";
        if (box.width > shellBox.width + 2 || box.height > 105
            || text.includes("Edit Profile") || text.includes("Listening to")) break;
        target = next;
    }
    return target;
}

function restore(host: Host) {
    // React unmount is deferred to avoid the native React unmount crash.
    queueMicrotask(() => {
        host.root.unmount();
        host.node.remove();
        if (host.oldPosition !== undefined && host.parent.style.position === "relative") {
            host.parent.style.position = host.oldPosition;
        }
    });
}
function clearPopout() {
    if (popout) {
        restore(popout.host);
        popout = undefined;
    }
    stopLocalEffectCard("popout");
}
function scanPopout(userId: string) {
    const shell = findSelfPopout();
    if (!shell) {
        clearPopout();
        return;
    }

    mountLocalEffectCard("popout", shell, userId);
    if (popout && popout.shell === shell && popout.host.node.isConnected) return;
    if (popout) restore(popout.host);
    popout = undefined;

    const heading = findNameHeading(shell, userId);
    if (!heading || !heading.parentElement) return;

    // Insert a compact nameplate immediately after the name block in the
    // actual popout, preserving the rest of Discord's normal controls.
    const node = document.createElement("div");
    node.dataset.nexcordLocalSurface = "popout-nameplate";
    node.className = "nexcord-popout-nameplate-host";
    heading.after(node);
    try {
        const root = createRoot(node);
        popout = { shell, host: { node, root, parent: node.parentElement! } };
        root.render(<LocalNameplate userId={userId} />);
    } catch (error) {
        logger.warn("Could not mount local popout nameplate", error);
        node.remove();
    }
}

function findOwnMemberRows(userId: string): HTMLElement[] {
    const rows: HTMLElement[] = [];
    for (const row of document.querySelectorAll<HTMLElement>("[data-list-item-id]")) {
        const listId = row.getAttribute("data-list-item-id") ?? "";
        // Discord's virtual member list uses an ID containing the member's
        // full snowflake. Never guess from a matching display name.
        if (!/^members[-_]/.test(listId) || !listId.includes(userId)) continue;
        const r = row.getBoundingClientRect();
        if (r.width < 145 || r.width > 450 || r.height < 26 || r.height > 130) continue;
        rows.push(row);
        if (rows.length >= 6) break;
    }
    return rows;
}
function scanMemberRows(userId: string) {
    const wanted = new Set(findOwnMemberRows(userId));
    for (const [row, host] of memberHosts) {
        if (wanted.has(row) && host.node.isConnected) continue;
        memberHosts.delete(row);
        row.removeAttribute("data-nexcord-local-member");
        restore(host);
    }

    for (const row of wanted) {
        if (memberHosts.has(row)) continue;
        const oldPosition = row.style.position;
        if (getComputedStyle(row).position === "static") row.style.position = "relative";
        const node = document.createElement("div");
        node.dataset.nexcordLocalSurface = "member-nameplate";
        node.className = "nexcord-member-nameplate-host";
        row.insertBefore(node, row.firstChild);
        row.dataset.nexcordLocalMember = "true";
        try {
            const root = createRoot(node);
            memberHosts.set(row, { node, root, parent: row, oldPosition });
            root.render(<LocalNameplate userId={userId} backdropOnly />);
        } catch (error) {
            logger.warn("Could not mount member row nameplate", error);
            node.remove();
            row.removeAttribute("data-nexcord-local-member");
            row.style.position = oldPosition;
        }
    }
}
function scan() {
    if (!observer) return;
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) return;
    scanPopout(userId);
    scanMemberRows(userId);
}
function schedule() {
    if (timeout || !observer) return;
    timeout = setTimeout(() => {
        timeout = undefined;
        try { scan(); } catch (error) { logger.warn("Local cosmetic scan failed", error); }
    }, 350);
}
export function startLocalCosmeticSurfaces() {
    if (observer || typeof document === "undefined" || !document.body) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { subtree: true, childList: true });
    schedule();
}
export function stopLocalCosmeticSurfaces() {
    observer?.disconnect();
    observer = undefined;
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    clearPopout();
    for (const [row, host] of memberHosts) {
        row.removeAttribute("data-nexcord-local-member");
        restore(host);
    }
    memberHosts.clear();
}
