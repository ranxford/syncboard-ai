"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Zap } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Avatar } from "./Avatar";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
              <Zap className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">
              SyncBoard <span className="text-brand-400">AI+</span>
            </span>
          </Link>
          {children}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <Avatar name={user.name} color={user.avatarColor} size={30} />
              <span className="hidden text-sm text-gray-300 md:inline">{user.name}</span>
            </div>
          )}
          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="btn-ghost px-2.5 py-1.5"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
