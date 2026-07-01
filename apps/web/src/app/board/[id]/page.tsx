"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ChevronLeft, History, Video } from "lucide-react";
import { getSocket, pingLatency } from "@/lib/socket";
import { useBoard } from "@/store/board";
import { useCall } from "@/store/call";
import type { Board, PresenceUser, Task } from "@/lib/types";
import { AuthGate } from "@/components/AuthGate";
import { Navbar } from "@/components/Navbar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { BoardSearch } from "@/components/BoardSearch";
import { PresenceBar } from "@/components/PresenceBar";
import { ConnectivityBadge } from "@/components/ConnectivityBadge";
import { TaskModal } from "@/components/TaskModal";
import { AIPanel } from "@/components/AIPanel";
import { MeetingModal } from "@/components/MeetingModal";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CallPanel } from "@/components/CallPanel";
import { SyncRoomWrapUp } from "@/components/syncroom/SyncRoomWrapUp";

function BoardInner({ projectId }: { projectId: string }) {
  const {
    board,
    loading,
    error,
    init,
    reset,
    applyServerBoard,
    setPresence,
    setConnection,
    setLatency,
    flush,
  } = useBoard();

  const [editing, setEditing] = useState<Task | null>(null);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [activityKey, setActivityKey] = useState(0);

  const callPhase = useCall((s) => s.phase);
  const callRoster = useCall((s) => s.roster);
  const wrapUpOpen = useCall((s) => s.wrapUpOpen);
  const sessionLog = useCall((s) => s.sessionLog);
  const contextTask = useCall((s) => s.contextTask);
  const dismissWrapUp = useCall((s) => s.dismissWrapUp);

  useEffect(() => {
    init(projectId);
    useCall.getState().observe(projectId);

    const socket = getSocket();
    const joinBoard = () => socket.emit("board:join", projectId);

    if (socket.connected) joinBoard();
    socket.on("connect", () => {
      setConnection("online");
      joinBoard();
      flush();
    });
    socket.on("disconnect", () => setConnection("offline"));

    socket.on("board:updated", (payload: { board: Board }) => {
      applyServerBoard(payload.board);
      setActivityKey((k) => k + 1);
    });
    socket.on("presence:updated", (payload: { projectId: string; users: PresenceUser[] }) => {
      if (payload.projectId === projectId) setPresence(payload.users);
    });

    // Connectivity-adaptive: react to the browser going on/offline
    const onOnline = () => {
      setConnection("online");
      flush();
    };
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Latency meter
    const latencyTimer = setInterval(async () => {
      setLatency(await pingLatency());
    }, 5000);

    return () => {
      socket.emit("board:leave", projectId);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("board:updated");
      socket.off("presence:updated");
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(latencyTimer);
      useCall.getState().unobserve();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar>
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-200" title="Back">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold text-gray-100">{board?.project.name ?? "Loading…"}</span>
          <ConnectivityBadge />
        </div>
      </Navbar>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 md:px-6">
        <div className="md:hidden">
          <ConnectivityBadge />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {board && (
            <BoardSearch
              projectId={projectId}
              onSelect={(taskId) => {
                const found = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
                if (found) setEditing(found);
              }}
            />
          )}
          {board && <PresenceBar projectId={projectId} />}
          <button
            onClick={() => {
              const call = useCall.getState();
              if (call.phase === "in-call" || call.phase === "lobby" || call.phase === "connecting") {
                call.setViewMode(call.viewMode === "minimized" ? "expanded" : call.viewMode);
              } else {
                void call.openLobby();
              }
            }}
            className={`btn-ghost relative px-2.5 py-1.5 ${
              callPhase !== "idle"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : callRoster.length > 0
                  ? "border-emerald-500/40 text-emerald-300"
                  : ""
            }`}
            title={
              callPhase !== "idle"
                ? "Open SyncRoom"
                : callRoster.length > 0
                  ? "Join SyncRoom in progress"
                  : "Open project SyncRoom"
            }
          >
            <Video className="h-4 w-4" />
            {callPhase === "idle" && callRoster.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
                {callRoster.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFeedOpen((v) => !v)}
            className={`btn-ghost px-2.5 py-1.5 ${
              feedOpen ? "border-brand-500/40 bg-brand-500/10 text-brand-200" : ""
            }`}
            title="Activity"
            aria-pressed={feedOpen}
          >
            <History className="h-4 w-4" />
          </button>
          <button onClick={() => setAiOpen(true)} className="btn-primary">
            <Brain className="h-4 w-4" /> <span className="hidden sm:inline">AI Insights</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <BoardSkeleton />
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-red-300">{error}</p>
              <Link href="/dashboard" className="btn-ghost">
                Back to dashboard
              </Link>
            </div>
          ) : (
            <KanbanBoard
              onEditTask={(t) => setEditing(t)}
              onAddTask={(columnId) => setAddingColumnId(columnId)}
            />
          )}
        </div>

        {feedOpen && board && (
          <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-ink-900 md:block">
            <ActivityFeed projectId={projectId} refreshKey={activityKey} />
          </aside>
        )}
      </div>

      {/* Modals & panels */}
      {(editing || addingColumnId) && board && (
        <TaskModal
          task={editing}
          columnId={addingColumnId}
          members={board.members}
          onClose={() => {
            setEditing(null);
            setAddingColumnId(null);
          }}
        />
      )}

      {board && (
        <AIPanel
          projectId={projectId}
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          onOpenMeeting={() => {
            setAiOpen(false);
            setMeetingOpen(true);
          }}
          onStartSyncRoom={(task) => {
            setAiOpen(false);
            void useCall.getState().openLobby({ task });
          }}
        />
      )}

      {meetingOpen && board && (
        <MeetingModal
          projectId={projectId}
          columns={board.columns}
          members={board.members}
          onClose={() => setMeetingOpen(false)}
        />
      )}

      <CallPanel />

      <SyncRoomWrapUp
        open={wrapUpOpen}
        sessionLog={sessionLog}
        contextTask={contextTask}
        onClose={dismissWrapUp}
      />
    </div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <BoardInner projectId={id} />
    </AuthGate>
  );
}
