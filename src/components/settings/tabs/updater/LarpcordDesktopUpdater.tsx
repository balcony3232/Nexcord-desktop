/*
 * Larpcord standalone updater UI, GPL-3.0-or-later.
 * Replaces the old Equicord ASAR updater only for the Windows shell.
 */
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
    releaseUrl: string;
};
type UpdaterBridge = {
    checkLarpcordUpdates(): Promise<UpdateCheck>;
    installLarpcordUpdate(): Promise<{ started: boolean; }>;
    onLarpcordUpdateProgress(cb: (percent: number) => void): () => void;
};

export function LarpcordDesktopUpdater() {
    const bridge = VesktopNative.app as unknown as UpdaterBridge;
    const [state, setState] = React.useState<UpdateCheck | null>(null);
    const [status, setStatus] = React.useState<"idle" | "checking" | "ready" | "downloading">("idle");
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState("");

    React.useEffect(() => bridge.onLarpcordUpdateProgress(percent => {
        setProgress(Math.round(percent));
    }), []);

    async function check() {
        setStatus("checking");
        setError("");
        try {
            const result = await bridge.checkLarpcordUpdates();
            setState(result);
            setStatus("ready");
        } catch (err) {
            setState(null);
            setError(err instanceof Error ? err.message : "Could not check for updates. Try again later.");
            setStatus("idle");
        }
    }

    async function install() {
        if (!state?.available) return;
        setProgress(0);
        setStatus("downloading");
        setError("");
        try {
            const result = await bridge.installLarpcordUpdate();
            if (!result.started) setStatus("ready");
            // On success the native NSIS updater will close Larpcord and
            // install the verified Windows package.
        } catch (err) {
            setError(err instanceof Error ? err.message : "The update could not be installed.");
            setStatus("ready");
        }
    }

    return (
        <SettingsTab>
            <Heading tag="h2">Larpcord Updates</Heading>
            <Paragraph className={Margins.top8}>
                Keep the standalone Windows application and bundled plugins up to date.
                Updates come from Larpcord's own GitHub Releases, not Equibop or Nexcord.
            </Paragraph>

            <Card style={{ padding: 16, marginTop: 22, marginBottom: 18 }}>
                <Heading tag="h3">Windows Desktop</Heading>
                {state && <Paragraph className={Margins.top8}>Installed v{state.currentVersion} · Latest release v{state.latestVersion}</Paragraph>}
                {status === "idle" && !error && (
                    <Paragraph className={Margins.top8}>Check for the newest standalone Larpcord version.</Paragraph>
                )}
                {status === "checking" && <Paragraph className={Margins.top8}>Checking Larpcord releases…</Paragraph>}
                {status === "ready" && !state?.available && (
                    <Paragraph className={Margins.top8}>You're running the latest available Larpcord release.</Paragraph>
                )}
                {status === "ready" && state?.available && (
                    <Paragraph className={Margins.top8}>Larpcord v{state.latestVersion} is available to install.</Paragraph>
                )}
                {status === "downloading" && (
                    <Paragraph className={Margins.top8}>Downloading verified update… {progress}%</Paragraph>
                )}
                {error && <Paragraph className={Margins.top8} style={{ color: "var(--text-danger)" }}>{error}</Paragraph>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
                    <Button disabled={status === "checking" || status === "downloading"} onClick={() => void check()}>
                        {status === "checking" ? "Checking…" : "Check for Updates"}
                    </Button>
                    {state?.available && (
                        <Button variant="primary" disabled={status !== "ready"} onClick={() => void install()}>
                            {status === "downloading" ? "Installing…" : `Download & Install v${state.latestVersion}`}
                        </Button>
                    )}
                </div>
            </Card>

            <Heading tag="h3">Update source</Heading>
            <Paragraph className={Margins.top8}>
                <Link href="https://github.com/balcony3232/Nexcord-desktop/releases">Larpcord GitHub Releases</Link>
            </Paragraph>
            <Paragraph className={Margins.top8}>
                You'll always be asked before downloading and installing an update.
                Larpcord verifies the update metadata before installation. This development build is unsigned.
            </Paragraph>
        </SettingsTab>
    );
}
