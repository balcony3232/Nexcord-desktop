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
