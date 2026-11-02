# Nexcord v0.2 — local cosmetics experiment

The first local cosmetics milestone supports your profile and other users' profiles.
- Right-click any user and select **Edit Local Cosmetics**.
- The full profile view also has a **Nexcord Local Appearance** section.
- Import PNG, JPG, WebP or GIF, limited to 2 MB per item, 30 items per device.
- Save custom banners and nameplates locally and preview them.
- Banner presentation is patched at Discord's standard getPreviewBanner call site. Compatibility must be verified in a running Discord client.
- Nameplates are previewed and saved but are **not yet rendered as native nameplates**.
- Nothing is sent to Discord's profile-save endpoint.

This is not yet integrated into Discord's own User Settings > Profiles cosmetic pickers.
