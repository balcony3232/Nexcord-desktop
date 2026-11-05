# Larpcord v0.1.1 — development preview

This release focuses on the user-visible Larpcord identity in the standalone Windows desktop client. It is a preview, not a signed production release.

- Replace remaining Nexcord text in the Discord settings navigation, headings, updater panel and version information.
- Rename the desktop-shell settings entry to **Larpcord Desktop Settings** while retaining its internal settings identifiers.
- Set the pink cat as the default native splash image. Existing custom splash images still take precedence.
- Remove the native spinner animation from the Larpcord splash image.
- Use a soft pink accent on the Larpcord Welcome page and settings introduction, without overriding Discord's default theme.
- Refresh native first-launch button and link accents, and bump the standalone installer to version **0.1.1**.
- Preserve existing profile cosmetics, plugin identifiers, saved settings, plugin presets, and source credits.

## Building

GitHub Actions workflow: `.github/workflows/larpcord-desktop.yml` on `larpcord-development`. After a successful run, download the `larpcord-windows-standalone-preview` artifact and extract the `Larpcord-Setup-0.1.1.exe` installer.

## Verification checklist

1. Confirm Larpcord Setup reports v0.1.1, and that old Larpcord installation can be upgraded.
2. Confirm the first native loading window displays the cat without rotating.
3. Open Discord settings and verify **Larpcord Settings**, **Welcome to Larpcord**, and **Larpcord Desktop Settings**.
4. Verify installed plugins, cosmetic preferences, and saved presets persist after upgrade.
5. Check notifications, login, and minimized-to-tray behavior.

## Built-in updater (v0.1.1)

- The standalone **Updater** tab checks Larpcord GitHub Releases instead of the old Nexcord/Equicord client feed.
- Manual **Check for Updates** and **Download & install** controls, including progress and explicit native confirmation before closing the app.
- Electron-updater validates the release's SHA-512 metadata and handles NSIS installation. No update silently installs in the background.
- Windows CI publishes `v0.1.1` as a GitHub prerelease with `latest.yml`, installer, and blockmap on its first successful build.
- Existing v0.1.0 users must install the v0.1.1 installer manually once; subsequent versions can be installed from inside Larpcord.

## v0.1.2 — Personalisation and pink polish

- Dedicated **Appearance** panel in Larpcord Settings.
- Default soft pink accent, with six named presets and a hex input plus native colour picker.
- A live preview, accessible focus styles, contrast-aware text on coloured buttons and reset-to-default.
- Accent settings saved in the existing required `NexcordBranding` plugin ID to preserve upgrade compatibility.
- Live updates to Larpcord Welcome, introduction and app-specific controls; no restart needed.
- Optional **Colour Discord's buttons too** switch, off by default to avoid altering native/custom themes.
- Cat icon and Discord's normal dark layout remain untouched.
- Upgrades standalone installer version to **0.1.2**, retaining the GitHub release auto-updater.

**Smoke tests:** select swatches, enter a custom hex value, toggle Discord colour scope, relaunch and verify settings persist, reset to default, and update from v0.1.1 using the Updater tab.

## v0.1.3 — Appearance modes and staged updating

- Original, Accent and Full Larpcord modes with reversible styling, colour presets and tint/glow sliders.
- Smaller, centred loading-cat logo with no overlapping loading tip.
- Staged Windows updates: download, verification, and a separate Restart to Update action.
- Per-user silent NSIS install path for updates originating from v0.1.3 onwards.
- Recovery links; the legacy equibop installation directory is preserved rather than automatically moved.
- User-tested appearance, launch, login, settings and core Discord workflows (26 checks).

## v0.1.4 — Quality & Cosmetics (combined v0.1.4/v0.1.5 plan)

- **Unified dark-mode appearance:** Full Larpcord can colour the entire chat pane, channels/sidebar, member list, message composer, settings and popout surfaces using coordinated darker shades of the selected accent. The new Colour the entire app option is enabled by default.
- A stronger surface tint slider and reversible Original/Accent modes; does not change Discord's layout or authorisation.
- Guided settings backup and restore with explicit confirmation, private-data warnings, section selection, and Larpcord-named JSON files. There is also a Backup Settings button on the updater page.
- Native Profile Editor: local-only accent/background palette and clearly labelled local badge presets. Self popout displays saved theme colours and local badge; decorative Shop thumbnail preview is shown in the editor alongside existing local effects and nameplates.
- Reduce unnecessary DOM scans in native profile/cosmetic integrations while Discord chats are changing. No promised RAM reductions without Windows measurements.
- Existing Shop selections and original Discord ownership, Nitro, save flow and native profile data remain untouched. Local previews are visible only within compatible Larpcord clients; they are not official Discord items.
- Silent update confirmation from v0.1.3 to v0.1.4 still requires a real PC test. The installer is unsigned. Automatic rollback and automatic legacy-directory migration are not implemented.

**Smoke tests:** follow `LARPCORD_V014_TEST_CHECKLIST.md`; test the silent update from v0.1.3, all tinted surfaces, profile editor and custom badge previews, restarts, export and restore after exporting a safety backup.

## v0.1.5 — Local Cosmetics Follow-up (test release)

- All My Custom buttons open a unified 7-category browser (Banners, Nameplates, Decorations, Effects, Frames, Badges and Identity) without moving Discord's original profile editor.
- Local Discord-style badge gallery, including classic Nitro/Boost tiers, HypeSquad, Staff, Bug Hunter, Early Supporter and newer activity badges. Select up to six; these are LOCAL PREVIEWS, not earned Discord badges. Classic icon assets via Merlin's MIT-licensed source (attribution in picker).
- Editable *local* display name and username in Identity, saved to Larpcord DataStore. These values only appear on your own Larpcord preview surfaces; your real account, chats, remote profile and identifiers are untouched.
- New labelled preview overlay on the real self-profile editor card and own profile popout for local names, badge images and selected frame artwork.
- Frame choices are now selectable and persisted; the local preview uses their Shop product artwork. Proper native animated frame rendering is not implemented.
- Shop galleries support Show more in 60-item batches and search through all returned catalogue items. Current/retired Discord Shop availability still depends on the public feed.
- Fix Full Larpcord settings panels showing the chat beneath them by forcing opaque themed settings layers.
- No Discord entitlement, purchase, billing, profile save, or username-change API is invoked. Profile editor compatibility requires real Windows testing.
