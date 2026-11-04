/*
 * Larpcord's native-feeling accent picker. SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Button } from "@components/Button";
import { SettingsTab } from "@components/settings";
import { React } from "@webpack/common";

import { NexcordLogo } from "./NexcordLogo";
import { DEFAULT_ACCENT, normaliseHex } from "./accent";
import { settings } from "./index";

const PRESETS = [
    { name: "Blush", value: "#F58EAF" },
    { name: "Rose", value: "#E9789C" },
    { name: "Peach", value: "#F2A57A" },
    { name: "Lavender", value: "#A895EC" },
    { name: "Sky", value: "#79B6E8" },
    { name: "Mint", value: "#78C8B6" }
] as const;

export function AccentTab() {
    const saved = settings.use(["accentColor", "mode", "glowIntensity", "tintStrength"]);
    const mode = saved.mode ?? "full";
    const colour = normaliseHex(saved.accentColor) ?? DEFAULT_ACCENT;
    const [draft, setDraft] = React.useState(colour);
    const valid = normaliseHex(draft);
    const hasChanged = valid !== null && valid !== colour;
    React.useEffect(() => setDraft(colour), [colour]);

    const chooseColour = (value: string) => {
        const normal = normaliseHex(value);
        if (!normal) return;
        settings.store.accentColor = normal;
        setDraft(normal);
    };

    return (
        <SettingsTab>
            <div className="larpcord-appearance-page">
                <div className="larpcord-appearance-hero">
                    <NexcordLogo width={64} height={64} />
                    <div>
                        <span className="larpcord-appearance-eyebrow">LARPCORD / PERSONALISATION</span>
                        <h2>Make it yours.</h2>
                        <p>A little colour, without losing the Discord look you already know.</p>
                    </div>
                </div>

                <div className="larpcord-appearance-grid">
                    <section className="larpcord-appearance-panel">
                        <h3>Appearance mode</h3>
                        <p>Keep the familiar Discord layout. Switch styles instantly or revert to Original any time.</p>
                        <div className="larpcord-mode-options" role="group" aria-label="Appearance mode">
                            {([
                                ["original", "Original", "Discord's colours and surfaces"],
                                ["accent", "Accent", "Coloured controls and highlights"],
                                ["full", "Full Larpcord", "Tinted panels, accents and glow"]
                            ] as const).map(([value, title, desc]) => (
                                <button type="button" key={value} className={"larpcord-mode-card" + (mode === value ? " is-selected" : "")}
                                    aria-pressed={mode === value}
                                    onClick={() => settings.store.mode = value}>
                                    <strong>{title}</strong><small>{desc}</small>
                                </button>
                            ))}
                        </div>
                        <h3>Accent colour</h3>
                        <p>Pick a preset or enter any six-digit HEX colour. Changes appear instantly, and your selection is saved.</p>
                        <div className="larpcord-appearance-swatches" role="group" aria-label="Accent colour presets">
                            {PRESETS.map(preset => (
                                <button key={preset.name} type="button"
                                    className={colour === preset.value ? "larpcord-swatch is-selected" : "larpcord-swatch"}
                                    aria-label={preset.name + " " + preset.value}
                                    aria-pressed={colour === preset.value}
                                    title={preset.name}
                                    onClick={() => chooseColour(preset.value)}
                                >
                                    <span style={{ background: preset.value }} />
                                    <small>{preset.name}</small>
                                </button>
                            ))}
                        </div>

                        <div className="larpcord-appearance-custom">
                            <label htmlFor="larpcord-accent-hex">Custom colour</label>
                            <div className="larpcord-appearance-custom-controls">
                                <input type="color" value={colour} aria-label="Pick custom accent colour"
                                    onChange={event => chooseColour(event.currentTarget.value)} />
                                <input id="larpcord-accent-hex" className="larpcord-hex-input" type="text" spellCheck={false}
                                    maxLength={7} value={draft}
                                    onChange={event => setDraft(event.currentTarget.value)}
                                    onKeyDown={event => { if (event.key === "Enter" && valid) chooseColour(valid); }}
                                    aria-invalid={!valid} placeholder="#F58EAF" />
                                <Button variant="primary" disabled={!hasChanged} onClick={() => valid && chooseColour(valid)}>
                                    Apply
                                </Button>
                            </div>
                            {!valid && <span className="larpcord-appearance-error">Use six hexadecimal digits, e.g. #F58EAF.</span>}
                        </div>

                        <div className="larpcord-appearance-sliders">
                            <label htmlFor="larpcord-tint-range">
                                Surface tint <strong>{saved.tintStrength}%</strong>
                            </label>
                            <input id="larpcord-tint-range" type="range" min="0" max="100" step="1"
                                value={saved.tintStrength} disabled={mode !== "full"}
                                onChange={event => settings.store.tintStrength = Number(event.currentTarget.value)} />
                            <label htmlFor="larpcord-glow-range">
                                Glow intensity <strong>{saved.glowIntensity}%</strong>
                            </label>
                            <input id="larpcord-glow-range" type="range" min="0" max="100" step="1"
                                value={saved.glowIntensity} disabled={mode !== "full"}
                                onChange={event => settings.store.glowIntensity = Number(event.currentTarget.value)} />
                            <small>These controls affect Full Larpcord mode only. Select Original to undo Discord-wide styling.</small>
                        </div>
                        <div className="larpcord-appearance-footer">
                            <span>Your colours stay on this device, in Larpcord's plugin settings.</span>
                            <Button variant="secondary" disabled={colour === DEFAULT_ACCENT && mode === "full" && saved.glowIntensity === 28 && saved.tintStrength === 38}
                                onClick={() => { chooseColour(DEFAULT_ACCENT); settings.store.mode = "full"; settings.store.glowIntensity = 28; settings.store.tintStrength = 38; }}>
                                Reset to default
                            </Button>
                        </div>
                    </section>

                    <section className="larpcord-appearance-preview" aria-label="Live accent preview">
                        <span className="larpcord-appearance-eyebrow">LIVE PREVIEW · {mode === "full" ? "FULL LARPCORD" : mode.toUpperCase()}</span>
                        <div className={"larpcord-preview-shell larpcord-preview-" + mode}>
                            <div className="larpcord-preview-heading">
                                <NexcordLogo width={36} height={36} />
                                <div>
                                    <strong>Larpcord</strong>
                                    <small>Just for you</small>
                                </div>
                                <span className="larpcord-preview-online" />
                            </div>
                            <div className="larpcord-preview-message">
                                <span className="larpcord-preview-avatar">L</span>
                                <div><strong>New look, same chats.</strong><p>Customise Larpcord at your own pace.</p></div>
                            </div>
                            <div className="larpcord-preview-tag">✦ Accent ready</div>
                            <div className="larpcord-preview-action">{mode === "original" ? "Original Discord" : mode === "accent" ? "Accent mode" : "Full Larpcord"}</div>
                        </div>
                        <p>The cat logo stays pink. Original leaves Discord unchanged; Accent recolours controls; Full adds coloured surfaces and glow.</p>
                    </section>
                </div>
            </div>
        </SettingsTab>
    );
}
