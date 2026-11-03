/* Nexcord Welcome — GPL-3.0-or-later */
import { React, ChannelStore, PrivateChannelSortStore, UserStore, NavigationRouter, useStateFromStores } from "@webpack/common";

const IMAGE_KEY = "nexcord.welcome.image.v1";
type RecentDM = { id:string; name:string; subtitle:string; avatar?:string; };
function getDMs(): RecentDM[] {
    const currentId = UserStore.getCurrentUser()?.id;
    const ids = PrivateChannelSortStore.getPrivateChannelIds();
    const result: RecentDM[] = [];
    for (const id of ids) {
        if (result.length >= 6) break;
        const channel = ChannelStore.getChannel(id);
        if (!channel || !Array.isArray(channel.recipients)) continue;
        const people = channel.recipients.filter((x: string) => x !== currentId)
            .map((x: string) => UserStore.getUser(x)).filter(Boolean);
        const group = channel.type === 3 || people.length > 1;
        const name = group
            ? (channel.name || people.slice(0, 3).map((p: any) => p.globalName || p.username).join(", ") || "Group DM")
            : (people[0]?.globalName || people[0]?.username || "Direct message");
        const avatar = !group && people[0] ? people[0].getAvatarURL?.(undefined, 64) : undefined;
        result.push({ id, name, subtitle: group ? String(people.length) + " members" : "Direct message", avatar });
    }
    return result;
}
function initialImage() {
    try { return localStorage.getItem(IMAGE_KEY) || ""; } catch { return ""; }
}
export function WelcomePage() {
    const user = useStateFromStores([UserStore], () => UserStore.getCurrentUser());
    const dms = useStateFromStores([PrivateChannelSortStore, ChannelStore, UserStore], getDMs);
    const [image, setImage] = React.useState(initialImage);
    const [error, setError] = React.useState("");
    const input = React.useRef<HTMLInputElement>(null);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const name = user?.globalName || user?.username || "there";

    function importImage(file?: File) {
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
            setError("Use a PNG, JPG, WebP or GIF image."); return;
        }
        if (file.size > 1500000) { setError("Choose an image smaller than 1.5 MB."); return; }
        const reader = new FileReader();
        reader.onerror = () => setError("Unable to read image.");
        reader.onload = () => {
            if (typeof reader.result !== "string" || !reader.result.startsWith("data:image/")) return;
            try { localStorage.setItem(IMAGE_KEY, reader.result); setImage(reader.result); setError(""); }
            catch { setError("Unable to save locally. Try a smaller image."); }
        };
        reader.readAsDataURL(file);
    }
    function removeImage() {
        try { localStorage.removeItem(IMAGE_KEY); } catch { /* ignored */ }
        setImage("");
        if (input.current) input.current.value = "";
    }

    return <div className="nexcord-welcome-page">
        <header className="nexcord-welcome-heading">
            <div className="nexcord-welcome-eyebrow">Nexcord / Welcome</div>
            <h1>{greeting}, {name} <span aria-hidden="true">👋</span></h1>
            <p>Welcome back. Pick up where you left off.</p>
        </header>
        <div className="nexcord-welcome-layout">
            <section aria-label="Recent direct messages">
                <div className="nexcord-welcome-subheading">
                    <h2>Most recent DMs</h2>
                    <button onClick={() => NavigationRouter.transitionTo("/channels/@me")} type="button">Friends</button>
                </div>
                <div className="nexcord-welcome-conversations">
                    {dms.length ? dms.map(dm => <button type="button" key={dm.id}
                        className="nexcord-welcome-conversation"
                        onClick={() => NavigationRouter.transitionTo("/channels/@me/" + dm.id)}>
                        <span className="nexcord-welcome-avatar">{dm.avatar ? <img src={dm.avatar} alt="" /> : "👥"}</span>
                        <span className="nexcord-welcome-info"><strong>{dm.name}</strong><small>{dm.subtitle}</small></span>
                        <span aria-hidden="true">›</span>
                    </button>) : <div className="nexcord-welcome-empty">No recent DMs yet.</div>}
                </div>
            </section>
            <section aria-label="Custom welcome image">
                <div className="nexcord-welcome-subheading">
                    <h2>Your image</h2>
                    <span className="nexcord-welcome-caption">Only on this device</span>
                </div>
                <div className="nexcord-welcome-image">
                    {image ? <img src={image} alt="Your imported welcome artwork" />
                        : <div className="nexcord-welcome-placeholder"><span aria-hidden="true">▧</span>
                            <strong>Import a PNG or picture</strong><small>Make this space yours.</small>
                        </div>}
                </div>
                <input type="file" ref={input} className="nexcord-welcome-file" accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={e => importImage(e.currentTarget.files?.[0])} />
                <div className="nexcord-welcome-actions">
                    <button type="button" className="nexcord-welcome-primary"
                        onClick={() => input.current?.click()}>{image ? "Change image" : "Import image"}</button>
                    {image && <button type="button" className="nexcord-welcome-secondary" onClick={removeImage}>Remove</button>}
                </div>
                {error && <p className="nexcord-welcome-error" role="alert">{error}</p>}
                <p className="nexcord-welcome-caption">PNG, JPG, GIF or WebP • under 1.5 MB • stored locally</p>
            </section>
        </div>
    </div>;
}
