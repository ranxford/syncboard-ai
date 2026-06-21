"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import type { ProjectSummary } from "@/lib/types";
import { AuthGate } from "@/components/AuthGate";
import { Navbar } from "@/components/Navbar";

function DashboardInner() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeProject(id: string, name: string) {
    if (!window.confirm(`Delete "${name}" and all its tasks? This cannot be undone.`)) return;
    await api.deleteProject(id);
    await load();
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.createProject({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
      setCreating(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-50">Your projects</h1>
            <p className="text-sm text-gray-400">Real-time boards for your distributed team.</p>
          </div>
          <button onClick={() => setCreating((v) => !v)} className="btn-primary">
            <Plus className="h-4 w-4" /> New project
          </button>
        </div>

        {creating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            onSubmit={createProject}
            className="glass mb-7 space-y-3 rounded-2xl p-5"
          >
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
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? "Creating…" : "Create project"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </motion.form>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="glass flex flex-col items-center rounded-2xl py-16 text-center">
            <FolderKanban className="mb-3 h-10 w-10 text-gray-500" />
            <p className="text-gray-300">No projects yet.</p>
            <p className="text-sm text-gray-500">Create your first board to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative"
              >
                {p.role === "owner" && (
                  <button
                    onClick={() => removeProject(p.id, p.name)}
                    className="absolute bottom-3 right-3 z-10 rounded-md p-1.5 text-gray-500 opacity-0 transition-opacity hover:bg-red-500/15 hover:text-red-300 group-hover:opacity-100"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <Link
                  href={`/board/${p.id}`}
                  className="glass card-shadow block h-full rounded-2xl p-5 transition-colors hover:border-brand-500/40"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize text-gray-400">
                      {p.role}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-100">{p.name}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-gray-400">
                    {p.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" /> {p.taskCount} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {p.memberCount} members
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
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
