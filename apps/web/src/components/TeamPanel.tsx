"use client";

import { useEffect, useState } from "react";
import { Shield, Trash2, UserPlus, X } from "lucide-react";
import { api } from "@/lib/api";
import type { PendingInvite, TeamMember } from "@/lib/types";
import { useAuth } from "@/store/auth";
import { useBoard } from "@/store/board";
import { toast } from "@/store/toast";
import { Avatar } from "./Avatar";

export function TeamPanel({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const user = useAuth((s) => s.user);
  const applyServerBoard = useBoard((s) => s.applyServerBoard);
  const myRole = useBoard((s) => s.board?.members.find((m) => m.id === user?.id)?.role);
  const canManage = myRole === "owner" || myRole === "admin";

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [visibility, setVisibility] = useState<"personal" | "shared">("shared");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.getTeam(projectId);
    setMembers(data.members);
    setInvites(data.invites);
    setVisibility(data.visibility);
  }

  useEffect(() => {
    if (!open) return;
    void load().catch(() => toast.error("Couldn't load team."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  if (!open) return null;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const res = await api.addMember(projectId, email.trim(), role);
      if (res.board) applyServerBoard(res.board);
      toast.success(
        res.invited?.status === "pending"
          ? `Invite sent to ${email.trim()} (pending signup).`
          : `Added ${email.trim()}.`,
      );
      setEmail("");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, next: "admin" | "member") {
    try {
      await api.updateMemberRole(projectId, userId, next);
      toast.success(`Role updated to ${next}.`);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't update role");
    }
  }

  async function remove(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this project?`)) return;
    try {
      const { board } = await api.removeMember(projectId, userId);
      applyServerBoard(board);
      toast.success(`Removed ${name}.`);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove member");
    }
  }

  async function revoke(inviteId: string) {
    try {
      await api.revokeInvite(projectId, inviteId);
      toast.success("Invite revoked.");
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't revoke invite");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="font-semibold text-gray-50">Community team</h2>
            <p className="text-xs text-gray-500">
              {visibility === "personal"
                ? "Personal workspace"
                : "Invite collaborators — each gets their own timeline"}{" "}
              · manage roles & invites
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {canManage && (
            <form onSubmit={(e) => void invite(e)} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <UserPlus className="h-3.5 w-3.5" /> Invite
              </p>
              <input
                className="input"
                placeholder="email@team.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  className="input flex-1"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "member" | "admin")}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={busy} className="btn-primary">
                  {busy ? "…" : "Invite"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">
                Existing users join immediately. Unknown emails stay pending until they sign up & confirm.
                Inviting on a personal board converts it to shared.
              </p>
            </form>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Members</h3>
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <Avatar name={m.name} color={m.avatarColor} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-100">
                      {m.name}
                      {m.id === user?.id && <span className="text-gray-500"> (you)</span>}
                    </p>
                    <p className="truncate text-xs text-gray-500">{m.email}</p>
                  </div>
                  {canManage && m.role !== "owner" ? (
                    <select
                      className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-xs text-gray-300"
                      value={m.role}
                      onChange={(e) => void changeRole(m.id, e.target.value as "admin" | "member")}
                    >
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] capitalize text-gray-400">
                      {m.role === "owner" && <Shield className="h-3 w-3" />}
                      {m.role}
                    </span>
                  )}
                  {canManage && m.role !== "owner" && m.id !== user?.id && (
                    <button
                      type="button"
                      onClick={() => void remove(m.id, m.name)}
                      className="rounded p-1 text-gray-500 hover:bg-red-500/15 hover:text-red-300"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {invites.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pending invites
              </h3>
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-gray-200">{inv.email}</p>
                      <p className="text-xs text-gray-500">Role: {inv.role}</p>
                    </div>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => void revoke(inv.id)}
                        className="text-xs text-gray-400 hover:text-red-300"
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
