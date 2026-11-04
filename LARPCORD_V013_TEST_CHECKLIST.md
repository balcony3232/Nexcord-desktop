# Larpcord v0.1.3 — Tester checklist

Mark each item [x] only when you've checked it on your own Windows PC. Report failures with a screenshot or description. Do not remove your existing installation or account data.

## 1. Upgrade and account safety
- [ ] 1.1 v0.1.2 Updater detects v0.1.3.
- [ ] 1.2 Install v0.1.3 and relaunch successfully. Note: the v0.1.2 updater may still use a visible installer.
- [ ] 1.3 About Larpcord / installer details show v0.1.3.
- [ ] 1.4 Already logged-in Discord account, servers, DMs and friends work.
- [ ] 1.5 Existing plugins, cosmetic settings, presets, welcome image and notifications persist.
- [ ] 1.6 Separate official Discord and Equibop installs (if present) remain untouched.

## 2. Appearance — Original, Accent and Full
- [ ] 2.1 Appearance page shows all three modes.
- [ ] 2.2 On a fresh profile Full Larpcord is the default; saved v0.1.2 colour persists on an upgrade.
- [ ] 2.3 Original mode restores Discord colours and surfaces without changing Discord layout.
- [ ] 2.4 Accent mode recolours buttons, highlights and links, but not the background.
- [ ] 2.5 Full Larpcord noticeably tints surfaces and adds subtle glow, while preserving navigation and chat layout.
- [ ] 2.6 All six presets update immediately: Blush, Rose, Peach, Lavender, Sky and Mint.
- [ ] 2.7 Custom valid six-digit hex works; invalid input is rejected.
- [ ] 2.8 Tint slider at 0, 50 and 100 changes surface strength in Full mode.
- [ ] 2.9 Glow slider at 0, 50 and 100 changes glow in Full mode.
- [ ] 2.10 Both sliders are disabled/irrelevant in Original and Accent modes.
- [ ] 2.11 Live preview changes for all modes.
- [ ] 2.12 Closing and reopening Larpcord preserves mode, colour and slider values.
- [ ] 2.13 Reset restores Full Larpcord, Blush, default slider values.
- [ ] 2.14 Switching back to Original removes tinted styling, even after using Full.
- [ ] 2.15 Toolbox action Restore Original Discord Appearance works.
- [ ] 2.16 Themes, QuickCSS, custom cosmetics and usual Discord settings still work.
- [ ] 2.17 Text and controls remain readable with light and dark accent colours.

## 3. Welcome screen and splash
- [ ] 3.1 Welcome page uses selected accents without breaking DM links or imported image.
- [ ] 3.2 Loading cat is smaller, around 120 px, with no cropping.
- [ ] 3.3 Cat, Did you know label and tip do not overlap.
- [ ] 3.4 Loading composition is horizontally and vertically well-centred on your window.
- [ ] 3.5 Small and maximised windows remain readable.
- [ ] 3.6 Windows reduced-motion preference stops logo fade animation.
- [ ] 3.7 Normal launch reliably finishes and opens Discord.

## 4. Updater and safety
- [ ] 4.1 On v0.1.3, Check for Updates shows correct installed/latest versions.
- [ ] 4.2 Download Update and Restart to Update are separate steps.
- [ ] 4.3 Progress reaches 100% before Restart to Update appears (requires a future release to be available).
- [ ] 4.4 Clicking Restart to Update installs without per-user/all-users wizard (requires future release).
- [ ] 4.5 Larpcord automatically reopens on the newer version (requires future release).
- [ ] 4.6 Network failure shows an error and does not replace the working installation.
- [ ] 4.7 Release links point only to the Larpcord GitHub repository.
- [ ] 4.8 Previous v0.1.2 release recovery link is accessible.
- [ ] 4.9 Existing installation location is retained without automatic deletion of any legacy equibop folder.
- [ ] 4.10 Fresh per-user installation uses Larpcord identity (test only if possible on a separate Windows profile/VM).

## 5. General regression and performance
- [ ] 5.1 App opens and closes correctly, including system tray behaviour.
- [ ] 5.2 Calls, voice, microphone, notifications and Rich Presence still work.
- [ ] 5.3 Profile Editor and existing local cosmetics still work.
- [ ] 5.4 No unexpected CPU, GPU or RAM spike compared with v0.1.2 (record Task Manager results).
- [ ] 5.5 No crashes on resizing, switching chats, navigating settings or changing themes.
- [ ] 5.6 Keyboard focus and high-contrast/readability are reasonable.

## Release gates before planning v0.1.4
- [ ] All applicable 1–3 and 5 tests pass or have filed fixes.
- [ ] Installation path and previous-release recovery are tested.
- [ ] Future-release updater tests (4.3–4.5) remain explicitly UNVERIFIED until there is a higher-version test release.
- [ ] No critical regression remains unresolved.

Notes:
- The v0.1.2-to-v0.1.3 updater is still the OLD installer, so its wizard does not prove v0.1.3 silent updates are broken.
- Automatic rollback and automatic migration of existing equibop directories are NOT implemented. Manual rollback is offered instead.
- Unsigned preview binaries can trigger Windows SmartScreen; only install from this repository's verified release page.
