/*
 * Nexcord local-only cosmetic gallery.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import type { RenderModalProps } from "@vencord/discord-types";
import { IconUtils, Modal, React, showToast, UserProfileStore, UserStore } from "@webpack/common";

import { applyAsset, getAppearance, getSelectedAsset, importAsset, listAssets, loadCosmetics, subscribe } from "./storage";
import type { CosmeticKind } from "./storage";

export function LocalCosmeticsModal({
    userId,
    modalProps,
    initialKind = "banner"
}: {
    userId: string;
    modalProps: RenderModalProps;
    initialKind?: CosmeticKind;
}) {
    const user = UserStore.getUser(userId);
    const displayName = user?.globalName || user?.username || userId;
    const avatarUrl = user ? IconUtils.getUserAvatarURL(user, true, 128) : undefined;
    const profileBanner = UserProfileStore.getUserProfile(userId)?.banner;
    const discordBannerUrl = profileBanner
        ? "https://cdn.discordapp.com/banners/" + userId + "/" + profileBanner + "." + (profileBanner.startsWith("a_") ? "gif" : "png") + "?size=1024"
        : undefined;

    const [kind, setKind] = React.useState<CosmeticKind>(initialKind);
    const [pending, setPending] = React.useState(getAppearance(userId));
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const [, refresh] = React.useReducer(n => n + 1, 0);
    const fileInput = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => subscribe(refresh), []);
    React.useEffect(() => {
        void loadCosmetics().then(() => {
            setPending({ ...getAppearance(userId) });
        }).catch(e => setError(String(e)));
    }, [userId]);

    const isBanner = kind === "banner";
    const choices = listAssets(kind);
    const selected = choices.find(asset => asset.id === pending[kind]);
    const saved = getSelectedAsset(userId, kind);
    const title = isBanner ? "Change Profile Banner" : "Change Nameplate";
    const visibleBanner = isBanner ? selected?.dataUrl ?? (pending.banner ? undefined : discordBannerUrl) : discordBannerUrl;
    const styleBanner = visibleBanner ? { backgroundImage: "url(" + JSON.stringify(visibleBanner) + ")" } : undefined;

    async function onImport(file?: File) {
        if (!file) return;
        setBusy(true);
        setError("");
        try {
            const item = await importAsset(kind, file);
            setPending(old => ({ ...old, [kind]: item.id }));
            showToast({ text: "Added to My Custom " + (isBanner ? "Banners" : "Nameplates"), variant: "success" });
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    async function onApply() {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await applyAsset(userId, "banner", pending.banner);
            await applyAsset(userId, "nameplate", pending.nameplate);
            showToast({ text: "Local appearance saved — only you can see it", variant: "success" });
            modalProps.onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={title}
            actions={[
                { text: "Cancel", variant: "secondary", onClick: () => modalProps.onClose() },
                { text: "Apply", variant: "primary", onClick: onApply, disabled: busy }
            ]}
        >
            <div className="nexcord-picker">
                <div className="nexcord-picker-topline">
                    <span className="nexcord-picker-local-pill">Only visible to you</span>
                    <span>Customise how <strong>{displayName}</strong> appears in Nexcord</span>
                </div>
                <div className="nexcord-picker-body">
                    <div className="nexcord-picker-options">
                        <h3>Your {isBanner ? "Banners" : "Nameplates"}</h3>
                        <div className="nexcord-picker-choice-row">
                            <button
                                type="button"
                                className={"nexcord-picker-none" + (!pending[kind] ? " nexcord-picker-selected" : "")}
                                aria-pressed={!pending[kind]}
                                onClick={() => setPending(old => ({ ...old, [kind]: undefined }))}
                            >
                                <span className="nexcord-picker-none-symbol">⊘</span>
                                <span>None</span>
                            </button>
                            <button
                                type="button"
                                className="nexcord-picker-upload"
                                onClick={() => fileInput.current?.click()}
                                disabled={busy}
                            >
                                <span className="nexcord-picker-upload-symbol">+</span>
                                <span>Import</span>
                            </button>
                        </div>
                        <h3>My Custom</h3>
                        {choices.length ? (
                            <div className={"nexcord-picker-grid" + (!isBanner ? " nexcord-picker-grid-wide" : "")}>
                                {choices.map(asset => (
                                    <button
                                        key={asset.id}
                                        type="button"
                                        aria-pressed={pending[kind] === asset.id}
                                        title={asset.label}
                                        className={"nexcord-picker-asset" + (pending[kind] === asset.id ? " nexcord-picker-selected" : "")}
                                        onClick={() => setPending(old => ({ ...old, [kind]: asset.id }))}
                                    >
                                        <img alt={asset.label} src={asset.dataUrl} />
                                        <span>{asset.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="nexcord-picker-empty">Your imported {isBanner ? "banners" : "nameplates"} will appear here.</p>
                        )}
                        <input
                            ref={fileInput}
                            type="file"
                            hidden
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={event => {
                                void onImport(event.currentTarget.files?.[0]);
                                event.currentTarget.value = "";
                            }}
                        />
                        <p className="nexcord-picker-hint">PNG, JPG, WebP or GIF · Maximum 2 MB per image · Stored locally</p>
                    </div>
                    <div className="nexcord-picker-preview">
                        <div className="nexcord-picker-preview-header">
                            <h3>{isBanner ? "Profile Preview" : "Nameplate Preview"}</h3>
                            <span>Only you</span>
                        </div>
                        {isBanner ? (
                            <div className="nexcord-picker-profile-card">
                                <div className="nexcord-picker-banner" style={styleBanner} />
                                <div className="nexcord-picker-profile-content">
                                    {avatarUrl
                                        ? <img className="nexcord-picker-avatar" alt="" src={avatarUrl} />
                                        : <span className="nexcord-picker-avatar nexcord-picker-placeholder">{displayName[0]?.toUpperCase() ?? "?"}</span>}
                                    <strong className="nexcord-picker-display-name">{displayName}</strong>
                                    <span className="nexcord-picker-username">{user?.username ?? displayName}</span>
                                    <div className="nexcord-picker-profile-button">Message</div>
                                </div>
                            </div>
                        ) : (
                            <div className="nexcord-picker-nameplate-example">
                                <div className="nexcord-picker-skeleton-row"><span /><span /></div>
                                <div className="nexcord-picker-nameplate-stage" style={selected ? { backgroundImage: "url(" + JSON.stringify(selected.dataUrl) + ")" } : undefined}>
                                    {avatarUrl
                                        ? <img className="nexcord-picker-mini-avatar" alt="" src={avatarUrl} />
                                        : <span className="nexcord-picker-mini-avatar nexcord-picker-placeholder">{displayName[0]?.toUpperCase() ?? "?"}</span>}
                                    <span className="nexcord-picker-nameplate-name">{displayName}</span>
                                </div>
                                <div className="nexcord-picker-skeleton-row"><span /><span /></div>
                            </div>
                        )}
                        <div className="nexcord-picker-selection-detail">
                            <strong>{selected?.label ?? (isBanner ? "Default banner" : "No local nameplate")}</strong>
                            <span>{selected ? "My Custom · Stored locally" : "Discord original"}</span>
                        </div>
                        {saved && <p className="nexcord-picker-hint">Currently applied: {saved.label}</p>}
                        {!isBanner && <p className="nexcord-picker-hint">Custom nameplates can be previewed and saved. Showing them in Discord's built-in nameplate slot is still in development.</p>}
                    </div>
                </div>
                {error && <p className="nexcord-picker-error" role="alert">{error}</p>}
                {busy && <p className="nexcord-picker-hint">Saving…</p>}
            </div>
        </Modal>
    );
}
