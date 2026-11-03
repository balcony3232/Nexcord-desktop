/*
 * Local-only animated effect overlay in Discord's real profile preview card.
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Does not patch Discord stores, ownership, Nitro status, or network writes.
 * Only attaches a pointer-events:none visual overlay to the current user's
 * profile card when the actual profile editor is visible.
 */
import { Logger } from "@utils/Logger";
import { createRoot, React } from "@webpack/common";
import type { Root } from "react-dom/client";

import { getShopSelection, subscribeShop } from "./ShopCatalog";
import { getEffectDefinition } from "./EffectAssets";
import type { EffectDefinition, EffectLayer } from "./EffectAssets";

const logger = new Logger("NexcordEffectOverlay");
type Mount = { card: HTMLElement; host: HTMLElement; root: Root; position: string; };
let mounted: Mount | undefined;

function hasProfileAvatar(element: HTMLElement, memberY: number): boolean {
    return [...element.querySelectorAll("img")].some(image => {
        const r = image.getBoundingClientRect();
        return r.width >= 62 && r.width <= 175
            && Math.abs(r.width - r.height) < 18 && r.top < memberY - 150;
    });
}
function findProfileCard(rail: HTMLElement): HTMLElement | undefined {
    const railBox = rail.getBoundingClientRect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.textContent?.trim() !== "Member Since") continue;
        const textElement = node.parentElement;
        if (!textElement || textElement.closest("[data-nexcord-effect-host]")) continue;
        const memberBox = textElement.getBoundingClientRect();
        if (memberBox.left < railBox.right + 10) continue;
        let element: HTMLElement | null = textElement;
        for (let depth = 0; depth < 13 && element; depth++, element = element.parentElement) {
            const box = element.getBoundingClientRect();
            if (box.width < 315 || box.width > 570 || box.height < 350 || box.height > 1350) continue;
            if (box.left < railBox.right + 10 || box.left > railBox.right + 220) continue;
            if (box.top > memberBox.top - 240) continue;
            const content = element.textContent ?? "";
            if (content.includes("Board") || content.includes("Wishlist") ||
                !content.includes("Member Since") || !hasProfileAvatar(element, memberBox.top)) continue;
            // The first acceptable compact container is the profile-card
            // surface, not the wider editor/dialog that also includes widgets.
            return element;
        }
    }
}

function LayerImage({ frame, scale }: { frame: EffectLayer; scale: number; }) {
    const [show, setShow] = React.useState(frame.start <= 0);
    React.useEffect(() => {
        if (frame.start <= 0) {
            setShow(true);
            return;
        }
        setShow(false);
        const t = window.setTimeout(() => setShow(true), frame.start);
        return () => window.clearTimeout(t);
    }, [frame.src, frame.start]);
    if (!show) return null;
    return (
        <img
            alt=""
            draggable={false}
            src={frame.src}
            style={{
                position: "absolute",
                top: frame.position.y * scale,
                left: frame.position.x * scale,
                width: frame.width * scale,
                height: frame.height * scale,
                zIndex: frame.zIndex,
                pointerEvents: "none",
                userSelect: "none",
                maxWidth: "none"
            }}
        />
    );
}

function EffectOverlay({ userId, card }: { userId: string; card: HTMLElement; }) {
    const [selectionRevision, changed] = React.useReducer((x: number) => x + 1, 0);
    const [effect, setEffect] = React.useState<EffectDefinition | undefined>();
    const [width, setWidth] = React.useState(card.getBoundingClientRect().width);
    const selected = getShopSelection(userId, "effect");

    React.useEffect(() => subscribeShop(changed), []);
    React.useEffect(() => {
        const observer = new ResizeObserver(() => setWidth(card.getBoundingClientRect().width));
        observer.observe(card);
        return () => observer.disconnect();
    }, [card]);

    React.useEffect(() => {
        let active = true;
        setEffect(undefined);
        if (selected) {
            void getEffectDefinition(selected).then(result => {
                if (active) setEffect(result);
            }).catch(error => {
                logger.warn("Could not resolve effect layers for local preview", error);
            });
        }
        return () => { active = false; };
    }, [selected?.skuId, selectionRevision]);

    if (!effect) return null;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    // Official Discord effect layers target a 450px-wide profile canvas.
    const scale = width / 450;
    return (
        <div className="nexcord-effect-card-layer" aria-hidden="true" title={undefined}>
            {reduceMotion && (effect.staticFrameSrc || effect.reducedMotionSrc)
                ? <img className="nexcord-effect-reduced" src={effect.staticFrameSrc ?? effect.reducedMotionSrc} alt="" />
                : effect.layers.length
                    ? effect.layers.map((frame, index) => <LayerImage key={frame.src + index} frame={frame} scale={scale} />)
                    : effect.reducedMotionSrc || effect.staticFrameSrc || effect.previewAnimatedSrc
                        ? <img
                            className="nexcord-effect-reduced"
                            src={effect.reducedMotionSrc ?? effect.staticFrameSrc ?? effect.previewAnimatedSrc}
                            alt=""
                            onError={() => logger.warn("Discord effect fallback image could not load")}
                        />
                        : null}
        </div>
    );
}

export function scanNativeEffectCard(rail: HTMLElement, userId: string) {
    const card = findProfileCard(rail);
    const activeMount = mounted;
    if (activeMount && activeMount.card === card && activeMount.host.isConnected) return;
    stopNativeEffectCard();
    if (!card) return;
    const host = document.createElement("div");
    host.className = "nexcord-effect-host";
    host.dataset.nexcordEffectHost = "true";
    const originalPosition = card.style.position;
    if (getComputedStyle(card).position === "static") card.style.position = "relative";
    card.append(host);
    try {
        const root = createRoot(host);
        mounted = { card, host, root, position: originalPosition };
        root.render(<EffectOverlay userId={userId} card={card} />);
    } catch (error) {
        logger.error("Unable to attach local profile effect overlay", error);
        host.remove();
        card.style.position = originalPosition;
    }
}
export function stopNativeEffectCard() {
    if (!mounted) return;
    const old = mounted;
    mounted = undefined;
    // Avoid unmounting a React root synchronously during native DOM mutations.
    queueMicrotask(() => {
        old.root.unmount();
        old.host.remove();
        if (old.card.style.position === "relative") old.card.style.position = old.position;
    });
}
