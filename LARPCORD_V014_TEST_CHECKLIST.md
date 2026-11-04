# Larpcord v0.1.4 — Combined Quality & Cosmetics Acceptance

Only check a box after testing on Windows. Start with the existing v0.1.3 install.
Report failures with the steps and a screenshot. Do not delete previous installation files.

## Installation / Silent updater (highest priority)
- [ ] 1. v0.1.3 Updater detects v0.1.4.
- [ ] 2. Download Update shows progress and waits at Restart to Update.
- [ ] 3. Restart to Update closes Larpcord and silently installs v0.1.4 with no installer wizard.
- [ ] 4. Larpcord reopens and About Larpcord reports v0.1.4.
- [ ] 5. Login, server memberships, DMs, settings, plugins and cosmetics survive.
- [ ] 6. A separate official Discord / Equibop install is unchanged.

## Entire-app appearance
- [ ] 7. Settings > Appearance > Full Larpcord > Colour the entire app is enabled by default.
- [ ] 8. Selected accent visibly colours chat background, left DM/channel panel, server bar and right member list.
- [ ] 9. Message composer, settings surfaces and compatible popouts use a coordinated accent tint.
- [ ] 10. Blush / Lavender / Mint / custom HEX instantly recolour all these surfaces.
- [ ] 11. Tint at 0%, 50%, 100% changes depth; chat text remains legible at 100%.
- [ ] 12. Glow slider still changes highlight intensity.
- [ ] 13. Turning Colour the entire app off leaves more restrained Full styling.
- [ ] 14. Accent mode changes highlights but not chat backgrounds.
- [ ] 15. Original mode fully restores Discord's native colours, without residual CSS.
- [ ] 16. Appearance survives restart; changing themes and light/dark mode causes no unreadable text.
- [ ] 17. Discord layout remains familiar; no clipped buttons, stuck chat, or inaccessible settings.

## Backup / restore
- [ ] 18. Backup & Restore wizard offers All / Plugins / QuickCSS / DataStore.
- [ ] 19. Export All downloads a larpcord JSON file; protect this file as private.
- [ ] 20. Restore requires a deliberate acknowledgement before file selection.
- [ ] 21. Importing a known-good backup restores appearance and plugin preferences (after preserving a safety backup).
- [ ] 22. Cancel leaves the application unchanged, and invalid JSON reports an error.
- [ ] 23. Updater Backup Settings button exports a backup without downloading an update.

## Profile cosmetics
- [ ] 24. Profile Editor still opens and its built-in controls are clickable.
- [ ] 25. My Custom controls for banners, nameplates, decorations and effects remain available.
- [ ] 26. Local Profile Theme option appears near Display Name Style (when present).
- [ ] 27. Custom profile background and accent colour save and preview immediately.
- [ ] 28. Local badges (Star, Heart, Moon, Cat) show clearly as LOCAL in self-popout.
- [ ] 29. The Reset local profile control removes the local theme, without deleting Discord account cosmetics.
- [ ] 30. Shop avatar decoration selection shows in the editor as LOCAL PREVIEW; no claims of ownership.
- [ ] 31. Existing local nameplates and effect previews still render on supported surfaces.
- [ ] 32. No actual Discord profile save, Nitro entitlement or paid Shop purchase occurs.
- [ ] 33. Local cosmetic choices persist after restarting and appear in DataStore backups.

## Performance / stability
- [ ] 34. Idle RAM/CPU compares favourably with v0.1.3 (record Task Manager readings).
- [ ] 35. Typing rapidly in chats does not cause UI stutter from cosmetic observers.
- [ ] 36. Calls, microphone, notifications, tray behaviour and Rich Presence work.
- [ ] 37. Changing chats, opening Profile Editor repeatedly and resizing do not crash Larpcord.
- [ ] 38. Discord restart shows cat splash and opens without login reset.
- [ ] 39. Previous-release link opens v0.1.3; reinstalling it remains a manual recovery option.

## Not complete in this release
- Automatic rollback after a bad install (manual recovery only).
- Automatic migration/deletion of the old equibop install path (preserved for safety).
- Sharing cosmetic presets with friends (v0.2.0).
- Native entitlement or remote profile effects, which are intentionally not supported.

Once all applicable boxes pass and bugs are fixed, we can choose the next version.
