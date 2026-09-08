"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { useAuth } from "@/store/auth";

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { confirmEmail, status } = useAuth();

  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
      return;
    }
    if (!email || !token) {
      setState("error");
      setError("Invalid verification link. Request a new one from the sign-in page.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await confirmEmail(email, token);
        if (!cancelled) setState("success");
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setError(err instanceof Error ? err.message : "Verification failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [email, token, confirmEmail, status, router]);

  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(() => router.replace("/dashboard"), 1500);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <BrandLogo href="/" className="mb-8" />

        <div className="panel text-center">
          {state === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-400" />
              <h1 className="mt-4 text-xl font-semibold text-gray-50">Verifying your email…</h1>
              <p className="mt-2 text-sm text-gray-400">Hang on while we confirm {email}</p>
            </>
          )}

          {state === "success" && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h1 className="mt-4 text-xl font-semibold text-gray-50">Email confirmed</h1>
              <p className="mt-2 text-sm text-gray-400">Redirecting to your dashboard…</p>
            </>
          )}

          {state === "error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-red-400" />
              <h1 className="mt-4 text-xl font-semibold text-gray-50">Verification failed</h1>
              <p className="mt-2 text-sm text-red-300">{error}</p>
              <div className="mt-6 flex flex-col gap-2">
                <Link href="/login" className="btn-primary w-full py-2.5">
                  <Mail className="h-4 w-4" /> Go to sign in
                </Link>
                <Link href="/signup" className="btn-ghost w-full py-2.5">
                  Create a new account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </main>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
