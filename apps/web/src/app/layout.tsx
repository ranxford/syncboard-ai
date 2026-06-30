import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AppBootstrap } from "@/components/AppBootstrap";

export const metadata: Metadata = {
  title: "SyncBoard AI+ — Intelligent Real-Time Collaboration",
  description:
    "An AI-powered real-time collaborative platform for distributed teams. Live sync, presence, predictive analytics, and offline resilience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-ink-950 font-sans text-gray-200 antialiased">
        <AppBootstrap>{children}</AppBootstrap>
      </body>
    </html>
  );
}
