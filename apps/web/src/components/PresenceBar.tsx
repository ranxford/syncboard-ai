"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useBoard } from "@/store/board";
import { api } from "@/lib/api";
import { Avatar } from "./Avatar";

export function PresenceBar({ projectId }: { projectId: string }) {
  const presence = useBoard((s) => s.presence);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const { board } = await api.addMember(projectId, email.trim());
      applyServerBoard(board);
      setEmail("");
      setAdding(false);
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to add member");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center -space-x-2">
        {presence.length === 0 && <span className="text-xs text-gray-500">No one else here</span>}
        {presence.slice(0, 6).map((u) => (
          <div key={u.userId} className="relative">
            <Avatar name={u.name} color={u.avatarColor} size={30} ring />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
          </div>
        ))}
        {presence.length > 6 && (
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/10 text-xs">
            +{presence.length - 6}
          </span>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setAdding((v) => !v)} className="btn-ghost px-2.5 py-1.5" title="Add member">
          <UserPlus className="h-4 w-4" />
        </button>
        {adding && (
          <form
            onSubmit={addMember}
            className="glass absolute right-0 top-11 z-40 w-64 space-y-2 rounded-xl p-3"
          >
            <p className="text-xs text-gray-400">Invite a teammate by email</p>
            <input
              className="input"
              placeholder="teammate@team.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            {msg && <p className="text-xs text-red-300">{msg}</p>}
            <button type="submit" className="btn-primary w-full py-1.5 text-xs">
              Add to project
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
