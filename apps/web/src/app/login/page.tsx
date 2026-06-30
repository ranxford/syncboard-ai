"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Cloud, Radio, Zap } from "lucide-react";
import { useAuth } from "@/store/auth";

const highlights = [
  { icon: Radio, title: "Real-time sync", desc: "Changes propagate instantly over WebSockets." },
  { icon: Brain, title: "AI workflow insights", desc: "Spot bottlenecks and deadline risk early." },
  { icon: Cloud, title: "Offline-resilient", desc: "Keep working through connectivity drops." },
];

export default function LoginPage() {
  const router = useRouter();
  const { status, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setMode("login");
    setEmail("ada@syncboard.dev");
    setPassword("password123");
  }

  return (
    <main className="relative flex min-h-screen">
      {/* Left brand showcase */}
      <aside className="relative hidden w-1/2 overflow-hidden border-r border-white/[0.06] lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-aurora" />
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />

        <div className="relative z-10 p-12">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
              <Zap className="h-5 w-5" />
            </span>
            SyncBoard <span className="text-brand-400">AI+</span>
          </Link>
        </div>

        <div className="relative z-10 px-12">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Keep your team <span className="text-gradient">perfectly in sync</span>.
          </h2>
          <p className="mt-4 max-w-md text-gray-400">
            The collaborative workspace built for distributed teams — intelligent,
            real-time, and resilient to flaky connections.
          </p>

          <div className="mt-10 space-y-4">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/20">
                  <h.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-gray-100">{h.title}</p>
                  <p className="text-sm text-gray-400">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-12 text-xs text-gray-500">
          Built with Next.js, Socket.io &amp; Prisma.
        </div>
      </aside>

      {/* Right form */}
      <div className="relative flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20 lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-md"
        >
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-lg font-semibold lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
              <Zap className="h-4 w-4" />
            </span>
            SyncBoard <span className="text-brand-400">AI+</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-gray-50">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mb-7 mt-1 text-sm text-gray-400">
            {mode === "login"
              ? "Sign in to your collaborative workspace."
              : "Start collaborating with your team in real time."}
          </p>

          {/* Mode toggle */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-ink-800/60 p-1 text-sm">
            <button
              onClick={() => setMode("login")}
              className={`rounded-md py-1.5 font-medium transition-colors ${
                mode === "login" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("register")}
              className={`rounded-md py-1.5 font-medium transition-colors ${
                mode === "register" ? "bg-white/10 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">Full name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@team.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-gray-600">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button onClick={fillDemo} className="btn-ghost mt-4 w-full py-2.5">
            Use demo account
          </button>
        </motion.div>
      </div>
    </main>
  );
}
