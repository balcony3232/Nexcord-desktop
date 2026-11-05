/*
 * Larpcord local-only profile presentation. GPL-3.0-or-later.
 * Native-looking badges and name preview belong to the user's own visible
 * profile card / popout, not a floating faux profile. All names, badge
 * icons and art are presentation-only: no API calls, entitlement updates,
 * UserStore mutations, or messages are modified.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";
import { badgeById } from "./BadgeCatalog";
import { getLocalProfileStyle, subscribeProfileStyles } from "./LocalProfileStyle";
import { getShopSelection, subscribeShop } from "./ShopCatalog";

const logger = new Logger("LarpcordNativePreview");
export type IdentitySurface = "editor" | "popout";
type RestoreText = { node: Text; original: string; rendered: string };
type Layer = { node: HTMLElement; root: Root };
type Mounted = {
    card: HTMLElement;
    userId: string;
    surface: IdentitySurface;
    badge: Layer;
    frame: Layer;
    decoration: Layer;
    avatar?: HTMLElement;
    originalPosition: string;
    originalTexts: RestoreText[];
    stop: Array<() => void>;
};
const mounts = new Map<IdentitySurface, Mounted>();

function exactTextNodes(card: HTMLElement, expected: string): Text[] {
    if (!expected) return [];
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    let next: Node | null;
    while ((next = walker.nextNode())) {
        const text = next as Text;
        if (text.textContent?.trim() !== expected) continue;
        const parent = text.parentElement;
        if (!parent || parent.closest("[data-larpcord-local-layer], [data-nexcord-local-surface]")) continue;
        const rect = parent.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || rect.top < cardRect.top + 45 ||
            rect.top > cardRect.top + (cardRect.height < 500 ? 320 : 385) ||
            rect.left < cardRect.left || rect.left > cardRect.left + Math.min(295, cardRect.width - 15)) continue;
        nodes.push(text);
    }
    return nodes;
}
function findNameNode(card: HTMLElement, userId: string): Text | undefined {
    const user = UserStore.getUser(userId) ?? UserStore.getCurrentUser();
    if (!user) return;
    const names = [...new Set([user.globalName, user.username].filter((x): x is string => !!x))];
    const texts = names.flatMap(name => exactTextNodes(card, name));
    texts.sort((a, b) => {
        const fontA = parseFloat(getComputedStyle(a.parentElement!).fontSize) || 0;
        const fontB = parseFloat(getComputedStyle(b.parentElement!).fontSize) || 0;
        return fontB - fontA;
    });
    return texts[0];
}
function restoreNames(entry: Mounted) {
    for (const old of entry.originalTexts) {
        if (old.node.isConnected && old.node.textContent === old.rendered) old.node.textContent = old.original;
    }
    entry.originalTexts = [];
}
function applyLocalNames(entry: Mounted) {
    restoreNames(entry);
    const style = getLocalProfileStyle(entry.userId);
    if (!style.enabled) return;
    const user = UserStore.getUser(entry.userId) ?? UserStore.getCurrentUser();
    if (!user) return;
    const displayNode = findNameNode(entry.card, entry.userId);
    if (style.localDisplayName && displayNode && style.localDisplayName !== displayNode.textContent) {
        entry.originalTexts.push({ node: displayNode, original: displayNode.textContent ?? "", rendered: style.localDisplayName });
        displayNode.textContent = style.localDisplayName;
    }
    if (style.localUsername) {
        const username = user.username;
        const matches = [...exactTextNodes(entry.card, username), ...exactTextNodes(entry.card, "@" + username)];
        const other = matches.find(node => node !== displayNode);
        if (other && other.textContent !== style.localUsername) {
            const old = other.textContent ?? "";
            const replacement = old.startsWith("@") ? "@" + style.localUsername : style.localUsername;
            entry.originalTexts.push({ node: other, original: old, rendered: replacement });
            other.textContent = replacement;
        }
    }
}

function BadgeRow({userId}: {userId:string}) {
    const [, refresh] = React.useReducer((v:number)=>v+1,0);
    React.useEffect(()=>subscribeProfileStyles(refresh),[]);
    const profile = getLocalProfileStyle(userId);
    const chosen = profile.badges.map(badgeById).filter((b): b is NonNullable<typeof b> => Boolean(b));
    if (!chosen.length && profile.badge === "none") return null;
    return (
        <span className="larpcord-native-badge-row" aria-label="Local badge previews">
            {chosen.map(b => <span className="larpcord-native-badge" key={b.id}
                title={b.name + " — Larpcord local preview (not an earned Discord badge)"}>
                <span>{b.symbol}</span>
                {b.image && <img src={b.image} alt="" onError={e => e.currentTarget.style.display = "none"}/>}
            </span>)}
            {!chosen.length && profile.badge !== "none" && <span className="larpcord-native-badge" title="Local decorative badge">✦</span>}
            <small title="These badges are only visible on this device">LOCAL</small>
        </span>
    );
}

const decorationCdn = (asset?: string) => {
    if (!asset || !/^(?:a_)?[a-f0-9]{16,80}$/i.test(asset)) return;
    return "https://cdn.discordapp.com/avatar-decoration-presets/" + asset + ".png?size=256";
};
function AvatarLayer({userId}: {userId:string}) {
    const [, refresh] = React.useReducer((v:number)=>v+1,0);
    React.useEffect(()=>subscribeShop(refresh),[]);
    const selection = getShopSelection(userId, "decoration");
    const source = decorationCdn(selection?.asset);
    const [url, setUrl] = React.useState(source ?? selection?.previewUrl ?? "");
    React.useEffect(() => setUrl(source ?? selection?.previewUrl ?? ""), [source, selection?.previewUrl]);
    if (!selection) return null;
    return <div className="larpcord-native-avatar-decoration" aria-hidden="true">
        {url && <img src={url} alt="" draggable={false} onError={() => {
            if (url !== selection.previewUrl && selection.previewUrl) setUrl(selection.previewUrl);
            else setUrl("");
        }}/>}
        <span>LOCAL</span>
    </div>;
}
function FrameEdge({userId}: {userId:string}) {
    const [, refresh] = React.useReducer((v:number)=>v+1,0);
    React.useEffect(()=>subscribeShop(refresh),[]);
    const frame = getShopSelection(userId, "frame");
    if (!frame) return null;
    const art = frame.previewUrl ?? frame.animatedPreviewUrl;
    React.useEffect(()=>subscribeProfileStyles(refresh),[]);
    const profile = getLocalProfileStyle(userId);
    return (
        <div className="larpcord-native-frame" aria-hidden="true"
            style={{borderColor:profile.accent}}>
            <div className="larpcord-native-frame-texture"
                style={art ? { backgroundImage: "url(" + JSON.stringify(art) + ")" } : undefined}/>
            <small>LOCAL FRAME · {frame.name}</small>
        </div>
    );
}

function findBadgeAnchor(card: HTMLElement, userId: string): HTMLElement | undefined {
    const heading = findNameNode(card, userId)?.parentElement;
    if (!heading) return;
    const head = heading.getBoundingClientRect();
    for (const el of card.querySelectorAll<HTMLElement>(
        '[class*="profileBadges_"],[class*="badgeList_"],[class*="badgeContainer_"],[class*="badges_"]'
    )) {
        if (el.closest("[data-larpcord-local-layer]") || el.contains(heading)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 10 && r.width < 300 && r.height < 90 &&
            r.top >= head.top - 18 && r.top < head.bottom + 105) return el;
    }
    return heading.parentElement ?? heading;
}
function findAvatar(card: HTMLElement): HTMLElement | undefined {
    const rect = card.getBoundingClientRect();
    const options = [...card.querySelectorAll<HTMLImageElement>("img")].filter(img => {
        if (img.closest("[data-larpcord-local-layer], [data-nexcord-effect-host]")) return false;
        const r=img.getBoundingClientRect();
        return r.width>=55 && r.width<=190 && Math.abs(r.width-r.height)<=15 &&
            r.top>=rect.top+22 && r.top<rect.top+260 && r.left<rect.left+235;
    });
    const best = options.find(i=>i.src.includes("/avatars/")) ?? options[0];
    return best;
}
function placeAvatarLayer(entry: Mounted) {
    const avatar = findAvatar(entry.card);
    if (!avatar) {
        entry.decoration.node.style.display="none";
        return;
    }
    entry.avatar=avatar;
    const r=avatar.getBoundingClientRect(),outer=entry.card.getBoundingClientRect();
    const pad=Math.max(7,Math.min(15,r.width*.12));
    Object.assign(entry.decoration.node.style,{
        display:"block", left:(r.left-outer.left-pad)+"px",top:(r.top-outer.top-pad)+"px",
        width:(r.width+pad*2)+"px",height:(r.height+pad*2)+"px"
    });
}
function makeLayer(card: HTMLElement, type: string): Layer {
    const node=document.createElement("div");
    node.dataset.larpcordLocalLayer=type;
    node.className="larpcord-native-layer larpcord-layer-"+type;
    card.append(node);
    return {node,root:createRoot(node)};
}
function update(entry:Mounted) {
    if (!entry.card.isConnected) return;
    applyLocalNames(entry);
    placeAvatarLayer(entry);
}
export function syncLocalIdentityPreview(surface:IdentitySurface,card:HTMLElement|undefined,userId:string) {
    const previous=mounts.get(surface);
    if (card && previous?.card === card && previous.userId === userId && previous.badge.node.isConnected) {
        placeAvatarLayer(previous);
        return;
    }
    stopLocalIdentityPreview(surface);
    if (!card) return;
    const originalPosition=card.style.position;
    if (getComputedStyle(card).position==="static") card.style.position="relative";
    let badge:Layer|undefined,frame:Layer|undefined,decoration:Layer|undefined;
    try {
        badge=makeLayer(card,"badges");
        frame=makeLayer(card,"frame");
        decoration=makeLayer(card,"decoration");
        const entry:Mounted={card,userId,surface,badge,frame,decoration,originalPosition,originalTexts:[],stop:[]};
        mounts.set(surface,entry);
        const anchor=findBadgeAnchor(card,userId);
        if (anchor) anchor.append(badge.node);
        else badge.node.style.display = "none";
        badge.root.render(<BadgeRow userId={userId}/>);
        frame.root.render(<FrameEdge userId={userId}/>);
        decoration.root.render(<AvatarLayer userId={userId}/>);
        update(entry);
        entry.stop.push(subscribeProfileStyles(()=>update(entry)));
        const resizer=new ResizeObserver(()=>placeAvatarLayer(entry));
        resizer.observe(card);
        entry.stop.push(()=>resizer.disconnect());
    } catch (error) {
        logger.warn("Could not mount native local identity preview",error);
        badge?.root.unmount();frame?.root.unmount();decoration?.root.unmount();
        badge?.node.remove();frame?.node.remove();decoration?.node.remove();
        mounts.delete(surface);
        if (card.style.position==="relative") card.style.position=originalPosition;
    }
}
export function stopLocalIdentityPreview(surface:IdentitySurface) {
    const current=mounts.get(surface);
    if (!current) return;
    mounts.delete(surface);
    current.stop.forEach(fn=>fn());
    restoreNames(current);
    queueMicrotask(()=>{
        for (const layer of [current.badge,current.frame,current.decoration]) {
            layer.root.unmount();
            layer.node.remove();
        }
        if (current.card.style.position==="relative") current.card.style.position=current.originalPosition;
    });
}
