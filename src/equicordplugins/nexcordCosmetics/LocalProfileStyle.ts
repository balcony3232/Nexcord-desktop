/*
 * Larpcord local self-profile colours and non-official badge decorations.
 * SPDX-License-Identifier: GPL-3.0-or-later.
 * These are cosmetic previews, NOT Discord entitlements or user properties.
 */
import * as DataStore from "@api/DataStore";

const KEY = "larpcord.self-profile-style.v1";
export type LocalBadge = "none" | "star" | "heart" | "moon" | "cat";
export interface LocalProfileStyle {
    enabled: boolean;
    accent: string;
    background: string;
    badge: LocalBadge;
}
export const DEFAULT_PROFILE_STYLE: LocalProfileStyle = {
    enabled: false,
    accent: "#F58EAF",
    background: "#241C28",
    badge: "none"
};
const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
const badges: LocalBadge[] = ["none", "star", "heart", "moon", "cat"];
const listeners = new Set<() => void>();
let profiles: Record<string, LocalProfileStyle> = {};
let loaded = false;
let pending: Promise<void> | undefined;

function clean(value: unknown): LocalProfileStyle {
    const o = value && typeof value === "object" ? value as Partial<LocalProfileStyle> : {};
    return {
        enabled: o.enabled === true,
        accent: isHex(o.accent) ? o.accent.toUpperCase() : DEFAULT_PROFILE_STYLE.accent,
        background: isHex(o.background) ? o.background.toUpperCase() : DEFAULT_PROFILE_STYLE.background,
        badge: badges.includes(o.badge as LocalBadge) ? o.badge as LocalBadge : "none"
    };
}
export async function loadProfileStyles() {
    if (loaded) return;
    if (!pending) pending = (async () => {
        const data = await DataStore.get<Record<string, unknown>>(KEY);
        if (data && typeof data === "object" && !Array.isArray(data)) {
            for (const [id, style] of Object.entries(data).slice(0, 30)) {
                if (/^\d{15,22}$/.test(id)) profiles[id] = clean(style);
            }
        }
        loaded = true;
        for (const listener of listeners) listener();
    })().catch(error => { pending = undefined; throw error; });
    return pending;
}
export function getLocalProfileStyle(userId: string): LocalProfileStyle {
    return profiles[userId] ?? DEFAULT_PROFILE_STYLE;
}
export function subscribeProfileStyles(callback: () => void) {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
}
export async function setLocalProfileStyle(userId: string, changes: Partial<LocalProfileStyle>) {
    if (!/^\d{15,22}$/.test(userId)) throw new Error("Invalid user ID");
    await loadProfileStyles();
    const next = { ...profiles, [userId]: clean({ ...getLocalProfileStyle(userId), ...changes }) };
    await DataStore.set(KEY, next);
    profiles = next;
    for (const listener of listeners) listener();
}
