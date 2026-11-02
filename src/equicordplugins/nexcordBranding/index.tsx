/*
 * Nexcord branding plugin. SPDX-License-Identifier: GPL-3.0-or-later
 */
import SettingsPlugin from "@plugins/_core/settings";
import { removeFromArray } from "@utils/misc";
import definePlugin from "@utils/types";

import { NexcordLogo } from "./NexcordLogo";

export default definePlugin({
    name: "NexcordBranding",
    description: "Nexcord identity and development information",
    tags: ["Utility"],
    authors: [{ name: "Nexcord", id: 0n }],
    required: true,
    start() {
        SettingsPlugin.customEntries.push({
            key: "nexcord_about",
            title: "About Nexcord",
            Component: require("./NexcordTab").default,
            Icon: NexcordLogo
        });
    },
    stop() {
        removeFromArray(SettingsPlugin.customEntries, entry => entry.key === "nexcord_about");
    }
});
