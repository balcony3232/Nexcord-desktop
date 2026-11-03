# Nexcord v0.2 — Native cosmetic integration (experimental)

This plugin adds compact **My Custom** controls beside Discord's original profile editor headings. Selecting a custom image doesn't alter Discord's layout or call Discord's profile-save APIs.

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

## Experimental display hooks
- Nameplate, avatar decoration, and profile effect selections are exposed through a client-only profile store adapter
- Discord may render them on some surfaces but not others; native rendering is not yet confirmed and requires real-client testing
- Profile frames appear in a preview-only catalogue tab; Apply is disabled
- Imported *custom* nameplates are still preview-only outside the editor

## Limitations
- The live Shop catalogue does **not** include every retired, unpublished, promotional or region-unavailable item.
- Selections are **not purchases** and are not visible to other Discord users.
- This is experimental and may be affected by Discord updates.
- If Discord's actual Nameplate, Effect or Decoration UI fails to display an item, the local selection remains saved; please report which surface didn't update.
- Existing data stays in Nexcord's local IndexedDB. No extra Nexcord server or telemetry.
