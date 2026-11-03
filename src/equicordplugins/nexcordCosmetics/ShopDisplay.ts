/*
 * Nexcord local collectible display adapter.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Shallow-copies profile data returned by the client's existing profile store.
 * Never changes entitlements, purchases, REST requests, or the stored real user
 * profile. Can be disabled cleanly without altering Discord account data.
 */
import { Logger } from "@utils/Logger";
import { UserProfileStore } from "@webpack/common";

import { getShopSelection, subscribeShop } from "./ShopCatalog";
import type { ShopItem } from "./ShopCatalog";

const logger = new Logger("NexcordShopDisplay");
type NativeProfile = Record<string, any>;
type Getter = (...args: string[]) => NativeProfile | undefined;
type NativeStore = { getUserProfile?: Getter; getGuildMemberProfile?: Getter; emitChange?: () => void; };
let originalGetProfile: Getter | undefined;
let originalGetGuild: Getter | undefined;
let unsubscribe: (() => void) | undefined;
const store = UserProfileStore as unknown as NativeStore;
const cache = new WeakMap<object, { stamp: string; value: NativeProfile }>();

function makeNameplate(item: ShopItem) {
    return {
        skuId: item.skuId,
        sku_id: item.skuId,
        asset: item.asset,
        label: item.name,
        palette: item.palette,
        type: 2,
        expiresAt: null,
        expires_at: null
    };
}
function makeDecoration(item: ShopItem) {
    return {
        skuId: item.skuId,
        sku_id: item.skuId,
        asset: item.asset,
        type: 0,
        expiresAt: null,
        expires_at: null
    };
}
function makeEffect(item: ShopItem) {
    return {
        ...(item.effect ?? {}),
        skuId: item.skuId,
        sku_id: item.skuId,
        type: 1,
        expiresAt: null,
        expireAt: null
    };
}

function localProfile(userId: string, profile: NativeProfile | undefined): NativeProfile | undefined {
    if (!profile || typeof profile !== "object") return profile;
    const nameplate = getShopSelection(userId, "nameplate");
    const decoration = getShopSelection(userId, "decoration");
    const effect = getShopSelection(userId, "effect");
    if (!nameplate && !decoration && !effect) return profile;

    const stamp = [nameplate?.skuId, decoration?.skuId, effect?.skuId].join(":");
    const previous = cache.get(profile);
    if (previous?.stamp === stamp) return previous.value;

    const collectibles = { ...(profile.collectibles && typeof profile.collectibles === "object" ? profile.collectibles : {}) };
    const result: NativeProfile = { ...profile };
    if (nameplate?.asset && nameplate.palette) {
        const value = makeNameplate(nameplate);
        collectibles.nameplate = value;
        result.nameplate = value;
    }
    if (decoration?.asset) {
        const value = makeDecoration(decoration);
        result.avatarDecorationData = value;
        result.avatarDecoration = value;
    }
    if (effect) {
        const value = makeEffect(effect);
        result.profileEffectId = effect.skuId;
        result.profileEffect = value;
    }
    result.collectibles = collectibles;
    cache.set(profile, { stamp, value: result });
    return result;
}

export function startShopDisplay() {
    if (originalGetProfile || originalGetGuild) return;
    try {
        if (typeof store.getUserProfile === "function") {
            const original = store.getUserProfile;
            store.getUserProfile = function (this: NativeStore, userId: string) {
                return localProfile(userId, original.call(this, userId));
            };
            if (store.getUserProfile !== original) originalGetProfile = original;
        }
    } catch (error) { logger.error("Profile store hook was unavailable", error); }

    try {
        if (typeof store.getGuildMemberProfile === "function") {
            const original = store.getGuildMemberProfile;
            store.getGuildMemberProfile = function (this: NativeStore, userId: string, guildId: string) {
                return localProfile(userId, original.call(this, userId, guildId));
            };
            if (store.getGuildMemberProfile !== original) originalGetGuild = original;
        }
    } catch (error) { logger.error("Guild profile hook was unavailable", error); }

    unsubscribe = subscribeShop(() => {
        try { store.emitChange?.(); } catch { /* Some store implementations don't expose this. */ }
    });
}

export function stopShopDisplay() {
    unsubscribe?.();
    unsubscribe = undefined;
    // Do not replace another plugin's hook if it changed the same method.
    if (originalGetProfile) {
        try {
            store.getUserProfile = originalGetProfile;
        } catch (error) { logger.error("Could not restore user profile getter", error); }
        originalGetProfile = undefined;
    }
    if (originalGetGuild) {
        try {
            store.getGuildMemberProfile = originalGetGuild;
        } catch (error) { logger.error("Could not restore guild profile getter", error); }
        originalGetGuild = undefined;
    }
}
