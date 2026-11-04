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
