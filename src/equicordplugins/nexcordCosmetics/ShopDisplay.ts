/*
 * Nexcord local collectible display adapter.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Local presentation only. Never changes a user's actual Discord account,
 * purchases, entitlements, user store records, or network requests.
 */
import { Logger } from "@utils/Logger";
import { UserProfileStore, UserStore } from "@webpack/common";

import { getShopSelection, subscribeShop } from "./ShopCatalog";
import type { ShopItem } from "./ShopCatalog";

const logger = new Logger("NexcordShopDisplay");
type NativeProfile = Record<string, any>;
type Getter = (...args: string[]) => NativeProfile | undefined;
type NativeStore = {
    getUserProfile?: Getter;
    getGuildMemberProfile?: Getter;
    emitChange?: () => void;
};
type NativeUserStore = {
    getUser?: (id: string) => NativeProfile | undefined;
    getCurrentUser?: () => NativeProfile | undefined;
    emitChange?: () => void;
};
const profileStore = UserProfileStore as unknown as NativeStore;
const userStore = UserStore as unknown as NativeUserStore;

let restoreHooks: Array<() => void> = [];
let unsubscribe: (() => void) | undefined;
let lastProfileCache = new WeakMap<object, { stamp: string; value: NativeProfile }>();
let lastUserCache = new WeakMap<object, { stamp: string; value: NativeProfile }>();

// Preserve the original object's prototype and descriptors so Discord's own
// user/profile methods continue working. Only the returned view is changed.
function withOverrides(original: NativeProfile, overrides: NativeProfile): NativeProfile {
    // Build descriptors on the new object in one pass. A Discord model may
    // contain non-configurable original fields, which cannot be redefined
    // after cloning even though the new object is safe to construct.
    const descriptors = {
        ...Object.getOwnPropertyDescriptors(original),
        ...Object.getOwnPropertyDescriptors(overrides)
    };
    return Object.create(Object.getPrototypeOf(original), descriptors);
}

function makeNameplate(item: ShopItem) {
    return {
        skuId: item.skuId,
        asset: item.asset,
        label: item.name,
        palette: item.palette,
        expiresAt: null,
        type: 2
    };
}
function makeDecoration(item: ShopItem) {
    return {
        skuId: item.skuId,
        asset: item.asset,
        expiresAt: null,
        type: 0
    };
}
function makeEffect(item: ShopItem) {
    const fields = item.effect ?? {};
    return {
        ...fields,
        skuId: item.skuId,
        expiresAt: null,
        expireAt: null,
        type: 1
    };
}
function selected(userId: string) {
    const nameplate = getShopSelection(userId, "nameplate");
    const decoration = getShopSelection(userId, "decoration");
    const effect = getShopSelection(userId, "effect");
    return { nameplate, decoration, effect };
}
function fingerprint(userId: string) {
    const s = selected(userId);
    return [s.nameplate?.skuId, s.decoration?.skuId, s.effect?.skuId].join(":");
}
function mergeCollectibles(original: unknown, nameplate: ShopItem | undefined) {
    return {
        ...(original && typeof original === "object" ? original : {}),
        ...(nameplate?.asset && nameplate.palette ? { nameplate: makeNameplate(nameplate) } : {})
    };
}

function localProfile(userId: string, profile: NativeProfile | undefined): NativeProfile | undefined {
    if (!profile || typeof profile !== "object" || !userId) return profile;
    const { nameplate, decoration, effect } = selected(userId);
    if (!nameplate && !decoration && !effect) return profile;

    const stamp = fingerprint(userId);
    const cached = lastProfileCache.get(profile);
    if (cached?.stamp === stamp) return cached.value;

    const override: NativeProfile = {};
    if (nameplate?.asset && nameplate.palette) {
        const value = makeNameplate(nameplate);
        override.collectibles = mergeCollectibles(profile.collectibles, nameplate);
        override.nameplate = value;
    }
    if (decoration?.asset) {
        override.avatarDecoration = null;
        override.avatarDecorationData = makeDecoration(decoration);
    }
    if (effect && Array.isArray(effect.effect?.effects) && effect.effect.effects.length) {
        override.profileEffectId = effect.skuId;
        override.profileEffect = makeEffect(effect);
        // Some profile-card renderers gate effects behind a premium visual
        // state. This changes ONLY the returned local view, not Discord's store.
        if (!profile.premiumType) override.premiumType = 2;
    }
    try {
        const value = withOverrides(profile, override);
        lastProfileCache.set(profile, { stamp, value });
        return value;
    } catch (error) {
        logger.warn("Profile clone failed; leaving Discord profile unchanged", error);
        return profile;
    }
}

function localUser(user: NativeProfile | undefined): NativeProfile | undefined {
    const userId = user?.id;
    if (!user || typeof user !== "object" || typeof userId !== "string") return user;
    const { nameplate, decoration } = selected(userId);
    if (!nameplate && !decoration) return user;
    const stamp = fingerprint(userId);
    const cached = lastUserCache.get(user);
    if (cached?.stamp === stamp) return cached.value;
    // Use a Proxy here rather than a shallow object: Discord models include
    // prototype functions, getters and some non-configurable properties.
    const override = new Proxy(user, {
        get(target, prop, receiver) {
            const descriptor = Object.getOwnPropertyDescriptor(target, prop);
            if (descriptor && !descriptor.configurable) return Reflect.get(target, prop, target);
            if (prop === "collectibles" && nameplate?.asset && nameplate.palette) {
                return mergeCollectibles(target.collectibles, nameplate);
            }
            if (prop === "nameplate" && nameplate?.asset && nameplate.palette) return makeNameplate(nameplate);
            if (prop === "avatarDecorationData" && decoration?.asset) return makeDecoration(decoration);
            if (prop === "avatarDecoration" && decoration?.asset) return null;
            return Reflect.get(target, prop, target);
        }
    });
    lastUserCache.set(user, { stamp, value: override });
    return override;
}

function hookMethod<T extends object, K extends keyof T>(
    store: T,
    method: K,
    wrapper: (original: (...args: any[]) => any) => (...args: any[]) => any
) {
    const original = store[method];
    if (typeof original !== "function") return;
    const wrapped = wrapper(original as (...args: any[]) => any);
    try {
        (store as any)[method] = wrapped;
        if ((store as any)[method] === wrapped) {
            restoreHooks.push(() => {
                // Don't accidentally unpatch someone else's later hook.
                try {
                    if ((store as any)[method] === wrapped) (store as any)[method] = original;
                } catch (error) {
                    logger.warn("Could not restore local view hook", error);
                }
            });
        }
    } catch (error) {
        logger.warn("Discord did not allow local view hook for " + String(method), error);
    }
}

function refreshStores() {
    lastProfileCache = new WeakMap();
    lastUserCache = new WeakMap();
    try { profileStore.emitChange?.(); } catch { /* some stores don't expose this */ }
    try { userStore.emitChange?.(); } catch { /* some stores don't expose this */ }
}

export function startShopDisplay() {
    if (unsubscribe) return;
    hookMethod(profileStore, "getUserProfile", original =>
        function (this: NativeStore, userId: string) {
            return localProfile(userId, original.call(this, userId));
        }
    );
    hookMethod(profileStore, "getGuildMemberProfile", original =>
        function (this: NativeStore, userId: string, guildId: string) {
            return localProfile(userId, original.call(this, userId, guildId));
        }
    );
    hookMethod(userStore, "getUser", original =>
        function (this: NativeUserStore, userId: string) {
            return localUser(original.call(this, userId));
        }
    );
    hookMethod(userStore, "getCurrentUser", original =>
        function (this: NativeUserStore) {
            return localUser(original.call(this));
        }
    );
    unsubscribe = subscribeShop(refreshStores);
}

export function stopShopDisplay() {
    unsubscribe?.();
    unsubscribe = undefined;
    for (const undo of restoreHooks.reverse()) undo();
    restoreHooks = [];
    lastProfileCache = new WeakMap();
    lastUserCache = new WeakMap();
}
