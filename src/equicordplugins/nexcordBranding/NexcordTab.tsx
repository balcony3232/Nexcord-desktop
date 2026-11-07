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
                    <h2 style={{ margin: 0 }}>Larpcord Desktop</h2>
                    <p style={{ margin: "6px 0", opacity: .72 }}>v0.1.11 preview • {gitHashShort}</p>
                </div>
            </div>
            <h3>Welcome to Larpcord</h3>
            <p>Larpcord is an independent, community-built Discord client modification based on Equicord and Vencord. Choose Original, Accent, or Full Larpcord modes without changing Discord's familiar layout.</p>
            <p>Customise your accent in Larpcord Settings → Appearance. Plugins and saved presets remain available from the Plugins tab.</p>
            <h3>Early development build</h3>
            <p>Custom loading facts are supplied by LoadingQuotes. Local-only profile themes, cosmetic previews and native editor integration are experimental. Silent updating and rollback still require end-to-end testing.</p>
            <p><a href="https://github.com/balcony3232/Nexcord-desktop" target="_blank" rel="noreferrer">Larpcord source and releases</a></p>
            <h3>Upstream projects and support</h3>
            <p>Larpcord builds on the work of <a href="https://github.com/Equicord/Equicord" target="_blank" rel="noreferrer">Equicord</a> and <a href="https://github.com/Vendicated/Vencord" target="_blank" rel="noreferrer">Vencord</a>. You can support those projects through their official sites.</p>
            <p style={{ opacity: .65 }}>GPL-3.0-or-later. Larpcord is not affiliated with Discord, Equicord or Vencord. Original licence and copyright notices are retained in the source repository.</p>
        </SettingsTab>
    );
}
