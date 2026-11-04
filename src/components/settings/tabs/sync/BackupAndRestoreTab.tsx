/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { downloadSettingsBackup, uploadSettingsBackup } from "@api/SettingsSync/offline";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { React } from "@webpack/common";

type Section = "all" | "plugins" | "css" | "datastore";
const sections: { kind: Section; label: string; note: string; }[] = [
    { kind: "all", label: "All settings", note: "QuickCSS, theme links, plugins and DataStore" },
    { kind: "plugins", label: "Plugins only", note: "Plugin preferences and enabled plugins" },
    { kind: "css", label: "QuickCSS only", note: "Your CSS customisations" },
    { kind: "datastore", label: "Local DataStore", note: "Stored plugin data (can include local cosmetics)" }
];

function BackupAndRestoreTab() {
    const [section, setSection] = React.useState<Section>("all");
    const [confirm, setConfirm] = React.useState(false);
    const [phase, setPhase] = React.useState<"choose" | "confirm" | "restoring">("choose");
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");

    async function exportSelected() {
        setError("");
        setSaving(true);
        try {
            await downloadSettingsBackup(section);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    }

    async function importSelected() {
        if (!confirm || phase !== "confirm") return;
        setError("");
        setPhase("restoring");
        try {
            await uploadSettingsBackup(section);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setConfirm(false);
            setPhase("choose");
        }
    }

    return (
        <SettingsTab>
            <div style={{ maxWidth: 780 }}>
                <Heading className={Margins.top16}>Larpcord Backup & Restore</Heading>
                <Paragraph className={Margins.bottom20}>
                    Save your appearance presets, plugin configuration, custom CSS and local cosmetic data.
                    Backups are JSON files stored wherever you choose. No Larpcord server is required.
                </Paragraph>
                <Notice.Warning className={Margins.bottom20}>
                    Restoring overwrites matching local settings. Export a backup before importing.
                    Backups may contain sensitive plugin data; keep them private and do not share them publicly.
                    Discord login sessions and account passwords are not backed up.
                </Notice.Warning>

                <Heading>Step 1 — Choose what to back up</Heading>
                <div role="radiogroup" aria-label="Backup section" style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    {sections.map(({ kind, label, note }) => (
                        <label key={kind} style={{
                            display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                            borderRadius: 9, border: "1px solid var(--border-subtle)",
                            background: section === kind ? "var(--larpcord-accent-wash,rgba(245,142,175,.08))" : "transparent",
                            cursor: "pointer"
                        }}>
                            <input type="radio" name="larpcord-backup-section"
                                checked={section === kind} onChange={() => {
                                    setSection(kind); setPhase("choose"); setConfirm(false);
                                }} />
                            <span><strong>{label}</strong><br /><small>{note}</small></span>
                        </label>
                    ))}
                </div>
                <Flex className={Margins.top16} gap="8px">
                    <Button variant="primary" disabled={saving || phase === "restoring"}
                        onClick={() => void exportSelected()}>
                        {saving ? "Exporting…" : "Export Backup"}
                    </Button>
                </Flex>

                <Divider className={Margins.top20} />
                <Heading className={Margins.top16}>Step 2 — Restore a saved backup</Heading>
                <Paragraph className={Margins.bottom16}>
                    Select the same section as the file you exported. Restore will merge settings from the
                    JSON file into this installation. A restart may be needed for plugins or themes.
                </Paragraph>
                {phase === "choose" && (
                    <Button variant="secondary" onClick={() => {
                        setConfirm(false); setError(""); setPhase("confirm");
                    }}>
                        Review Restore
                    </Button>
                )}
                {phase === "confirm" && (
                    <div style={{ padding: 16, border: "1px solid var(--larpcord-accent-border)", borderRadius: 10 }}>
                        <strong>Restore {sections.find(s => s.kind === section)?.label}?</strong>
                        <Paragraph className={Margins.top8}>
                            This may replace existing plugin preferences or cosmetic selections. Make a backup first.
                        </Paragraph>
                        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14, cursor: "pointer" }}>
                            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.currentTarget.checked)} />
                            I understand that this can overwrite my existing settings.
                        </label>
                        <Flex className={Margins.top16} gap="8px">
                            <Button variant="primary" disabled={!confirm} onClick={() => void importSelected()}>Choose JSON and Restore</Button>
                            <Button variant="secondary" onClick={() => { setPhase("choose"); setConfirm(false); }}>Cancel</Button>
                        </Flex>
                    </div>
                )}
                {phase === "restoring" && <Paragraph>Opening backup file and restoring settings…</Paragraph>}
                {error && <Paragraph style={{ color: "var(--text-danger)" }} className={Margins.top8}>{error}</Paragraph>}
                <Divider className={Margins.top20} />
                <Paragraph className={Margins.top16}>
                    Larpcord does not back up Discord credentials, account tokens, installed program files,
                    or large media outside its plugin DataStore. The import format remains compatible with
                    existing Equicord/Vencord JSON backups.
                </Paragraph>
            </div>
        </SettingsTab>
    );
}
export default wrapTab(BackupAndRestoreTab, "Backup & Restore");
