"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FolderKanban,
  Lock,
  Plus,
  Radio,
  Target,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { PROJECT_FIELDS, fieldLabel } from "@/lib/projectFields";
import { toast } from "@/store/toast";
import type { MyTask, ProjectSummary } from "@/lib/types";
import { PRIORITY_STYLES, dueLabel } from "@/lib/ui";
import { AuthGate } from "@/components/AuthGate";
import { Navbar } from "@/components/Navbar";
import { TeammateLiveFeed } from "@/components/TeammateLiveFeed";
import { useTeammateAwareness } from "@/lib/useTeammateAwareness";

function DashboardInner() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [initialTeammates, setInitialTeammates] = useState<import("@/lib/types").TeammateStatus[]>([]);
  const teammates = useTeammateAwareness(initialTeammates, { notifySyncRoom: true });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"personal" | "shared">("shared");
  const [field, setField] = useState("");
  const [fieldFilter, setFieldFilter] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [{ projects, teammates }, { tasks }] = await Promise.all([api.dashboard(), api.myTasks()]);
      setProjects(projects);
      setInitialTeammates(teammates);
      setMyTasks(tasks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalOverdue = projects.reduce((n, p) => n + (p.overdueTasks ?? 0), 0);
  const liveRooms = projects.filter((p) => p.syncRoomActive).length;
  const institutionOptions = Array.from(
    new Set(projects.map((p) => p.field || "general")),
  ).sort((a, b) => fieldLabel(a).localeCompare(fieldLabel(b)));
  const visibleProjects =
    fieldFilter.length === 0
      ? projects
      : projects.filter((p) => fieldFilter.includes(p.field || "general"));

  function toggleFieldFilter(id: string) {
    setFieldFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function removeProject(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and all its tasks? This cannot be undone.`)) return;
    try {
      await api.deleteProject(id);
      toast.success(`"${name}" deleted.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete the project.");
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (!field) {
      toast.error("Choose what field this project is for.");
      return;
    }
    setBusy(true);
    try {
      await api.createProject({
        name: name.trim(),
        description: description.trim(),
        visibility,
        field,
      });
      toast.success(
        `${visibility === "personal" ? "Personal" : "Shared"} project "${name.trim()}" created.`,
      );
      setName("");
      setDescription("");
      setVisibility("shared");
      setField("");
      setCreating(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create the project.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="page-shell py-8 md:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="section-title">Your boards</h1>
            <p className="section-lead">
              Open a project or create a new one. Invite teammates from the board when you&apos;re
              ready.
            </p>
          </div>
          <button onClick={() => setCreating((v) => !v)} className="btn-primary shrink-0">
            <Plus className="h-4 w-4" /> New project
          </button>
        </div>

        {!loading && <TeammateLiveFeed teammates={teammates} />}

        {!loading && (totalOverdue > 0 || liveRooms > 0) && (
          <section className="mb-7 grid gap-3 sm:grid-cols-2">
            {totalOverdue > 0 && (
              <div className="panel flex items-center gap-3 border-amber-500/20 py-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-gray-100">
                    {totalOverdue} overdue task{totalOverdue === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-gray-500">Open a board → AI Insights for one-click fixes</p>
                </div>
              </div>
            )}
            {liveRooms > 0 && (
              <div className="panel flex items-center gap-3 border-emerald-500/20 py-4">
                <Radio className="h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-gray-100">
                    {liveRooms} active SyncRoom{liveRooms === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-gray-500">Join from the board toolbar to collaborate live</p>
                </div>
              </div>
            )}
          </section>
        )}

        {creating && (
          <form onSubmit={createProject} className="panel mb-7 space-y-3">
            <input
              className="input"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <input
              className="input"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex gap-2 rounded-lg border border-white/10 bg-ink-800/50 p-1 text-sm">
              <button
                type="button"
                onClick={() => setVisibility("shared")}
                className={`flex-1 rounded-md py-1.5 font-medium ${
                  visibility === "shared" ? "bg-white/10 text-white" : "text-gray-400"
                }`}
              >
                Shared community
              </button>
              <button
                type="button"
                onClick={() => setVisibility("personal")}
                className={`flex-1 rounded-md py-1.5 font-medium ${
                  visibility === "personal" ? "bg-white/10 text-white" : "text-gray-400"
                }`}
              >
                Personal only
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-200">What field is this project for?</p>
                <p className="text-xs text-gray-500">
                  Required — picks starter board columns for your industry (not software-only).
                </p>
              </div>
              <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                {PROJECT_FIELDS.map((f) => {
                  const selected = field === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setField(f.id)}
                      className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "border-brand-500/60 bg-brand-500/15 text-brand-100"
                          : "border-white/10 bg-ink-800/40 text-gray-300 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
              {!field && (
                <p className="text-[11px] text-amber-400/90">Select a field to continue.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !field} className="btn-primary">
                {busy ? "Creating…" : "Create project"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!loading && myTasks.length > 0 && (
          <section className="panel mb-7">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
              <CalendarClock className="h-4 w-4 text-brand-400" />
              Assigned to me
              <span className="pill">{myTasks.length}</span>
            </h2>
            <div className="space-y-1.5">
              {myTasks.slice(0, 6).map((t) => {
                const prio = PRIORITY_STYLES[t.priority];
                const due = dueLabel(t.dueDate);
                return (
                  <Link
                    key={t.id}
                    href={`/board/${t.project.id}?task=${t.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: prio.dot }} />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-200">{t.title}</span>
                    <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">{t.project.name}</span>
                    <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
                      {t.column.name}
                    </span>
                    {due && (
                      <span
                        className={`shrink-0 text-[11px] ${
                          due.tone === "over"
                            ? "text-red-300"
                            : due.tone === "soon"
                              ? "text-amber-300"
                              : "text-gray-500"
                        }`}
                      >
                        {due.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="card flex flex-col items-center rounded-2xl py-16 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/20">
              <FolderKanban className="h-7 w-7" />
            </span>
            <p className="font-medium text-gray-200">No projects yet</p>
            <p className="mb-5 text-sm text-gray-500">Create your first board to get your team in sync.</p>
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> New project
            </button>
          </div>
        ) : (
          <>
            {institutionOptions.length > 1 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Filter by field</span>
                <button
                  type="button"
                  onClick={() => setFieldFilter([])}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    fieldFilter.length === 0
                      ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  All institutions
                </button>
                {institutionOptions.map((id) => {
                  const on = fieldFilter.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleFieldFilter(id)}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        on
                          ? "bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {fieldLabel(id)}
                    </button>
                  );
                })}
              </div>
            )}
            {visibleProjects.length === 0 ? (
              <div className="card rounded-2xl py-10 text-center text-sm text-gray-400">
                No projects in the selected fields.{" "}
                <button type="button" className="text-brand-300 hover:underline" onClick={() => setFieldFilter([])}>
                  Show all
                </button>
              </div>
            ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((p) => (
              <div key={p.id} className="group relative">
                {p.role === "owner" && (
                  <button
                    onClick={() => removeProject(p.id, p.name)}
                    className="absolute bottom-3 right-3 z-10 rounded-md p-1.5 text-gray-500 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <Link href={`/board/${p.id}`} className="project-card block p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-100">{p.name}</h3>
                      <p className="mt-0.5 text-[11px] text-gray-500">{fieldLabel(p.field)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                      {p.visibility === "personal" ? (
                        <span className="pill">
                          <Lock className="mr-0.5 inline h-3 w-3" />
                          Personal
                        </span>
                      ) : (
                        <span className="pill text-brand-300">Community</span>
                      )}
                      {p.syncRoomActive && (
                        <span className="pill text-emerald-300">
                          <Radio className="mr-0.5 inline h-3 w-3" />
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-400">
                    {p.description || "No description"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-3 text-xs text-gray-500">
                    <span>{p.taskCount} tasks</span>
                    <span>{p.memberCount} members</span>
                    <span className="capitalize">{p.role}</span>
                    {(p.overdueTasks ?? 0) > 0 && (
                      <span className="text-amber-400">{p.overdueTasks} overdue</span>
                    )}
                    {(p.stalledTasks ?? 0) > 0 && (
                      <span>{p.stalledTasks} stalled</span>
                    )}
                    {p.visibility === "shared" && p.effectiveness?.needsBrief && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Target className="h-3 w-3" /> Needs brief
                      </span>
                    )}
                    {p.visibility === "shared" && (p.effectiveness?.offTrack ?? 0) > 0 && (
                      <span className="text-red-300/90">{p.effectiveness!.offTrack} off track</span>
                    )}
                    {p.visibility === "shared" &&
                      p.myAlignmentStatus &&
                      p.myAlignmentStatus !== "aligned" &&
                      p.myAlignmentStatus !== "no_brief" && (
                        <span className="text-amber-400 capitalize">
                          You: {p.myAlignmentStatus.replace("_", " ")}
                        </span>
                      )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
