/*
 * Local-only Discord-style badge catalogue. Does NOT grant real badges.
 * Classic artwork source: merlinfuchs/discord-badges (MIT).
 * Nitro-tier artwork: Fmasterpro27/Discord-badges (MIT).
 * Icons are fetched only if the local badge gallery is opened.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
const ICONS = "https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges@dfca440f7ad0fd59d1dfd1258788be24c1e63b62/PNG/";
export type PreviewBadge = { id: string; name: string; category: string; symbol: string; image?: string; };
function badge(id: string, name: string, category: string, symbol: string, asset?: string): PreviewBadge {
    return {id,name,category,symbol,image:asset ? ICONS+asset+".png" : undefined};
}

// Optional historical and evolving Nitro artwork, licensed under MIT by JackMa.
// Images are fetched on demand; unavailable images fall back to an icon.
const EVOLVING = "https://cdn.jsdelivr.net/gh/Fmasterpro27/Discord-badges@ff55dded12ed08a0c0673827306ffc43d7207105/assets/nitro_badge/";
const nitroTier = (id: string, title: string, symbol: string, filename: string): PreviewBadge => ({
    id, name: title, category: "Evolving Nitro", symbol, image: EVOLVING + filename + ".png"
});
const other = (id: string, title: string, category: string, symbol: string): PreviewBadge => ({
    id, name: title, category, symbol
});

export const BADGE_CATALOG: PreviewBadge[] = [
    badge("nitro","Discord Nitro","Subscription","💎","nitro"),
    nitroTier("nitro-bronze","Nitro Bronze · 1 month","🥉","bronze"),
    nitroTier("nitro-silver","Nitro Silver · 3 months","🥈","silver"),
    nitroTier("nitro-gold","Nitro Gold · 6 months","🥇","gold"),
    nitroTier("nitro-platinum","Nitro Platinum · 12 months","💠","platinum"),
    nitroTier("nitro-diamond","Nitro Diamond · 24 months","💎","diamond"),
    nitroTier("nitro-emerald","Nitro Emerald · 36 months","🟢","emerald"),
    nitroTier("nitro-ruby","Nitro Ruby · 60 months","🔴","ruby"),
    nitroTier("nitro-opal","Nitro Opal · 72+ months","🌈","opal"),
    badge("boost1","Server Booster · 1 month","Subscription","🚀","boosting_1_months"),
    badge("boost2","Server Booster · 2 months","Subscription","🚀","boosting_2_months"),
    badge("boost3","Server Booster · 3 months","Subscription","🚀","boosting_3_months"),
    badge("boost6","Server Booster · 6 months","Subscription","🚀","boosting_6_months"),
    badge("boost9","Server Booster · 9 months","Subscription","🚀","boosting_9_months"),
    badge("boost12","Server Booster · 12 months","Subscription","🚀","boosting_12_months"),
    badge("boost15","Server Booster · 15 months","Subscription","🚀","boosting_15_months"),
    badge("boost18","Server Booster · 18 months","Subscription","🚀","boosting_18_months"),
    badge("boost24","Server Booster · 24 months","Subscription","🚀","boosting_24_months"),
    badge("quest","Completed a Quest","Activity","🎯"),
    badge("orbs","Discord Orbs","Activity","🔮"),
    badge("age","Account Age","Activity","🕰️"),
    badge("gametime","Game Time","Activity","🎮"),
    badge("streaming","Streaming","Activity","📺"),
    badge("staff","Discord Staff","Legacy & rare","🛠️","staff"),
    badge("partner","Partnered Server Owner","Legacy & rare","🤝","partnered_server_owner"),
    badge("bug1","Bug Hunter Level 1","Legacy & rare","🐛","bug_hunter_level_1"),
    badge("bug2","Bug Hunter Level 2","Legacy & rare","🐞","bug_hunter_level_2"),
    badge("bravery","HypeSquad Bravery","Legacy & rare","🛡️","hypesquad_bravery"),
    badge("brilliance","HypeSquad Brilliance","Legacy & rare","💎","hypesquad_brilliance"),
    badge("balance","HypeSquad Balance","Legacy & rare","⚖️","hypesquad_balance"),
    badge("hypesquad","HypeSquad Events","Legacy & rare","🎟️","hypesquad_events"),
    badge("supporter","Early Supporter","Legacy & rare","👑","early_supporter"),
    badge("moderator","Moderator Program Alumni","Legacy & rare","🎓","certified_moderator"),
    badge("verified-dev","Early Verified Bot Developer","Legacy & rare","🤖","early_verified_developer"),
    badge("active-dev","Active Developer","Legacy & rare","⚡","active_developer"),
    badge("legacy-name","Legacy Username","Legacy & rare","🏷️"),
    badge("meadow","Last Meadow Online","Legacy & rare","🌿"),
    other("gifting1","Gifting Patron · 1 gift","Gifting","🎁"),
    other("gifting2","Gifting Champion · 2 gifts","Gifting","🎁"),
    other("gifting3","Gifting Luminary · 3 gifts","Gifting","🎁"),
    other("gifting6","Gifting Icon · 6 gifts","Gifting","🎁"),
    other("gifting10","Gifting Hero · 10 gifts","Gifting","🎁"),
    other("gifting20","Gifting Legend · 20 gifts","Gifting","🎁"),
    other("game-variety","Game Variety","Activity","🕹️"),
    other("lootbox","2024 Lootbox Event (legacy)","Legacy & rare","🎪"),
    other("account-age","Account Age","Activity","⏳"),
    other("stream-tier","Streaming milestone","Activity","📡")
];

/**
 * Extended experimental badge preview variants.
 * The four evolving families are confirmed in Discord's 2026 badge directory,
 * but fine-grained milestone names/counts come from public community indexes
 * and can change. These are sample tier variants, not verified entitlements.
 */
const experimental: Array<{
    id: string; category: string; symbol: string;
    tiers: readonly (readonly [string, string])[];
}> = [
    { id: "age", category: "Account Age", symbol: "🌳", tiers: [
        ["Seed","1 year"],["Sprout","2 years"],["Bud","3 years"],
        ["Sapling","4 years"],["Blossom","5 years"],["Redwood","6 years"],
        ["Sequoia","7 years"],["Bristlecone","8 years"],
        ["Stromatolite","9 years"],["Primordial","10+ years"]
    ] },
    { id: "gametime", category: "Game Time", symbol: "🎮", tiers: [
        ["Casual","1 hour"],["Recreational","5 hours"],["Dedicated","20 hours"],
        ["Committed","75 hours"],["Serious","150 hours"],["Devoted","300 hours"],
        ["Seasoned","500 hours"],["Ironclad","1,000 hours"],
        ["Unshakeable","2,000 hours"],["Eternal","5,000+ hours"]
    ] },
    { id: "game-variety", category: "Game Variety", symbol: "🕹️", tiers: [
        ["Sampler","2 games"],["Dabbler","5 games"],["Enthusiast","10 games"],
        ["Ranger","15 games"],["Explorer","20 games"],["Adventurer","30 games"],
        ["Voyager","40 games"],["Maverick","60 games"],
        ["Polymath","80 games"],["Universalist","100+ games"]
    ] },
    { id: "streaming", category: "Streaming", symbol: "📺", tiers: [
        ["Newcomer","1 hour"],["Fledgling","5 hours"],["Breakout","20 hours"],
        ["Standout","75 hours"],["Trendsetter","150 hours"],
        ["Headliner","300 hours"],["Star","500 hours"],
        ["Sensation","1,000 hours"],["Visionary","2,000 hours"],
        ["Phenomenon","5,000+ hours"]
    ] }
];

for (const family of experimental) {
    for (const [i, [name, threshold]] of family.tiers.entries()) {
        BADGE_CATALOG.push(other(
            family.id + "-tier-" + (i + 1),
            family.category + " · " + name + " (" + threshold + ")",
            family.category,
            family.symbol
        ));
    }
}

/**
 * Verified SVG badge illustrations from the MIT-licensed 2026 Discord
 * Badge Archive. Pinned to a specific commit so icon names do not drift.
 * Experimental tier families share a base emblem where no tier-specific SVG
 * is available; those are preview variants, not official entitlement icons.
 */
const ARCHIVE = "https://cdn.jsdelivr.net/gh/EliteZilla/Discord-Badges@294dee8c8ecc4f885806915d005ed199ff7baaa7/assets/";
function archivedIcon(id: string): string | undefined {
    if (id === "nitro") return "profile/discord-nitro.svg";
    const nitro = /^nitro-(bronze|silver|gold|platinum|diamond|emerald|ruby|opal)$/.exec(id);
    if (nitro) return "nitro/" + nitro[1] + ".svg";
    const boost = /^boost(1|2|3|6|9|12|15|18|24)$/.exec(id);
    if (boost) {
        const levels = ["1","2","3","6","9","12","15","18","24"];
        return "boosts/discordboost" + (levels.indexOf(boost[1]) + 1) + ".svg";
    }
    const exact: Record<string, string> = {
        "quest": "profile/discord-quests.svg",
        "orbs": "profile/orbs.svg",
        "staff": "profile/discord-staff.svg",
        "bug1": "profile/bug-hunter.svg",
        "bug2": "profile/golden-bug-hunter.svg",
        "bravery": "legacy/hypesquad-bravery.svg",
        "brilliance": "legacy/hypesquad-brilliance.svg",
        "balance": "legacy/hypesquad-balance.svg",
        "hypesquad": "legacy/hypesquad-events.svg",
        "supporter": "legacy/early-supporter.svg",
        "moderator": "legacy/moderator-program-alumni.svg",
        "partner": "legacy/partnered-server-owner.svg",
        "legacy-name": "profile/legacy-username.svg",
        "meadow": "legacy/last-meadow-online.svg",
        "active-dev": "developers/active-developer.svg"
    };
    if (exact[id]) return exact[id];
    if (/^gifting/.test(id)) return "experimental/gifting.svg";
    if (id === "age" || id === "account-age" || id.startsWith("age-tier")) return "experimental/account-age.svg";
    if (id === "gametime" || id.startsWith("gametime-tier")) return "experimental/game-time.svg";
    if (id === "game-variety" || id.startsWith("game-variety-tier")) return "experimental/game-variety.svg";
    if (id === "streaming" || id === "stream-tier" || id.startsWith("streaming-tier")) return "experimental/streaming.svg";
}
for (const badgeItem of BADGE_CATALOG) {
    const asset = archivedIcon(badgeItem.id);
    if (asset) badgeItem.image = ARCHIVE + asset;
}

// Preserve historical saved badge IDs, but remove duplicate browse entries.
const unique = new Set<string>();
export const BADGE_GROUPS = [
    { key: "nitro", title: "Nitro subscription & evolution", hint: "Basic, Classic and all documented evolving Nitro designs" },
    { key: "boost", title: "Server Boost milestones", hint: "Every documented continuous-boost design" },
    { key: "gifting", title: "Gifting milestones", hint: "Six known gift-count designs" },
    { key: "activity", title: "Quests, Orbs & activity", hint: "Current and experimental activity badges" },
    { key: "age", title: "Account Age levels", hint: "Community-indexed experimental variants" },
    { key: "gametime", title: "Game Time levels", hint: "Community-indexed experimental variants" },
    { key: "variety", title: "Game Variety levels", hint: "Community-indexed experimental variants" },
    { key: "stream", title: "Streaming levels", hint: "Community-indexed experimental variants" },
    { key: "bug", title: "Bug Hunters", hint: "Standard and Golden Bug Hunter" },
    { key: "staff", title: "Staff, Developers & Partners", hint: "Staff and historic community/developer recognitions" },
    { key: "hype", title: "HypeSquad", hint: "Three Houses and HypeSquad Events" },
    { key: "legacy", title: "Miscellaneous & legacy", hint: "Early Supporter, legacy username and special/event badges" }
] as const;
export type BadgeGroupKey = typeof BADGE_GROUPS[number]["key"];
export function badgeGroupFor(id: string): BadgeGroupKey {
    if (id === "nitro" || id.startsWith("nitro-")) return "nitro";
    if (id.startsWith("boost")) return "boost";
    if (id.startsWith("gifting")) return "gifting";
    if (id.startsWith("age-tier")) return "age";
    if (id.startsWith("gametime-tier")) return "gametime";
    if (id.startsWith("game-variety-tier")) return "variety";
    if (id.startsWith("streaming-tier")) return "stream";
    if (id === "bug1" || id === "bug2") return "bug";
    if (["staff","partner","moderator","verified-dev","active-dev"].includes(id)) return "staff";
    if (["bravery","brilliance","balance","hypesquad"].includes(id)) return "hype";
    if (["quest","orbs","gametime","game-variety","age","account-age","streaming","stream-tier"].includes(id)) return "activity";
    return "legacy";
}
export const ALL_BADGES_BY_GROUP = BADGE_GROUPS.map(group => ({
    ...group,
    items: BADGE_CATALOG.filter(item => badgeGroupFor(item.id) === group.key)
        .filter(item => {
            if (unique.has(item.id)) return false;
            unique.add(item.id);
            return true;
        })
}));

export const BADGE_IDS = new Set(BADGE_CATALOG.map(item => item.id));
export const badgeById = (id: string) => BADGE_CATALOG.find(item => item.id === id);
