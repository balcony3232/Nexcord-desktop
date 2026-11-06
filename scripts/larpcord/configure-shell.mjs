#!/usr/bin/env node
/* Larpcord standalone shell adapter. Based on Equibop (GPL-3.0-or-later). */
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {join,resolve} from "node:path";

const root=process.cwd(),shell=resolve(process.argv[2]||"");
if(!existsSync(join(shell,"src/main/vencordDir.ts"))||!existsSync("assets/larpcord-cat.svg"))
    throw Error("Pass a pinned Equibop source directory and run from Larpcord repo root");
const read=p=>readFileSync(join(shell,p),"utf8").replace(/\r\n/g,"\n");
const write=(p,s)=>writeFileSync(join(shell,p),s);
function patch(file,from,to){
    const s=read(file);
    if(!s.includes(from))throw Error("Changed upstream anchor in "+file+": "+from);
    write(file,s.replace(from,to));
}
const pkg=JSON.parse(read("package.json"));
Object.assign(pkg,{name:"larpcord",desktopName:"larpcord",version:"0.1.8",
    description:"Larpcord — independent Discord client based on Equibop and Equicord",
    homepage:"https://github.com/balcony3232/Nexcord-desktop",
    repository:{type:"git",url:"git+https://github.com/balcony3232/Nexcord-desktop.git"}});
Object.assign(pkg.build,{appId:"app.larpcord.desktop",productName:"Larpcord",
    executableName:"Larpcord",extraResources:[{from:"static/dist/larpcord.asar",to:"larpcord.asar"}],
    publish:[{provider:"github",owner:"balcony3232",repo:"Nexcord-desktop",releaseType:"prerelease"}]});
delete pkg.build.protocols; // Avoid replacing the official Discord deep-link handler.
pkg.build.win={...pkg.build.win,icon:"build/icon.ico",target:[{target:"nsis",arch:["x64"]}]};
// Per-user, single-click NSIS installation. Existing installations retain their
// recorded install location; we never overwrite or delete an old Equibop app.
pkg.build.nsis={...pkg.build.nsis,
    oneClick:true,perMachine:false,allowToChangeInstallationDirectory:false,
    runAfterFinish:true,artifactName:"Larpcord-Setup-"+"$"+"{version}."+"$"+"{ext}"};
write("package.json",JSON.stringify(pkg,null,4)+"\n");

if(!read("src/main/vencordDir.ts").includes('join(SESSION_DATA_DIR, "equicord.asar")'))
    throw Error("Incompatible Equibop mod loader; refusing to build with upstream defaults");
write("src/main/vencordDir.ts",[
    "/* Bundled local Larpcord client. Derived from Equibop, GPL-3.0-or-later. */",
    'import {app} from "electron";',
    'import {join} from "path";',
    'import {STATIC_DIR} from "shared/paths";',
    'import {State} from "./settings";',
    'export const VENCORD_DIR = State.store.equicordDir',
    '  ? join(State.store.equicordDir,"equibop")',
    '  : app.isPackaged ? join(process.resourcesPath,"larpcord.asar")',
    '      : join(STATIC_DIR,"dist","larpcord.asar");',
    ""
].join("\n"));

const loader="src/main/utils/vencordLoader.ts";
const downloader=/export async function downloadVencordAsar\(\) \{[\s\S]*?\n\}/;
if(!downloader.test(read(loader)))throw Error("Unknown upstream downloader");
write(loader,read(loader).replace(downloader,[
    "export async function downloadVencordAsar() {",
    '  if (!existsSync(VENCORD_DIR)) throw Error("Larpcord client bundle missing; reinstall Larpcord Desktop.");',
    "}"
].join("\n")).replace('import { downloadFile, fetchie } from "./http";',
'import { fetchie } from "./http";'));

patch("src/main/startup.ts",'    setAsDefaultProtocolClient("discord");',
    "    // Larpcord preview never takes over the official discord:// handler.");
patch("src/main/startup.ts",'import { setAsDefaultProtocolClient } from "./utils/setAsDefaultProtocolClient";\n',"");
patch("src/main/startup.ts",'app.setAppUserModelId("org.equicord.equibop")',
      'app.setAppUserModelId("app.larpcord.desktop")');
// Replace the old Equibop updater, which otherwise checks another application's feed.
// The packaged app-update.yml points to our own GitHub Releases publisher.
write("src/main/updater.ts", readFileSync(join(root, "scripts/larpcord/desktop-updater.template"), "utf8"));

// Expose only three dedicated methods to the settings UI via the sandboxed preload.
patch("src/preload/VesktopNative.ts",
    '        isOutdated: () => invoke<boolean>(IpcEvents.UPDATER_IS_OUTDATED),',
    [
      '        checkLarpcordUpdates: () => invoke("LARPCORD_UPDATE_CHECK"),',
      '        installLarpcordUpdate: () => invoke("LARPCORD_UPDATE_INSTALL"),',
      '        restartLarpcordUpdate: () => invoke("LARPCORD_UPDATE_RESTART"),',
      '        onLarpcordUpdateProgress: (callback: (percent: number) => void) => {',
      '            const listener = (_event: Electron.IpcRendererEvent, percent: number) => callback(percent);',
      '            ipcRenderer.on("LARPCORD_UPDATE_PROGRESS", listener);',
      '            return () => ipcRenderer.removeListener("LARPCORD_UPDATE_PROGRESS", listener);',
      '        },',
      '        isOutdated: () => invoke<boolean>(IpcEvents.UPDATER_IS_OUTDATED),'
    ].join("\n")
);
patch("build/installer.nsh","$LocalAppData\\equibop","$LocalAppData\\Larpcord");
patch("src/main/settings.ts",'"Equibop settings"','"Larpcord settings"');
patch("src/main/settings.ts",'"Equibop state"','"Larpcord state"');

for(const file of ["src/main/mainWindow.ts","src/main/startup.ts",
"src/main/constants.ts","src/main/tray.ts","src/main/updater.ts",
"src/renderer/components/settings/Updater.tsx","static/views/about.html",
"static/views/first-launch.html","static/views/splash.html"])
    write(file,read(file).replaceAll("Equibop","Larpcord")); // Only display spelling, keep lower-case internals.
mkdirSync(join(shell,"static/dist"),{recursive:true});
mkdirSync(join(shell,"build"),{recursive:true});
const asar=join(root,"dist/equibop.asar");
if(!existsSync(asar))throw Error("Build local equibop.asar first");
copyFileSync(asar,join(shell,"static/dist/larpcord.asar"));
copyFileSync(join(root,"assets/larpcord-cat.svg"),join(shell,"build/icon.svg"));
// Preserve the upstream custom-splash feature, but use our cat as its default asset.
patch("src/main/userAssets.ts", 'splash: "tray.png",', 'splash: "icon.png",');
// The default cat mark should not rotate like the old spinner.
patch("src/main/splash.ts", 'animation: spin 2s linear infinite;', 'animation: none;');
// Shell-managed settings also need native Larpcord labels, not old Equibop text.
patch("src/renderer/index.ts", 'title: "Equibop Settings"', 'title: "Larpcord Desktop Settings"');
patch("src/renderer/index.ts", 'label: "Equibop Settings"', 'label: "Larpcord Desktop Settings"');
for (const file of [
    "src/renderer/components/settings/Settings.tsx",
    "src/renderer/components/settings/OutdatedVesktopWarning.tsx"
]) write(file, read(file).replaceAll("Equibop", "Larpcord"));
// Use a soft pink accent in the independent shell's setup flow.
patch("static/views/first-launch.html", 'background: red;', 'background: #43303b;');
patch("static/views/first-launch.html", 'background: green;', 'background: #f58eaf; color: #2b1c2c;');
patch("static/views/common.css", '--link: light-dark(#006ce7, #00a8fc);', '--link: light-dark(#ad3762, #f6a4bd);');
patch("static/views/common.css", '--link-hover: light-dark(#005bb5, #0086c3);', '--link-hover: light-dark(#89284f, #ffc0d4);');
console.log("Configured isolated Larpcord v0.1.8 shell with cat splash and branded settings.");
