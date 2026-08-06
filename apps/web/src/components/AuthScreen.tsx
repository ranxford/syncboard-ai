"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, LayoutList, Mail, Radio, Users } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth";

const highlights = [
  { icon: Users, title: "Invite-only communities", desc: "You choose who joins — no public feed." },
  { icon: LayoutList, title: "Personal timelines", desc: "Each collaborator keeps their own track." },
  { icon: Radio, title: "Live when it matters", desc: "SyncRoom when the whole team needs to move." },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const {
    status,
    login,
    register,
    confirmEmail,
    resendConfirmation,
    pendingVerifyEmail,
    pendingDemoToken,
    clearPendingVerify,
  } = useAuth();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyMode, setVerifyMode] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  useEffect(() => {
    if (pendingVerifyEmail) {
      setVerifyMode(true);
      setEmail(pendingVerifyEmail);
      if (pendingDemoToken) setConfirmCode(pendingDemoToken);
    }
  }, [pendingVerifyEmail, pendingDemoToken]);

  const nameError = isRegister && !name.trim() ? "Please enter your name." : null;
  const emailError = !EMAIL_RE.test(email) ? "Enter a valid email address." : null;
  const passwordError = password.length < 6 ? "Password must be at least 6 characters." : null;
  const formError = nameError || emailError || passwordError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (formError) return;
    setBusy(true);
    try {
      if (isRegister) {
        const result = await register(name.trim(), email.trim(), password);
        if (result === "needsVerification") {
          setVerifyMode(true);
          return;
        }
      } else {
        await login(email.trim(), password);
      }
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (err instanceof ApiError && err.data.needsVerification) {
        setVerifyMode(true);
        setError("Confirm your email to continue.");
      } else {
        setError(
          msg === "network-unavailable"
            ? "Can't reach the server. Please check your connection and try again."
            : msg,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmCode.trim()) {
      setError("Enter the confirmation code.");
      return;
    }
    setBusy(true);
    try {
      await confirmEmail(email.trim() || pendingVerifyEmail || "", confirmCode.trim());
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    try {
      const token = await resendConfirmation(email.trim() || pendingVerifyEmail || "");
      if (token) setConfirmCode(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Couldn't resend code");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setEmail("ada@syncboard.dev");
    setPassword("password123");
    setTouched(false);
    setError(null);
    setVerifyMode(false);
    clearPendingVerify();
  }

  return (
    <main className="relative flex min-h-screen">
      <aside className="relative hidden w-1/2 overflow-hidden border-r border-white/[0.07] bg-ink-900 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-aurora opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-grain" />

        <div className="relative z-10 p-12">
          <BrandLogo href="/" className="text-xl" />
        </div>

        <div className="relative z-10 px-12">
          <h2 className="max-w-md text-3xl font-semibold leading-snug tracking-tight text-gray-50">
            Work with your people — not the whole internet.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
            Communities stay invite-only. Timelines stay personal. Sessions pull the group together
            when a deadline needs many hands.
          </p>

          <div className="mt-10 space-y-5">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                <h.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-medium text-gray-100">{h.title}</p>
                  <p className="text-sm text-gray-500">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-12 text-xs text-gray-600">{new Date().getFullYear()}</div>
      </aside>

      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-md"
        >
          <BrandLogo href="/" className="mb-8 lg:hidden" />

          <div className="panel">
          {verifyMode ? (
            <>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
                <Mail className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-50">Confirm your email</h1>
              <p className="mb-7 mt-1 text-sm text-gray-400">
                We sent a confirmation code to{" "}
                <span className="text-gray-200">{email || pendingVerifyEmail}</span>. In demo mode
                the code is shown below (no SMTP required).
              </p>
              <form onSubmit={(e) => void onConfirm(e)} className="space-y-4">
                <Field label="Confirmation code">
                  <input
                    className="input font-mono text-sm"
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    placeholder="Paste code from email / demo"
                    autoFocus
                  />
                </Field>
                {pendingDemoToken && (
                  <p className="rounded-lg border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
                    Demo code: <span className="font-mono">{pendingDemoToken}</span>
                  </p>
                )}
                {error && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
                  {busy ? "Confirming…" : "Confirm & continue"}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </button>
                <button type="button" onClick={() => void onResend()} disabled={busy} className="btn-ghost w-full">
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyMode(false);
                    clearPendingVerify();
                  }}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-300"
                >
                  Back to {isRegister ? "sign up" : "sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-50">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mb-7 mt-2 text-sm text-gray-400">
                {isRegister
                  ? "Set up a workspace and invite people when you’re ready."
                  : "Sign in to your boards and communities."}
              </p>

              <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-ink-800/60 p-1 text-sm">
                <Link
                  href="/login"
                  className={`rounded-md py-1.5 text-center font-medium transition-colors ${
                    !isRegister ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className={`rounded-md py-1.5 text-center font-medium transition-colors ${
                    isRegister ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Sign up
                </Link>
              </div>

              <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4">
                {isRegister && (
                  <Field label="Full name" error={touched ? nameError : null}>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ada Lovelace"
                      autoComplete="name"
                      autoFocus
                    />
                  </Field>
                )}
                <Field label="Email" error={touched ? emailError : null}>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@team.com"
                    autoComplete="email"
                    autoFocus={!isRegister}
                  />
                </Field>
                <Field
                  label="Password"
                  error={touched ? passwordError : null}
                  hint={isRegister ? "At least 6 characters" : undefined}
                >
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={isRegister ? "new-password" : "current-password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 transition-colors hover:text-gray-300"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {error && (
                  <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
                  {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
                  {!busy && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-xs text-gray-600">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {isRegister ? (
                <p className="mt-4 text-center text-sm text-gray-400">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-brand-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              ) : (
                <button onClick={fillDemo} className="btn-ghost mt-4 w-full py-2.5">
                  Use demo account
                </button>
              )}
            </>
          )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        {hint && !error && <span className="text-[11px] text-gray-600">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
