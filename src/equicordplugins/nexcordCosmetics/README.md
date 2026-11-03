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
