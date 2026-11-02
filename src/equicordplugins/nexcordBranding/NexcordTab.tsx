/*
 * Nexcord desktop branding and settings. SPDX-License-Identifier: GPL-3.0-or-later
 */
import { SettingsTab } from "@components/settings";
import { gitHashShort } from "@shared/vencordUserAgent";
import { React } from "@webpack/common";

import { NexcordLogo } from "./NexcordLogo";

export default function NexcordTab() {
    return (
        <SettingsTab>
            <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 22 }}>
                <NexcordLogo width={76} height={76} />
                <div>
                    <h2 style={{ margin: 0 }}>Nexcord Desktop</h2>
                    <p style={{ margin: "6px 0", opacity: .72 }}>v0.1 development • {gitHashShort}</p>
                </div>
            </div>
            <h3>Welcome to Nexcord</h3>
            <p>Nexcord is an independent, community-built Discord client modification based on Equicord and Vencord. Discord's normal appearance is preserved by default.</p>
            <p>The plugin library is available in the Plugins tab. It includes favourites, filters, and Nexcord's own saved plugin presets.</p>
            <h3>Early development build</h3>
            <p>Custom loading facts are supplied by LoadingQuotes. Native profile cosmetics, installer automation and other features are still in development.</p>
            <p><a href="https://github.com/balcony3232/Nexcord-desktop" target="_blank" rel="noreferrer">Nexcord source and releases</a></p>
            <p style={{ opacity: .65 }}>GPL-3.0-or-later. Nexcord is not affiliated with Discord, Equicord or Vencord. See the source repository for upstream credits.</p>
        </SettingsTab>
    );
}
