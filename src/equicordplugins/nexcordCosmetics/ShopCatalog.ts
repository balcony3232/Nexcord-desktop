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
    kind: ShopKind;
    name: string;
    previewUrl?: string;
    asset?: string;
    palette?: string;
    effect?: Record<string, unknown>;
    category?: string;
};

const CACHE_KEY = "nexcord.collectibles-catalog.v1";
const SELECT_KEY = "nexcord.collectibles-selected.v1";
const ONE_DAY = 24 * 60 * 60 * 1000;
const MAX_PRODUCTS = 1500;
const MAX_SELECTIONS = 500;
const SHOP_ASSETS = /^https:\/\/(?:cdn|media)\.discordapp\.com\//i;

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
function previewFor(item: Record<string, any>, product: Record<string, any>): string | undefined {
    const assets = record(product.preview_assets) ?? record(product.previewAssets) ?? {};
    const media = record(item.assets) ?? {};
    return safeImage(assets.fg_static) ?? safeImage(assets.fgStatic)
        ?? safeImage(assets.bg_static) ?? safeImage(assets.bgStatic)
        ?? safeImage(item.thumbnailPreviewSrc) ?? safeImage(item.thumbnail_preview_src)
        ?? safeImage(item.staticFrameSrc) ?? safeImage(item.static_frame_src)
        ?? safeImage(media.static_image_url) ?? safeImage(media.animated_image_url);
}
function normalize(product: Record<string, any>, raw: Record<string, any>, category?: string): ShopItem | undefined {
    const type = raw.type;
    const kind: ShopKind | undefined =
        type === 0 ? "decoration" : type === 1 ? "effect" :
        type === 2 ? "nameplate" : type === 3 ? "frame" : undefined;
    if (!kind) return;
    const id = sku(raw.sku_id) ?? sku(raw.skuId) ?? sku(product.sku_id) ?? sku(product.skuId);
    if (!id) return;
    const name = (string(product.name) ?? string(raw.label) ?? string(raw.title) ?? "Discord cosmetic").slice(0, 120);
    const asset = string(raw.asset);
    const palette = string(raw.palette);
    // A native nameplate needs the asset and palette, not just a picture.
    if (kind === "nameplate" && (!asset || !palette)) return;
    if (kind === "decoration" && !asset) return;
    const previewUrl = previewFor(raw, product);
    let effect: Record<string, unknown> | undefined;
    if (kind === "effect") {
        effect = {
            skuId: id,
            title: string(raw.title) ?? name,
            description: string(raw.description) ?? "",
            accessibilityLabel: string(raw.accessibilityLabel) ?? string(raw.accessibility_label) ?? name,
            thumbnailPreviewSrc: safeImage(raw.thumbnailPreviewSrc) ?? safeImage(raw.thumbnail_preview_src),
            reducedMotionSrc: safeImage(raw.reducedMotionSrc) ?? safeImage(raw.reduced_motion_src),
            staticFrameSrc: safeImage(raw.staticFrameSrc) ?? safeImage(raw.static_frame_src),
            // The full effect animation is intentionally not cached.
            type: 1
        };
    }
    return { skuId: id, kind, name, previewUrl, asset: asset?.slice(0, 500), palette: palette?.slice(0, 40), effect, category };
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
    return userId ? selections[userId]?.[kind] : undefined;
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
