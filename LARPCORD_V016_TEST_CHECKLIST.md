# Larpcord v0.1.6 — Manual Profile Fixes Checklist

All cosmetic changes are client-side self-profile previews. Please send screenshots of the opened self-profile editor, self popout and cosmetic picker after changing selections.

## 1. Names
- [ ] Open Edit Profiles > My Custom > Identity; local display name and username inputs are visible at the TOP of the panel.
- [ ] Set a test display name and local username, then click Save Local Names.
- [ ] Close the picker; your own profile editor card displays those names in the original name positions, **not as a floating preview card**.
- [ ] Open your own profile popout: the changed names appear there too.
- [ ] Chat messages and your actual Discord account username are unchanged.
- [ ] Reload Larpcord; local names persist. Resetting removes local overrides without touching Discord account info.

## 2. Badges
- [ ] Open My Custom > Badges and search for Nitro Bronze/Silver/Gold/Platinum/Diamond/Emerald/Ruby/Opal.
- [ ] Search for all Server Booster monthly tiers (1,2,3,6,9,12,15,18,24).
- [ ] Search for Bug Hunter levels 1/2, Staff, HypeSquad, Early Supporter, Quest, Orbs and Gifting tiers.
- [ ] Select up to six, then close picker: icons appear next to real profile badges/name area with a small LOCAL marker, NOT in a floating preview.
- [ ] Real Discord-earned badges remain unchanged, and other people do not see the new previews.
- [ ] Badge artwork loads where available; fallback emoji is shown if a hosted icon is unavailable.
- [ ] Badge selection survives restarting Larpcord.

## 3. Frames & avatar decorations
- [ ] My Custom > Frames: selecting Dark Moon or another frame creates a decorative BORDER around the profile card, not a small floating frame thumbnail.
- [ ] Profile card remains usable and its content readable with the local border active.
- [ ] My Custom > Decorations: selecting a decoration produces an overlay around your avatar in profile editor and self popout.
- [ ] Switching/removing decoration removes the overlay, and original Discord avatar stays the same.
- [ ] Effects, native nameplates and My Custom category switching still work.
- [ ] **Note:** Frames are approximated from product artwork; exact/animated official frame rendering remains outstanding.

## 4. Regression
- [ ] No black/translucent settings overlay, frozen editor, or broken Save controls.
- [ ] Original/Accent/Full Larpcord appearance options work.
- [ ] No Discord crashes when opening and closing Edit Profiles repeatedly.
- [ ] Voice, messages, notifications, login and update settings survive.
- [ ] If anything is still visually off-center, send a screenshot with the entire profile editor visible.

Don't mark this test build complete until these runtime checks pass.
