/*
 * Larpcord v0.1.4 unified appearance runtime.
 * SPDX-License-Identifier: GPL-3.0-or-later.
 *
 * All overrides are local and reversible: Original mode removes the stylesheet,
 * data attribute and inline custom properties. No Discord account/theme APIs.
 * Colour-mixing keeps the app dark and text legible rather than rendering
 * solid accent-coloured slabs behind bright message text.
 */
export const DEFAULT_ACCENT = "#F58EAF";
export type AppearanceMode = "original" | "accent" | "full";
const STYLE_ID = "larpcord-mode-style";
const PROPERTIES = [
    "--larpcord-accent", "--larpcord-accent-rgb", "--larpcord-accent-ink",
    "--larpcord-accent-hover", "--larpcord-accent-wash", "--larpcord-accent-border",
    "--larpcord-glow", "--larpcord-surface", "--larpcord-chat",
    "--larpcord-sidebar", "--larpcord-panel", "--larpcord-input", "--larpcord-hover"
];
export function normaliseHex(value: unknown): string | null {
    const match = /^#?([0-9a-f]{6})$/i.exec(String(value).trim());
    return match ? "#" + match[1].toUpperCase() : null;
}
function channels(color: string): [number, number, number] {
    return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as [number,number,number];
}
function inkFor(parts: number[]) {
    const values = parts.map(c => {
        const x = c / 255;
        return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return values[0] * .2126 + values[1] * .7152 + values[2] * .0722 > .31 ? "#241822" : "#FFFFFF";
}
const clamp = (n: unknown) => Math.max(0, Math.min(100, Number.isFinite(Number(n)) ? Number(n) : 0));
function mix(base: string, color: string, amount: number) {
    return `color-mix(in srgb, ${base}, ${color} ${amount}%)`;
}
export function applyAccent(
    value: unknown, selectedMode: AppearanceMode, glow: unknown, strength: unknown, unified = true
) {
    const root = document.documentElement;
    if (!root) return;
    const color = normaliseHex(value) ?? DEFAULT_ACCENT;
    const mode: AppearanceMode = ["original", "accent", "full"].includes(selectedMode) ? selectedMode : "full";
    const parts = channels(color);
    const ink = inkFor(parts);
    const hover = mix(color, ink === "#FFFFFF" ? "white" : "black", 11);
    const amount = Math.round(clamp(strength) * .72);
    const glowAlpha = (clamp(glow) / 100 * .26).toFixed(3);
    document.getElementById(STYLE_ID)?.remove();
    for (const prop of PROPERTIES) root.style.removeProperty(prop);
    root.removeAttribute("data-larpcord-mode");
    root.removeAttribute("data-larpcord-unified");
    if (mode === "original") return;

    root.setAttribute("data-larpcord-mode", mode);
    if (mode === "full" && unified) root.setAttribute("data-larpcord-unified", "true");
    root.style.setProperty("--larpcord-accent", color);
    root.style.setProperty("--larpcord-accent-rgb", parts.join(", "));
    root.style.setProperty("--larpcord-accent-ink", ink);
    root.style.setProperty("--larpcord-accent-hover", hover);
    root.style.setProperty("--larpcord-accent-wash", `rgba(${parts.join(",")},0.10)`);
    root.style.setProperty("--larpcord-accent-border", `rgba(${parts.join(",")},0.34)`);
    root.style.setProperty("--larpcord-glow", `0 0 22px rgba(${parts.join(",")},${glowAlpha})`);
    root.style.setProperty("--larpcord-surface", mix("#25252b", color, amount));
    root.style.setProperty("--larpcord-chat", mix("#1b1c21", color, amount));
    root.style.setProperty("--larpcord-sidebar", mix("#16171b", color, amount));
    root.style.setProperty("--larpcord-panel", mix("#25262c", color, amount));
    root.style.setProperty("--larpcord-input", mix("#292a31", color, amount));
    root.style.setProperty("--larpcord-hover", mix("#393941", color, Math.round(amount * .8)));

    const style = document.createElement("style");
    style.id = STYLE_ID;
    const brand = `
      --brand-500: ${color}; --brand-560: ${hover};
      --brand-experiment: ${color}; --control-brand-foreground: ${color};
      --button-filled-brand-background: ${color};
      --button-filled-brand-background-hover: ${hover};
      --button-filled-brand-background-active: ${hover};
      --button-filled-brand-text: ${ink};
    `;
    const common = `
      --background-primary: var(--larpcord-chat);
      --background-secondary: var(--larpcord-sidebar);
      --background-secondary-alt: var(--larpcord-panel);
      --background-tertiary: var(--larpcord-sidebar);
      --background-floating: var(--larpcord-panel);
      --background-base-low: var(--larpcord-chat);
      --background-base-lower: var(--larpcord-sidebar);
      --background-base-lowest: var(--larpcord-sidebar);
      --background-surface-low: var(--larpcord-sidebar);
      --background-surface-lower: var(--larpcord-sidebar);
      --background-surface-high: var(--larpcord-panel);
      --background-surface-higher: var(--larpcord-panel);
      --background-surface-highest: var(--larpcord-input);
      --background-modifier-hover: var(--larpcord-hover);
      --background-modifier-active: var(--larpcord-panel);
      --background-modifier-selected: var(--larpcord-panel);
      --channeltextarea-background: var(--larpcord-input);
      --chat-background: var(--larpcord-chat);
      --chat-background-default: var(--larpcord-chat);
      --input-background: var(--larpcord-input);
      --modal-background: var(--larpcord-panel);
      --modal-footer-background: var(--larpcord-sidebar);
      --home-background: var(--larpcord-chat);
      --scrollbar-auto-track: transparent;
    `;
    style.textContent = `
      :root[data-larpcord-mode="accent"] :is(.theme-dark,.theme-light),
      :root[data-larpcord-mode="full"] :is(.theme-dark,.theme-light),
      :root[data-larpcord-mode="accent"]:is(.theme-dark,.theme-light),
      :root[data-larpcord-mode="full"]:is(.theme-dark,.theme-light) { ${brand} }
      :root[data-larpcord-mode="full"] .theme-dark {
        --background-base-low: var(--larpcord-surface);
        --background-secondary: var(--larpcord-sidebar);
        --background-tertiary: var(--larpcord-sidebar);
        --background-surface-high: var(--larpcord-panel);
      }
      :root[data-larpcord-mode="full"] :is(
        .larpcord-appearance-hero,.larpcord-appearance-preview,
        .larpcord-intro,.nexcord-welcome-image
      ) { box-shadow: var(--larpcord-glow); }
      :root[data-larpcord-mode="full"] :is(
        .nexcord-welcome-conversation,.larpcord-appearance-panel
      ) { border-color: var(--larpcord-accent-border); }
      :root[data-larpcord-mode="full"] [aria-selected="true"]:is([role="tab"],[role="option"]),
      :root[data-larpcord-mode="full"] [aria-current="page"] {
        box-shadow: inset 3px 0 0 var(--larpcord-accent);
      }

      /* Dark-mode app surfaces, not solid saturated accent blocks:
         retaining readable message, placeholder and username contrast. */
      :root[data-larpcord-mode="full"][data-larpcord-unified="true"] .theme-dark,
      :root[data-larpcord-mode="full"][data-larpcord-unified="true"].theme-dark {
        ${common}
      }
      :root[data-larpcord-unified="true"] :is(
        [class*="chatContent_"],[class*="messagesWrapper_"],
        [class*="chat_"][role="main"],[class*="contentRegionScroller_"]
      ) { background-color: var(--larpcord-chat); }
      :root[data-larpcord-unified="true"] :is(
        [class*="sidebar_"][class*="theme"],
        [class*="privateChannels_"],[class*="membersWrap_"],
        [class*="guilds_"],[class*="peopleColumn_"]
      ) { background-color: var(--larpcord-sidebar); }
      :root[data-larpcord-unified="true"] :is(
        [class*="channelTextArea_"],[class*="scrollableContainer_"],
        [class*="searchBar_"] input,[class*="inputWrapper_"] input
      ) { background-color: var(--larpcord-input); }
      :root[data-larpcord-unified="true"] :is(
        [class*="members_"],[class*="member_"][role="listitem"],
        [class*="sidebarList_"],[class*="contentRegion_"]
      ) { background-color: var(--larpcord-sidebar); }
      :root[data-larpcord-unified="true"] :is(
        [class*="titleBar_"],[class*="titleWrapper_"],
        [class*="container_"][role="banner"]
      ) { background-color: var(--larpcord-panel); }
      @media(prefers-reduced-motion:reduce) {
        .larpcord-appearance-page *, .nexcord-welcome-conversation {
            animation:none!important;transition:none!important;
        }
      }
    `;
    document.head.appendChild(style);
}
export function resetAccent() {
    const root = document.documentElement;
    for (const prop of PROPERTIES) root?.style.removeProperty(prop);
    root?.removeAttribute("data-larpcord-mode");
    root?.removeAttribute("data-larpcord-unified");
    document.getElementById(STYLE_ID)?.remove();
}
