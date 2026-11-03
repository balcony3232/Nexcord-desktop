/*
 * Local-only Discord profile-effect animation definitions.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Fetches effect layers from Discord's read-only /user-profile-effects endpoint
 * on demand. Does not modify entitlements or user/profile stores.
 */
import { RestAPI } from "@webpack/common";

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
    if (!skuId || !Array.isArray(e.effects)) return;
    const layers = e.effects.slice(0, MAX_LAYERS).map(parseLayer).filter((layer): layer is EffectLayer => !!layer);
    const reducedMotionSrc = cdn(e.reducedMotionSrc) ?? cdn(e.reduced_motion_src);
    const staticFrameSrc = cdn(e.staticFrameSrc) ?? cdn(e.static_frame_src);
    if (!layers.length && !reducedMotionSrc && !staticFrameSrc) return;
    return {
        skuId,
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
        if (parsed) definitions.set(parsed.skuId, parsed);
        for (const key of ["profile_effects", "profileEffects", "effects", "data", "body", "items", "products", "bundled_products"]) {
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

/**
 * Find real animation tracks for the selected item, never a product/bundle
 * thumbnail. Fallback to the detailed product endpoint if necessary.
 */
export async function getEffectDefinition(item: ShopItem): Promise<EffectDefinition | undefined> {
    if (item.kind !== "effect") return;
    if (item.effect) {
        const own = parseDefinition({ ...item.effect, skuId: item.skuId });
        if (own) return own;
    }
    try {
        const known = await getDefinitions();
        const found = known.get(item.skuId);
        if (found) return found;
    } catch { /* Fall through to product detail read. */ }
    try {
        const result = await RestAPI.get({ url: "/collectibles-products/" + item.skuId, retries: 1 });
        const definitions = parseResponse(result.body);
        return definitions.get(item.skuId) ?? (definitions.size === 1 ? [...definitions.values()][0] : undefined);
    } catch {
        return undefined;
    }
}
