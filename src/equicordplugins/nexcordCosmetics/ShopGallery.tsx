/*
 * Nexcord's local-only Discord Shop gallery.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { React, showToast } from "@webpack/common";

import { applyShopItem, cachedShopItems, getShopSelection, loadShopCatalog, loadShopSelections, resolveRenderableItem, subscribeShop } from "./ShopCatalog";
import type { ShopKind } from "./ShopCatalog";

export function ShopGallery({
    kind,
    userId,
    onApplied,
    allowFrames = false
}: {
    kind: ShopKind;
    userId: string;
    onApplied?: () => void;
    allowFrames?: boolean;
}) {
    const [search, setSearch] = React.useState("");
    const [activeKind, setActiveKind] = React.useState<ShopKind>(kind);
    const [busy, setBusy] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState("");
    const [, refresh] = React.useReducer((n: number) => n + 1, 0);

    React.useEffect(() => subscribeShop(refresh), []);
    React.useEffect(() => {
        let active = true;
        void loadShopSelections().then(() => { if (active) refresh(); }).catch(() => {});
        void loadShopCatalog().then(() => { if (active) setLoaded(true); })
            .catch(e => { if (active) setError(e instanceof Error ? e.message : String(e)); });
        return () => { active = false; };
    }, []);

    const all = cachedShopItems(activeKind);
    const options = search.trim()
        ? all.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()))
        : all;
    const selected = getShopSelection(userId, activeKind);
    const shown = options.slice(0, 60);

    async function refreshCatalog() {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const results = await loadShopCatalog(true);
            setLoaded(true);
            showToast({ text: "Loaded " + results.length + " Discord Shop items", variant: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    async function select(item?: typeof selected) {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            if (activeKind === "frame") throw new Error("Local profile frame rendering is not available yet");
            // Resolve the individual collectible and required native render
            // data before claiming an effect was applied successfully.
            const resolved = item ? await resolveRenderableItem(item) : undefined;
            await applyShopItem(userId, activeKind, resolved);
            showToast({
                text: resolved
                    ? "Local " + activeKind + " preview saved: " + resolved.name + ". Native display is paused for compatibility."
                    : "Local " + activeKind + " preview removed",
                variant: "success"
            });
            onApplied?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="nexcord-shop-gallery">
            <div className="nexcord-shop-gallery-header">
                <strong>Discord Shop</strong>
                <button type="button" onClick={() => void refreshCatalog()} disabled={busy}>Refresh</button>
            </div>
            {allowFrames && (
                <div className="nexcord-shop-kinds">
                    <button type="button" className={activeKind === "effect" ? "nexcord-shop-kind-active" : ""} onClick={() => setActiveKind("effect")}>Effects</button>
                    <button type="button" className={activeKind === "frame" ? "nexcord-shop-kind-active" : ""} onClick={() => setActiveKind("frame")}>Frames (preview)</button>
                </div>
            )}
            <p className="nexcord-shop-gallery-info">
                Browse currently listed Discord collectibles and save your choices for local preview. Native collectible rendering is temporarily paused; no purchases or entitlements are changed.
            </p>
            <input
                className="nexcord-shop-gallery-search"
                type="search"
                aria-label={"Search Discord Shop " + activeKind + "s"}
                placeholder={"Search " + activeKind + "s"}
                value={search}
                onChange={event => setSearch(event.currentTarget.value)}
            />
            <div className="nexcord-shop-gallery-count">
                {loaded || all.length ? all.length + " available · " : "Loading catalogue · "}
                {options.length > 60 ? "Showing first 60 matches" : options.length + " shown"}
            </div>
            <div className="nexcord-shop-gallery-grid">
                <button type="button" disabled={busy || activeKind === "frame"}
                    className={!selected ? "nexcord-shop-gallery-selected" : ""}
                    onClick={() => void select(undefined)}
                    title="Remove local Discord Shop selection">
                    <span className="nexcord-shop-none">⊘</span>
                    <small>None</small>
                </button>
                {shown.map(item => (
                    <button type="button" key={item.skuId} disabled={busy || activeKind === "frame"}
                        title={item.name + " — local preview only"}
                        aria-pressed={selected?.skuId === item.skuId}
                        className={selected?.skuId === item.skuId ? "nexcord-shop-gallery-selected" : ""}
                        onClick={() => void select(item)}>
                        {item.previewUrl
                            ? <img loading="lazy" src={item.previewUrl} alt="" />
                            : <span className="nexcord-shop-none">✦</span>}
                        <small>{item.name}</small>
                    </button>
                ))}
            </div>
            {error && <p role="alert" className="nexcord-native-popover-error">{error}</p>}
            {!loaded && !all.length && !error && <p className="nexcord-shop-gallery-info">Loading items from Discord’s Shop…</p>}
            {loaded && !all.length && <p className="nexcord-shop-gallery-info">No items of this type are currently available in the catalogue.</p>}
            {selected && <p className="nexcord-shop-gallery-info"><strong>Saved preview:</strong> {selected.name}. Native rendering is temporarily disabled while the profile and Nitro compatibility issue is investigated.</p>}
            <p className="nexcord-shop-gallery-info">Some retired, event-exclusive or unavailable items may not appear. Preview images are loaded from Discord’s CDN when viewed.</p>
            {activeKind === "frame" && <p className="nexcord-shop-gallery-info">Profile frame display is not yet supported; use this section to explore the catalogue.</p>}
        </div>
    );
}
