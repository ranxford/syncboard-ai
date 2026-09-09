"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Video } from "lucide-react";
import { getSocket, pingLatency } from "@/lib/socket";
import { useBoard } from "@/store/board";
import { useCall } from "@/store/call";
import { useAuth } from "@/store/auth";
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
import { BoardInsightNudges } from "@/components/BoardInsightNudges";
import { CallPanel } from "@/components/CallPanel";
import { SyncRoomQuickControls } from "@/components/SyncRoomQuickControls";
import { TeamPanel } from "@/components/TeamPanel";
import { IdeasPanel } from "@/components/IdeasPanel";
import { MemberReviewActions } from "@/components/MemberReviewActions";
import { AdminReviewInboxButton } from "@/components/AdminReviewInboxButton";
import { ReviewDeliverablesPanel } from "@/components/ReviewDeliverablesPanel";
import { ProjectFieldBar } from "@/components/ProjectFieldBar";
import { ProjectTimeline } from "@/components/ProjectTimeline";
import { SyncRoomBoardTracker } from "@/components/syncroom/SyncRoomBoardTracker";
import { SyncRoomProjectHint } from "@/components/syncroom/SyncRoomProjectHint";
import { SyncRoomWrapUp } from "@/components/syncroom/SyncRoomWrapUp";
import { BoardToolsMenu } from "@/components/BoardToolsMenu";
import { DeepSeekBadge } from "@/components/DeepSeekBadge";
import { AskDeepSeekPanel } from "@/components/AskDeepSeekPanel";
import { api } from "@/lib/api";
import type { AiProviderInfo } from "@/lib/types";
import { fieldLabel } from "@/lib/projectFields";
import { useTeammateAwareness } from "@/lib/useTeammateAwareness";

function BoardInner({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
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
  const [teamOpen, setTeamOpen] = useState(false);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [fieldPickerOpen, setFieldPickerOpen] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  const [askDeepSeekOpen, setAskDeepSeekOpen] = useState(false);
  const [aiInfo, setAiInfo] = useState<AiProviderInfo | null>(null);

  const user = useAuth((s) => s.user);
  const myRole = board?.members.find((m) => m.id === user?.id)?.role;
  const isProjectAdmin = myRole === "owner" || myRole === "admin";

  const callPhase = useCall((s) => s.phase);
  const callViewMode = useCall((s) => s.viewMode);
  const callRoster = useCall((s) => s.roster);
  const wrapUpOpen = useCall((s) => s.wrapUpOpen);
  const sessionLog = useCall((s) => s.sessionLog);
  const contextTask = useCall((s) => s.contextTask);
  const dismissWrapUp = useCall((s) => s.dismissWrapUp);

  // Cross-project alerts when a shared teammate starts a SyncRoom elsewhere.
  useTeammateAwareness(undefined, { notifySyncRoom: true });

  useEffect(() => {
    void api.getAiProvider().then(setAiInfo).catch(() => {});
  }, []);

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

    socket.on("board:updated", (payload: { projectId?: string; board: Board }) => {
      if (payload.projectId && payload.projectId !== projectId) return;
      applyServerBoard(payload.board);
      setActivityKey((k) => k + 1);
    });
    socket.on("presence:updated", (payload: { projectId: string; users: PresenceUser[] }) => {
      if (payload.projectId === projectId) setPresence(payload.users);
    });

    socket.on("timeline:updated", (payload: { projectId: string }) => {
      if (payload.projectId === projectId) {
        window.dispatchEvent(
          new CustomEvent("syncboard:timeline-updated", { detail: { projectId } }),
        );
      }
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
      socket.off("timeline:updated");
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(latencyTimer);
      useCall.getState().unobserve();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || !board || editing) return;
    const found = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
    if (found) setEditing(found);
  }, [searchParams, board, editing]);

  useEffect(() => {
    if (searchParams.get("insights") === "1") setAiOpen(true);
  }, [searchParams]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/dashboard"
            className="rounded p-1 text-gray-500 transition-colors hover:bg-white/[0.05] hover:text-gray-200"
            title="Back to boards"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="text-gray-600">/</span>
          <span className="truncate font-medium text-gray-100">{board?.project.name ?? "Loading…"}</span>
          {board?.project.field && (
            <span className="pill hidden lg:inline">{fieldLabel(board.project.field)}</span>
          )}
          <DeepSeekBadge info={aiInfo} />
          <ConnectivityBadge />
        </div>
      </Navbar>

      <SyncRoomProjectHint />
      <SyncRoomBoardTracker />
      <BoardInsightNudges projectId={projectId} />
      {fieldPickerOpen && board && isProjectAdmin && (
        <div className="border-b border-white/10 bg-ink-900/60 px-4 py-2 md:px-6">
          <ProjectFieldBar defaultOpen />
        </div>
      )}
      {board && <ProjectTimeline projectId={projectId} />}

      {/* Toolbar */}
      <div className="board-toolbar">
        <div className="flex min-w-0 items-center gap-2 md:hidden">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-200" title="Back">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="truncate text-sm font-medium text-gray-200">
            {board?.project.name ?? "Loading…"}
          </span>
          <ConnectivityBadge />
        </div>
        <div className="hidden md:block" aria-hidden />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
          <SyncRoomQuickControls />
          {isProjectAdmin && (
            <button
              type="button"
              onClick={() => setAskDeepSeekOpen(true)}
              className="btn-ghost hidden border-violet-500/30 text-violet-200 sm:inline-flex"
              title="Ask DeepSeek to create tasks for all members"
            >
              Ask DeepSeek
            </button>
          )}
          {board && (
            <BoardSearch
              projectId={projectId}
              onSelect={(taskId) => {
                const found = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
                if (found) setEditing(found);
              }}
            />
          )}
          {board && (
            <PresenceBar
              onOpenTask={(taskId) => {
                const found = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
                if (found) setEditing(found);
              }}
            />
          )}
          {board?.project.visibility === "shared" && isProjectAdmin && (
            <AdminReviewInboxButton onClick={() => setDeliverablesOpen(true)} />
          )}
          {board?.project.visibility === "shared" && myRole === "member" && (
            <MemberReviewActions
              projectId={projectId}
              onOpenDeliverables={() => setDeliverablesOpen(true)}
            />
          )}
          <button
            type="button"
            onClick={() => {
              const call = useCall.getState();
              if (call.phase === "in-call" || call.phase === "lobby" || call.phase === "connecting") {
                call.setViewMode(call.viewMode === "minimized" ? "expanded" : call.viewMode);
              } else {
                void call.openLobby();
              }
            }}
            className={`btn-primary relative px-2.5 py-1.5 text-sm ${
              callPhase !== "idle" || callRoster.length > 0 ? "ring-1 ring-emerald-500/40" : ""
            }`}
            title={
              callPhase !== "idle"
                ? "Open SyncRoom"
                : callRoster.length > 0
                  ? "Join SyncRoom in progress"
                  : "Start SyncRoom"
            }
          >
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">SyncRoom</span>
            {callPhase === "idle" && callRoster.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-semibold text-ink-900">
                {callRoster.length}
              </span>
            )}
          </button>
          <BoardToolsMenu
            activityOpen={feedOpen}
            showDeliverables={
              board?.project.visibility === "shared"
                ? isProjectAdmin
                  ? "admin"
                  : myRole === "member"
                    ? "member"
                    : undefined
                : undefined
            }
            onTeam={() => setTeamOpen(true)}
            onDeliverables={() => setDeliverablesOpen(true)}
            onIdeas={() => setIdeasOpen(true)}
            onActivity={() => setFeedOpen((v) => !v)}
            onInsights={() => setAiOpen(true)}
            onProjectField={
              isProjectAdmin ? () => setFieldPickerOpen((v) => !v) : undefined
            }
          />
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
              isAdmin={isProjectAdmin}
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

        {/* SyncRoom docks as a right sidebar beside the board */}
        {callPhase !== "idle" && callViewMode !== "minimized" && callViewMode !== "fullscreen" && (
          <CallPanel />
        )}
      </div>

      {/* Floating SyncRoom when minimized or fullscreen */}
      {callPhase !== "idle" && (callViewMode === "minimized" || callViewMode === "fullscreen") && (
        <CallPanel />
      )}

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

      <TeamPanel projectId={projectId} open={teamOpen} onClose={() => setTeamOpen(false)} />
      <IdeasPanel projectId={projectId} open={ideasOpen} onClose={() => setIdeasOpen(false)} />

      {board?.project.visibility === "shared" && (
        <ReviewDeliverablesPanel
          open={deliverablesOpen}
          onClose={() => setDeliverablesOpen(false)}
          projectId={projectId}
          isAdmin={isProjectAdmin}
          isMember={myRole === "member"}
        />
      )}

      <AskDeepSeekPanel
        projectId={projectId}
        open={askDeepSeekOpen}
        onClose={() => setAskDeepSeekOpen(false)}
        aiInfo={aiInfo}
        isAdmin={isProjectAdmin}
      />

      <SyncRoomWrapUp
        open={wrapUpOpen}
        sessionLog={sessionLog}
        contextTask={contextTask}
        projectId={projectId}
        columns={board?.columns ?? []}
        members={board?.members ?? []}
        onClose={dismissWrapUp}
      />
    </div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGate>
      <Suspense fallback={<BoardSkeleton />}>
        <BoardInner projectId={id} />
      </Suspense>
    </AuthGate>
  );
}
