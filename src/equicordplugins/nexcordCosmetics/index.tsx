/*
 * Nexcord local-only profile cosmetics. SPDX-License-Identifier: GPL-3.0-or-later
 */
import "./style.css";

import { PencilIcon } from "@components/Icons";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Menu, openModal, UserStore } from "@webpack/common";

import { LocalCosmeticsModal } from "./LocalCosmeticsModal";
import { getLocalBanner, loadCosmetics } from "./storage";
import { startNativeProfileIntegration, stopNativeProfileIntegration } from "./NativeProfileIntegration";
import { startShopDisplay, stopShopDisplay } from "./ShopDisplay";
import { loadShopSelections } from "./ShopCatalog";

const logger = new Logger("NexcordCosmetics");

function openEditor(userId: string, kind: "banner" | "nameplate" = "banner") {
    openModal(modalProps => <LocalCosmeticsModal userId={userId} initialKind={kind} modalProps={modalProps} />);
}

export default definePlugin({
    name: "NexcordCosmetics",
    description: "Browse local images and Discord Shop collectibles in the real profile editor (local-only)",
    authors: [{ name: "Nexcord", id: 0n }],
    tags: ["Appearance", "Customisation"],
    enabledByDefault: true,
    patches: [{
        // Native banner presentation, not profile save or account state.
        // Based on the preview-banner integration already used by USRBG.
        find: ':"SHOULD_LOAD");',
        replacement: {
            match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
            replace: "$self.bannerFor(arguments[0])||$&"
        },
        noWarn: true
    }],
    contextMenus: {
        "user-context": (children, { user }) => {
            if (!user?.id) return;
            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="nexcord-local-banner"
                    label="Change Local Banner"
                    icon={PencilIcon}
                    action={() => openEditor(user.id, "banner")}
                />,
                <Menu.MenuItem
                    id="nexcord-local-nameplate"
                    label="Change Local Nameplate"
                    icon={PencilIcon}
                    action={() => openEditor(user.id, "nameplate")}
                />
            );
        }
    },
    toolboxActions: {
        "Edit My Local Cosmetics": () => {
            const id = UserStore.getCurrentUser()?.id;
            if (id) openEditor(id);
        }
    },
    bannerFor({ displayProfile }: { displayProfile?: { userId?: string; }; }) {
        return getLocalBanner(displayProfile?.userId);
    },
    start() {
        startShopDisplay();
        startNativeProfileIntegration();
        void loadShopSelections().catch(error => logger.error("Failed loading local shop selections", error));
        void loadCosmetics().catch(error => logger.error("Failed loading Nexcord cosmetics", error));
    },
    stop() {
        stopNativeProfileIntegration();
        stopShopDisplay();
    }
});
