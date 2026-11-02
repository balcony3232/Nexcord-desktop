/*
 * Nexcord local-only cosmetic library. SPDX-License-Identifier: GPL-3.0-or-later
 * Images stay in the client IndexedDB; never sent to Discord.
 */
import * as DataStore from "@api/DataStore";

export type CosmeticKind = "banner" | "nameplate";
export interface CosmeticAsset {
    id: string;
    kind: CosmeticKind;
    label: string;
    dataUrl: string;
    createdAt: number;
}
export interface LocalAppearance {
    banner?: string;
    nameplate?: string;
}
interface CosmeticsData {
    assets: CosmeticAsset[];
    users: Record<string, LocalAppearance>;
}
const STORE_KEY = "nexcord.local-cosmetics.v1";
const MAX_FILE = 2 * 1024 * 1024;
const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
let state: CosmeticsData = { assets: [], users: {} };
let loaded = false;
let loading: Promise<void> | undefined;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach(callback => callback());
}
export function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
}
function validAsset(asset: unknown): asset is CosmeticAsset {
    if (!asset || typeof asset !== "object") return false;
    const a = asset as Partial<CosmeticAsset>;
    return typeof a.id === "string" && a.id.length < 100
        && (a.kind === "banner" || a.kind === "nameplate")
        && typeof a.label === "string" && a.label.length <= 100
        && typeof a.dataUrl === "string" && a.dataUrl.length <= MAX_FILE * 1.5
        && /^data:image\/(?:png|jpeg|webp|gif);base64,/.test(a.dataUrl)
        && typeof a.createdAt === "number";
}
export async function loadCosmetics() {
    if (loaded) return;
    if (!loading) {
        loading = (async () => {
            const saved = await DataStore.get<CosmeticsData>(STORE_KEY);
            if (saved && typeof saved === "object") {
                state = {
                    assets: Array.isArray(saved.assets) ? saved.assets.filter(validAsset).slice(0, 30) : [],
                    users: saved.users && typeof saved.users === "object" && !Array.isArray(saved.users)
                        ? saved.users : {}
                };
            }
            loaded = true;
            notify();
        })().catch(error => { loading = undefined; throw error; });
    }
    return loading;
}
export function listAssets(kind: CosmeticKind) {
    return state.assets.filter(item => item.kind === kind);
}
export function getAsset(id: string | undefined) {
    return id ? state.assets.find(item => item.id === id) : undefined;
}
export function getAppearance(userId: string): LocalAppearance {
    return state.users[userId] ?? {};
}
export function getSelectedAsset(userId: string, kind: CosmeticKind) {
    return getAsset(getAppearance(userId)[kind]);
}
export function getLocalBanner(userId: string | undefined) {
    return userId ? getSelectedAsset(userId, "banner")?.dataUrl : undefined;
}
async function persist(next: CosmeticsData) {
    await DataStore.set(STORE_KEY, next);
    state = next;
    notify();
}
function fileDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string"
            ? resolve(reader.result) : reject(new Error("Invalid image"));
        reader.onerror = () => reject(new Error("Image could not be read"));
        reader.readAsDataURL(file);
    });
}
export async function importAsset(kind: CosmeticKind, file: File) {
    await loadCosmetics();
    if (!SUPPORTED.has(file.type)) throw new Error("Use PNG, JPG, WebP or GIF");
    if (!file.size || file.size > MAX_FILE) throw new Error("Choose an image no larger than 2 MB");
    if (state.assets.length >= 30) throw new Error("Your local library is full (30 images)");
    const dataUrl = await fileDataUrl(file);
    if (!/^data:image\/(?:png|jpeg|webp|gif);base64,/.test(dataUrl)) throw new Error("Unsupported format");
    if (state.assets.reduce((n, a) => n + a.dataUrl.length, dataUrl.length) > 18 * 1024 * 1024 * 1.5)
        throw new Error("Local library size limit reached");

    const item: CosmeticAsset = {
        id: crypto.randomUUID(),
        kind,
        label: file.name.slice(0, 100),
        dataUrl,
        createdAt: Date.now()
    };
    await persist({ ...state, assets: [...state.assets, item] });
    return item;
}
export async function applyAsset(userId: string, kind: CosmeticKind, id: string | undefined) {
    await loadCosmetics();
    if (!/^\d{15,22}$/.test(userId)) throw new Error("Invalid Discord user ID");
    if (id && (!getAsset(id) || getAsset(id)?.kind !== kind)) throw new Error("Invalid selection");
    const user = { ...getAppearance(userId) };
    if (id) user[kind] = id;
    else delete user[kind];
    await persist({ ...state, users: { ...state.users, [userId]: user } });
}
