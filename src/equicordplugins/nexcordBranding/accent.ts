/*
 * Larpcord v0.1.3 theme runtime. SPDX-License-Identifier: GPL-3.0-or-later
 * Reversible runtime-only CSS and narrowly constrained theme variables.
 */
export const DEFAULT_ACCENT = "#F58EAF";
export type AppearanceMode = "original" | "accent" | "full";
const STYLE_ID = "larpcord-mode-style";
const PROPERTIES = [
    "--larpcord-accent", "--larpcord-accent-rgb", "--larpcord-accent-ink",
    "--larpcord-accent-hover", "--larpcord-accent-wash",
    "--larpcord-accent-border", "--larpcord-glow", "--larpcord-surface"
];
export function normaliseHex(value: unknown): string | null {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(value).trim());
    return match ? "#" + match[1].toUpperCase() : null;
}
function channels(color: string): [number, number, number] {
    return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as [number,number,number];
}
function inkFor(parts: number[]) {
    const values = parts.map(c => { const x = c / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722 > .31 ? "#241822" : "#FFFFFF";
}
const clamp = (n: unknown) => Math.max(0, Math.min(100, Number.isFinite(Number(n)) ? Number(n) : 0));
export function applyAccent(value: unknown, selectedMode: AppearanceMode, glow: unknown, strength: unknown) {
    const root = document.documentElement;
    if (!root) return;
    const color = normaliseHex(value) ?? DEFAULT_ACCENT;
    const mode: AppearanceMode = ["original", "accent", "full"].includes(selectedMode) ? selectedMode : "full";
    const rgb = channels(color);
    const ink = inkFor(rgb);
    const hover = ink === "#FFFFFF" ? "color-mix(in srgb, " + color + " 88%, white)" : "color-mix(in srgb, " + color + " 90%, black)";
    const glowAlpha = (clamp(glow) / 100 * .26).toFixed(3);
    const tintPercent = Math.round(clamp(strength) / 100 * 19);
    const previous = document.getElementById(STYLE_ID);
    previous?.remove();
    for (const prop of PROPERTIES) root.style.removeProperty(prop);
    root.removeAttribute("data-larpcord-mode");
    if (mode === "original") return;

    root.setAttribute("data-larpcord-mode", mode);
    root.style.setProperty("--larpcord-accent", color);
    root.style.setProperty("--larpcord-accent-rgb", rgb.join(", "));
    root.style.setProperty("--larpcord-accent-ink", ink);
    root.style.setProperty("--larpcord-accent-hover", hover);
    root.style.setProperty("--larpcord-accent-wash", "rgba(" + rgb.join(",") + ",0.10)");
    root.style.setProperty("--larpcord-accent-border", "rgba(" + rgb.join(",") + ",0.34)");
    root.style.setProperty("--larpcord-glow", "0 0 22px rgba(" + rgb.join(",") + "," + glowAlpha + ")");
    root.style.setProperty("--larpcord-surface", "color-mix(in srgb, #25252b, " + color + " " + tintPercent + "%)");

    const style = document.createElement("style");
    style.id = STYLE_ID;
    const brand = `
      --brand-500: ${color};
      --brand-560: ${hover};
      --brand-experiment: ${color};
      --control-brand-foreground: ${color};
      --button-filled-brand-background: ${color};
      --button-filled-brand-background-hover: ${hover};
      --button-filled-brand-background-active: ${hover};
      --button-filled-brand-text: ${ink};
    `;
    style.textContent = `
      :root[data-larpcord-mode="accent"] .theme-dark,
      :root[data-larpcord-mode="accent"] .theme-light,
      :root[data-larpcord-mode="full"] .theme-dark,
      :root[data-larpcord-mode="full"] .theme-light { ${brand} }
      :root[data-larpcord-mode="accent"] :is(.vc-settings-tab,.larpcord-appearance-page) a,
      :root[data-larpcord-mode="full"] :is(.vc-settings-tab,.larpcord-appearance-page) a {color:var(--larpcord-accent);}
      :root[data-larpcord-mode="full"] .theme-dark {
        --background-base-low: color-mix(in srgb, #1b1c20, ${color} ${tintPercent}%);
        --background-base-lower: color-mix(in srgb, #14151a, ${color} ${tintPercent}%);
        --background-surface-high: color-mix(in srgb, #27272d, ${color} ${tintPercent}%);
        --background-secondary: color-mix(in srgb, #202127, ${color} ${tintPercent}%);
        --background-tertiary: color-mix(in srgb, #15161a, ${color} ${tintPercent}%);
      }
      :root[data-larpcord-mode="full"] :is(
        .larpcord-appearance-hero,.larpcord-appearance-preview,.larpcord-intro,.nexcord-welcome-image
      ) {box-shadow:var(--larpcord-glow);}
      :root[data-larpcord-mode="full"] :is(.nexcord-welcome-conversation,.larpcord-appearance-panel) {
        border-color:var(--larpcord-accent-border);
      }
      :root[data-larpcord-mode="full"] [aria-selected="true"]:is([role="tab"],[role="option"]),
      :root[data-larpcord-mode="full"] [aria-current="page"] {
        box-shadow: inset 3px 0 0 var(--larpcord-accent);
      }
      @media (prefers-reduced-motion:reduce) {
        .larpcord-appearance-page *, .nexcord-welcome-conversation {animation:none!important;transition:none!important;}
      }
    `;
    document.head.appendChild(style);
}
export function resetAccent() {
    const root = document.documentElement;
    for (const prop of PROPERTIES) root?.style.removeProperty(prop);
    root?.removeAttribute("data-larpcord-mode");
    document.getElementById(STYLE_ID)?.remove();
}
