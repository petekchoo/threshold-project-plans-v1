import type { Metadata } from 'next';
import './globals.css';
import './extended.css';
export const metadata:Metadata = { title:{default:'Threshold Projects',template:'%s · Threshold Projects'}, description:'Shared operational planning for the Threshold management team.', openGraph:{title:'Threshold Projects',description:'One shared view of what is happening, what comes next, and who owns it.'} };
const chromeHydrationGuard = `(()=>{const attribute='__gchrome_uniqueid';const clean=node=>{if(node.nodeType!==1)return;node.removeAttribute(attribute);node.querySelectorAll?.('['+attribute+']').forEach(element=>element.removeAttribute(attribute))};clean(document.documentElement);new MutationObserver(records=>records.forEach(record=>{if(record.type==='attributes')clean(record.target);else record.addedNodes.forEach(clean)})).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:[attribute]})})();`;
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><head><script dangerouslySetInnerHTML={{__html:chromeHydrationGuard}}/></head><body>{children}</body></html>}
