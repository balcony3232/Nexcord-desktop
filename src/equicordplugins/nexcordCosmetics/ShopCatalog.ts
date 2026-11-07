/*
 * Nexcord Shop catalogue — metadata-only local previews.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Reads the public storefront through Discord's existing REST client.
 * Does not purchase, claim, change entitlements, or send any profile updates.
 * Images are served by Discord's CDN on demand, NOT bulk-downloaded.
 */
import * as DataStore from "@api/DataStore";
import { RestAPI } from "@webpack/common";

export type ShopKind = "nameplate" | "decoration" | "effect" | "frame";
export type ShopItem = {
    skuId: string;
    /** Parent shop product (often a bundle), distinct from the actual effect SKU. */
    productSkuId?: string;
    /** Collectible effect/config ID, which may differ from its SKU. */
    itemId?: string;
    kind: ShopKind;
    name: string;
    previewUrl?: string;
    /** Animated foreground supplied by the Shop, not necessarily native effect tracks. */
    animatedPreviewUrl?: string;
    asset?: string;
    palette?: string;
    /** Actual per-nameplate assets, not the parent bundle's showcase graphics. */
    nameplateStaticUrl?: string;
    nameplateAnimatedUrl?: string;
    nameplateVideoUrl?: string;
    effect?: Record<string, unknown>;
    category?: string;
};

// Refresh cached entries when their individual/bundle SKU schema changes.
const CACHE_KEY = "nexcord.collectibles-catalog.v5";
const SELECT_KEY = "nexcord.collectibles-selected.v1";
const ONE_DAY = 24 * 60 * 60 * 1000;
const MAX_PRODUCTS = 5000;
const MAX_SELECTIONS = 500;
const SHOP_ASSETS = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.com|media\.discordapp\.net)\//i;

type CachedShop = { savedAt: number; items: ShopItem[]; };
type Selections = Record<string, Partial<Record<ShopKind, ShopItem>>>;

let cached: CachedShop | undefined;
let loadPromise: Promise<ShopItem[]> | undefined;
let selections: Selections = {};
let selectionsLoaded = false;
let selectionsLoading: Promise<void> | undefined;
const listeners = new Set<() => void>();
function notify() { for (const callback of listeners) callback(); }
export function subscribeShop(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function record(value: unknown): Record<string, any> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    return value as Record<string, any>;
}
function string(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}
function sku(value: unknown): string | undefined {
    const candidate = typeof value === "number" ? String(value) : value;
    return typeof candidate === "string" && /^\d{15,22}$/.test(candidate) ? candidate : undefined;
}
function safeImage(value: unknown): string | undefined {
    return typeof value === "string" && SHOP_ASSETS.test(value) && value.length < 700
        ? value : undefined;
}
function previewFor(item: Record<string, any>, individualProduct?: Record<string, any>): string | undefined {
    const media = record(item.assets) ?? {};
    // The actual cosmetic takes precedence over its product card. Bundles
    // display collages and must NEVER be used as an individual preview.
    const direct = safeImage(media.static_image_url) ?? safeImage(media.staticImageUrl)
        ?? safeImage(media.animated_image_url) ?? safeImage(media.animatedImageUrl)
        ?? safeImage(item.thumbnailPreviewSrc) ?? safeImage(item.thumbnail_preview_src)
        ?? safeImage(item.staticFrameSrc) ?? safeImage(item.static_frame_src);
    if (direct) return direct;
    const assets = record(individualProduct?.preview_assets)
        ?? record(individualProduct?.previewAssets) ?? {};
    return safeImage(assets.fg_static) ?? safeImage(assets.fgStatic)
        ?? safeImage(assets.bg_static) ?? safeImage(assets.bgStatic);
}
function normalize(product: Record<string, any>, raw: Record<string, any>, category?: string): ShopItem | undefined {
    const type = raw.type;
    const kind: ShopKind | undefined =
        type === 0 ? "decoration" : type === 1 ? "effect" :
        type === 2 ? "nameplate" : type === 3 ? "frame" : undefined;
    if (!kind) return;
    const id = sku(raw.sku_id) ?? sku(raw.skuId)
        ?? (product.type === 1000 ? undefined : sku(product.sku_id) ?? sku(product.skuId));
    if (!id) return;
    // A bundle can contain multiple separately-rendered cosmetics.
    // Name each option for its individual item, not just its enclosing bundle.
    const members = (Array.isArray(product.bundled_products) ? product.bundled_products
        : Array.isArray(product.bundledProducts) ? product.bundledProducts : []) as Record<string, any>[];
    const matchingMember = members.find(member =>
        sku(member.sku_id) === id || sku(member.skuId) === id
        || (Array.isArray(member.items) && member.items.some((part: Record<string, any>) =>
            sku(part.sku_id) === id || sku(part.skuId) === id)));
    const isBundle = product.type === 1000;
    // A bundle containing a cosmetic isn't the cosmetic itself. Require an
    // identifiable child item and never use its parent thumbnail or SKU.
    if (isBundle && !matchingMember && !string(raw.title) && !string(raw.label)) return;
    const asset = string(raw.asset);
    const palette = string(raw.palette);
    const individualName = string(matchingMember?.name)
        ?? (!isBundle ? string(product.name) : undefined);
    // Nameplates commonly have a descriptive accessibility `label` rather
    // than a product title. Never use the parent bundle's showcase name when
    // the item has its own SKU and an identifiable name.
    const baseName = string(product.name)?.replace(/\s+Bundle$/i, "").trim() ?? "Nameplate";
    const variant = asset?.split("/").filter(Boolean).at(-1)?.replace(/[_-]/g, " ");
    const specificName = variant && !baseName.toLowerCase().includes(variant.toLowerCase())
        ? baseName + " (" + variant.replace(/\b\w/g, c => c.toUpperCase()) + ")"
        : baseName;
    const name = (kind === "nameplate"
        ? (string(raw.title) ?? individualName ?? string(raw.label) ?? specificName)
        : (string(raw.title) ?? individualName ?? string(raw.label)
            ?? (isBundle ? undefined : string(product.name)) ?? "Discord cosmetic")
    ).slice(0, 120);
    // A native nameplate needs the asset and palette, not just a picture.
    if (kind === "nameplate" && (!asset || !palette)) return;
    if (kind === "decoration" && !asset) return;
    const itemAssets = record(raw.assets) ?? {};
    const itemStatic = safeImage(itemAssets.static_image_url) ?? safeImage(itemAssets.staticImageUrl);
    const itemAnimated = safeImage(itemAssets.animated_image_url) ?? safeImage(itemAssets.animatedImageUrl);
    const itemVideo = safeImage(itemAssets.video_url) ?? safeImage(itemAssets.videoUrl);
    const productForPreview = matchingMember ?? (isBundle ? undefined : product);
    const previewUrl = kind === "nameplate"
        ? itemStatic ?? itemAnimated ?? previewFor(raw, productForPreview)
        : previewFor(raw, productForPreview);
    const previewAssets = record(productForPreview?.preview_assets)
        ?? record(productForPreview?.previewAssets) ?? {};
    const animatedPreviewUrl = itemAnimated
        ?? safeImage(previewAssets.fg_animated)
        ?? safeImage(previewAssets.fgAnimated);
    let effect: Record<string, unknown> | undefined;
    if (kind === "effect") {
        effect = {
            skuId: id,
            title: string(raw.title) ?? name,
            description: string(raw.description) ?? "",
            accessibilityLabel: string(raw.accessibilityLabel) ?? string(raw.accessibility_label) ?? name,
            thumbnailPreviewSrc: safeImage(raw.thumbnailPreviewSrc) ?? safeImage(raw.thumbnail_preview_src),
            reducedMotionSrc: safeImage(raw.reducedMotionSrc) ?? safeImage(raw.reduced_motion_src),
            // Some current Shop entries offer an animated *preview* but no
            // full effect layer list. Use it only as a clearly labeled visual fallback.
            previewAnimatedSrc: animatedPreviewUrl,
            staticFrameSrc: safeImage(raw.staticFrameSrc) ?? safeImage(raw.static_frame_src),
            animationType: typeof raw.animationType === "number" ? raw.animationType
                : typeof raw.animation_type === "number" ? raw.animation_type : undefined,
            effects: Array.isArray(raw.effects) ? raw.effects : undefined,
            type: 1
        };
    }
    return {
        skuId: id,
        productSkuId: sku(product.sku_id) ?? sku(product.skuId),
        itemId: sku(raw.id),
        kind, name, previewUrl, animatedPreviewUrl, asset: asset?.slice(0, 500),
        palette: palette?.slice(0, 40),
        nameplateStaticUrl: kind === "nameplate" ? itemStatic : undefined,
        nameplateAnimatedUrl: kind === "nameplate" ? itemAnimated : undefined,
        nameplateVideoUrl: kind === "nameplate" ? itemVideo : undefined,
        effect, category
    };
}

/**
 * Check a selected Shop card against Discord's individual product endpoint.
 * A catalogue card can represent a bundle, and the compact listing often
 * omits the animation tracks required by the native effect renderer.
 *
 * Never accept a "successful" selection without an actual renderable item.
 * This is a read-only Discord Shop request; it doesn't alter entitlements.
 */
export async function resolveRenderableItem(item: ShopItem): Promise<ShopItem> {
    if (item.kind === "frame") throw new Error("Profile frames are preview-only for now.");
    const detail = await RestAPI.get({
        url: "/collectibles-products/" + item.skuId,
        retries: 2
    });

    const candidates: Array<{ value: Record<string, any>; matchedId?: string; }> = [];
    const visited = new WeakSet<object>();
    const walk = (value: unknown, depth: number) => {
        if (!value || typeof value !== "object" || visited.has(value) || depth > 12) return;
        visited.add(value);
        if (Array.isArray(value)) {
            for (const child of value) walk(child, depth + 1);
            return;
        }
        const obj = record(value);
        if (!obj) return;
        const type = obj.type;
        const kind = type === 0 ? "decoration" : type === 1 ? "effect"
            : type === 2 ? "nameplate" : type === 3 ? "frame" : undefined;
        if (kind === item.kind) {
            const id = sku(obj.sku_id) ?? sku(obj.skuId);
            candidates.push({ value: obj, matchedId: id });
        }
        for (const key of ["items", "variants", "products", "bundledProducts", "bundled_products", "data", "body"]) {
            if (obj[key]) walk(obj[key], depth + 1);
        }
    };
    walk(detail.body, 0);
    const match = candidates.find(candidate => candidate.matchedId === item.skuId)
        ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!match) {
        throw new Error("Couldn't identify the individual cosmetic in this Shop bundle. Try a different item.");
    }

    const raw = match.value;
    const actualId = match.matchedId ?? item.skuId;
    const resolved: ShopItem = {
        ...item,
        skuId: actualId,
        asset: string(raw.asset) ?? item.asset,
        palette: string(raw.palette) ?? item.palette,
        name: (string(raw.title) ?? string(raw.label) ?? item.name).slice(0, 120)
    };
    if (item.kind === "nameplate") {
        if (!resolved.asset || !resolved.palette) {
            throw new Error("This nameplate has no renderable asset or palette.");
        }
    }
    if (item.kind === "decoration" && !resolved.asset) {
        throw new Error("This avatar decoration has no renderable asset.");
    }
    if (item.kind === "effect") {
        const tracks = Array.isArray(raw.effects) ? raw.effects : undefined;
        if (!tracks?.length) {
            throw new Error("This bundle doesn't expose its profile-effect animation data. Nexcord can't render it yet.");
        }
        const animationType = typeof raw.animationType === "number" ? raw.animationType
            : typeof raw.animation_type === "number" ? raw.animation_type : undefined;
        resolved.effect = {
            type: 1,
            skuId: actualId,
            title: string(raw.title) ?? resolved.name,
            description: string(raw.description) ?? "",
            accessibilityLabel: string(raw.accessibilityLabel) ?? string(raw.accessibility_label) ?? resolved.name,
            thumbnailPreviewSrc: safeImage(raw.thumbnailPreviewSrc) ?? safeImage(raw.thumbnail_preview_src),
            reducedMotionSrc: safeImage(raw.reducedMotionSrc) ?? safeImage(raw.reduced_motion_src),
            staticFrameSrc: safeImage(raw.staticFrameSrc) ?? safeImage(raw.static_frame_src),
            effects: tracks,
            animationType
        };
    }
    return resolved;
}

export function parseShopResponse(payload: unknown): ShopItem[] {
    // The /collectibles-categories and /collectibles-shop responses can be
    // nested under different keys across Discord versions.
    const results: ShopItem[] = [];
    const known = new Set<string>();
    const seen = new WeakSet<object>();
    const traverse = (value: unknown, category: string | undefined, depth: number) => {
        if (depth > 10 || results.length >= MAX_PRODUCTS || !value || typeof value !== "object") return;
        if (seen.has(value)) return;
        seen.add(value);
        if (Array.isArray(value)) {
            for (const child of value) traverse(child, category, depth + 1);
            return;
        }
        const obj = record(value);
        if (!obj) return;
        const nextCategory = typeof obj.name === "string" && Array.isArray(obj.products)
            ? obj.name.slice(0, 90) : category;
        if (Array.isArray(obj.items)) {
            for (const raw of obj.items) {
                const item = record(raw);
                if (!item) continue;
                const normalized = normalize(obj, item, category);
                if (!normalized || known.has(normalized.kind + ":" + normalized.skuId)) continue;
                known.add(normalized.kind + ":" + normalized.skuId);
                results.push(normalized);
            }
        }
        // Limit traversal to recognized shop response containers.
        for (const key of ["categories", "products", "variants", "bundled_products",
            "bundledProducts", "items", "blocks", "sections", "shop",
            "data", "body", "tabs", "entries", "content", "featured"]) {
            if (obj[key] && typeof obj[key] === "object") traverse(obj[key], nextCategory, depth + 1);
        }
    };
    traverse(payload, undefined, 0);
    return results;
}

function validItem(value: unknown): value is ShopItem {
    const v = record(value);
    return !!v && !!sku(v.skuId)
        && ["nameplate", "decoration", "effect", "frame"].includes(v.kind)
        && typeof v.name === "string" && v.name.length <= 120
        && (!v.previewUrl || !!safeImage(v.previewUrl))
        && (!v.animatedPreviewUrl || !!safeImage(v.animatedPreviewUrl))
        && (!v.nameplateStaticUrl || !!safeImage(v.nameplateStaticUrl))
        && (!v.nameplateAnimatedUrl || !!safeImage(v.nameplateAnimatedUrl))
        && (!v.nameplateVideoUrl || !!safeImage(v.nameplateVideoUrl))
        && (!v.asset || typeof v.asset === "string" && v.asset.length < 501);
}

export async function loadShopCatalog(force = false): Promise<ShopItem[]> {
    if (!force && cached && Date.now() - cached.savedAt < ONE_DAY) return cached.items;
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
        if (!force && !cached) {
            try {
                const saved = await DataStore.get<CachedShop>(CACHE_KEY);
                if (saved && Array.isArray(saved.items) && typeof saved.savedAt === "number") {
                    cached = { savedAt: saved.savedAt, items: saved.items.filter(validItem).slice(0, MAX_PRODUCTS) };
                    notify();
                    if (cached.items.length && Date.now() - cached.savedAt < ONE_DAY) return cached.items;
                }
            } catch { /* Continue to live catalogue */ }
        }
        let lastError: unknown;
        for (const path of ["/collectibles-categories/v2", "/collectibles-categories"]) {
            try {
                const response = await RestAPI.get({ url: path, retries: 1 });
                const items = parseShopResponse(response.body);
                if (!items.length) throw new Error("Discord returned an unrecognised catalogue format");
                cached = { savedAt: Date.now(), items };
                await DataStore.set(CACHE_KEY, cached).catch(() => {});
                notify();
                return items;
            } catch (error) {
                lastError = error;
            }
        }
        if (cached?.items.length) return cached.items;
        throw lastError ?? new Error("Discord Shop is unavailable");
    })().finally(() => { loadPromise = undefined; });
    return loadPromise;
}

export function cachedShopItems(kind?: ShopKind): ShopItem[] {
    return kind ? (cached?.items ?? []).filter(item => item.kind === kind) : cached?.items ?? [];
}
export async function loadShopSelections() {
    if (selectionsLoaded) return;
    if (!selectionsLoading) {
        selectionsLoading = (async () => {
            const saved = await DataStore.get<Selections>(SELECT_KEY);
            if (saved && typeof saved === "object" && !Array.isArray(saved)) {
                const next: Selections = {};
                for (const [userId, kinds] of Object.entries(saved).slice(0, MAX_SELECTIONS)) {
                    if (!/^\d{15,22}$/.test(userId) || !kinds || typeof kinds !== "object") continue;
                    const valid: Partial<Record<ShopKind, ShopItem>> = {};
                    for (const kind of ["nameplate", "decoration", "effect", "frame"] as const) {
                        const item = kinds[kind];
                        if (validItem(item) && item.kind === kind) valid[kind] = item;
                    }
                    next[userId] = valid;
                }
                selections = next;
            }
            selectionsLoaded = true;
            notify();
        })().catch(error => { selectionsLoading = undefined; throw error; });
    }
    return selectionsLoading;
}
export function getShopSelection(userId: string | undefined, kind: ShopKind): ShopItem | undefined {
    const selected = userId ? selections[userId]?.[kind] : undefined;
    if (!selected) return;
    // Saved local previews from the old catalogue may still carry the bundle
    // showcase art. Prefer the refreshed individual SKU metadata in memory.
    return cached?.items.find(item => item.kind === kind && item.skuId === selected.skuId)
        ?? selected;
}
export async function applyShopItem(userId: string, kind: ShopKind, item?: ShopItem) {
    if (!/^\d{15,22}$/.test(userId)) throw new Error("Invalid user ID");
    if (item && (!validItem(item) || item.kind !== kind)) throw new Error("Invalid cosmetic");
    await loadShopSelections();
    const nextUser = { ...selections[userId] };
    if (item) nextUser[kind] = item;
    else delete nextUser[kind];
    const next = { ...selections, [userId]: nextUser };
    await DataStore.set(SELECT_KEY, next);
    selections = next;
    notify();
}
