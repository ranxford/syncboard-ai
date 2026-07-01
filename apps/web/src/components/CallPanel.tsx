"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Users } from "lucide-react";
import { useCallShortcuts } from "@/lib/webrtc/useCallShortcuts";
import type { CallViewMode } from "@/lib/webrtc/types";
import { useAuth } from "@/store/auth";
import { useSyncRoom } from "@/store/call";
import { CallControls, CallHeaderControls } from "./call/CallControls";
import { CallLobby } from "./call/CallLobby";
import { CallRoom } from "./call/CallRoom";

function panelClass(mode: CallViewMode): string {
  if (mode === "fullscreen") {
    return "fixed inset-3 z-[90] flex w-auto max-w-none flex-col";
  }
  if (mode === "expanded") {
    return "fixed bottom-4 left-1/2 z-[80] flex w-[min(96vw,56rem)] -translate-x-1/2 flex-col";
  }
  if (mode === "minimized") {
    return "fixed bottom-4 right-4 z-[80] flex w-[min(92vw,20rem)] flex-col";
  }
  return "fixed bottom-4 right-4 z-[80] flex w-[min(92vw,28rem)] flex-col";
}

export function SyncRoomPanel() {
  const phase = useSyncRoom((s) => s.phase);
  const viewMode = useSyncRoom((s) => s.viewMode);
  const localStream = useSyncRoom((s) => s.localStream);
  const participants = useSyncRoom((s) => s.participants);
  const roster = useSyncRoom((s) => s.roster);
  const micOn = useSyncRoom((s) => s.micOn);
  const camOn = useSyncRoom((s) => s.camOn);
  const sharingScreen = useSyncRoom((s) => s.sharingScreen);
  const cameras = useSyncRoom((s) => s.cameras);
  const mics = useSyncRoom((s) => s.mics);
  const cameraId = useSyncRoom((s) => s.cameraId);
  const micId = useSyncRoom((s) => s.micId);
  const contextTask = useSyncRoom((s) => s.contextTask);
  const user = useAuth((s) => s.user);

  const {
    closeLobby,
    join,
    leave,
    toggleMic,
    toggleCam,
    toggleScreen,
    setViewMode,
    copyInviteLink,
    setCameraId,
    setMicId,
  } = useSyncRoom.getState();

  useCallShortcuts(phase === "in-call");

  if (phase === "idle") return null;

  const inCall = phase === "in-call";
  const connecting = phase === "connecting";
  const inLobby = phase === "lobby";
  const total = participants.length + (inCall ? 1 : 0);
  const showBody = viewMode !== "minimized";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className={`card card-shadow overflow-hidden ${panelClass(viewMode)}`}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {inLobby ? "Join SyncRoom" : connecting ? "Connecting…" : "SyncRoom"}
            {!inLobby && (
              <span className="flex items-center gap-1 text-xs font-normal text-gray-400">
                <Users className="h-3.5 w-3.5" /> {total}
              </span>
            )}
          </div>
          <CallHeaderControls viewMode={viewMode} onViewMode={setViewMode} />
        </div>

        {contextTask && showBody && (
          <p className="border-b border-white/10 bg-brand-500/10 px-3 py-2 text-xs text-brand-200">
            Live discussion: <span className="font-medium text-brand-100">“{contextTask.title}”</span>
          </p>
        )}

        {showBody && (
          <>
            {inLobby && (
              <CallLobby
                localStream={localStream}
                userName={user?.name ?? "You"}
                avatarColor={user?.avatarColor ?? "#6366f1"}
                micOn={micOn}
                camOn={camOn}
                cameras={cameras}
                mics={mics}
                cameraId={cameraId}
                micId={micId}
                rosterCount={roster.length}
                onClose={closeLobby}
                onJoinVideo={() => void join({ video: true })}
                onJoinAudio={() => void join({ video: false })}
                onCameraChange={(id) => void setCameraId(id)}
                onMicChange={(id) => void setMicId(id)}
                onToggleMic={toggleMic}
                onToggleCam={toggleCam}
              />
            )}

            {connecting && (
              <div className="flex h-40 items-center justify-center gap-2 text-sm text-gray-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Connecting to teammates…
              </div>
            )}

            {inCall && (
              <CallRoom
                localStream={localStream}
                localName={user?.name ?? "You"}
                localAvatar={user?.avatarColor ?? "#6366f1"}
                localMicOn={micOn}
                localCamOn={camOn}
                localSharing={sharingScreen}
                participants={participants}
              />
            )}
          </>
        )}

        {inCall && (
          <CallControls
            micOn={micOn}
            camOn={camOn}
            sharingScreen={sharingScreen}
            viewMode={viewMode}
            onToggleMic={toggleMic}
            onToggleCam={toggleCam}
            onToggleScreen={() => void toggleScreen()}
            onCopyLink={() => void copyInviteLink()}
            onLeave={leave}
            onViewMode={setViewMode}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export const CallPanel = SyncRoomPanel;
