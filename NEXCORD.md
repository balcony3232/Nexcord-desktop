# Nexcord Desktop v0.1

Independent Equicord-based Discord desktop modification.

- `main` is the unmodified/stable upstream fork.
- `nexcord-development` contains development changes.
- GitHub Actions uploads `desktop.asar` from successful builds.
- No changes to Discord accounts, Nitro entitlements or remote user profiles.
- Default Discord styling stays unchanged; Nexcord appearance options are opt-in.
- Build source and upstream attribution remain available under GPL-3.0-or-later.

## Current v0.1 work
- Nexcord Settings identity and original orbital N logo
- Nexcord loading facts via existing LoadingQuotes plugin
- Nexcord in-app loading logo via startup spinner patch (inspired by Xaenny, MIT; safe fallback if patch no longer matches)
- Plugin favourites and filters remain provided by Equicord
- Nexcord saved plugin presets

## Known limitations
- NexcordStartup targets the **in-app** loading logo. The earlier Electron splash is separate. The logo replacement requires a live Discord launch test.
- Installing into Discord and configuring release updates requires the dedicated Nexcord Installer, which is not yet complete.
- Distributing untested development builds can break the Discord installation. Use PTB/Canary for testing.

## Build
The `.github/workflows/nexcord-dev.yml` workflow builds `dist/desktop.asar` on the development branch. Do not install it directly without a patching installer.
