"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Cloud,
  Radio,
  Sparkles,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useAuth } from "@/store/auth";

const features = [
  {
    icon: Brain,
    title: "AI Workflow Prediction",
    desc: "Detects bottlenecks, stalled tasks, and deadline risk before they hurt delivery.",
  },
  {
    icon: Radio,
    title: "Real-Time Sync",
    desc: "Every change propagates instantly over WebSockets — no refresh, no stale boards.",
  },
  {
    icon: Workflow,
    title: "Smart Task Rebalancing",
    desc: "Recommends optimal task reassignment based on live workload analysis.",
  },
  {
    icon: Cloud,
    title: "Offline-Resilient",
    desc: "Queues your edits during connectivity drops and syncs the moment you're back.",
  },
  {
    icon: Users,
    title: "Live Presence",
    desc: "See who's viewing and editing each task in real time, down to the card.",
  },
  {
    icon: Activity,
    title: "Productivity Analytics",
    desc: "Throughput, cycle time, completion rate, and team load at a glance.",
  },
];

const stats = [
  { value: "<50ms", label: "Sync latency" },
  { value: "100%", label: "Offline resilient" },
  { value: "6", label: "AI signals tracked" },
  { value: "0", label: "Refreshes needed" },
];

const previewColumns = [
  {
    name: "In Progress",
    dot: "#f59e0b",
    cards: [
      { title: "Refine onboarding flow", tag: "design", tone: "text-pink-300 bg-pink-500/10" },
      { title: "WebSocket reconnect logic", tag: "backend", tone: "text-cyan-300 bg-cyan-500/10" },
    ],
  },
  {
    name: "Review",
    dot: "#6366f1",
    cards: [{ title: "Analytics dashboard", tag: "frontend", tone: "text-brand-300 bg-brand-500/10" }],
  },
  {
    name: "Done",
    dot: "#22c55e",
    cards: [{ title: "Auth + JWT sessions", tag: "shipped", tone: "text-emerald-300 bg-emerald-500/10" }],
  },
];

export default function Landing() {
  const status = useAuth((s) => s.status);
  const cta = status === "authenticated" ? "/dashboard" : "/login";

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-50" />

      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2 text-base font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow">
              <Zap className="h-4 w-4" />
            </span>
            SyncBoard <span className="text-brand-400">AI+</span>
          </div>
          <div className="hidden items-center gap-7 text-sm text-gray-400 md:flex">
            <a href="#features" className="transition-colors hover:text-gray-100">Features</a>
            <a href="#preview" className="transition-colors hover:text-gray-100">Preview</a>
          </div>
          <Link href={cta} className="btn-primary">
            {status === "authenticated" ? "Open app" : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-300"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-400" />
          Built for distributed teams in low-connectivity environments
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Real-time collaboration
          <br />
          that <span className="text-gradient">never loses sync</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400"
        >
          SyncBoard AI+ combines AI-driven workflow analytics, instant WebSocket
          sync, live presence, and offline-resilient architecture into one modern
          platform — so your team stays coordinated, anywhere.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href={cta} className="btn-primary px-6 py-3 text-base">
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="btn-ghost px-6 py-3 text-base">
            Explore features
          </a>
        </motion.div>
      </section>

      {/* Product preview */}
      <section id="preview" className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-brand-gradient opacity-20 blur-3xl" />
          <div className="card card-shadow overflow-hidden">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-amber-400/70" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
              <span className="ml-3 flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                <Radio className="h-3 w-3 text-emerald-400" /> Live · 4 online
              </span>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              {previewColumns.map((col) => (
                <div key={col.name} className="rounded-xl border border-white/[0.06] bg-ink-800/50 p-3">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-300">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.dot }} />
                    {col.name}
                    <span className="ml-auto text-gray-600">{col.cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {col.cards.map((c) => (
                      <div
                        key={c.title}
                        className="rounded-lg border border-white/[0.06] bg-ink-900 p-3 text-left shadow-soft"
                      >
                        <p className="mb-2 text-sm font-medium text-gray-100">{c.title}</p>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${c.tone}`}>
                          {c.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-gradient">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything a modern team needs
          </h2>
          <p className="mt-3 text-gray-400">
            Thoughtfully designed features that keep work flowing — online or off.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group card card-shadow relative overflow-hidden p-6 transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40"
            >
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/10 blur-2xl transition-opacity duration-200 group-hover:opacity-100 sm:opacity-0" />
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold text-gray-100">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div className="card card-shadow relative overflow-hidden px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.08]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to keep your team in sync?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-400">
              Spin up a board in seconds. No credit card, no setup — just real-time collaboration.
            </p>
            <Link href={cta} className="btn-primary mt-7 px-6 py-3 text-base">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2 font-medium text-gray-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-gradient">
              <Zap className="h-3.5 w-3.5" />
            </span>
            SyncBoard AI+
          </div>
          <p>Built with Next.js, Socket.io &amp; Prisma.</p>
        </div>
      </footer>
    </main>
  );
}
