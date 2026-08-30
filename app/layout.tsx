import type { Metadata } from 'next';
import './globals.css';
import './extended.css';
export const metadata:Metadata = { title:{default:'Threshold Projects',template:'%s · Threshold Projects'}, description:'Shared operational planning for the Threshold management team.', openGraph:{title:'Threshold Projects',description:'One shared view of what is happening, what comes next, and who owns it.'} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
