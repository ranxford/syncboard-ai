"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Brain,
  Cloud,
  Gauge,
  Radio,
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

export default function Landing() {
  const status = useAuth((s) => s.status);
  const cta = status === "authenticated" ? "/dashboard" : "/login";

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <Zap className="h-5 w-5" />
          </span>
          SyncBoard <span className="text-brand-400">AI+</span>
        </div>
        <Link href={cta} className="btn-ghost">
          {status === "authenticated" ? "Open app" : "Sign in"}
        </Link>
      </nav>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300"
        >
          <Gauge className="h-3.5 w-3.5 text-brand-400" />
          Built for distributed teams in low-connectivity environments
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance text-5xl font-bold leading-tight tracking-tight md:text-6xl"
        >
          Intelligent real-time
          <br />
          collaboration that{" "}
          <span className="bg-gradient-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">
            never loses sync
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-gray-400"
        >
          SyncBoard AI+ combines AI-driven workflow analytics, instant WebSocket
          sync, live presence, and offline-resilient architecture into one modern
          platform — so your team stays coordinated, anywhere.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <Link href={cta} className="btn-primary px-6 py-3 text-base">
            Get started free
          </Link>
          <a href="#features" className="btn-ghost px-6 py-3 text-base">
            Explore features
          </a>
        </motion.div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 pb-28">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass card-shadow rounded-2xl p-6"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold text-gray-100">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-gray-500">
        SyncBoard AI+ — final-year project demo. Built with Next.js, Socket.io & Prisma.
      </footer>
    </main>
  );
}
