/*
 * Nexcord local cosmetic picker. SPDX-License-Identifier: GPL-3.0-or-later
 */
import { Button } from "@components/Button";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, React, showToast, UserStore } from "@webpack/common";

import { applyAsset, getAppearance, getSelectedAsset, importAsset, listAssets, loadCosmetics, subscribe } from "./storage";
import type { CosmeticKind } from "./storage";

const TABS: CosmeticKind[] = ["banner", "nameplate"];

export function LocalCosmeticsModal({ userId, modalProps }: { userId: string; modalProps: RenderModalProps; }) {
    const user = UserStore.getUser(userId);
    const displayName = user?.globalName || user?.username || userId;
    const [kind, setKind] = React.useState<CosmeticKind>("banner");
    const [pending, setPending] = React.useState<Record<CosmeticKind, string | undefined>>({
        banner: getAppearance(userId).banner,
        nameplate: getAppearance(userId).nameplate
    });
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    const [revision, forceUpdate] = React.useReducer(n => n + 1, 0);
    const fileInput = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => subscribe(forceUpdate), []);
    React.useEffect(() => {
        void loadCosmetics().then(() => {
            const saved = getAppearance(userId);
            setPending({ banner: saved.banner, nameplate: saved.nameplate });
        }).catch(err => setError(String(err)));
    }, [userId]);

    void revision; // redraw after IndexedDB state changes
    const choices = listAssets(kind);
    const preview = choices.find(asset => asset.id === pending[kind]);
    const current = getSelectedAsset(userId, kind);

    async function importFile(file: File | undefined) {
        if (!file) return;
        setBusy(true);
        setError("");
        try {
            const asset = await importAsset(kind, file);
            setPending(old => ({ ...old, [kind]: asset.id }));
            showToast({ text: "Saved to Nexcord's local cosmetic library", variant: "success" });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    async function save() {
        setBusy(true);
        setError("");
        try {
            await applyAsset(userId, "banner", pending.banner);
            await applyAsset(userId, "nameplate", pending.nameplate);
            showToast({ text: "Local appearance saved — only you can see it", variant: "success" });
            modalProps.onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Nexcord Local Cosmetics"
            actions={[
                { text: "Cancel", variant: "secondary", onClick: () => modalProps.onClose() },
                { text: "Apply Locally", variant: "primary", onClick: save }
            ]}
        >
            <div className="nexcord-cosmetic-modal">
                <p className="nexcord-local-info">
                    Editing <strong>{displayName}</strong> · Local only. Nothing is uploaded to Discord or visible to other people.
                </p>
                <div className="nexcord-cosmetic-tabs">
                    {TABS.map(tab => (
                        <Button
                            key={tab}
                            size="small"
                            variant={tab === kind ? "primary" : "secondary"}
                            onClick={() => setKind(tab)}
                        >
                            {tab === "banner" ? "Banners" : "Nameplates"}
                        </Button>
                    ))}
                </div>
                <div className="nexcord-cosmetic-columns">
                    <div className="nexcord-cosmetic-library">
                        <h3>My Custom {kind === "banner" ? "Banners" : "Nameplates"}</h3>
                        <div className="nexcord-cosmetic-grid">
                            <button
                                type="button"
                                className={"nexcord-cosmetic-tile nexcord-empty" + (!pending[kind] ? " nexcord-selected" : "")}
                                onClick={() => setPending(old => ({ ...old, [kind]: undefined }))}
                            >
                                <span className="nexcord-no-item">⊘</span> None
                            </button>
                            {choices.map(asset => (
                                <button
                                    key={asset.id}
                                    type="button"
                                    title={asset.label}
                                    className={"nexcord-cosmetic-tile" + (pending[kind] === asset.id ? " nexcord-selected" : "")}
                                    onClick={() => setPending(old => ({ ...old, [kind]: asset.id }))}
                                >
                                    <img src={asset.dataUrl} alt={asset.label} />
                                    <span>{asset.label}</span>
                                </button>
                            ))}
                        </div>
                        <input
                            ref={fileInput}
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/gif"
                            onChange={e => {
                                void importFile(e.currentTarget.files?.[0]);
                                e.currentTarget.value = "";
                            }}
                        />
                        <Button size="small" variant="secondary" disabled={busy} onClick={() => fileInput.current?.click()}>
                            + Import Image / GIF
                        </Button>
                        <p className="nexcord-cosmetic-help">PNG, JPG, WebP or GIF · Up to 2 MB each · Stored on your computer</p>
                    </div>
                    <div className="nexcord-cosmetic-preview-panel">
                        <h3>Live preview</h3>
                        <div className="nexcord-cosmetic-profile-card">
                            {kind === "banner" && (
                                <div
                                    className="nexcord-cosmetic-banner"
                                    style={preview ? { backgroundImage: "url(" + JSON.stringify(preview.dataUrl) + ")" } : undefined}
                                />
                            )}
                            <div className="nexcord-cosmetic-profile-content">
                                <div className="nexcord-cosmetic-avatar">{displayName[0]?.toUpperCase() || "?"}</div>
                                {kind === "nameplate" && preview && (
                                    <img className="nexcord-cosmetic-nameplate" src={preview.dataUrl} alt="Nameplate preview" />
                                )}
                                <strong>{displayName}</strong>
                                <small>Local Nexcord appearance</small>
                            </div>
                        </div>
                        <p className="nexcord-cosmetic-selection">
                            {preview ? preview.label : "No local " + kind + " selected"}
                        </p>
                        {current && <p className="nexcord-cosmetic-help">Currently saved: {current.label}</p>}
                        {kind === "nameplate" && (
                            <p className="nexcord-cosmetic-help">
                                Nameplates are currently saved and previewed locally.
                                Rendering in Discord's native nameplate slots comes later.
                            </p>
                        )}
                    </div>
                </div>
                {error && <p className="nexcord-cosmetic-error" role="alert">{error}</p>}
                {busy && <p className="nexcord-cosmetic-help">Saving local changes...</p>}
            </div>
        </Modal>
    );
}
