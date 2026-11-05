/*
 * Nexcord's local-only Discord Shop gallery.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { React, showToast } from "@webpack/common";

import { applyShopItem, cachedShopItems, getShopSelection, loadShopCatalog, loadShopSelections, subscribeShop } from "./ShopCatalog";
import type { ShopItem, ShopKind } from "./ShopCatalog";
import { clearEffectLookupCache, inspectEffectDefinition } from "./EffectAssets";
import { applyAsset } from "./storage";
import { NameplateArtwork } from "./NameplateArtwork";

function EffectAssetStatus({ item, catalogLoaded, revision }: {
    item: ShopItem;
    catalogLoaded: boolean;
    revision: number;
}) {
    const [status, setStatus] = React.useState<"loading" | "ready" | "missing">("loading");
    const [details, setDetails] = React.useState("");
    const [storeStatus, setStoreStatus] = React.useState("");
    const [candidates, setCandidates] = React.useState<string[]>([]);
    React.useEffect(() => {
        if (!catalogLoaded) return;
        let alive = true;
        setStatus("loading");
        setDetails("");
        setStoreStatus("");
        void inspectEffectDefinition(item).then(result => {
            if (!alive) return;
            setStatus(result.definition ? "ready" : "missing");
            setDetails(result.reason + (result.definition?.previewOnly
                ? " It is a still image or limited Shop preview, not the complete animated effect." : ""));
            setStoreStatus(result.storeState ?? "");
            setCandidates(result.candidates);
        }).catch(error => {
            if (!alive) return;
            setStatus("missing");
            setDetails(error instanceof Error ? error.message : String(error));
        });
        return () => { alive = false; };
    }, [item.skuId, catalogLoaded, revision]);
    if (!catalogLoaded) return <p className="nexcord-shop-effect-status">Loading Shop product identifiers…</p>;
    return (
        <div className={"nexcord-shop-effect-status" + (status === "missing" ? " error" : "")}>
            {status === "loading" && "Looking up individual Discord effect animation tracks…"}
            {status === "ready" && "Effect artwork located. Nexcord will try to render it on your local profile."}
            {status === "missing" && "No animation found for this selection; it remains a saved local preview."}
            {!!storeStatus && <div className="nexcord-shop-effect-detail">Local Discord effect store: {storeStatus}.</div>}
            {!!details && <div className="nexcord-shop-effect-detail">{details}</div>}
            {status === "missing" && !!candidates.length &&
                <div className="nexcord-shop-effect-detail">Checked public cosmetic IDs: {candidates.join(", ")}</div>}
        </div>
    );
}

export function ShopGallery({
    kind,
    userId,
    allowFrames = false
}: {
    kind: ShopKind;
    userId: string;
    allowFrames?: boolean;
}) {
    const [search, setSearch] = React.useState("");
    const [activeKind, setActiveKind] = React.useState<ShopKind>(kind);
    const [busy, setBusy] = React.useState(false);
    const [loaded, setLoaded] = React.useState(false);
    const [error, setError] = React.useState("");
    const [feedback, setFeedback] = React.useState("");
    const [catalogRevision, setCatalogRevision] = React.useState(0);
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
    const saved = getShopSelection(userId, activeKind);
    const selected = activeKind === "nameplate" && saved
        ? all.find(item => item.skuId === saved.skuId) ?? saved : saved;
    const shown = options.slice(0, 60);

    async function refreshCatalog() {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const results = await loadShopCatalog(true);
            clearEffectLookupCache();
            setCatalogRevision(value => value + 1);
            setLoaded(true);
            showToast({ text: "Loaded " + results.length + " Discord Shop items", variant: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    async function select(item?: ShopItem) {
        if (busy) return;
        setBusy(true);
        setError("");
        setFeedback("");
        try {
            // The catalogue frequently contains bundles that have no
            // individual, renderable effect animation in their details.
            // Saving a *local preview* must not depend on resolving those
            // assets: it is just a selection, not a Discord purchase.
            await applyShopItem(userId, activeKind, item);
            if (activeKind === "nameplate") await applyAsset(userId, "nameplate", undefined);
            setFeedback(item
                ? "Selected: " + item.name + " — saved locally for preview."
                : "Selection cleared. No local " + activeKind + " preview.");
            showToast({
                text: item
                    ? "Saved local " + activeKind + " preview: " + item.name
                    : "Cleared local " + activeKind + " preview",
                variant: "success"
            });
            // Intentionally keep the Shop panel open: the active tile and
            // item preview must remain visible after a click.
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
                    <button type="button" className={activeKind === "frame" ? "nexcord-shop-kind-active" : ""} onClick={() => setActiveKind("frame")}>Frames</button>
                </div>
            )}
            <p className="nexcord-shop-gallery-info">
                {activeKind === "nameplate"
                    ? "Individual nameplates, with local rendering in the editor, profile popout and member list. Nothing is purchased or unlocked."
                    : "Select a cosmetic to preview locally. Frames show their preview artwork; profile effects render where animation assets exist. Nothing is purchased or unlocked."}
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
                <button type="button" disabled={busy}
                    className={!selected ? "nexcord-shop-gallery-selected" : ""}
                    onClick={() => void select(undefined)}
                    title="Remove local Discord Shop selection">
                    <span className="nexcord-shop-none">⊘</span>
                    <small>None</small>
                </button>
                {shown.map(item => (
                    <button type="button" key={item.skuId} disabled={busy}
                        title={item.name + " — select a local preview"}
                        aria-pressed={selected?.skuId === item.skuId}
                        className={selected?.skuId === item.skuId ? "nexcord-shop-gallery-selected" : ""}
                        onClick={() => void select(item)}>
                        {activeKind === "nameplate"
                            ? <NameplateArtwork item={item} userId={userId} compact />
                            : item.previewUrl
                                ? <img loading="lazy" src={item.previewUrl} alt="" />
                            : <span className="nexcord-shop-none">✦</span>}
                        <small>{item.name}</small>
                        {selected?.skuId === item.skuId && <span className="nexcord-shop-card-check" aria-hidden="true">✓</span>}
                    </button>
                ))}
            </div>
            {activeKind === "effect" && selected && <EffectAssetStatus item={selected} catalogLoaded={loaded || all.length > 0} revision={catalogRevision} />}
            {feedback && <p className="nexcord-shop-gallery-feedback" role="status">{feedback}</p>}
            {error && <p role="alert" className="nexcord-native-popover-error">{error}</p>}
            {!loaded && !all.length && !error && <p className="nexcord-shop-gallery-info">Loading items from Discord’s Shop…</p>}
            {loaded && !all.length && <p className="nexcord-shop-gallery-info">No items of this type are currently available in the catalogue.</p>}
            {selected && (
                <div className="nexcord-shop-selected-preview">
                    {activeKind === "nameplate"
                        ? <NameplateArtwork item={selected} userId={userId} compact />
                        : selected.previewUrl
                            ? <img src={selected.previewUrl} alt="" />
                        : <span className="nexcord-shop-preview-placeholder">✦</span>}
                    <div>
                        <strong>{selected.name}</strong>
                        <span>Selected · Saved locally</span>
                        <small>{activeKind === "nameplate"
                            ? "Locally applied to your editor, self popout and member row."
                            : "An effect overlay is shown locally when animation assets are available."}</small>
                    </div>
                </div>
            )}
            <p className="nexcord-shop-gallery-info">Some retired, event-exclusive or unavailable items may not appear. Preview images are loaded from Discord’s CDN when viewed.</p>
            {activeKind === "frame" && <p className="nexcord-shop-gallery-info">Selected frame artwork is displayed as a local labelled preview; it does not equip a real Discord collectible.</p>}
        </div>
    );
}
