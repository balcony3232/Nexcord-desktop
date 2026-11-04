/*
 * Local-only Discord-style badge catalogue. Does NOT grant real badges.
 * Classic artwork source: merlinfuchs/discord-badges (MIT).
 * Icons are fetched only if the local badge gallery is opened.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
const ICONS = "https://cdn.jsdelivr.net/gh/merlinfuchs/discord-badges@dfca440f7ad0fd59d1dfd1258788be24c1e63b62/PNG/";
export type PreviewBadge = { id: string; name: string; category: string; symbol: string; image?: string; };
function badge(id: string, name: string, category: string, symbol: string, asset?: string): PreviewBadge {
    return {id,name,category,symbol,image:asset ? ICONS+asset+".png" : undefined};
}
export const BADGE_CATALOG: PreviewBadge[] = [
    badge("nitro","Discord Nitro","Subscription","💎","nitro"),
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
    badge("meadow","Last Meadow Online","Legacy & rare","🌿")
];
export const BADGE_IDS = new Set(BADGE_CATALOG.map(item => item.id));
export const badgeById = (id: string) => BADGE_CATALOG.find(item => item.id === id);
