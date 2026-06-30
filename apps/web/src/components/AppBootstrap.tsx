"use client";

import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { Toaster } from "./Toaster";

/** Hydrates the auth session from the stored token on first load. */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
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
