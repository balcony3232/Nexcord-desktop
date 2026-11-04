/* Cat-only Larpcord mark. Original mascot, GPL-3.0-or-later. */
import { React } from "@webpack/common";

// Keep the old export name so existing settings imports remain compatible.
export function NexcordLogo(props: React.SVGProps<SVGSVGElement>) {
    return <svg viewBox="0 0 256 256" width="32" height="32" role="img" aria-label="Larpcord cat" {...props}>
        <rect width="256" height="256" rx="53" fill="#1d1622" />
        <path d="M49 111 57 46q2-10 13-4l42 29q16-4 32 0l42-29q11-6 13 4l8 65q20 27 20 55 0 68-99 68T29 166q0-28 20-55Z" fill="#fff2f5" stroke="#f58eaf" strokeWidth="11" strokeLinejoin="round"/>
        <path d="m66 63 25 19-34 29zM190 63l-25 19 34 29z" fill="#ffc1d3"/>
        <path d="M108 81v25M128 78v27M148 81v25" fill="none" stroke="#ffacc8" strokeWidth="8" strokeLinecap="round"/>
        <path d="m72 134 28 20-28 20M184 134l-28 20 28 20" fill="none" stroke="#2b1c2c" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M111 159c-2 18 13 22 17 5 5 17 19 13 17-5" fill="none" stroke="#2b1c2c" strokeWidth="8.5" strokeLinecap="round"/>
        <path d="M63 188q6-6 14-7M193 188q-6-6-14-7" stroke="#ff9dbf" strokeWidth="9" strokeLinecap="round" fill="none"/>
        <path d="M19 139 42 147M17 162 39 164M237 139 214 147M239 162 217 164" fill="none" stroke="#ffc6d9" strokeWidth="8" strokeLinecap="round"/>
    </svg>;
}
