# Larpcord v0.1.11 — Cosmetics Repair Acceptance

Test with installed v0.1.11 on Windows. These are **client-only cosmetic previews**; no real Discord entitlements should change.

## Individual items rather than bundles
- [ ] My Custom > Frames shows actual individual item names (not “... Bundle”).
- [ ] The selected individual frame shows item-specific artwork rather than a bundle poster.
- [ ] Decorations and Effects show the specific item's name and thumbnail.
- [ ] Refresh uses the new catalogue and does not reinsert stale bundle posters.
- [ ] Missing individual preview artwork shows a clear message rather than falsely claiming a frame is rendered.

## Infinite scroll
- [ ] An initial list of 50 items is rendered (or all remaining if fewer).
- [ ] Scrolling near the bottom of the grid automatically appends up to 50 more.
- [ ] With at least 101 items, repeat the scroll to reach beyond 100.
- [ ] Search still finds items outside the first batch and resets the rendered count.
- [ ] The optional Load Next button works using keyboard or mouse.
- [ ] No severe stutter from loading images while scrolling.

## Uncapped badges
- [ ] Select 7+ badges in different categories, close My Custom and see them in your own profile.
- [ ] Select All chooses all available catalogue badge IDs (not just six).
- [ ] The profile row wraps and scrolls so all chosen badges can be viewed.
- [ ] Clear All removes selected local badges without removing real Discord badges.
- [ ] Restart Larpcord and confirm badge selections persist.
- [ ] The Identity preview does not dump the complete name of every badge when many are equipped.

## Frame and other regressions
- [ ] Selecting a frame does not crash/freezes or break profile rendering.
- [ ] Changing the selected frame changes its preview artwork when the Shop provides distinct individual assets.
- [ ] Removing a frame then selecting another still works (tests conditional React hook fix).
- [ ] Selected decoration/nameplate/effect previews, local names, settings and popup buttons still work.
- [ ] Calls, messages, notifications and other installed Discord clients are unaffected.

**Known:** this build does not faithfully render each native animated Frame layer; it implements individual static previews and fixes the React rendering crash.
