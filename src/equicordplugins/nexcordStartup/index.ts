/*
 * NexcordStartup - Nexcord in-app loading logo.
 * SPDX-License-Identifier: MIT
 *
 * Adapted from Xaenny's CustomLoadingLogo for Vencord:
 * https://github.com/Xaenny/VencordPlugins/tree/master/CustomLoadingLogo
 * Copyright (c) 2026 Xaenny. Modified for Nexcord to use a bundled SVG data
 * URI, remove external network fetching, and fail safely on patch mismatch.
 * See THIRD_PARTY_LICENSE.txt for the original licence and attribution terms.
 */
import definePlugin, { StartAt } from "@utils/types";
import { React } from "@webpack/common";
import type { ComponentType } from "react";

import svgSource from "file://../../../assets/nexcord-logo.svg";
import "./style.css";

const LOGO_DATA_URI = "data:image/svg+xml;base64," + btoa(svgSource);
const cached = new WeakMap<ComponentType<any>, ComponentType<any>>();

export default definePlugin({
    name: "NexcordStartup",
    description: "Show the Nexcord logo on Discord's in-app loading screen",
    authors: [{ name: "Nexcord", id: 0n }, { name: "Xaenny", id: 0n }],
    tags: ["Appearance"],
    enabledByDefault: true,
    startAt: StartAt.Init,
    patches: [{
        // The fallback is the original Discord spinner if this patch does not
        // match a newer Discord version.
        find: '"app-spinner"',
        replacement: {
            match: /(return\(0,\i\.jsx\)\()(\i\.\i)(,\{ref:)/,
            replace: "$1$self.wrapLogo($2)$3"
        },
        noWarn: true
    }],
    wrapLogo(Original: ComponentType<any>) {
        let component = cached.get(Original);
        if (component) return component;

        component = React.forwardRef<HTMLImageElement, {
            className?: string;
            onLoadedData?: () => void;
        }>((props, ref) => {
            // The original onLoadedData signal is needed so Discord can
            // dismiss its loading screen, even if the SVG fails to render.
            return React.createElement("img", {
                ref,
                src: LOGO_DATA_URI,
                alt: "",
                draggable: false,
                className: [props.className, "nexcord-loading-logo"].filter(Boolean).join(" "),
                "data-testid": "app-spinner",
                onLoad: props.onLoadedData,
                onError: props.onLoadedData
            });
        });
        cached.set(Original, component);
        return component;
    }
});
