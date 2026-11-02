/*
 * Nexcord saved plugin presets. SPDX-License-Identifier: GPL-3.0-or-later
 * Keeps existing Equicord plugin UI and honours required/dependency plugins.
 */
import * as DataStore from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Alerts, React, showToast, TextInput, useEffect, useState } from "@webpack/common";

import Plugins from "~plugins";

type Preset = { name: string; enabled: string[]; };
const KEY = "nexcord.plugin-presets.v1";

function isPreset(value: unknown): value is Preset {
    if (!value || typeof value !== "object") return false;
    const p = value as Partial<Preset>;
    return typeof p.name === "string" && p.name.length <= 40
        && Array.isArray(p.enabled) && p.enabled.every(name => typeof name === "string");
}

export function NexcordPluginPresets() {
    const [presets, setPresets] = useState<Preset[]>([]);
    const [name, setName] = useState("My plugins");

    useEffect(() => {
        let alive = true;
        void DataStore.get<Preset[]>(KEY).then(saved => {
            if (alive && Array.isArray(saved)) setPresets(saved.filter(isPreset).slice(0, 30));
        }).catch(() => {});
        return () => { alive = false; };
    }, []);

    async function saveCurrent() {
        const clean = name.trim().slice(0, 40);
        if (!clean) return;
        const enabled = Object.values(Plugins)
            .filter(plugin => !plugin.required && isPluginEnabled(plugin.name))
            .map(plugin => plugin.name);
        const next = [...presets.filter(p => p.name !== clean), { name: clean, enabled }];
        try {
            await DataStore.set(KEY, next);
            setPresets(next);
            showToast({ text: "Saved Nexcord plugin preset", variant: "success" });
        } catch {
            showToast({ text: "Failed to save plugin preset", variant: "critical" });
        }
    }

    function applyPreset(preset: Preset) {
        Alerts.show({
            title: "Apply plugin preset?",
            body: "This changes enabled optional plugins and reloads Discord. Required plugins and dependencies remain enabled.",
            confirmText: "Apply and Reload",
            cancelText: "Cancel",
            onConfirm: () => {
                const wanted = new Set<string>();
                const visit = (pluginName: string) => {
                    if (wanted.has(pluginName) || !Plugins[pluginName]) return;
                    wanted.add(pluginName);
                    for (const dep of Plugins[pluginName].dependencies ?? []) visit(dep);
                };
                for (const pluginName of preset.enabled) visit(pluginName);
                for (const plugin of Object.values(Plugins)) {
                    if (plugin.required || plugin.isDependency && !wanted.has(plugin.name)) continue;
                    Settings.plugins[plugin.name].enabled = wanted.has(plugin.name);
                }
                location.reload();
            }
        });
    }

    async function deletePreset(preset: Preset) {
        const next = presets.filter(p => p.name !== preset.name);
        try {
            await DataStore.set(KEY, next);
            setPresets(next);
        } catch {
            showToast({ text: "Failed to delete preset", variant: "critical" });
        }
    }

    return (
        <Card style={{ padding: 16, marginTop: 16, marginBottom: 18 }}>
            <Heading tag="h4">Nexcord Plugin Presets</Heading>
            <p style={{ margin: "8px 0 12px", opacity: .75 }}>Save your current enabled plugins and restore them later. Required plugins cannot be removed.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: "1 1 160px" }}>
                    <TextInput value={name} onChange={setName} placeholder="Preset name" />
                </div>
                <Button variant="primary" onClick={() => void saveCurrent()}>Save current plugins</Button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {presets.map(preset => (
                    <div key={preset.name} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <span>{preset.name} <small style={{ opacity: .6 }}>({preset.enabled.length} plugins)</small></span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <Button size="small" onClick={() => applyPreset(preset)}>Apply</Button>
                            <Button variant="dangerPrimary" size="small" onClick={() => void deletePreset(preset)}>Delete</Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
