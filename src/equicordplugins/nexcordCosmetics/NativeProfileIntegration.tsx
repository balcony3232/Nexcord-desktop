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
import { DEFAULT_PROFILE_STYLE, getLocalProfileStyle, loadProfileStyles, setLocalProfileStyle, subscribeProfileStyles } from "./LocalProfileStyle";
import type { LocalBadge } from "./LocalProfileStyle";
import { ALL_BADGES_BY_GROUP, BADGE_IDS, badgeById } from "./BadgeCatalog";
import type { CosmeticKind } from "./storage";
import type { ShopKind } from "./ShopCatalog";
import { ShopGallery } from "./ShopGallery";
import { applyShopItem } from "./ShopCatalog";
import { scanNativeNameplate, stopNativeNameplate } from "./NativeNameplate";
import { scanNativeEffectTile, stopNativeEffectTile } from "./NativeEffectTile";
import { scanNativeFrameTile, stopNativeFrameTile } from "./NativeFrameTile";
import { scanNativeDecorationTile, stopNativeDecorationTile } from "./NativeDecorationTile";
import { findProfileCard, scanNativeEffectCard, stopNativeEffectCard } from "./EffectCardOverlay";
import { syncLocalIdentityPreview, stopLocalIdentityPreview } from "./LocalIdentityPreview";

type Surface = "sidebar" | "picker";
type NativeKind = CosmeticKind | ShopKind | "theme" | "badges";
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
// Only the promotional panel inside Discord's own profile editor is hidden.
// Keep original CSS values so disabling Nexcord restores the panel exactly.
const hiddenUpsellPanels = new Map<HTMLElement, string>();

// Discord has two left-sidebar layouts: one for profiles with the premium
// appearance editor and one with a "Banner colour" section / Nitro upsell.
// These markers apply to BOTH layouts, without changing entitlement state.
const EDITOR_LABELS = ["Nameplate", "Avatar & Decoration", "Profile Effect & Frame"];
const BANNER_LABELS = ["Theme & Banner", "Banner colour", "Banner color"];
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
        if (EDITOR_LABELS.every(label => text.includes(label))
            && BANNER_LABELS.some(label => text.includes(label))) return element;
    }
}

/**
 * Hide only the Nitro sales card inside the *real* profile-editor sidebar.
 * Do not change premium type flags, account entitlements, billing state,
 * native product pickers, or any other Nitro advertising elsewhere.
 */
function hideEditorNitroPromotion(rail: HTMLElement) {
    const hide = (element: HTMLElement) => {
        if (hiddenUpsellPanels.has(element)) return;
        hiddenUpsellPanels.set(element, element.style.display);
        element.style.display = "none";
    };
    for (const button of rail.querySelectorAll<HTMLElement>("button,[role='button']")) {
        if (button.textContent?.trim() !== "Preview Nitro") continue;
        let ancestor: HTMLElement | null = button;
        for (let depth = 0; depth < 8 && ancestor && ancestor !== rail; depth++, ancestor = ancestor.parentElement) {
            const text = ancestor.textContent ?? "";
            if (!text.includes("Preview Nitro") || !text.includes("Level up your look")) continue;
            // If Discord keeps "Display Name Style" inside the purple Nitro
            // panel, don't hide the whole panel or the genuine styling UI.
            const includesRealFields = EDITOR_LABELS.some(label => text.includes(label))
                || BANNER_LABELS.some(label => text.includes(label))
                || text.includes("Display Name Style");
            const box = ancestor.getBoundingClientRect();
            if (!includesRealFields && box.height < 360 && box.width < 440) {
                hide(ancestor);
                return;
            }
            break;
        }

        // Reduced-Nitro editor fallback: the promotional box sometimes also
        // contains functional profile controls. Hide only its sales copy and
        // Preview Nitro button, never the surrounding editor or style section.
        hide(button);
        const walker = document.createTreeWalker(rail, NodeFilter.SHOW_TEXT);
        let textNode: Node | null;
        while ((textNode = walker.nextNode())) {
            if (!textNode.textContent?.includes("Level up your look")) continue;
            let copy = textNode.parentElement;
            let isolated = copy;
            while (copy?.parentElement && copy.parentElement !== rail) {
                const parent = copy.parentElement;
                const content = parent.textContent ?? "";
                if (content.includes("Display Name Style") ||
                    content.includes("Preview Nitro") ||
                    EDITOR_LABELS.some(label => content.includes(label)) ||
                    BANNER_LABELS.some(label => content.includes(label))) break;
                isolated = parent;
                copy = parent;
            }
            if (isolated) hide(isolated);
            return;
        }
        return;
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
        for (const [element] of hiddenUpsellPanels) {
            if (!element.isConnected) hiddenUpsellPanels.delete(element);
        }
        for (const [host, slot] of slots) {
            if (host.isConnected && slot.heading.isConnected) continue;
            slots.delete(host);
            // React might still be committing Discord's own tree, so do not
            // synchronously unmount a React root from a MutationObserver.
            queueMicrotask(() => slot.root.unmount());
        }

        const labels = labelElements(new Set([
            ...EDITOR_LABELS, ...BANNER_LABELS,
            "Display Name Style", NATIVE_NAMEPLATE_TITLE, OWNED_NAMEPLATES
        ]));
        if (!UserStore.getCurrentUser()?.id) return;

        // A verified narrow rail is necessary before modifying this surface.
        // Nitro's reduced editor uses "Banner colour" instead of "Theme & Banner".
        const bannerHeadings = BANNER_LABELS.flatMap(label => labels.get(label) ?? []);
        for (const heading of bannerHeadings) {
            const rail = getProfileRail(heading);
            if (!rail) continue;
            addTrigger(heading, "banner", "sidebar");
            hideEditorNitroPromotion(rail);
            scanNativeEffectCard(rail, UserStore.getCurrentUser()!.id);
            syncLocalIdentityPreview("editor", findProfileCard(rail), UserStore.getCurrentUser()!.id);
            break;
        }
        let decorationMounted = false;
        for (const heading of labels.get("Avatar & Decoration") ?? []) {
            const rail = getProfileRail(heading);
            if (!rail) continue;
            addTrigger(heading, "decoration", "sidebar");
            scanNativeDecorationTile(heading, rail, UserStore.getCurrentUser()!.id);
            decorationMounted = true;
            break;
        }
        if (!decorationMounted) stopNativeDecorationTile();
        // The effect and profile-frame sections share one Discord heading.
        // One compact button opens the Effects / Frames tabs.
        let effectTileMounted = false;
        for (const heading of labels.get("Profile Effect & Frame") ?? []) {
            const rail = getProfileRail(heading);
            if (!rail) continue;
            addTrigger(heading, "effect", "sidebar");
            scanNativeEffectTile(heading, rail, UserStore.getCurrentUser()!.id);
            scanNativeFrameTile(heading, rail, UserStore.getCurrentUser()!.id);
            effectTileMounted = true;
            break;
        }
        if (!effectTileMounted) { stopNativeEffectTile(); stopNativeFrameTile(); }
        const nameplateLabels = labels.get("Nameplate") ?? [];
        let mountedNameplate = false;
        for (const heading of nameplateLabels) {
            const rail = getProfileRail(heading);
            if (!rail) continue;
            addTrigger(heading, "nameplate", "sidebar");
            scanNativeNameplate(heading, rail, UserStore.getCurrentUser()!.id);
            mountedNameplate = true;
            break;
        }
        if (!mountedNameplate) stopNativeNameplate();

        // Add local-only profile colours and badge previews beside Discord's
        // Display Name Style heading. Never patch its native save flow.
        for (const heading of labels.get("Display Name Style") ?? []) {
            if (!getProfileRail(heading)) continue;
            addTrigger(heading, "theme", "sidebar");
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
    observer = new MutationObserver(mutations => {
        // v0.1.4: avoid scanning every new chat message or emoji frame.
        // React may add headings as either text or nested element nodes.
        if (slots.size || hiddenUpsellPanels.size || mutations.some(m =>
            [...m.addedNodes, ...m.removedNodes].some(node => {
                const text = node.textContent ?? "";
                return ["Display Name Style", ...EDITOR_LABELS, ...BANNER_LABELS,
                    NATIVE_NAMEPLATE_TITLE, OWNED_NAMEPLATES].some(label => text.includes(label));
            })
        )) scheduleScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    void loadCosmetics().catch(err => logger.error("Cannot load local cosmetics", err));
    scheduleScan();
}

export function stopNativeProfileIntegration() {
    stopNativeDecorationTile();
    stopNativeEffectTile();
    stopNativeFrameTile();
    stopNativeNameplate();
    stopNativeEffectCard();
    stopLocalIdentityPreview("editor");
    observer?.disconnect();
    observer = undefined;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = undefined;
    for (const [element, originalDisplay] of hiddenUpsellPanels) {
        element.style.display = originalDisplay;
    }
    hiddenUpsellPanels.clear();
    const saved = [...slots.entries()];
    slots.clear();
    queueMicrotask(() => {
        for (const [host, slot] of saved) {
            slot.root.unmount();
            host.remove();
        }
    });
}

/** The Larpcord picker uses a browser top-layer dialog to avoid
 * Discord profile editor overlays stealing pointer and keyboard events. */
function NativeTrigger({ kind, surface }: { kind: NativeKind; surface: Surface; }) {
    const userId = UserStore.getCurrentUser()?.id;
    const trigger = React.useRef<HTMLButtonElement>(null);
    const panel = React.useRef<HTMLDivElement>(null);
    // A browser-native modal sits in the top layer above Discord's own
    // profile editor. This avoids the profile editor intercepting clicks
    // and trapping focus in the wrong React/modal container.
    const [dialogHost, setDialogHost] = React.useState<HTMLDialogElement | null>(null);
    const input = React.useRef<HTMLInputElement>(null);
    const nameInput = React.useRef<HTMLInputElement>(null);
    const usernameInput = React.useRef<HTMLInputElement>(null);
    const [focusedField, setFocusedField] = React.useState<"none" | "display" | "username">("none");
    const [open, setOpen] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const [tab, setTab] = React.useState<"custom" | "shop">(kind === "banner" || kind === "nameplate" ? "custom" : "shop");
    const [position, setPosition] = React.useState({ left: 16, top: 16 });
    const [browseKind, setBrowseKind] = React.useState<NativeKind>(kind);
    const [badgeSearch, setBadgeSearch] = React.useState("");
    const [badgeGroup, setBadgeGroup] = React.useState<string>("nitro");
    const [identityDraft, setIdentityDraft] = React.useState({displayName:"",username:""});
    const [, refresh] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => subscribe(refresh), []);
    React.useEffect(() => subscribeProfileStyles(refresh), []);
    React.useEffect(() => { void loadProfileStyles().then(refresh).catch(error => setError(String(error))); }, []);

    // The catalogue deserves a readable, independent panel beside Discord's
    // profile editor, rather than a narrow menu overlapping its left rail.
    const width = 470;
    const label = kind === "decoration" ? "avatar decoration" : kind === "effect" ? "profile effect" : kind === "theme" ? "profile theme" : kind;
    const profileStyle = userId ? getLocalProfileStyle(userId) : DEFAULT_PROFILE_STYLE;
    React.useEffect(() => {
        if (!open) return;
        const dialog = document.createElement("dialog");
        dialog.className = "larpcord-native-cosmetic-dialog";
        dialog.setAttribute("aria-label", "Larpcord cosmetic picker");
        const onCancel = (event: Event) => {
            event.preventDefault();
            setOpen(false);
        };
        dialog.addEventListener("cancel", onCancel);
        document.body.appendChild(dialog);
        try {
            dialog.showModal();
        } catch (error) {
            logger.warn("Could not open native cosmetic dialog", error);
            dialog.remove();
            setOpen(false);
            return;
        }
        setDialogHost(dialog);
        return () => {
            dialog.removeEventListener("cancel", onCancel);
            if (dialog.open) dialog.close();
            dialog.remove();
        };
    }, [open]);

    // Discard the detached dialog target after closing so a later reopen
    // cannot briefly render into a stale DOM node.
    React.useEffect(() => {
        if (!open && dialogHost) setDialogHost(null);
    }, [open, dialogHost]);

    React.useEffect(() => setIdentityDraft({
        displayName: profileStyle.localDisplayName,
        username: profileStyle.localUsername
    }), [userId, profileStyle.localDisplayName, profileStyle.localUsername]);

    // The form is now inside Discord's focus boundary. Focus on opening the
    // Identity tab once; do not re-focus on every keystroke or style update.
    React.useEffect(() => {
        if (!open || !dialogHost || browseKind !== "theme") return;
        const frame = requestAnimationFrame(() => nameInput.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open, dialogHost, browseKind]);
    async function saveProfileStyle(changes: Partial<typeof profileStyle>) {
        if (!userId || busy) return;
        setBusy(true);
        setError("");
        try {
            await setLocalProfileStyle(userId, changes);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }
    const customKind = browseKind === "banner" || browseKind === "nameplate";
    const assets = customKind ? listAssets(browseKind as CosmeticKind) : [];
    const selected = customKind && userId ? getAppearance(userId)[browseKind as CosmeticKind] : undefined;
    const activeBadges = profileStyle.badges;
    const badgeQuery = badgeSearch.trim().toLowerCase();
    const badgeGroupsVisible = ALL_BADGES_BY_GROUP.map(group => ({
        ...group,
        items: group.items.filter(item => !badgeQuery ||
            (item.name + " " + item.category).toLowerCase().includes(badgeQuery))
    })).filter(group => group.items.length && (badgeQuery || badgeGroup === group.key));
    async function toggleBadge(id: string) {
        await saveProfileStyle({badges: activeBadges.includes(id)
            ? activeBadges.filter(x => x !== id) : [...activeBadges, id]});
    }

    React.useEffect(() => {
        if (!open || !dialogHost) return;
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
        // Discord's profile editor uses its own popovers, focus traps and
        // pointer capture. A global click-away listener misidentified clicks
        // *inside* the picker and dismissed it before the selected item saved.
        // Only explicit close/trigger-toggle/Escape should dismiss this panel.
        // Escape is handled by the browser dialog's cancel event, rather than
        // propagating through Discord's own modal keyboard handlers.
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("resize", updatePosition);
        };
    }, [open, width, dialogHost]);

    React.useEffect(() => {
        if (!dialogHost) return;
        dialogHost.style.left = position.left + "px";
        dialogHost.style.top = position.top + "px";
    }, [dialogHost, position.left, position.top]);

    async function apply(id: string | undefined) {
        if (!userId || busy || !customKind) return;
        setBusy(true);
        setError("");
        try {
            await applyAsset(userId, browseKind as CosmeticKind, id);
            if (browseKind === "nameplate") await applyShopItem(userId, "nameplate", undefined);
            showToast({ text: "Local " + label + " applied — only you can see it", variant: "success" });
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
            const asset = await importAsset(browseKind as CosmeticKind, file);
            await applyAsset(userId, browseKind as CosmeticKind, asset.id);
            if (browseKind === "nameplate") await applyShopItem(userId, "nameplate", undefined);
            showToast({ text: "Custom " + label + " imported and applied locally", variant: "success" });
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
            {open && dialogHost && ReactDOM.createPortal(
                <div
                    ref={panel}
                    className="nexcord-native-popover"
                    style={{ width }}
                    onClick={event => event.stopPropagation()}
                    onPointerDown={event => event.stopPropagation()}
                    onKeyDown={event => {
                        // Do not propagate keystrokes to Discord's profile editor,
                        // which contains global keyboard shortcuts.
                        if (event.key !== "Escape") event.stopPropagation();
                    }}
                >
                    <div className="nexcord-native-popover-title">
                        <strong>{browseKind === "banner" ? "Local Banners" :
                            browseKind === "nameplate" ? "Local Nameplates" :
                            browseKind === "decoration" ? "Avatar Decorations" :
                            browseKind === "effect" ? "Profile Effects" :
                            browseKind === "frame" ? "Profile Frames" :
                            browseKind === "badges" ? "Badge Catalogue" : "Local Profile Identity"}</strong>
                        <button type="button" className="larpcord-picker-close"
                            aria-label="Close cosmetic picker" title="Close"
                            onClick={() => setOpen(false)}>×</button>
                    </div>
                    <div className="larpcord-cosmetics-kind-tabs" role="tablist" aria-label="Browse local cosmetics">
                        {([
                            ["banner","Banners"],["nameplate","Nameplates"],["decoration","Decorations"],
                            ["effect","Effects"],["frame","Frames"],["badges","Badges"],["theme","Identity"]
                        ] as const).map(([value,title]) => (
                            <button type="button" role="tab" key={value} aria-selected={browseKind === value}
                                className={browseKind === value ? "is-active" : ""}
                                onClick={() => {
                                    setBrowseKind(value);
                                    setTab(value === "banner" || value === "nameplate" ? "custom" : "shop");
                                    setError("");
                                }}>{title}</button>
                        ))}
                    </div>
                    {customKind && browseKind !== "banner" && (
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
                    {tab === "shop" && browseKind !== "banner" && browseKind !== "theme" && browseKind !== "badges" && userId && (
                        <ShopGallery
                            key={browseKind}
                            kind={browseKind as ShopKind}
                            allowFrames={false}
                            userId={userId}
                        />
                    )}
                    {tab === "custom" && customKind && (
                        <p className="nexcord-native-popover-note">
                            Local-only selections apply immediately. Discord's original
                            Save and Apply controls are unchanged.
                        </p>
                    )}
                    {browseKind === "nameplate" && <p className="nexcord-native-popover-note">
                        Your local nameplate appears in the editor and on your
                        popout and member-list row (only you can see it).
                    </p>}
                    {browseKind === "theme" && userId && (
                        <div className="larpcord-local-theme-picker">
                            <p>Changes below are visible only in your own Larpcord profile view. Nothing is changed on your Discord account.</p>
                            <h4 className="larpcord-local-identity-header">Local Name & Username</h4>
                            <label className="larpcord-local-theme-row">
                                <span>Local display name</span>
                                <input ref={nameInput} type="text" maxLength={32} autoComplete="off" spellCheck={false}
                                    aria-label="Local display name" value={identityDraft.displayName}
                                    onFocus={() => setFocusedField("display")}
                                    onBlur={() => setFocusedField("none")}
                                    placeholder="Use real display name"
                                    onChange={event => {
                                        // React may clear currentTarget before the queued updater runs.
                                        // Capture the string synchronously, then update state with that value.
                                        const value = event.currentTarget.value;
                                        setIdentityDraft(old => ({ ...old, displayName: value }));
                                    }}
                                    onKeyDown={event => {
                                        if (event.key !== "Escape") event.stopPropagation();
                                    }}/>
                            </label>
                            <label className="larpcord-local-theme-row">
                                <span>Local username</span>
                                <input ref={usernameInput} type="text" maxLength={32} autoComplete="off" spellCheck={false}
                                    aria-label="Local username" value={identityDraft.username}
                                    onFocus={() => setFocusedField("username")}
                                    onBlur={() => setFocusedField("none")}
                                    placeholder="Use real username"
                                    onChange={event => {
                                        const value = event.currentTarget.value;
                                        setIdentityDraft(old => ({ ...old, username: value }));
                                    }}
                                    onKeyDown={event => {
                                        if (event.key !== "Escape") event.stopPropagation();
                                    }}/>
                            </label>
                            <small className="larpcord-identity-focus-status" role="status">
                                {focusedField === "display" ? "Typing in local display name" :
                                 focusedField === "username" ? "Typing in local username" :
                                 "Select either field to edit your local name"}
                            </small>
                            <button type="button" className="larpcord-local-theme-reset"
                                disabled={busy || (identityDraft.displayName === profileStyle.localDisplayName
                                    && identityDraft.username === profileStyle.localUsername)}
                                onClick={() => void saveProfileStyle({
                                    localDisplayName: identityDraft.displayName,
                                    localUsername: identityDraft.username,
                                    enabled: true
                                })}>{busy ? "Saving…" : "Save Local Names"}</button>
                            {(identityDraft.displayName !== profileStyle.localDisplayName ||
                              identityDraft.username !== profileStyle.localUsername) &&
                                <p role="status">Preview updated. Click Save Local Names to keep these changes.</p>}
                            <p>The saved names replace the text in your own profile view, not in messages or on Discord's servers.</p>
                            <div className="larpcord-local-theme-sample"
                                style={{
                                    borderColor: profileStyle.accent,
                                    background: profileStyle.background
                                }}>
                                <span style={{ color: profileStyle.accent }}>✦ Profile preview</span>
                                <strong>{identityDraft.displayName || UserStore.getCurrentUser()?.globalName || UserStore.getCurrentUser()?.username || "You"}</strong>
                                <small>@{identityDraft.username || UserStore.getCurrentUser()?.username || "you"}</small>
                                {(profileStyle.badges.length > 0 || profileStyle.badge !== "none") &&
                                    <small>✦ {(profileStyle.badges.map(id => badgeById(id)?.name).filter(Boolean).join(", ") || profileStyle.badge).toUpperCase()} · LOCAL</small>}
                            </div>
                            <label className="larpcord-local-theme-row">
                                <span>Enable local profile theme</span>
                                <input type="checkbox" checked={profileStyle.enabled} disabled={busy}
                                    onChange={e => void saveProfileStyle({ enabled: e.currentTarget.checked })}/>
                            </label>
                            <label className="larpcord-local-theme-row">
                                <span>Accent colour</span>
                                <input type="color" value={profileStyle.accent} disabled={busy}
                                    onChange={e => void saveProfileStyle({ accent: e.currentTarget.value, enabled: true })}/>
                            </label>
                            <label className="larpcord-local-theme-row">
                                <span>Profile background</span>
                                <input type="color" value={profileStyle.background} disabled={busy}
                                    onChange={e => void saveProfileStyle({ background: e.currentTarget.value, enabled: true })}/>
                            </label>
                            <span className="larpcord-local-theme-label">Extra decorative symbols</span>
                            <div className="larpcord-local-badge-presets" role="group" aria-label="Local badge previews">
                                {([
                                    ["none", "None"],["star", "Star"],["heart", "Heart"],
                                    ["moon", "Moon"],["cat", "Cat"]
                                ] as const).map(([badge, title]) => (
                                    <button type="button" key={badge} disabled={busy}
                                        aria-pressed={profileStyle.badge === badge}
                                        className={profileStyle.badge === badge ? "is-selected" : ""}
                                        onClick={() => void saveProfileStyle({ badge: badge as LocalBadge })}>
                                        {title}
                                    </button>
                                ))}
                            </div>
                            <button type="button" className="larpcord-local-theme-reset" disabled={busy}
                                onClick={() => void saveProfileStyle(DEFAULT_PROFILE_STYLE)}>Reset local profile</button>
                        </div>
                    )}
                    {browseKind === "badges" && (
                        <div className="larpcord-badges-browser">
                            <p>Choose as many local preview badges as you want, from any category. Your selected badges are shown in a scrollable section of your profile; Discord account entitlements are unchanged.</p>
                            <input type="search" aria-label="Search available badge previews"
                                placeholder="Search badges…" value={badgeSearch}
                                onChange={e => setBadgeSearch(e.currentTarget.value)}/>
                            <div className="larpcord-badge-categories" role="tablist" aria-label="Badge families">
                                {ALL_BADGES_BY_GROUP.map(group => (
                                    <button type="button" role="tab" key={group.key}
                                        aria-selected={badgeGroup === group.key && !badgeQuery}
                                        title={group.hint}
                                        onClick={() => { setBadgeGroup(group.key); setBadgeSearch(""); }}>
                                        {group.title}
                                        <small>{group.items.length}</small>
                                    </button>
                                ))}
                            </div>
                            <div className="larpcord-badge-sections">
                                {badgeGroupsVisible.map(group => (
                                    <section key={group.key} className="larpcord-badge-section"
                                        aria-label={group.title}>
                                        <div className="larpcord-badge-section-header">
                                            <strong>{group.title}</strong>
                                            <small>{group.items.length} choices · {group.hint}</small>
                                        </div>
                                        <div className="larpcord-badge-gallery">
                                            {group.items.map(item => (
                                                <button type="button" key={item.id} disabled={busy}
                                                    aria-pressed={activeBadges.includes(item.id)}
                                                    title={item.name + " — local preview, not an earned badge"}
                                                    onClick={() => void toggleBadge(item.id)}>
                                                    <span className="larpcord-badge-art"><b>{item.symbol}</b>
                                                        {item.image && <img loading="lazy" src={item.image} alt=""
                                                            onError={event => event.currentTarget.style.display = "none"}/>}
                                                    </span>
                                                    <strong>{item.name}</strong>
                                                    {activeBadges.includes(item.id) && <em>✓</em>}
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>
                            <small>{activeBadges.length} selected · {BADGE_IDS.size} available · Local preview only</small>
                            <button type="button" className="larpcord-local-theme-reset" disabled={busy || !activeBadges.length}
                                onClick={() => void saveProfileStyle({badges:[],badge:"none"})}>Clear Local Badges</button>
                            <p>Experimental milestone labels are community-indexed and may change. For the confirmed badge families, see
                                <a href="https://support.discord.com/hc/en-us/articles/44369363856663-Discord-Profile-Badges-What-Each-Badge-Means"
                                    target="_blank" rel="noreferrer">Discord's official badge guide</a>.
                                Classic and Nitro-tier artwork: <a href="https://github.com/merlinfuchs/discord-badges"
                                target="_blank" rel="noreferrer">Merlin</a> and <a
                                href="https://github.com/Fmasterpro27/Discord-badges" target="_blank" rel="noreferrer">JackMa</a>
                                and <a href="https://github.com/EliteZilla/Discord-Badges"
                                    target="_blank" rel="noreferrer">Discord Badge Archive</a>
                                (MIT-licensed). Local previews only; not earned badges.</p>
                        </div>
                    )}
                    {error && <p className="nexcord-native-popover-error" role="alert">{error}</p>}
                </div>, dialogHost
            )}
        </>
    );
}
