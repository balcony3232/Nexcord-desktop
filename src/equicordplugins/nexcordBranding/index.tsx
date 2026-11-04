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
import { applyAccent, DEFAULT_ACCENT, normaliseHex, resetAccent, type AppearanceMode } from "./accent";
import { NexcordLogo } from "./NexcordLogo";

export const settings = definePluginSettings({
    accentColor: {
        type: OptionType.STRING,
        description: "Larpcord's appearance accent (six-digit HEX colour).",
        default: DEFAULT_ACCENT,
        isValid: value => Boolean(normaliseHex(value)) || "Enter a six-digit HEX colour, such as #F58EAF."
    },
    // Kept for backwards-compatibility with v0.1.2 saved settings.
    tintDiscord: {
        type: OptionType.BOOLEAN,
        description: "Legacy v0.1.2 option, replaced by Appearance Mode.",
        default: false,
        hidden: true
    },
    mode: {
        type: OptionType.SELECT,
        description: "Choose the original Discord look, accent-only controls, or the full Larpcord skin.",
        options: [
            { label: "Original Discord", value: "original" },
            { label: "Accent", value: "accent" },
            { label: "Full Larpcord", value: "full", default: true }
        ]
    },
    glowIntensity: {
        type: OptionType.SLIDER,
        description: "Subtle highlight glow in Full Larpcord mode.",
        default: 28,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false
    },
    tintStrength: {
        type: OptionType.SLIDER,
        description: "Background surface tint strength in Full Larpcord mode.",
        default: 38,
        markers: [0, 25, 50, 75, 100],
        stickToMarkers: false
    },
    unifiedSurfaces: {
        type: OptionType.BOOLEAN,
        description: "Tint chat, sidebars, member lists, message composer, settings and popouts together in Full Larpcord mode.",
        default: true
    }
});

const accentChanged = () => applyAccent(settings.store.accentColor, settings.store.mode as AppearanceMode, settings.store.glowIntensity, settings.store.tintStrength, settings.store.unifiedSurfaces);
const accentKey = "plugins.NexcordBranding.accentColor";
const appearanceKeys = ["plugins.NexcordBranding.mode", "plugins.NexcordBranding.glowIntensity", "plugins.NexcordBranding.tintStrength", "plugins.NexcordBranding.unifiedSurfaces"] as const;

export default definePlugin({
    name: "NexcordBranding",
    description: "Larpcord identity, accent presets, live colour picker and development information",
    tags: ["Appearance", "Customisation"],
    authors: [{ name: "Larpcord", id: 0n }],
    required: true,
    settings,
    toolboxActions: {
        "Restore Original Discord Appearance": () => { settings.store.mode = "original"; }
    },
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
        for (const key of appearanceKeys) SettingsStore.addChangeListener(key, accentChanged);
    },
    stop() {
        removeFromArray(SettingsPlugin.customEntries, entry => entry.key === "larpcord_appearance" || entry.key === "nexcord_about");
        SettingsStore.removeChangeListener(accentKey, accentChanged);
        for (const key of appearanceKeys) SettingsStore.removeChangeListener(key, accentChanged);
        resetAccent();
    }
});
