/* Nexcord Welcome — GPL-3.0-or-later */
import "./style.css";
import { Logger } from "@utils/Logger";
import definePlugin, { StartAt } from "@utils/types";
import { createRoot, NavigationRouter, React, UserStore } from "@webpack/common";
import type { Root } from "react-dom/client";
import { WelcomePage } from "./WelcomePage";

const log = new Logger("NexcordWelcome");
const QUEST_ROUTE = "/quest-home";
type Mounted = { parent:HTMLElement; node:HTMLElement; root:Root; position:string; };
let mounted: Mounted | undefined;
let observer: MutationObserver | undefined;
let task: ReturnType<typeof setTimeout> | undefined;
let startup: ReturnType<typeof setTimeout> | undefined;
let didNavigate = false;
let retries = 0;
const textChanges = new Map<Text, string>();

function renameNavigation() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.textContent?.trim() !== "Quests" || !node.parentElement) continue;
        const el = node.parentElement;
        const box = el.getBoundingClientRect();
        if (box.left < 60 || box.left > 420 || box.top < 35 || box.top > 500) continue;
        const link = el.closest<HTMLElement>("a,button,[role='button']");
        if (!link) continue;
        const rect = link.getBoundingClientRect();
        if (rect.width < 95 || rect.width > 370 || rect.height < 20 || rect.height > 80) continue;
        const textNode = node as Text;
        if (!textChanges.has(textNode)) textChanges.set(textNode, textNode.textContent || "");
        textNode.textContent = "Welcome";
        link.dataset.nexcordWelcomeLink = "true";
    }
}
function findContent() {
    const nodes = document.querySelectorAll<HTMLElement>(
        'main,[role="main"],[class*="content_"],[class*="pageWrapper"],[class*="contentRegion"]'
    );
    const matches: Array<{el:HTMLElement; area:number}> = [];
    for (const el of nodes) {
        if (el.closest("[data-nexcord-welcome-host]")) continue;
        const r = el.getBoundingClientRect();
        if (r.left < 180 || r.top > 175 || r.width < 425 || r.height < 355) continue;
        if (r.right < window.innerWidth - 75 || r.bottom < window.innerHeight - 90) continue;
        matches.push({ el, area: r.width * r.height });
    }
    matches.sort((a,b) => a.area-b.area);
    return matches[0]?.el;
}
function unmount() {
    const old = mounted;
    mounted = undefined;
    if (!old) return;
    queueMicrotask(() => {
        old.root.unmount();
        old.node.remove();
        if (old.parent.style.position === "relative") old.parent.style.position = old.position;
    });
}
function scan() {
    if (!observer) return;
    renameNavigation();
    if (window.location.pathname !== QUEST_ROUTE) { unmount(); return; }
    const target = findContent();
    if (!target) return;
    if (mounted?.parent === target && mounted.node.isConnected) return;
    unmount();
    const node = document.createElement("div");
    node.className = "nexcord-welcome-host";
    node.dataset.nexcordWelcomeHost = "true";
    const position = target.style.position;
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    target.appendChild(node);
    try {
        const root = createRoot(node);
        mounted = { parent:target, node, root, position };
        root.render(<WelcomePage />);
    } catch (e) {
        log.error("Could not mount Welcome", e);
        node.remove();
        target.style.position = position;
    }
}
function queueScan() {
    if (!observer || task) return;
    task = setTimeout(() => {
        task = undefined;
        try { scan(); } catch (e) { log.warn("Welcome scan failed", e); }
    }, 180);
}
function navigateOnce() {
    if (!observer || didNavigate) return;
    if (!UserStore?.getCurrentUser?.()) {
        if (++retries < 60) startup = setTimeout(navigateOnce, 180);
        return;
    }
    didNavigate = true;
    const path = window.location.pathname;
    // Don't override a Discord deep link (invites, OAuth, shop, etc).
    if (!(/^\/channels\//.test(path) || path === "/" || path === QUEST_ROUTE)) return;
    if (path !== QUEST_ROUTE) {
        try { NavigationRouter.transitionTo(QUEST_ROUTE); }
        catch (e) { log.warn("Startup welcome navigation failed", e); }
    }
    queueScan();
}
export default definePlugin({
    name: "NexcordWelcome",
    description: "Show a Welcome page instead of Quests, and open it on Discord startup",
    authors: [{ name:"Nexcord", id:0n }],
    tags: ["Appearance","Customisation"],
    enabledByDefault: true,
    startAt: StartAt.WebpackReady,
    start() {
        if (observer || !document.body) return;
        didNavigate = false; retries = 0;
        observer = new MutationObserver(queueScan);
        observer.observe(document.body, {subtree:true, childList:true});
        queueScan();
        startup = setTimeout(navigateOnce, 650);
    },
    stop() {
        observer?.disconnect(); observer = undefined;
        if (task) clearTimeout(task);
        if (startup) clearTimeout(startup);
        task = startup = undefined;
        unmount();
        for (const [node,old] of textChanges) if (node.isConnected) node.textContent = old;
        textChanges.clear();
        document.querySelectorAll("[data-nexcord-welcome-link]").forEach(el => {
            el.removeAttribute("data-nexcord-welcome-link");
        });
    }
});
