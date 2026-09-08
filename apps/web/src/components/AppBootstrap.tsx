"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/lib/useNotifications";
import { Toaster } from "./Toaster";

/** Hydrates the auth session from the stored token on first load. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
  useNotifications();
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
