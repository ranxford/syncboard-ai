"use client";

import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingBoardMock } from "@/components/landing/LandingBoardMock";
import { useAuth } from "@/store/auth";

const heroFeatures = [
  {
    title: "Live board",
    desc: "Kanban columns update in real time. See who is online and what task they have open.",
  },
  {
    title: "SyncRoom",
    desc: "Start a session from the board — video, screen share, and notes tied to the work.",
  },
  {
    title: "Review gate",
    desc: "Members submit when ready. Admins check deliverables and sign off or send back.",
  },
];

const teams = [
  {
    name: "Engineering",
    desc: "Track backend, frontend, and infra work on one board. Submit code for review.",
  },
  {
    name: "Design & UX",
    desc: "Attach Figma exports. Keep personal timelines while the group shares a launch plan.",
  },
  {
    name: "Operations",
    desc: "Mining, telecom, logistics — pick field-specific columns and labels out of the box.",
  },
  {
    name: "Education & programs",
    desc: "Supervised cohorts: admins see each member's timeline and submission status.",
  },
];

const fields = ["Mining", "Telecom", "Software", "Business", "Healthcare", "Education"];

export default function Landing() {
  const status = useAuth((s) => s.status);
  const authed = status === "authenticated";
  const startHref = authed ? "/dashboard" : "/signup";

  return (
    <div className="relative min-h-screen bg-ink-950 text-gray-200">
      <div className="pointer-events-none fixed inset-0 bg-aurora" />
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-40" />

      <div className="relative">
        <LandingNav />

        {/* Hero */}
        <section className="border-b border-white/[0.07]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-2 md:px-8 md:py-20">
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-gray-50 md:text-4xl md:leading-[1.15]">
                Plan and track work with the people you invite.
              </h1>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-gray-400 md:text-lg">
                SyncBoard is a shared kanban board with live updates, optional video sessions, and
                a simple hand-in step for supervised teams.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={startHref} className="btn-primary px-5 py-2.5">
                  {authed ? "Open your boards" : "Get it free"}
                </Link>
                <a href="#guide" className="btn-ghost px-5 py-2.5">
                  See how it works
                </a>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Free to try · Invite-only · No credit card
              </p>
            </div>
            <LandingBoardMock />
          </div>
        </section>

        {/* Fields strip */}
        <section className="border-b border-white/[0.07] py-5">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-5 md:px-8">
            <span className="mr-1 text-sm text-gray-500">Fields:</span>
            {fields.map((name) => (
              <span key={name} className="pill text-sm">
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="landing-section-muted border-b border-white/[0.07] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 className="section-title">
              Wherever your team works, the board stays in sync
            </h2>
            <p className="section-lead">
              Not a public network — just the project you create and the people you add. Admins
              keep visibility; members keep their own timeline.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {heroFeatures.map((f) => (
                <div key={f.title} className="landing-panel">
                  <h3 className="text-base font-medium text-gray-100">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section id="teams" className="border-b border-white/[0.07] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 className="section-title">Every team can work on one board</h2>
            <p className="section-lead">
              Pick a field when you create a project — columns and labels match how that industry
              actually works.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {teams.map((t) => (
                <div key={t.name} className="landing-panel py-5">
                  <h3 className="font-medium text-gray-100">{t.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Guide */}
        <section id="guide" className="landing-section-muted border-b border-white/[0.07] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
              <div>
                <h2 className="section-title">Get started in minutes</h2>
                <p className="section-lead">
                  Same flow most teams follow on day one — create, invite, work, review.
                </p>
                <Link href={startHref} className="btn-primary mt-8 inline-flex px-5 py-2.5">
                  {authed ? "Go to dashboard" : "Create a board"}
                </Link>
              </div>
              <ol className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "Create a project",
                    desc: "Name it, choose your field, invite teammates by email.",
                  },
                  {
                    step: "2",
                    title: "Work on the board",
                    desc: "Add tasks, assign work, use personal timelines alongside the group plan.",
                  },
                  {
                    step: "3",
                    title: "Meet in SyncRoom when needed",
                    desc: "Video and screen share on the board — wrap-up can update tasks.",
                  },
                  {
                    step: "4",
                    title: "Submit and review",
                    desc: "Members hand in deliverables. Admins accept or request changes.",
                  },
                ].map((s) => (
                  <li key={s.step} className="flex gap-4 rounded-lg border border-white/[0.08] bg-ink-900 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-sm text-gray-400">
                      {s.step}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-100">{s.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Closing CTA — same surface as app, not a loud marketing band */}
        <section className="border-b border-white/[0.07] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="landing-panel mx-auto max-w-xl text-center md:py-10">
              <h2 className="text-xl font-semibold text-gray-50 md:text-2xl">
                Get started with SyncBoard
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Try the demo login or create a board in under a minute. No credit card.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href={startHref} className="btn-primary px-5 py-2.5">
                  {authed ? "Open app" : "Get it free"}
                </Link>
                {!authed && (
                  <Link href="/login" className="btn-ghost px-5 py-2.5">
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        <LandingFooter />
      </div>
    </div>
  );
}
