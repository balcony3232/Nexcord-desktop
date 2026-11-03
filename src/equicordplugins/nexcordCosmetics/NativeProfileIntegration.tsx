/*
 * Nexcord: inline controls inside Discord's real profile customisation UI.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * This integration attaches small React roots to existing Discord DOM sections
 * without replacing Discord profile save handlers, purchase checks, or account
 * state. It fails closed when the expected editor labels are not present.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React, showToast, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";

import { applyAsset, getAppearance, importAsset, listAssets, loadCosmetics, subscribe } from "./storage";
import type { CosmeticKind } from "./storage";

type Surface = "sidebar" | "picker";
type Slot = { root: Root; kind: CosmeticKind; surface: Surface; };
const logger = new Logger("NexcordNativeProfile");
const slots = new Map<HTMLElement, Slot>();
let observer: MutationObserver | undefined;
let scanTimer: ReturnType<typeof setTimeout> | undefined;
let scanActive = false;

// These are visible labels on Discord's current English profile editor.
// If Discord renames them, this integration simply doesn't insert anything.
const EDITOR_MARKERS = ["Avatar & Decoration", "Theme & Banner", "Display Name Style"];
const TITLE = {
    banner: "Theme & Banner",
    nameplate: "Nameplate"
} as const;
const PICKER_TITLE = "Change Nameplate";
const SHOP_HEADING = "See What's in Shop";

function exactTextNodes(search: ReadonlySet<string>): Map<string, HTMLElement[]> {
    const result = new Map<string, HTMLElement[]>();
    if (!document.body) return result;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const value = node.textContent?.trim();
        if (!value || !search.has(value)) continue;
        const element = node.parentElement;
        if (!element || element.closest("[data-nexcord-native-host]")) continue;
        const list = result.get(value) ?? [];
        list.push(element);
        result.set(value, list);
    }
    return result;
}

function headingContainer(element: HTMLElement): HTMLElement {
    // Prefer the label row, leaving the original Discord tiles intact.
    let anchor = element;
    for (let i = 0; i < 2; i++) {
        const parent = anchor.parentElement;
        if (!parent) break;
        const text = parent.textContent?.trim() ?? "";
        if (text.length > 65 || text.includes("Avatar & Decoration") || text.includes("Display Name Style")) break;
        anchor = parent;
    }
    return anchor;
}

function insertSlot(anchor: HTMLElement, kind: CosmeticKind, surface: Surface, before = false) {
    const sibling = before ? anchor.previousElementSibling : anchor.nextElementSibling;
    if (sibling instanceof HTMLElement && sibling.dataset.nexcordNativeHost === surface + "-" + kind) return;
    const container = document.createElement("div");
    container.dataset.nexcordNativeHost = surface + "-" + kind;
    container.className = "nexcord-native-host nexcord-native-" + surface;
    if (before) anchor.before(container);
    else anchor.after(container);
    try {
        const root = createRoot(container);
        slots.set(container, { root, kind, surface });
        root.render(<InlineGallery kind={kind} surface={surface} />);
    } catch (error) {
        logger.error("Failed to mount native cosmetic controls", error);
        slots.delete(container);
        container.remove();
    }
}

function findPickerAncestor(element: HTMLElement): HTMLElement | undefined {
    let ancestor: HTMLElement | null = element;
    for (let i = 0; i < 11 && ancestor; i++, ancestor = ancestor.parentElement) {
        const text = ancestor.textContent ?? "";
        if (text.includes(PICKER_TITLE) && text.includes(SHOP_HEADING) && text.includes("Your Nameplates"))
            return ancestor;
    }
}

function scan() {
    if (!observer || scanActive) return;
    scanActive = true;
    try {
        for (const [host, slot] of slots) {
            if (host.isConnected) continue;
            slot.root.unmount();
            slots.delete(host);
        }
        const labels = new Set([...EDITOR_MARKERS, "Nameplate", PICKER_TITLE, SHOP_HEADING, "Your Nameplates"]);
        const nodes = exactTextNodes(labels);
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (!currentUserId) return;

        // Require three independent native editor labels, preventing an
        // accidental mount on normal user profiles and plugin settings.
        if (EDITOR_MARKERS.every(marker => nodes.has(marker))) {
            for (const kind of ["banner", "nameplate"] as const) {
                for (const title of nodes.get(TITLE[kind]) ?? []) {
                    const anchor = headingContainer(title);
                    const existing = anchor.nextElementSibling;
                    if (existing instanceof HTMLElement && existing.dataset.nexcordNativeHost === "sidebar-" + kind)
                        continue;
                    if (anchor.closest("[data-nexcord-native-host]")) continue;
                    insertSlot(anchor, kind, "sidebar");
                    // Only the first matching section in the active editor.
                    break;
                }
            }
        }

        // The actual Discord "Change Nameplate" picker receives a local
        // gallery above its normal "See What's in Shop" heading. Discord's
        // original Apply button continues to handle real purchases/owned items.
        if (nodes.has(PICKER_TITLE)) {
            for (const heading of nodes.get(SHOP_HEADING) ?? []) {
                if (!findPickerAncestor(heading)) continue;
                const anchor = headingContainer(heading);
                const previous = anchor.previousElementSibling;
                if (previous instanceof HTMLElement && previous.dataset.nexcordNativeHost === "picker-nameplate")
                    continue;
                insertSlot(anchor, "nameplate", "picker", true);
                break;
            }
        }
    } catch (error) {
        logger.error("Error scanning Discord's profile editor", error);
    } finally {
        scanActive = false;
    }
}

function scheduleScan() {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
        scanTimer = undefined;
        scan();
    }, 220);
}

export function startNativeProfileIntegration() {
    if (observer || typeof document === "undefined") return;
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    void loadCosmetics().catch(error => logger.error("Cannot load custom cosmetics", error));
    scheduleScan();
}

export function stopNativeProfileIntegration() {
    observer?.disconnect();
    observer = undefined;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = undefined;
    // Unmount in a microtask to avoid unmounting during a React commit.
    const old = [...slots.entries()];
    slots.clear();
    queueMicrotask(() => {
        for (const [element, slot] of old) {
            slot.root.unmount();
            element.remove();
        }
    });
}

function InlineGallery({ kind, surface }: { kind: CosmeticKind; surface: Surface; }) {
    const userId = UserStore.getCurrentUser()?.id;
    const [, redraw] = React.useReducer((n: number) => n + 1, 0);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const picker = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => subscribe(redraw), []);
    if (!userId) return null;

    const selectedId = getAppearance(userId)[kind];
    const assets = listAssets(kind);
    const label = kind === "banner" ? "Banner" : "Nameplate";

    async function select(id: string | undefined) {
        if (!userId || busy) return;
        setBusy(true);
        setError("");
        try {
            await applyAsset(userId, kind, id);
            showToast({
                text: label + " applied locally. Reopen the profile if the preview doesn't refresh.",
                variant: "success"
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    async function addFile(file: File | undefined) {
        if (!file || !userId || busy) return;
        setBusy(true);
        setError("");
        try {
            const asset = await importAsset(kind, file);
            await applyAsset(userId, kind, asset.id);
            showToast({ text: "Imported and applied local " + label.toLowerCase(), variant: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className={"nexcord-inline-gallery nexcord-inline-gallery-" + surface}>
            <div className="nexcord-inline-gallery-heading">
                <strong>My Custom</strong>
                <span title="These cosmetics are visible only in your Nexcord client">Only you</span>
            </div>
            <div className={"nexcord-inline-assets nexcord-inline-assets-" + kind}>
                <button
                    type="button"
                    title={"Remove local " + label.toLowerCase()}
                    className={"nexcord-inline-none" + (!selectedId ? " nexcord-inline-current" : "")}
                    onClick={() => void select(undefined)}
                    disabled={busy}
                >
                    <span>⊘</span>
                    <small>None</small>
                </button>
                {assets.map(asset => (
                    <button
                        key={asset.id}
                        type="button"
                        title={asset.label}
                        aria-label={"Apply local " + label.toLowerCase() + " " + asset.label}
                        aria-pressed={selectedId === asset.id}
                        className={"nexcord-inline-image" + (selectedId === asset.id ? " nexcord-inline-current" : "")}
                        disabled={busy}
                        onClick={() => void select(asset.id)}
                    >
                        <img src={asset.dataUrl} alt="" />
                    </button>
                ))}
                <button
                    type="button"
                    title={"Import custom " + label.toLowerCase()}
                    className="nexcord-inline-import"
                    disabled={busy}
                    onClick={() => picker.current?.click()}
                >
                    <span>+</span>
                    <small>Import</small>
                </button>
            </div>
            <input
                type="file"
                ref={picker}
                hidden
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={e => {
                    void addFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = "";
                }}
            />
            {surface === "picker" && (
                <p className="nexcord-inline-note">
                    Choosing a custom item applies it <strong>locally</strong>.
                    Discord's Apply button is for your owned Discord nameplates.
                </p>
            )}
            {kind === "nameplate" && surface === "sidebar" && selectedId && (
                <p className="nexcord-inline-note">Saved locally. Native nameplate rendering is still experimental.</p>
            )}
            {error && <p className="nexcord-inline-error" role="alert">{error}</p>}
        </div>
    );
}
