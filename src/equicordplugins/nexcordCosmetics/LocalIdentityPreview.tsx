/*
 * Local-only labelled identity and frame previews inside Discord's original
 * self-profile surfaces. Does not alter UserStore, messages or account data.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Logger } from "@utils/Logger";
import { createRoot, React, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";

import { badgeById } from "./BadgeCatalog";
import { getLocalProfileStyle, subscribeProfileStyles } from "./LocalProfileStyle";
import { getShopSelection, subscribeShop } from "./ShopCatalog";

const logger = new Logger("LarpcordIdentityPreview");
export type IdentitySurface = "editor" | "popout";
type Mounted = { card: HTMLElement; host: HTMLElement; root: Root; oldPosition: string; };
const mounts = new Map<IdentitySurface, Mounted>();

function Preview({ userId, surface }: { userId: string; surface: IdentitySurface; }) {
    const [, change] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => {
        const a = subscribeProfileStyles(change);
        const b = subscribeShop(change);
        return () => { a(); b(); };
    }, []);
    const style = getLocalProfileStyle(userId);
    const frame = getShopSelection(userId, "frame");
    const user = UserStore.getUser(userId) ?? UserStore.getCurrentUser();
    const showNames = style.enabled && Boolean(style.localDisplayName || style.localUsername);
    const badges = style.badges.map(badgeById).filter((x): x is NonNullable<typeof x> => Boolean(x));
    const hasPreview = style.enabled || badges.length > 0 || style.badge !== "none" || Boolean(frame);
    if (!hasPreview) return null;
    return (
        <div className={"larpcord-local-identity-card larpcord-local-identity-" + surface}
            style={{
                borderColor: style.enabled ? style.accent : undefined,
                background: style.enabled ? style.background : undefined
            }}>
            <span className="larpcord-local-identity-label">LARPCORD · LOCAL PREVIEW</span>
            {showNames && (
                <div className="larpcord-local-identity-names">
                    <strong>{style.localDisplayName || user?.globalName || user?.username}</strong>
                    <small>@{style.localUsername || user?.username}</small>
                </div>
            )}
            {!!badges.length && (
                <div className="larpcord-local-identity-badges">
                    {badges.map(badge => (
                        <span key={badge.id} title={badge.name + " — local preview only"}>
                            {badge.image ? <img src={badge.image} alt={badge.name}/> : <b>{badge.symbol}</b>}
                        </span>
                    ))}
                </div>
            )}
            {style.badge !== "none" && !badges.length && <small>✦ {style.badge.toUpperCase()} · LOCAL</small>}
            {frame && <div className="larpcord-local-frame">
                {(frame.previewUrl || frame.animatedPreviewUrl) &&
                    <img loading="lazy" src={frame.previewUrl ?? frame.animatedPreviewUrl} alt=""/>}
                <span>FRAME ARTWORK PREVIEW <strong>{frame.name}</strong></span>
            </div>}
        </div>
    );
}

export function syncLocalIdentityPreview(surface: IdentitySurface, card: HTMLElement | undefined, userId: string) {
    const existing = mounts.get(surface);
    if (card && existing?.card === card && existing.host.isConnected) return;
    stopLocalIdentityPreview(surface);
    if (!card) return;
    const host = document.createElement("div");
    host.className = "larpcord-identity-preview-host";
    host.dataset.larpcordLocalIdentity = surface;
    const oldPosition = card.style.position;
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    card.appendChild(host);
    try {
        const root = createRoot(host);
        mounts.set(surface, {card, host, root, oldPosition});
        root.render(<Preview userId={userId} surface={surface}/>);
    } catch (error) {
        logger.warn("Could not show local identity preview", error);
        host.remove();
        card.style.position = oldPosition;
    }
}
export function stopLocalIdentityPreview(surface: IdentitySurface) {
    const entry = mounts.get(surface);
    if (!entry) return;
    mounts.delete(surface);
    queueMicrotask(() => {
        entry.root.unmount();
        entry.host.remove();
        if (entry.card.style.position === "relative") entry.card.style.position = entry.oldPosition;
    });
}
