"use client";

import { useEffect, useState } from "react";
import { Link2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useSyncRoom } from "@/store/call";
import { toast } from "@/store/toast";

interface Artifact {
  id: string;
  label: string;
  url: string;
}

export function SyncRoomArtifacts({ forceOpen = false }: { forceOpen?: boolean }) {
  const phase = useSyncRoom((s) => s.phase);
  const sessionId = useSyncRoom((s) => s.sessionId);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(forceOpen);

  useEffect(() => {
    if (!sessionId || phase !== "in-call") return;
    void api
      .getSessionArtifacts(sessionId)
      .then(({ artifacts }) => setArtifacts(artifacts))
      .catch(() => {});
  }, [sessionId, phase]);

  if (phase !== "in-call") return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !label.trim() || !url.trim()) return;
    try {
      const { artifact } = await api.addSessionArtifact(sessionId, label.trim(), url.trim());
      setArtifacts((a) => [...a, artifact]);
      setLabel("");
      setUrl("");
      toast.success("Link saved to session.");
    } catch {
      toast.error("Couldn't save the link.");
    }
  }

  const showLinks = forceOpen || open;

  return (
    <div className={forceOpen ? "px-3 py-2" : "border-t border-white/10 bg-white/[0.02] px-3 py-2"}>
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-300"
        >
          <Link2 className="h-3 w-3" /> Session links {artifacts.length > 0 && `(${artifacts.length})`}{" "}
          {open ? "▾" : "▸"}
        </button>
      )}
      {showLinks && (
        <>
          {artifacts.length > 0 && (
            <ul className="mb-2 space-y-1">
              {artifacts.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-300 hover:underline"
                  >
                    {a.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(e) => void add(e)} className="flex gap-1">
            <input
              className="input flex-1 py-1 text-xs"
              placeholder="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              className="input flex-[2] py-1 text-xs"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" className="btn-primary px-2 py-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
