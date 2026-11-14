/*
 * Larpcord emoji and sticker settings. SPDX-License-Identifier: GPL-3.0-or-later
 * FakeNitro is an upstream Vencord plugin; these controls do not grant Nitro.
 */
import { startDependenciesRecursive } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { SettingsTab } from "@components/settings";
import { React } from "@webpack/common";

import Plugins from "~plugins";

type ToggleProps = {
    title: string;
    detail: string;
    checked: boolean;
    disabled?: boolean;
    onChange(checked: boolean): void;
};

function Toggle({ title, detail, checked, disabled, onChange }: ToggleProps) {
    return (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", cursor: disabled ? "not-allowed" : "pointer" }}>
            <input
                type="checkbox"
                style={{ marginTop: 4 }}
                checked={checked}
                disabled={disabled}
                onChange={event => onChange(event.currentTarget.checked)}
            />
            <span>
                <strong style={{ display: "block" }}>{title}</strong>
                <small style={{ display: "block", opacity: 0.75, marginTop: 4 }}>{detail}</small>
            </span>
        </label>
    );
}

export function EmotesTab() {
    const settings = useSettings();
    const plugin = settings.plugins.FakeNitro;
    const [restartNeeded, setRestartNeeded] = React.useState(false);
    const [error, setError] = React.useState("");

    function changeEnabled(enabled: boolean) {
        if (enabled) {
            // Match the regular plugin manager: activate MessageEventsAPI first.
            const { failures } = startDependenciesRecursive(Plugins.FakeNitro);
            if (failures.length) {
                setError("Couldn't start plugin dependencies: " + failures.join(", "));
                return;
            }
        }

        plugin.enabled = enabled;
        setError("");
        setRestartNeeded(true); // FakeNitro uses webpack patches.
    }

    function changeOption(key: "enableEmojiBypass" | "enableStickerBypass" | "transformEmojis" | "transformStickers", checked: boolean) {
        plugin[key] = checked;
        setRestartNeeded(true);
    }

    return (
        <SettingsTab>
            <div style={{ maxWidth: 720 }}>
                <h2>Emojis &amp; Stickers</h2>
                <p>Use custom emojis and stickers from other servers without a Nitro subscription through Larpcord's built-in FakeNitro compatibility plugin.</p>
                <p style={{ opacity: 0.8 }}>
                    This is a visual workaround, not actual Nitro. Messages may be sent as image links or GIF attachments.
                    People using compatible clients may see them as normal emojis or stickers; other users may see the links or attachments.
                    The server must still permit the relevant message, link or attachment.
                </p>

                <div style={{ padding: "8px 16px", border: "1px solid var(--background-modifier-accent)", borderRadius: 12, margin: "20px 0" }}>
                    <Toggle
                        title="Enable free emoji & sticker compatibility"
                        detail="Uses the existing FakeNitro plugin. Other premium features are not granted to your Discord account."
                        checked={plugin.enabled}
                        onChange={changeEnabled}
                    />
                    <hr style={{ border: 0, borderTop: "1px solid var(--background-modifier-accent)" }} />
                    <Toggle
                        title="Use custom and animated emojis"
                        detail="Send otherwise unavailable custom emojis as compatible image links."
                        checked={plugin.enableEmojiBypass}
                        disabled={!plugin.enabled}
                        onChange={checked => changeOption("enableEmojiBypass", checked)}
                    />
                    <Toggle
                        title="Use stickers from other servers"
                        detail="Send otherwise unavailable stickers as links or, for some animations, GIF attachments."
                        checked={plugin.enableStickerBypass}
                        disabled={!plugin.enabled}
                        onChange={checked => changeOption("enableStickerBypass", checked)}
                    />
                    <Toggle
                        title="Render emoji links as emojis"
                        detail="Display compatible FakeNitro emoji links as normal emojis in your Larpcord client."
                        checked={plugin.transformEmojis}
                        disabled={!plugin.enabled}
                        onChange={checked => changeOption("transformEmojis", checked)}
                    />
                    <Toggle
                        title="Render sticker links as stickers"
                        detail="Display compatible FakeNitro sticker links as normal stickers in your Larpcord client."
                        checked={plugin.transformStickers}
                        disabled={!plugin.enabled}
                        onChange={checked => changeOption("transformStickers", checked)}
                    />
                </div>

                {error && <p role="alert" style={{ color: "var(--text-danger)" }}>{error}</p>}
                {restartNeeded && (
                    <div style={{ padding: 14, borderRadius: 10, background: "var(--background-secondary)" }}>
                        <p style={{ marginTop: 0 }}>Restart Larpcord to apply these changes. Your settings are saved.</p>
                        <Button variant="primary" onClick={() => location.reload()}>Restart Larpcord</Button>
                    </div>
                )}
                <p style={{ opacity: 0.75 }}>
                    More options, including emoji/sticker sizes and embed permission warnings, are in Settings → Plugins → FakeNitro.
                    This feature does not unlock Nitro subscriptions, paid cosmetics or native server-side emoji privileges.
                </p>
            </div>
        </SettingsTab>
    );
}
