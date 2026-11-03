/*
 * Local-only Discord profile-effect animation definitions.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Fetches effect layers from Discord's read-only /user-profile-effects endpoint
 * on demand. Does not modify entitlements or user/profile stores.
 */
import { RestAPI } from "@webpack/common";
import { findStore } from "@webpack";

import { cachedShopItems } from "./ShopCatalog";
import type { ShopItem } from "./ShopCatalog";

export interface EffectLayer {
    src: string;
    width: number;
    height: number;
    duration: number;
    start: number;
    loop: boolean;
    position: { x: number; y: number; };
    zIndex: number;
}

export interface EffectDefinition {
    skuId: string;
    itemId?: string;
    name: string;
    layers: EffectLayer[];
    reducedMotionSrc?: string;
    staticFrameSrc?: string;
}
const CDN = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net)\/assets\/profile_effects\//;
const MAX_LAYERS = 16;
const MAX_DEFINITIONS = 1500;
let definitionsPromise: Promise<Map<string, EffectDefinition>> | undefined;

function object(input: unknown): Record<string, unknown> | undefined {
    if (!input || typeof input !== "object" || Array.isArray(input)) return;
    return input as Record<string, unknown>;
}
function id(input: unknown): string | undefined {
    return typeof input === "string" && /^\d{15,22}$/.test(input) ? input : undefined;
}
function cdn(input: unknown): string | undefined {
    return typeof input === "string" && input.length < 1024 && CDN.test(input) ? input : undefined;
}
function number(input: unknown, fallback: number, min: number, max: number): number {
    return typeof input === "number" && Number.isFinite(input)
        ? Math.max(min, Math.min(max, input)) : fallback;
}
function parseLayer(input: unknown): EffectLayer | undefined {
    const l = object(input);
    if (!l) return;
    const position = object(l.position);
    const alternate = Array.isArray(l.randomizedSources)
        ? l.randomizedSources.map(object).map(value => cdn(value?.src)).find(Boolean) : undefined;
    const src = cdn(l.src) ?? alternate;
    if (!src) return;
    return {
        src,
        width: number(l.width, 450, 1, 2400),
        height: number(l.height, 880, 1, 2800),
        duration: number(l.duration, 3000, 0, 60000),
        start: number(l.start, 0, 0, 60000),
        loop: l.loop === true,
        position: { x: number(position?.x, 0, -1500, 1500), y: number(position?.y, 0, -1500, 1500) },
        zIndex: number(l.zIndex, 100, -1000, 1000)
    };
}
function parseDefinition(input: unknown): EffectDefinition | undefined {
    const e = object(input);
    if (!e) return;
    const skuId = id(e.skuId) ?? id(e.sku_id);
    const itemId = id(e.id);
    if ((!skuId && !itemId) || !Array.isArray(e.effects)) return;
    const layers = e.effects.slice(0, MAX_LAYERS).map(parseLayer).filter((layer): layer is EffectLayer => !!layer);
    const reducedMotionSrc = cdn(e.reducedMotionSrc) ?? cdn(e.reduced_motion_src);
    const staticFrameSrc = cdn(e.staticFrameSrc) ?? cdn(e.static_frame_src);
    if (!layers.length && !reducedMotionSrc && !staticFrameSrc) return;
    return {
        skuId: skuId ?? itemId!,
        itemId,
        name: typeof e.title === "string" ? e.title.slice(0, 120) : "Profile Effect",
        layers,
        reducedMotionSrc,
        staticFrameSrc
    };
}
function parseResponse(body: unknown): Map<string, EffectDefinition> {
    const definitions = new Map<string, EffectDefinition>();
    const seen = new WeakSet<object>();
    function visit(value: unknown, depth: number) {
        if (!value || typeof value !== "object" || depth > 6 || seen.has(value) || definitions.size >= MAX_DEFINITIONS) return;
        seen.add(value);
        if (Array.isArray(value)) {
            for (const item of value) visit(item, depth + 1);
            return;
        }
        const obj = object(value);
        if (!obj) return;
        const parsed = parseDefinition(obj);
        if (parsed) {
            definitions.set(parsed.skuId, parsed);
            if (parsed.itemId) definitions.set(parsed.itemId, parsed);
        }
        // Discord's /user-profile-effects endpoint returns an object with
        // `profile_effect_configs`, NOT `profile_effects`. Omitting this
        // container made every entry look like it lacked animation layers.
        for (const key of ["profile_effect_configs", "profileEffectConfigs", "profile_effects", "profileEffects", "effects", "data", "body", "items", "products", "bundled_products", "bundledProducts"]) {
            const child = obj[key];
            if (child && typeof child === "object") visit(child, depth + 1);
        }
    }
    visit(body, 0);
    return definitions;
}
async function getDefinitions(): Promise<Map<string, EffectDefinition>> {
    if (!definitionsPromise) {
        definitionsPromise = RestAPI.get({ url: "/user-profile-effects", retries: 1 })
            .then(response => parseResponse(response.body))
            .catch(error => {
                definitionsPromise = undefined;
                throw error;
            });
    }
    return definitionsPromise;
}

export interface EffectLookup {
    definition?: EffectDefinition;
    /** Number of unique effect configurations returned by Discord's list endpoint. */
    availableConfigs: number;
    /** Read-only collectible SKU and effect ID candidates, not user data. */
    candidates: string[];
    reason: string;
    /** Whether Discord's locally loaded effect store was checked. */
    storeState?: string;
}

const lookupPromises = new Map<string, Promise<EffectLookup>>();
function normalizedName(input: string) {
    return input.toLocaleLowerCase().replace(/\s+bundle$/i, "").replace(/[^a-z0-9]/g, "");
}
function findMatch(definitions: Map<string, EffectDefinition>, ids: string[], name: string): EffectDefinition | undefined {
    for (const candidate of ids) {
        const found = definitions.get(candidate);
        if (found) return found;
    }
    // Some Shop cards represent a bundle while the effects endpoint exposes
    // only the individual cosmetic. Fallback to its exact title, but never
    // arbitrarily choose the first effect from a multi-item bundle.
    const base = normalizedName(name);
    if (base.length < 5) return;
    const matches = [...new Set(definitions.values())]
        .filter(effect => normalizedName(effect.name) === base);
    return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Read Discord's existing ProfileEffectStore. This is the same local store
 * used by Discord's own profile-effect UI. We do not patch its methods,
 * data, purchase checks or user/profile stores.
 *
 * Store shape varies by client version, so check both its accessor and
 * indexed configuration map. Errors are caught and summarised without
 * dumping personal account/profile information.
 */
function lookupLoadedProfileEffects(ids: string[], name: string): {
    definition?: EffectDefinition;
    state: string;
    count: number;
} {
    let store: any;
    try {
        store = findStore("ProfileEffectStore");
    } catch {
        return { state: "Discord ProfileEffectStore not loaded", count: 0 };
    }
    if (!store) return { state: "Discord ProfileEffectStore not available", count: 0 };

    const configs = new Map<string, EffectDefinition>();
    const raw = store.profileEffects;
    if (raw && typeof raw === "object") {
        let entries: unknown[] = [];
        if (raw instanceof Map) entries = [...raw.values()];
        else if (Array.isArray(raw)) entries = raw;
        else entries = Object.values(raw);
        for (const value of entries.slice(0, MAX_DEFINITIONS)) {
            const def = parseDefinition(value);
            if (!def) continue;
            configs.set(def.skuId, def);
            if (def.itemId) configs.set(def.itemId, def);
        }
    }

    const accessor = store.getProfileEffectById;
    if (typeof accessor === "function") {
        for (const candidate of ids) {
            try {
                const result = parseDefinition(accessor.call(store, candidate));
                if (result) return {
                    definition: result,
                    count: new Set(configs.values()).size,
                    state: "Resolved via Discord ProfileEffectStore.getProfileEffectById"
                };
            } catch { /* Try dictionary data and remaining candidates. */ }
        }
    }

    const match = findMatch(configs, ids, name);
    if (match) return {
        definition: match,
        count: new Set(configs.values()).size,
        state: "Resolved via loaded Discord ProfileEffectStore configurations"
    };

    const total = new Set(configs.values()).size;
    return {
        count: total,
        state: total
            ? "ProfileEffectStore has " + total + " renderable effects, but this cosmetic wasn't found"
            : "ProfileEffectStore loaded without renderable effect configurations"
    };
}

async function lookupEffect(item: ShopItem): Promise<EffectLookup> {
    const live = cachedShopItems("effect").find(effect => effect.skuId === item.skuId);
    const candidates = [...new Set([
        item.skuId, item.itemId, item.productSkuId,
        live?.skuId, live?.itemId, live?.productSkuId
    ].filter((value): value is string => !!value && /^\d{15,22}$/.test(value)))];

    const inline = item.effect ? parseDefinition({ ...item.effect, skuId: item.skuId }) : undefined;
    if (inline) return { definition: inline, availableConfigs: 1, candidates, reason: "Animation tracks included in the selected Shop item." };

    // Prefer the cache Discord itself uses. This avoids relying solely on a
    // private REST endpoint which may be unavailable in current releases.
    const local = lookupLoadedProfileEffects(candidates, live?.name ?? item.name);
    if (local.definition) return {
        definition: local.definition,
        availableConfigs: local.count,
        candidates,
        storeState: local.state,
        reason: "Animation loaded from Discord's own ProfileEffectStore."
    };

    let availableConfigs = 0;
    let endpointError = "";
    try {
        const known = await getDefinitions();
        availableConfigs = new Set(known.values()).size;
        const found = findMatch(known, candidates, live?.name ?? item.name);
        if (found) return {
            definition: found, availableConfigs, candidates, storeState: local.state,
            reason: "Matched the individual effect in Discord's profile-effect definitions."
        };
    } catch (error) {
        endpointError = "Discord's effect-definition list was unavailable (" +
            (error instanceof Error ? error.message.slice(0, 140) : String(error).slice(0, 140)) + ").";
    }

    // Direct product details often contain the animation tracks even when a
    // bundle's catalogue entry contains only the thumbnail / effect SKU.
    const productSkus = [...new Set([
        item.skuId, live?.skuId, item.productSkuId, live?.productSkuId
    ].filter((value): value is string => !!value && /^\d{15,22}$/.test(value)))];
    let productsChecked = 0;
    for (const sku of productSkus) {
        try {
            const response = await RestAPI.get({ url: "/collectibles-products/" + sku, retries: 1 });
            productsChecked++;
            const definitions = parseResponse(response.body);
            const found = findMatch(definitions, candidates, live?.name ?? item.name)
                ?? (new Set(definitions.values()).size === 1
                    ? [...definitions.values()][0] : undefined);
            if (found) return {
                definition: found, availableConfigs, candidates, storeState: local.state,
                reason: "Found the effect in its individual Shop product details."
            };
        } catch {
            // The SKU might identify an item rather than a product. Check the
            // bundle's product SKU as well instead of treating that as fatal.
        }
    }

    return {
        availableConfigs, candidates, storeState: local.state,
        reason: endpointError
            ? endpointError + " Shop product details checked: " + productsChecked + "."
            : availableConfigs === 0
                ? "Discord returned no animation definitions. Shop product details checked: " + productsChecked + "."
                : "Discord returned " + availableConfigs +
                  " animation definitions, but none matched this item's SKU, config ID or title. Shop product details checked: " +
                  productsChecked + "."
    };
}

/** Shared by the visual overlay and picker, avoiding duplicate requests. */
export function inspectEffectDefinition(item: ShopItem): Promise<EffectLookup> {
    if (item.kind !== "effect") return Promise.resolve({
        availableConfigs: 0, candidates: [], reason: "Not a profile-effect collectible."
    });
    const cacheKey = [item.skuId, item.itemId, item.productSkuId].join(":");
    let result = lookupPromises.get(cacheKey);
    if (!result) {
        result = lookupEffect(item).catch(error => {
            lookupPromises.delete(cacheKey);
            throw error;
        });
        lookupPromises.set(cacheKey, result);
    }
    return result;
}
export function clearEffectLookupCache() {
    lookupPromises.clear();
    definitionsPromise = undefined;
}
export async function getEffectDefinition(item: ShopItem): Promise<EffectDefinition | undefined> {
    return (await inspectEffectDefinition(item)).definition;
}
