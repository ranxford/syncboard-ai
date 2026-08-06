"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PhoneOff, Users, X } from "lucide-react";
import { useCallShortcuts } from "@/lib/webrtc/useCallShortcuts";
import type { CallViewMode } from "@/lib/webrtc/types";
import { useAuth } from "@/store/auth";
import { useSyncRoom } from "@/store/call";
import { CallDevicePicker } from "./call/CallDevicePicker";
import { CallControls, CallHeaderControls } from "./call/CallControls";
import { CallLobby } from "./call/CallLobby";
import { CallRoom } from "./call/CallRoom";
import { SyncRoomSessionTools } from "./syncroom/SyncRoomSessionTools";
import { SyncRoomTaskSpotlight } from "./syncroom/SyncRoomTaskSpotlight";

function panelClass(mode: CallViewMode): string {
  if (mode === "fullscreen") {
    return "fixed inset-3 z-[90] flex w-auto max-w-none flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-2xl";
  }
  if (mode === "minimized") {
    return "fixed bottom-4 right-4 z-[90] flex w-[min(92vw,18rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl";
  }
  return "flex h-full w-[min(100%,20rem)] shrink-0 flex-col overflow-hidden border-l border-white/10 bg-ink-900 lg:w-[22rem]";
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
  const speakers = useSyncRoom((s) => s.speakers);
  const cameraId = useSyncRoom((s) => s.cameraId);
  const micId = useSyncRoom((s) => s.micId);
  const speakerId = useSyncRoom((s) => s.speakerId);
  const contextTask = useSyncRoom((s) => s.contextTask);
  const user = useAuth((s) => s.user);

  const closeLobby = useSyncRoom((s) => s.closeLobby);
  const join = useSyncRoom((s) => s.join);
  const leave = useSyncRoom((s) => s.leave);
  const toggleMic = useSyncRoom((s) => s.toggleMic);
  const toggleCam = useSyncRoom((s) => s.toggleCam);
  const toggleScreen = useSyncRoom((s) => s.toggleScreen);
  const setViewMode = useSyncRoom((s) => s.setViewMode);
  const copyInviteLink = useSyncRoom((s) => s.copyInviteLink);
  const setCameraId = useSyncRoom((s) => s.setCameraId);
  const setMicId = useSyncRoom((s) => s.setMicId);
  const setSpeakerId = useSyncRoom((s) => s.setSpeakerId);
  const refreshDevices = useSyncRoom((s) => s.refreshDevices);
  const connectMobileCamera = useSyncRoom((s) => s.useMobileCamera);
  const connectMobileMic = useSyncRoom((s) => s.useMobileMic);

  useCallShortcuts(phase === "in-call");

  if (phase === "idle") return null;

  const inCall = phase === "in-call";
  const connecting = phase === "connecting";
  const inLobby = phase === "lobby";
  const total = participants.length + (inCall ? 1 : 0);
  const minimized = viewMode === "minimized";
  const showBody = !minimized;
  const docked = viewMode !== "fullscreen" && viewMode !== "minimized";

  function endOrClose() {
    if (inCall || connecting) leave();
    else closeLobby();
  }

  const controlProps = {
    micOn,
    camOn,
    sharingScreen,
    viewMode,
    onToggleMic: toggleMic,
    onToggleCam: toggleCam,
    onToggleScreen: () => void toggleScreen(),
    onCopyLink: () => void copyInviteLink(),
    onViewMode: setViewMode,
    onUseMobileCamera: () => void connectMobileCamera(),
    hasMobileCamera: cameras.some((c) => c.isMobileDevice || c.isPhoneCamera),
  };

  const devicePickerProps = {
    cameras,
    mics,
    speakers,
    cameraId,
    micId,
    speakerId,
    onCameraChange: (id: string) => void setCameraId(id),
    onMicChange: (id: string) => void setMicId(id),
    onSpeakerChange: setSpeakerId,
    onRefreshDevices: () => void refreshDevices(),
    onUseMobileCamera: () => void connectMobileCamera(),
    onUseMobileMic: () => void connectMobileMic(),
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={docked ? { opacity: 0, x: 24 } : { opacity: 0, y: 24, scale: 0.96 }}
        animate={docked ? { opacity: 1, x: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={docked ? { opacity: 0, x: 24 } : { opacity: 0, y: 24, scale: 0.96 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className={panelClass(viewMode)}
        aria-label="SyncRoom"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-100">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="truncate">
              {inLobby ? "Join SyncRoom" : connecting ? "Connecting…" : "Team session"}
            </span>
            {!inLobby && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-gray-400">
                <Users className="h-3.5 w-3.5" /> {total}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={endOrClose}
              className="flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
              title={inCall || connecting ? "End team session" : "Close"}
            >
              {inCall || connecting ? (
                <>
                  <PhoneOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">End</span>
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Close</span>
                </>
              )}
            </button>
            <CallHeaderControls viewMode={viewMode} onViewMode={setViewMode} />
          </div>
        </div>

        {showBody && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {contextTask && <SyncRoomTaskSpotlight />}

            {inLobby && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <CallLobby
                  localStream={localStream}
                  userName={user?.name ?? "You"}
                  avatarColor={user?.avatarColor ?? "#2a9d8f"}
                  micOn={micOn}
                  camOn={camOn}
                  {...devicePickerProps}
                  rosterCount={roster.length}
                  onClose={closeLobby}
                  onJoinVideo={() => void join({ video: true })}
                  onJoinAudio={() => void join({ video: false })}
                  onToggleMic={toggleMic}
                  onToggleCam={toggleCam}
                />
              </div>
            )}

            {connecting && (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Connecting to teammates…
              </div>
            )}

            {inCall && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <CallRoom
                    localStream={localStream}
                    localName={user?.name ?? "You"}
                    localAvatar={user?.avatarColor ?? "#2a9d8f"}
                    localMicOn={micOn}
                    localCamOn={camOn}
                    localSharing={sharingScreen}
                    participants={participants}
                    speakerId={speakerId}
                    compact={docked}
                  />
                  <div className="border-t border-white/10 px-3 py-2">
                    <CallDevicePicker {...devicePickerProps} compact />
                  </div>
                  <SyncRoomSessionTools />
                </div>

                <CallControls {...controlProps} pinned />
              </>
            )}
          </div>
        )}

        {minimized && inCall && <CallControls {...controlProps} compact pinned />}
      </motion.aside>
    </AnimatePresence>
  );
}

export const CallPanel = SyncRoomPanel;
