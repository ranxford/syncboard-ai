import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppBootstrap } from "@/components/AppBootstrap";
import { getServerRuntimeConfig } from "@/lib/runtimeConfig";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SyncBoard",
  description: "Invite-only project boards with live sync and team sessions.",
};

/** Read Render env at request time — static export would bake localhost into config. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { apiUrl, socketUrl } = getServerRuntimeConfig();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans text-gray-200 antialiased">
        <Script id="syncboard-config" strategy="beforeInteractive">
          {`window.__SYNCBOARD_CONFIG__=${JSON.stringify({ apiUrl, socketUrl })};`}
        </Script>
        <AppBootstrap>{children}</AppBootstrap>
      </body>
    </html>
  );
}
