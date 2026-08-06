"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/store/auth";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#teams", label: "Use cases" },
  { href: "#guide", label: "Guide" },
];

export function LandingNav() {
  const status = useAuth((s) => s.status);
  const authed = status === "authenticated";
  const startHref = authed ? "/dashboard" : "/signup";

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5 md:px-8">
        <div className="flex items-center gap-8">
          <BrandLogo href="/" />
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-gray-400 hover:text-gray-200"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {!authed && (
            <Link href="/login" className="hidden text-sm text-gray-400 hover:text-gray-200 sm:inline">
              Sign in
            </Link>
          )}
          <Link href={startHref} className="btn-primary px-4 py-2 text-sm">
            {authed ? "Open app" : "Get it free"}
          </Link>
        </div>
      </div>
    </header>
  );
}
