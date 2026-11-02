/*
 * Nexcord local-only profile cosmetics. SPDX-License-Identifier: GPL-3.0-or-later
 */
import "./style.css";

import { addProfileSection, removeProfileSection } from "@api/ProfileSections";
import { PencilIcon } from "@components/Icons";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Menu, openModal, React, UserStore } from "@webpack/common";

import { LocalCosmeticsModal } from "./LocalCosmeticsModal";
import { getLocalBanner, getSelectedAsset, loadCosmetics, subscribe } from "./storage";

const logger = new Logger("NexcordCosmetics");
const SECTION_ID = "nexcord-local-cosmetics";

function openEditor(userId: string) {
    openModal(modalProps => <LocalCosmeticsModal userId={userId} modalProps={modalProps} />);
}

function ProfileSection({ userId }: { userId: string; isSideBar: boolean; }) {
    const [, forceUpdate] = React.useReducer(n => n + 1, 0);
    React.useEffect(() => subscribe(forceUpdate), []);
    const banner = getSelectedAsset(userId, "banner");
    const nameplate = getSelectedAsset(userId, "nameplate");

    return (
        <section className="nexcord-profile-section">
            <div className="nexcord-profile-section-title">
                <span>Nexcord Local Appearance</span>
                <span className="nexcord-local-tag">Only you</span>
            </div>
            {nameplate && <img className="nexcord-profile-nameplate" src={nameplate.dataUrl} alt="Local nameplate preview" />}
            <p>{banner ? "Custom banner" : "Default banner"} · {nameplate ? "Custom nameplate" : "Default nameplate"}</p>
            <button type="button" className="nexcord-profile-open" onClick={() => openEditor(userId)}>Edit local cosmetics</button>
        </section>
    );
}

export default definePlugin({
    name: "NexcordCosmetics",
    description: "Edit local banners and nameplates for yourself or another user",
    authors: [{ name: "Nexcord", id: 0n }],
    tags: ["Appearance", "Customisation"],
    enabledByDefault: true,
    dependencies: ["ProfileSectionsAPI"],
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
                    id="nexcord-edit-local-cosmetics"
                    label="Edit Local Cosmetics"
                    icon={PencilIcon}
                    action={() => openEditor(user.id)}
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
        addProfileSection(SECTION_ID, props => <ProfileSection {...props} />, 15);
        void loadCosmetics().catch(error => logger.error("Failed loading Nexcord cosmetics", error));
    },
    stop() {
        removeProfileSection(SECTION_ID);
    }
});
