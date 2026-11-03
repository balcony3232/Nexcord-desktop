/*
 * Nexcord - native profile-editor controls
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Important: do not insert whole galleries into Discord's flex/grid layout.
 * Mount one compact, inline trigger INSIDE the text heading instead. Its
 * gallery is a portal (fixed-position overlay), so it cannot push original
 * Discord settings or tiles around. No Discord save/API hooks are patched.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React, ReactDOM, showToast, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";

import { applyAsset, getAppearance, importAsset, listAssets, loadCosmetics, subscribe } from "./storage";
import type { CosmeticKind } from "./storage";
import type { ShopKind } from "./ShopCatalog";
import { ShopGallery } from "./ShopGallery";

type Surface = "sidebar" | "picker";
type NativeKind = CosmeticKind | ShopKind;
interface Slot {
    kind: NativeKind;
    surface: Surface;
    root: Root;
    heading: HTMLElement;
}
const logger = new Logger("NexcordNativeProfile");
const slots = new Map<HTMLElement, Slot>();
let observer: MutationObserver | undefined;
let scanTimer: ReturnType<typeof setTimeout> | undefined;
let scanning = false;

const EDITOR_LABELS = ["Nameplate", "Avatar & Decoration", "Display Name Style", "Theme & Banner"];
const NATIVE_NAMEPLATE_TITLE = "Change Nameplate";
const OWNED_NAMEPLATES = "Your Nameplates";

function labelElements(labels: Set<string>) {
    const matches = new Map<string, HTMLElement[]>();
    if (!document.body) return matches;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const value = node.textContent?.trim();
        if (!value || !labels.has(value)) continue;
        const parent = node.parentElement;
        if (!parent || parent.closest("[data-nexcord-native-host]")) continue;
        if (!parent.isConnected) continue;
        const list = matches.get(value) ?? [];
        list.push(parent);
        matches.set(value, list);
    }
    return matches;
}

/** Verify labels belong to the narrow native left rail, not some other UI. */
function getProfileRail(heading: HTMLElement): HTMLElement | undefined {
    let element: HTMLElement | null = heading;
    for (let depth = 0; depth < 12 && element; depth++, element = element.parentElement) {
        const box = element.getBoundingClientRect();
        if (box.width < 165 || box.width > 440 || box.height < 180) continue;
        const text = element.textContent ?? "";
        if (EDITOR_LABELS.every(label => text.includes(label))) return element;
    }
}

/** Verify heading is inside the native nameplate purchase/selection modal. */
function inNameplatePicker(heading: HTMLElement): boolean {
    let element: HTMLElement | null = heading;
    for (let depth = 0; depth < 13 && element; depth++, element = element.parentElement) {
        const box = element.getBoundingClientRect();
        if (box.width < 350 || box.width > 1100) continue;
        const text = element.textContent ?? "";
        if (text.includes(NATIVE_NAMEPLATE_TITLE) && text.includes(OWNED_NAMEPLATES)) return true;
    }
    return false;
}

function addTrigger(heading: HTMLElement, kind: NativeKind, surface: Surface) {
    if (heading.closest("button,[role=button],a")) return;
    // Only one active trigger per native heading. React may replace the whole
    // heading later, in which case the detached one is cleaned up on rescan.
    if (heading.querySelector('[data-nexcord-native-host="' + surface + '-' + kind + '"]')) return;
    const host = document.createElement("span");
    host.className = "nexcord-native-trigger-host";
    host.dataset.nexcordNativeHost = surface + "-" + kind;
    heading.appendChild(host);
    try {
        const root = createRoot(host);
        slots.set(host, { root, kind, surface, heading });
        root.render(<NativeTrigger kind={kind} surface={surface} />);
    } catch (err) {
        slots.delete(host);
        host.remove();
        logger.error("Failed mounting native profile control", err);
    }
}

function scan() {
    if (!observer || scanning) return;
    scanning = true;
    try {
        for (const [host, slot] of slots) {
            if (host.isConnected && slot.heading.isConnected) continue;
            slots.delete(host);
            // React might still be committing Discord's own tree, so do not
            // synchronously unmount a React root from a MutationObserver.
            queueMicrotask(() => slot.root.unmount());
        }

        const labels = labelElements(new Set([...EDITOR_LABELS, NATIVE_NAMEPLATE_TITLE, OWNED_NAMEPLATES]));
        if (!UserStore.getCurrentUser()?.id) return;

        const bannerLabels = labels.get("Theme & Banner") ?? [];
        for (const heading of bannerLabels) {
            if (!getProfileRail(heading)) continue;
            addTrigger(heading, "banner", "sidebar");
            break;
        }
        for (const heading of labels.get("Avatar & Decoration") ?? []) {
            if (!getProfileRail(heading)) continue;
            addTrigger(heading, "decoration", "sidebar");
            break;
        }
        // The effect and profile-frame sections share one Discord heading.
        // One compact button opens the Effects / Frames tabs.
        for (const heading of labelElements(new Set(["Profile Effect & Frame"])).get("Profile Effect & Frame") ?? []) {
            if (!getProfileRail(heading)) continue;
            addTrigger(heading, "effect", "sidebar");
            break;
        }
        const nameplateLabels = labels.get("Nameplate") ?? [];
        for (const heading of nameplateLabels) {
            if (!getProfileRail(heading)) continue;
            addTrigger(heading, "nameplate", "sidebar");
            break;
        }

        // Add a compact My Custom selector in the *real* Change Nameplate
        // dialog, next to "Your Nameplates", without moving Discord's grid.
        if (labels.has(NATIVE_NAMEPLATE_TITLE)) {
            for (const heading of labels.get(OWNED_NAMEPLATES) ?? []) {
                if (!inNameplatePicker(heading)) continue;
                addTrigger(heading, "nameplate", "picker");
                break;
            }
        }
    } catch (err) {
        logger.error("Native profile scan failed", err);
    } finally {
        scanning = false;
    }
}

function scheduleScan() {
    if (scanTimer || !observer) return;
    scanTimer = setTimeout(() => {
        scanTimer = undefined;
        scan();
    }, 300);
}

export function startNativeProfileIntegration() {
    if (observer || typeof document === "undefined" || !document.body) return;
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    void loadCosmetics().catch(err => logger.error("Cannot load local cosmetics", err));
    scheduleScan();
}

export function stopNativeProfileIntegration() {
    observer?.disconnect();
    observer = undefined;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = undefined;
    const saved = [...slots.entries()];
    slots.clear();
    queueMicrotask(() => {
        for (const [host, slot] of saved) {
            slot.root.unmount();
            host.remove();
        }
    });
}

function NativeTrigger({ kind, surface }: { kind: NativeKind; surface: Surface; }) {
    const userId = UserStore.getCurrentUser()?.id;
    const trigger = React.useRef<HTMLButtonElement>(null);
    const panel = React.useRef<HTMLDivElement>(null);
    const input = React.useRef<HTMLInputElement>(null);
    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const [tab, setTab] = React.useState<"custom" | "shop">(kind === "banner" || kind === "nameplate" ? "custom" : "shop");
    const [position, setPosition] = React.useState({ left: 16, top: 16 });
    const [, refresh] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => subscribe(refresh), []);

    // The catalogue deserves a readable, independent panel beside Discord's
    // profile editor, rather than a narrow menu overlapping its left rail.
    const width = 470;
    const label = kind === "decoration" ? "avatar decoration" : kind === "effect" ? "profile effect" : kind;
    const customKind = kind === "banner" || kind === "nameplate";
    const assets = customKind ? listAssets(kind as CosmeticKind) : [];
    const selected = customKind && userId ? getAppearance(userId)[kind as CosmeticKind] : undefined;

    React.useEffect(() => {
        if (!open) return;
        const updatePosition = () => {
            const rect = trigger.current?.getBoundingClientRect();
            if (!rect) return;
            const gap = 12;
            const viewportPadding = 12;
            const rail = surface === "sidebar" ? getProfileRail(trigger.current!) : undefined;
            const naturalLeft = (rail?.getBoundingClientRect().right ?? rect.right) + gap;
            const left = naturalLeft + width + viewportPadding <= window.innerWidth
                ? naturalLeft
                : Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
            // Keep the editor vertically anchored, but constrain the full
            // Shop catalogue to the screen. Only its item grid should scroll.
            const panelHeight = Math.min(570, window.innerHeight - 2 * viewportPadding);
            const top = Math.max(viewportPadding,
                Math.min(rect.top - 18, window.innerHeight - panelHeight - viewportPadding));
            setPosition({ left, top });
        };
        updatePosition();
        const onPointerDown = (event: PointerEvent) => {
            if (trigger.current?.contains(event.target as Node)) return;
            if (panel.current?.contains(event.target as Node)) return;
            setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [open, width]);

    async function apply(id: string | undefined) {
        if (!userId || busy || !customKind) return;
        setBusy(true);
        setError("");
        try {
            await applyAsset(userId, kind as CosmeticKind, id);
            showToast({ text: "Local " + label + " applied — only you can see it", variant: "success" });
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    async function importFile(file: File | undefined) {
        if (!file || !userId || busy || !customKind) return;
        setBusy(true);
        setError("");
        try {
            const asset = await importAsset(kind as CosmeticKind, file);
            await applyAsset(userId, kind as CosmeticKind, asset.id);
            showToast({ text: "Custom " + label + " imported and applied locally", variant: "success" });
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <button
                type="button"
                ref={trigger}
                className="nexcord-native-trigger"
                title={"Open local custom " + label + "s"}
                aria-expanded={open}
                onClick={event => {
                    event.stopPropagation();
                    setOpen(value => !value);
                }}
            >
                My Custom
            </button>
            {open && ReactDOM.createPortal(
                <div
                    ref={panel}
                    className="nexcord-native-popover"
                    style={{ width, left: position.left, top: position.top }}
                    onClick={event => event.stopPropagation()}
                >
                    <div className="nexcord-native-popover-title">
                        <strong>{kind === "banner" ? "Local Banners" :
                            kind === "nameplate" ? "Local Nameplates" :
                            kind === "decoration" ? "Avatar Decorations" : "Profile Effects & Frames"}</strong>
                        <span>Only you</span>
                    </div>
                    {customKind && kind !== "banner" && (
                        <div className="nexcord-native-tabs">
                            <button type="button" className={tab === "custom" ? "nexcord-native-tab-active" : ""}
                                onClick={() => setTab("custom")}>My Images</button>
                            <button type="button" className={tab === "shop" ? "nexcord-native-tab-active" : ""}
                                onClick={() => setTab("shop")}>Discord Shop</button>
                        </div>
                    )}
                    {tab === "custom" && customKind && (
                        <>
                            <div className="nexcord-native-popover-grid">
                                <button type="button" disabled={busy}
                                    className={!selected ? "nexcord-native-selected" : ""}
                                    title="Remove local cosmetic"
                                    onClick={() => void apply(undefined)}>
                                    <span className="nexcord-native-none-symbol">⊘</span>
                                    <small>None</small>
                                </button>
                                {assets.map(asset => (
                                    <button type="button" key={asset.id} title={asset.label}
                                        disabled={busy}
                                        aria-pressed={selected === asset.id}
                                        className={selected === asset.id ? "nexcord-native-selected" : ""}
                                        onClick={() => void apply(asset.id)}>
                                        <img src={asset.dataUrl} alt={asset.label} />
                                    </button>
                                ))}
                                <button type="button" disabled={busy}
                                    title={"Import " + label}
                                    onClick={() => input.current?.click()}>
                                    <span className="nexcord-native-none-symbol">+</span>
                                    <small>Import</small>
                                </button>
                            </div>
                            <input type="file" ref={input} hidden accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={event => {
                                    void importFile(event.currentTarget.files?.[0]);
                                    event.currentTarget.value = "";
                                }}/>
                        </>
                    )}
                    {tab === "shop" && kind !== "banner" && userId && (
                        <ShopGallery
                            kind={kind === "effect" ? "effect" : kind as ShopKind}
                            allowFrames={kind === "effect"}
                            userId={userId}
                            onApplied={() => setOpen(false)}
                        />
                    )}
                    {tab === "custom" && (
                        <p className="nexcord-native-popover-note">
                            Local-only selections apply immediately. Discord's original
                            Save and Apply controls are unchanged.
                        </p>
                    )}
                    {kind === "nameplate" && <p className="nexcord-native-popover-note">
                        Native nameplate rendering is experimental. If it doesn't display,
                        your selection will still be saved locally.
                    </p>}
                    {error && <p className="nexcord-native-popover-error" role="alert">{error}</p>}
                </div>, document.body
            )}
        </>
    );
}
