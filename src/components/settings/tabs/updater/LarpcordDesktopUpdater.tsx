import "./LarpcordUpdater.css";
/*
 * Larpcord v0.1.3 updater: download in-app, restart to install silently.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { downloadSettingsBackup } from "@api/SettingsSync/offline";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { React } from "@webpack/common";

type UpdateCheck = {
    currentVersion: string;
    latestVersion: string;
    available: boolean;
    prepared: boolean;
    releaseUrl: string;
};
type UpdaterBridge = {
    checkLarpcordUpdates(): Promise<UpdateCheck>;
    installLarpcordUpdate(): Promise<{ started: boolean; ready: boolean; }>;
    restartLarpcordUpdate(): Promise<{ started: boolean; }>;
    onLarpcordUpdateProgress(cb: (percent: number) => void): () => void;
};
type Status = "idle" | "checking" | "available" | "downloading" | "prepared" | "restarting";

export function LarpcordDesktopUpdater() {
    const bridge = VesktopNative.app as unknown as UpdaterBridge;
    const [state, setState] = React.useState<UpdateCheck | null>(null);
    const [status, setStatus] = React.useState<Status>("idle");
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState("");

    React.useEffect(() => bridge.onLarpcordUpdateProgress(percent => {
        setProgress(Math.max(0, Math.min(100, Math.round(percent))));
    }), []);

    async function check() {
        setStatus("checking");
        setError("");
        try {
            const result = await bridge.checkLarpcordUpdates();
            setState(result);
            setStatus(result.prepared ? "prepared" : "available");
        } catch (err) {
            setState(null);
            setError(err instanceof Error ? err.message : "Could not reach Larpcord releases.");
            setStatus("idle");
        }
    }
    async function download() {
        if (!state?.available || status !== "available") return;
        setProgress(0);
        setStatus("downloading");
        setError("");
        try {
            const result = await bridge.installLarpcordUpdate();
            setStatus(result.ready ? "prepared" : "available");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Update download failed.");
            setStatus("available");
        }
    }
    async function restart() {
        if (status !== "prepared") return;
        setStatus("restarting");
        setError("");
        try {
            await bridge.restartLarpcordUpdate();
            // The process exits and relaunches after verified NSIS installation.
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not restart for update.");
            setStatus("prepared");
        }
    }

    const busy = status === "checking" || status === "downloading" || status === "restarting";
    return (
        <SettingsTab>
            <div className="larpcord-update-page">
                <span className="larpcord-update-eyebrow">LARPCORD / UPDATES</span>
                <Heading tag="h2">Updates, without the setup wizard.</Heading>
                <Paragraph className={Margins.top8}>
                    Download and verify updates inside Larpcord. When you're ready, restart to install silently.
                </Paragraph>
                <Card style={{ padding: 20, marginTop: 22, marginBottom: 18 }}>
                    <div className="larpcord-update-title">
                        <div className="larpcord-update-icon">✦</div>
                        <div>
                            <Heading tag="h3">Windows Desktop</Heading>
                            {state && <Paragraph className={Margins.top8}>Installed v{state.currentVersion} · Latest v{state.latestVersion}</Paragraph>}
                        </div>
                    </div>
                    <Paragraph className={Margins.top16}>
                        {status === "checking" ? "Checking the Larpcord release feed…" :
                         status === "downloading" ? "Downloading and verifying the new release…" :
                         status === "prepared" ? "The update is downloaded and ready to install." :
                         status === "restarting" ? "Closing Larpcord to install the update…" :
                         state?.available ? `Larpcord v${state.latestVersion} is available.` :
                         state ? "You're running the latest available Larpcord release." :
                         "Check for the latest Larpcord version."}
                    </Paragraph>

                    {status === "downloading" && (
                        <div className="larpcord-update-progress">
                            <div className="larpcord-update-track" role="progressbar" aria-label="Update download"
                                aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                                <div style={{ width: progress + "%" }} />
                            </div>
                            <span>Downloading {progress}%</span>
                        </div>
                    )}
                    {error && <Paragraph className={Margins.top8} style={{ color: "var(--text-danger)" }}>{error}</Paragraph>}
                    <div className="larpcord-update-actions">
                        <Button disabled={busy || status === "prepared"} onClick={() => void check()}>
                            {status === "checking" ? "Checking…" : "Check for Updates"}
                        </Button>
                        {state?.available && status === "available" && (
                            <Button variant="primary" onClick={() => void download()}>Download Update</Button>
                        )}
                        {status === "prepared" && (
                            <Button variant="primary" onClick={() => void restart()}>Restart to Update</Button>
                        )}
                        <Button variant="secondary" disabled={busy}
                            onClick={() => void downloadSettingsBackup("all")}>Backup Settings</Button>
                    </div>
                </Card>
                <div className="larpcord-update-recovery">
                    <Heading tag="h3">Recovery and older versions</Heading>
                    <Paragraph className={Margins.top8}>
                        A failed download won't replace your current installation. If a new version misbehaves,
                        you can reinstall a previous version manually from the release history. Automatic rollback
                        is not yet enabled.
                    </Paragraph>
                    <Paragraph className={Margins.top8}>
                        <Link href="https://github.com/balcony3232/Nexcord-desktop/releases">Larpcord Releases</Link>
                        {" · "}
                        <Link href="https://github.com/balcony3232/Nexcord-desktop/releases/tag/v0.1.3">Previous v0.1.3 installer</Link>
                    </Paragraph>
                    <Paragraph className={Margins.top8}>
                        Export a settings backup before upgrading if you've customised plugins or local cosmetics.
                        JSON backups can contain private plugin values; keep them private.
                    </Paragraph>
                    <Paragraph className={Margins.top8}>
                        Updates keep your local Larpcord data. Existing legacy installation folders are retained
                        until you choose to migrate them; no automatic deletion or relocation.
                    </Paragraph>
                </div>
            </div>
        </SettingsTab>
    );
}
