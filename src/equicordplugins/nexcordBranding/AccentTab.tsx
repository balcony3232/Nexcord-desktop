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
    const saved = settings.use(["accentColor", "tintDiscord"]);
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

                        <label className="larpcord-appearance-toggle">
                            <input type="checkbox" checked={saved.tintDiscord}
                                onChange={event => settings.store.tintDiscord = event.currentTarget.checked} />
                            <span>
                                <strong>Colour Discord's buttons too</strong>
                                <small>Optional. Off by default to keep Discord's native accent and custom themes intact.</small>
                            </span>
                        </label>
                        <div className="larpcord-appearance-footer">
                            <span>Your colours stay on this device, in Larpcord's plugin settings.</span>
                            <Button variant="secondary" disabled={colour === DEFAULT_ACCENT && !saved.tintDiscord}
                                onClick={() => { chooseColour(DEFAULT_ACCENT); settings.store.tintDiscord = false; }}>
                                Reset to default
                            </Button>
                        </div>
                    </section>

                    <section className="larpcord-appearance-preview" aria-label="Live accent preview">
                        <span className="larpcord-appearance-eyebrow">LIVE PREVIEW</span>
                        <div className="larpcord-preview-shell">
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
                            <div className="larpcord-preview-action">Preview button</div>
                        </div>
                        <p>The cat logo stays pink; your accent applies to Larpcord's controls, highlights and Welcome page.</p>
                    </section>
                </div>
            </div>
        </SettingsTab>
    );
}
