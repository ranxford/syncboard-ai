"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/store/auth";
import { BrandLogo } from "./BrandLogo";
import { Avatar } from "./Avatar";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-ink-950/90 backdrop-blur-md">
      <div className="flex h-[3.25rem] items-center gap-4 px-4 md:px-6">
        <BrandLogo href="/dashboard" />
        {children && (
          <div className="hidden min-w-0 flex-1 items-center border-l border-white/[0.08] pl-4 md:flex">
            {children}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] py-1 pl-1 pr-2.5">
              <Avatar name={user.name} color={user.avatarColor} size={26} />
              <span className="hidden max-w-[140px] truncate text-sm text-gray-300 md:inline">
                {user.name}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            className="btn-ghost px-2 py-1.5"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      {children && (
        <div className="border-t border-white/[0.06] px-4 py-2 md:hidden">{children}</div>
      )}
    </header>
  );
}
