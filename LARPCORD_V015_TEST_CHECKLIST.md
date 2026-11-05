# Larpcord v0.1.5 — Cosmetic Follow-up Test Checklist

Test this **after installing v0.1.5**; send a screenshot of any failure.
This release only affects on-device preview cosmetics, not Discord entitlements.

## Universal My Custom browser
- [ ] Open Edit Profiles: every My Custom button exposes 7 tabs: Banners, Nameplates, Decorations, Effects, Frames, Badges, Identity.
- [ ] Switching tabs changes the gallery content correctly (particularly Effects → Frames → Decorations).
- [ ] Search can find items beyond the first 60 using Show more.
- [ ] Existing custom banners and local nameplates remain saved and usable.
- [ ] Closing the gallery doesn't move or break Discord's native Profile Editor.

## Local badges & identity
- [ ] Badges shows Nitro, Server Booster tiers, Staff, Bug Hunter, HypeSquad and newer options.
- [ ] Clicking a badge marks it selected; up to six can be selected and deselected.
- [ ] Local badge images show on the actual profile card and on your self popout with a LOCAL label.
- [ ] Identity tab lets you change local display name and local username separately.
- [ ] Apply Local Names updates both Larpcord preview surfaces, without changing real Discord username or chat authors.
- [ ] Restart Larpcord; local badges, names and colours persist.
- [ ] Reset Local Profile clears local names/badges; your real account remains unchanged.

## Frames and effects
- [ ] Frames gallery offers selectable items instead of disabled buttons.
- [ ] Selecting a frame highlights it and shows a small labelled frame-artwork preview on the profile and self popout.
- [ ] Effect preview, nameplate and avatar decoration previews still work.
- [ ] No local choice pretends to equip or purchase an official Discord frame.

## Display & regressions
- [ ] Full Larpcord still colours the chat, server bar, channels, member list and settings.
- [ ] Opening Voice & Video and switching tabs doesn't reveal the chat behind the settings dialog.
- [ ] Original mode restores normal Discord colours.
- [ ] No FPS stuttering, crash or excessive RAM usage while scrolling the badges or Shop.
- [ ] No official Discord, Equibop or separate client installation is affected.
- [ ] Existing accounts, plugins, calls and notification behaviour still work.

## Still experimental
- Selected frames are **artwork previews**, not full native animated frame rendering.
- Some badges use fallback symbols; only the classic set has pinned artwork.
- Full compatibility with future Discord profile UI changes can't be promised.
- Automatic rollback and automatic migration of legacy Equibop installation folders remain unimplemented.
