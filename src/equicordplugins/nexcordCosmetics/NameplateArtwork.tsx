/*
 * Nexcord local nameplate artwork.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Preview real individual Discord nameplate assets without changing Nitro,
 * ownership, purchases or user/profile stores.
 */
import { IconUtils, React, UserStore } from "@webpack/common";
import type { ShopItem } from "./ShopCatalog";

const CDN_ROOT = "https://cdn.discordapp.com/assets/collectibles/";
const ASSET_PATH = /^nameplates\/(?:[a-z0-9_-]+\/){1,8}$/i;
const DISCORD_CDN = /^https:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.com|media\.discordapp\.net)\//i;

function trusted(url: string | undefined): string | undefined {
    return url && DISCORD_CDN.test(url) && url.length < 1024 ? url : undefined;
}

/** An official nameplate image, never the thumbnail for a parent bundle. */
export function getNameplateMedia(item: ShopItem): {
    image?: string;
    fallback?: string;
    video?: string;
} {
    if (item.kind !== "nameplate") return {};
    const path = item.asset && ASSET_PATH.test(item.asset) ? item.asset : undefined;
    const fallback = trusted(item.nameplateStaticUrl)
        ?? (path ? CDN_ROOT + path + "static.png" : undefined);
    const image = trusted(item.nameplateAnimatedUrl) ?? fallback;
    const video = trusted(item.nameplateVideoUrl);
    return { image, fallback, video };
}

export function NameplateArtwork({
    item,
    userId,
    compact = false
}: {
    item: ShopItem;
    userId?: string;
    compact?: boolean;
}) {
    const user = userId ? UserStore.getUser(userId) : UserStore.getCurrentUser();
    const avatar = user ? IconUtils.getUserAvatarURL(user, true, 80) : undefined;
    const name = user?.globalName ?? user?.username ?? "Your name";
    const { image, fallback, video } = getNameplateMedia(item);
    const [brokenImage, setBrokenImage] = React.useState(false);
    const [brokenVideo, setBrokenVideo] = React.useState(false);

    React.useEffect(() => {
        setBrokenImage(false);
        setBrokenVideo(false);
    }, [item.skuId, image, video]);

    const src = brokenImage ? (image !== fallback ? fallback : undefined) : image;
    return (
        <div className={"nexcord-nameplate-artwork" + (compact ? " nexcord-nameplate-artwork-compact" : "")}
            aria-label={"Local nameplate preview: " + item.name}
            title={item.name}>
            {src && (
                <img
                    className="nexcord-nameplate-artwork-image"
                    draggable={false}
                    src={src}
                    alt=""
                    onError={() => setBrokenImage(true)}
                />
            )}
            {!src && video && !brokenVideo && (
                <video className="nexcord-nameplate-artwork-image"
                    src={video}
                    autoPlay muted loop playsInline
                    onError={() => setBrokenVideo(true)} />
            )}
            <span className="nexcord-nameplate-artwork-identity">
                {avatar
                    ? <img src={avatar} alt="" className="nexcord-nameplate-artwork-avatar" />
                    : <span className="nexcord-nameplate-artwork-avatar nexcord-nameplate-artwork-placeholder" />}
                <span className="nexcord-nameplate-artwork-user">{name}</span>
            </span>
        </div>
    );
}
