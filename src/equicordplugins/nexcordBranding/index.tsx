/*
 * Larpcord appearance and identity. SPDX-License-Identifier: GPL-3.0-or-later
 * Keep NexcordBranding as the internal plugin ID so existing settings migrate safely.
 */
import "./appearance.css";

import { definePluginSettings, SettingsStore } from "@api/Settings";
import { PaintbrushIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";

import { AccentTab } from "./AccentTab";
import { applyAccent, DEFAULT_ACCENT, normaliseHex, resetAccent } from "./accent";
import { NexcordLogo } from "./NexcordLogo";

export const settings = definePluginSettings({
    accentColor: {
        type: OptionType.STRING,
        description: "Larpcord's appearance accent (six-digit HEX colour).",
        default: DEFAULT_ACCENT,
        isValid: value => Boolean(normaliseHex(value)) || "Enter a six-digit HEX colour, such as #F58EAF."
    },
    tintDiscord: {
        type: OptionType.BOOLEAN,
        description: "Also colour Discord's brand buttons. Disable to keep Discord's original accent.",
        default: false
    }
});

const accentChanged = () => applyAccent(settings.store.accentColor, settings.store.tintDiscord);
const accentKey = "plugins.NexcordBranding.accentColor";
const scopeKey = "plugins.NexcordBranding.tintDiscord";

export default definePlugin({
    name: "NexcordBranding",
    description: "Larpcord identity, accent presets, live colour picker and development information",
    tags: ["Appearance", "Customisation"],
    authors: [{ name: "Larpcord", id: 0n }],
    required: true,
    settings,
    startAt: StartAt.DOMContentLoaded,
    start() {
        SettingsPlugin.customEntries.push({
            key: "larpcord_appearance",
            title: "Appearance",
            panelTitle: "Larpcord Appearance",
            Component: AccentTab,
            Icon: PaintbrushIcon
        }, {
            key: "nexcord_about",
            title: "About Larpcord",
            Component: require("./NexcordTab").default,
            Icon: NexcordLogo
        });
        accentChanged();
        SettingsStore.addChangeListener(accentKey, accentChanged);
        SettingsStore.addChangeListener(scopeKey, accentChanged);
    },
    stop() {
        removeFromArray(SettingsPlugin.customEntries, entry => entry.key === "larpcord_appearance" || entry.key === "nexcord_about");
        SettingsStore.removeChangeListener(accentKey, accentChanged);
        SettingsStore.removeChangeListener(scopeKey, accentChanged);
        resetAccent();
    }
});
