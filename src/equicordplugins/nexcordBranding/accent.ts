/*
 * Safely scoped Larpcord palette runtime. SPDX-License-Identifier: GPL-3.0-or-later
 * No arbitrary CSS, external stylesheets, or changes to account/theme storage.
 */
export const DEFAULT_ACCENT = "#F58EAF";
const RUNTIME_STYLE_ID = "larpcord-accent-runtime";
const PROPERTIES = [
    "--larpcord-accent", "--larpcord-accent-rgb", "--larpcord-accent-ink",
    "--larpcord-accent-hover", "--larpcord-accent-wash", "--larpcord-accent-border"
];

export function normaliseHex(value: unknown): string | null {
    const match = /^#?([a-f0-9]{6})$/i.exec(String(value).trim());
    return match ? "#" + match[1].toUpperCase() : null;
}

function rgb(hex: string) {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}

function contrastInk(parts: number[]) {
    const linear = parts.map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    const lum = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    return lum > 0.31 ? "#241822" : "#FFFFFF";
}

function shade(parts: number[], scale: number) {
    return "#" + parts.map(v => Math.max(0, Math.min(255, Math.round(v * scale)))
        .toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Larpcord-only surfaces use these custom properties. Discord's own brand
 * variables are overridden only when the user enables that option.
 */
export function applyAccent(value: string, tintDiscord: boolean) {
    const element = document.documentElement;
    if (!element) return;
    const color = normaliseHex(value) ?? DEFAULT_ACCENT;
    const parts = rgb(color);
    const ink = contrastInk(parts);
    const hover = ink === "#FFFFFF" ? shade(parts, 1.17) : shade(parts, 0.91);

    element.style.setProperty("--larpcord-accent", color);
    element.style.setProperty("--larpcord-accent-rgb", parts.join(", "));
    element.style.setProperty("--larpcord-accent-ink", ink);
    element.style.setProperty("--larpcord-accent-hover", hover);
    element.style.setProperty("--larpcord-accent-wash", `rgba(${parts.join(", ")}, 0.09)`);
    element.style.setProperty("--larpcord-accent-border", `rgba(${parts.join(", ")}, 0.28)`);

    let runtime = document.getElementById(RUNTIME_STYLE_ID) as HTMLStyleElement | null;
    if (!tintDiscord) {
        runtime?.remove();
        return;
    }
    if (!runtime) {
        runtime = document.createElement("style");
        runtime.id = RUNTIME_STYLE_ID;
        document.head.append(runtime);
    }
    // Only brand controls, not entire Discord backgrounds, fonts or profile colours.
    // This opt-in override may be superseded by explicit user themes.
    runtime.textContent = `
        .theme-dark, .theme-light {
            --brand-500: ${color};
            --brand-560: ${hover};
            --brand-experiment: ${color};
            --button-filled-brand-background: ${color};
            --button-filled-brand-background-hover: ${hover};
            --button-filled-brand-background-active: ${hover};
            --button-filled-brand-text: ${ink};
        }
    `;
}

export function resetAccent() {
    const element = document.documentElement;
    for (const property of PROPERTIES) element?.style.removeProperty(property);
    document.getElementById(RUNTIME_STYLE_ID)?.remove();
}
