import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-4 md:px-8">
        <div className="md:col-span-1">
          <BrandLogo href="/" />
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Invite-only boards for teams that work together under supervision.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200">
            AI powered by DeepSeek
          </p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-200">Product</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li><a href="#features" className="hover:text-gray-300">Features</a></li>
            <li><a href="#teams" className="hover:text-gray-300">Use cases</a></li>
            <li><Link href="/signup" className="hover:text-gray-300">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-200">Resources</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li><Link href="/source" className="hover:text-gray-300">Source code</Link></li>
            <li><a href="#guide" className="hover:text-gray-300">How it works</a></li>
            <li><Link href="/login" className="hover:text-gray-300">Demo login</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-200">Account</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-500">
            <li><Link href="/login" className="hover:text-gray-300">Sign in</Link></li>
            <li><Link href="/signup" className="hover:text-gray-300">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06] py-6 text-center text-xs text-gray-600">
        © {new Date().getFullYear()} SyncBoard
      </div>
    </footer>
  );
}
