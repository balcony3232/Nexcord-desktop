# Nexcord v0.2 — Native cosmetic integration (experimental)

This plugin adds compact **My Custom** controls beside Discord's original profile editor headings in **both Nitro and non-Nitro layouts**. In the non-Nitro layout, the banner selector is attached beside **Banner colour** instead of **Theme & Banner**. Selecting a custom image doesn't alter Discord's account data or call profile-save APIs.

## What's working
- User-imported PNG/JPEG/WebP/GIF banners, with a local profile banner override
- Existing local image library and persistence
- Inline, non-displacing My Custom popovers in Discord's profile editor
- Right-click local image editor for any Discord user

## New: Discord Shop catalogue
- **Discord Shop** tab for the native Nameplate control
- **Avatar & Decoration** and **Profile Effect & Frame** sections have Shop browsers
- Nexcord requests metadata from Discord's currently available `/collectibles-categories/v2` catalogue (falls back to `/collectibles-categories`)
- No bulk downloads of image/media files: thumbnails load directly from Discord CDN on demand
- Search by name; select items locally and persist each selection to the device
- Existing Discord ownership, billing, server permissions and Save/Apply actions are untouched

## Native collectible rendering currently paused
- The previous experimental renderer wrapped Discord’s profile and user store getters. It could interfere with Nitro/profile UI.
- **v0.2 compatibility hotfix disables those hooks**, including the premium display substitution, while leaving the catalogue and saved selections intact.
- Shop nameplate, avatar decoration and profile effect selections are currently **saved previews only**, not applied to native Discord surfaces.
- The existing custom-banner renderer remains enabled and unaffected.
- Profile frames appear in a preview-only catalogue tab; Apply is disabled
- Imported *custom* nameplates are still preview-only outside the editor

## Limitations
- The live Shop catalogue does **not** include every retired, unpublished, promotional or region-unavailable item.
- Selections are **not purchases** and are not visible to other Discord users.
- This is experimental and may be affected by Discord updates.
- If Discord's actual Nameplate, Effect or Decoration UI fails to display an item, the local selection remains saved; please report which surface didn't update.
- Existing data stays in Nexcord's local IndexedDB. No extra Nexcord server or telemetry.

## Non-Nitro sidebar appearance
- Nexcord hides only the **Level up your look / Preview Nitro** promotion inside the native profile editor for visual clarity.
- **Nameplate**, **Avatar & Decoration**, **Banner colour**, **Profile Effect & Frame**, and **Display Name Style** remain in Discord's original layout.
- If the promo card contains Display Name Style, only its sales text/button is hidden, not the functional styling controls.
- This does **not** grant Nitro, change subscription state, purchase collectibles, or remove billing screens.
- The plugin's unsafe profile/UserStore rendering adapter remains disabled. Shop collectibles are **saved previews**, not guaranteed live effects.

## Catalogue selection feedback
- All listed Shop entries can be selected and saved as **local previews**, even when a bundle lacks renderable animation data.
- Clicking a tile highlights it with a checkmark, shows the chosen asset in a selected-preview card, and keeps the picker open.
- Frames are selectable previews as well, **not** native profile frames.
- Native Discord rendering is still disabled because the earlier profile-store hooks affected profile/Nitro presentation.

## Historical effect animation data fallback
- Bundles metadata (not images) for **305** previously archived Discord profile effects from [aamiaa/discord-api-diff](https://github.com/aamiaa/discord-api-diff/blob/main/profile-effects.json), matched by effect SKU/ID or exact title.
- These metadata entries point to Discord CDN assets: media files are not redistributed in Nexcord.
- Newer effects (including **Lottie's Cauldron**) are not present in that historical archive. When full animation tracks aren't accessible, Nexcord renders only an official Shop thumbnail as a **static local illustration**, not as a working native profile effect.
- No interaction with Nitro entitlements, purchases or account profile API is performed. Disable NexcordCosmetics to remove the local display.

## Local nameplates in profile popouts and member rows

- The Shop catalogue now uses each **individual nameplate's** asset, not the parent bundle image. These may be animated WebM files or static PNGs.
- Nameplate selections appear locally inside Discord's original editor tile, on the user's own compact profile popout, and behind their own member-list row. The native member row retains its original avatar and text.
- The selected local profile effect also appears over the user's compact self popout. Editor and popout overlays are independent.
- Switching from Shop nameplates to imported image nameplates clears the alternative selection to avoid conflicting previews.
- All changes are client-side visual presentation; they do not change Nitro, purchase records, permissions, or remotely visible Discord account data.
- These new surfaces are version-dependent and require screenshot testing in the real Discord desktop client.

## Member-row detection and selected effect editor tile
- Covers both guild and group-DM member lists. Member rows are matched to the current user using an exact account ID in row attributes or the user's CDN avatar path; ambiguous display-name-only matches are ignored.
- The native **Profile Effect & Frame** tile now shows the selected local effect's Shop thumbnail with a small My Custom label, without replacing the underlying button or modifying Discord profile data.
- The popout effect renderer and nameplate editor rendering are unchanged.

## Larpcord v0.1.4 — Local themes and preview overlays

- The existing Discord-native profile editor now exposes a `My Custom` control alongside `Display Name Style` (when the current Discord UI has that heading) for local self-profile accent and background colours, plus clearly labelled local Star, Heart, Moon and Cat badge previews.
- The local colours appear on the user's own self popout only; the original Discord account profile information, permissions and entitlements are unchanged.
- Saved Shop avatar decorations appear as an optional static visual preview on the original editor tile; this overlay never captures clicks and doesn't equip or purchase the decoration.
- Existing custom banners/nameplates and profile effect previews still use their existing local rendering; exact appearance depends on current Discord markup.
- App-wide Full Larpcord appearance colour is separate from per-profile local theme styling.
- All local preferences are stored in DataStore, included in a full Larpcord settings backup; there are no remote writes.
- Feature acceptance requires screenshots from the user's installed v0.1.4 build; profile editor DOM can change across Discord releases.

## Larpcord v0.1.5 — Universal local cosmetic browser

Every My Custom link in the original Profile Editor can open all seven categories:
Banners, Nameplates, Decorations, Effects, Frames, Badges and Identity.
Local display names and usernames are stored as per-user preview fields and shown
only on Larpcord's own labelled self-profile card and popout preview. Real
Discord identifiers and chat message authors remain unchanged.

The Badge gallery covers 29 classic and modern Discord-style badges with up to
six selected preview slots. Historic artwork is loaded on demand from the
MIT-licensed merlinfuchs/discord-badges icon archive. Some newer badges show a
representative symbol rather than an official icon. No badge is granted by
Discord, and nobody else can see those local previews.

Frames can be selected in the Shop gallery. A clearly marked *frame artwork
preview* is shown on the self-profile preview; full native/animated frame
rendering is not yet supported because the Shop listing artwork is not
guaranteed to contain a compositable transparent frame asset.

The selected local cosmetics and names are in DataStore and are included in a
full Larpcord settings backup. Disable the LarpcordCosmetics plugin to remove
the overlays without altering Discord's actual profile.

## Larpcord v0.1.6 — Native Placement (experimental)

Local badges now appear near the self-profile's native name/badge area and remain explicitly LOCAL-labelled, rather than floating in a full-card popup. Local display names and usernames are temporary DOM text overrides scoped to your **own opened** self-profile UI; Discord identity and chat history are never modified. Local preview selections remain saved in DataStore.

Nitro evolution tiers, Server Booster tiers, legacy and current badge families are available in the badge picker, with six preview slots consistent with Discord's Badge Directory. This collection covers the currently documented categories but **may not include every future experimental tier**.

Avatar decoration renders from a validated Discord CDN asset when available, with a thumbnail fallback. Profile frame rendering is an edge-only decorative approximation of Shop art, **not** an accurate or functional native animated collectible. The frame/effect selection does not change ownership or payments.

## v0.1.9 — Native Cosmetics and Badge Picker

My Custom gallery remains open while interacting; close explicitly with the × button or Escape. The Badge library groups Nitro milestones, boosts, gifting, bug hunters, current/experimental activity and historic categories. Some experimental badge tiers are community-indexed, and no claim is made that Discord offers or recognizes all variants on this build.

Profile badges, frame artwork and avatar decoration overlays no longer include printed LOCAL stamps. These changes are exclusively on-device previews; actual Discord account badges, purchases, names and user information are not affected. The picker explicitly explains this, and badge tooltips provide a local-preview clarification.

Frame preview artwork now appears in the native Frame tile (visual-only, pointer-events disabled). Full native animation requires actual frame assets rather than Shop catalogue thumbnails and is not implemented.

## v0.1.11 — Shop catalogue & badge improvements

The Shop parser now distinguishes individual collectible SKUs from bundles and uses individual item preview assets when available. Current catalogue results are delivered in 50-item scroll batches; typing in search queries searches the full fetched item list, not merely the first rendered 50. Only results returned by Discord's Shop API are available (including possible exclusions of retired items).

Badges have **no six-badge cap**. Any/all of the badge catalogue's current entries can be selected simultaneously. The profile row wraps and scrolls rather than forcing a huge profile layout; the badge picker offers Select All and Clear All.

The local frame renderer's previously conditional React hook has been fixed. Frames use individual artwork where available; native multi-layer animated frames require deeper renderer integration and remain unsupported. No Discord purchase or account-entitlement modification occurs.
