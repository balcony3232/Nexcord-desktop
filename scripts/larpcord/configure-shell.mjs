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
Object.assign(pkg,{name:"larpcord",desktopName:"larpcord",version:"0.1.0",
    description:"Larpcord — independent Discord client based on Equibop and Equicord",
    homepage:"https://github.com/balcony3232/Nexcord-desktop",
    repository:{type:"git",url:"git+https://github.com/balcony3232/Nexcord-desktop.git"}});
Object.assign(pkg.build,{appId:"app.larpcord.desktop",productName:"Larpcord",
    executableName:"Larpcord",extraResources:[{from:"static/dist/larpcord.asar",to:"larpcord.asar"}],
    publish:[{provider:"github",owner:"balcony3232",repo:"Nexcord-desktop",releaseType:"prerelease"}]});
delete pkg.build.protocols; // Avoid replacing the official Discord deep-link handler.
pkg.build.win={...pkg.build.win,icon:"build/icon.ico",target:[{target:"nsis",arch:["x64"]}]};
pkg.build.nsis={...pkg.build.nsis,artifactName:"Larpcord-Setup-"+"$"+"{version}."+"$"+"{ext}"};
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
patch("src/main/updater.ts",
    'const isOutdated = autoUpdater.checkForUpdates().then(res => Boolean(res?.isUpdateAvailable));',
    "const isOutdated = Promise.resolve(false); // Not active until Larpcord publishes update metadata.");
patch("src/main/updater.ts",'    const res = await autoUpdater.checkForUpdates();',
      "    const res = undefined; // Avoid an unrelated fork's update feed.");
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
console.log("Configured isolated Larpcord shell and bundled own cosmetics build.");
