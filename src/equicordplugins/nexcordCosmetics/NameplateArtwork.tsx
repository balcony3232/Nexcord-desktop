/*
 * Nexcord local nameplate artwork — no user/profile store modification.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { IconUtils, React, UserStore } from "@webpack/common";

import type { ShopItem } from "./ShopCatalog";

const CDN_ROOT = "https://cdn.discordapp.com/assets/collectibles/";
const ASSET_PATH = /^nameplates\/(?:[a-z0-9_-]+\/){1,8}$/i;
const DISCORD_CDN = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.com|media\.discordapp\.net)\//i;

function trusted(url: string | undefined) {
    return url && DISCORD_CDN.test(url) && url.length < 1024 ? url : undefined;
}

export function getNameplateMedia(item: ShopItem) {
    const path = item.kind === "nameplate" && item.asset && ASSET_PATH.test(item.asset)
        ? item.asset : undefined;
    return {
        image: trusted(item.nameplateStaticUrl) ?? (path ? CDN_ROOT + path + "static.png" : undefined),
        video: trusted(item.nameplateVideoUrl) ?? (path ? CDN_ROOT + path + "asset.webm" : undefined),
        fallback: trusted(item.nameplateAnimatedUrl)
    };
}

/**
 * Background only, for member rows or native nameplates where Discord already
 * draws the avatar and name on top. Avoids duplicate text and images.
 */
export function NameplateBackdrop({ item }: { item: ShopItem; }) {
    const media = getNameplateMedia(item);
    const [videoError, setVideoError] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);
    React.useEffect(() => {
        setVideoError(false);
        setImageError(false);
    }, [item.skuId, media.image, media.video]);
    const preferStatic = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const video = !preferStatic && !videoError ? media.video : undefined;
    const image = imageError ? media.fallback : media.image;
    return (
        <div className="nexcord-nameplate-backdrop" aria-hidden="true">
            {video && <video className="nexcord-nameplate-media" src={video}
                muted autoPlay loop playsInline preload="metadata"
                onError={() => setVideoError(true)} />}
            {(!video || videoError) && image &&
                <img className="nexcord-nameplate-media" src={image} draggable={false}
                    alt="" onError={() => setImageError(true)} />}
        </div>
    );
}

export function NameplateArtwork({
    item, userId, compact = false
}: {
    item: ShopItem;
    userId?: string;
    compact?: boolean;
}) {
    const user = userId ? UserStore.getUser(userId) : UserStore.getCurrentUser();
    const avatar = user ? IconUtils.getUserAvatarURL(user, true, 80) : undefined;
    const name = user?.globalName ?? user?.username ?? "Your name";
    return (
        <div className={"nexcord-nameplate-artwork" + (compact ? " nexcord-nameplate-artwork-compact" : "")}
            aria-label={"Local nameplate preview: " + item.name} title={item.name}>
            <NameplateBackdrop item={item} />
            <span className="nexcord-nameplate-artwork-identity">
                {avatar && <img src={avatar} alt="" className="nexcord-nameplate-artwork-avatar" />}
                <span className="nexcord-nameplate-artwork-user">{name}</span>
            </span>
        </div>
    );
}
