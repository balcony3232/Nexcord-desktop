/*
 * Nexcord original brand mark. SPDX-License-Identifier: GPL-3.0-or-later
 */
import { React } from "@webpack/common";

export function NexcordLogo(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" width="32" height="32" role="img" aria-label="Nexcord" {...props}>
            <defs>
                <linearGradient id="nexcord-violet" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#C88DFF" />
                    <stop offset=".52" stopColor="#9069F1" />
                    <stop offset="1" stopColor="#6252D3" />
                </linearGradient>
            </defs>
            <rect width="128" height="128" rx="28" fill="#0D0F14" />
            <ellipse cx="64" cy="69" rx="58" ry="21" transform="rotate(-23 64 69)" fill="none" stroke="#BFA1FF" strokeWidth="3.3" opacity=".92" />
            <path d="M24 93 39 31h19l25 34 8-34h17L93 96H75L49 58l-9 35z" fill="url(#nexcord-violet)" />
            <circle cx="116" cy="45" r="3.2" fill="#D7C3FF" />
        </svg>
    );
}
