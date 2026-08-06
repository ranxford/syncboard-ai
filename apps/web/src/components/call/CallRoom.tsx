"use client";

import type { Participant } from "@/lib/webrtc/types";
import { Eye, MonitorUp } from "lucide-react";
import { CallVideoTile } from "./CallVideoTile";

type Tile = {
  key: string;
  stream: MediaStream | null;
  name: string;
  avatarColor: string;
  micOn: boolean;
  camOn: boolean;
  sharingScreen: boolean;
  isLocal?: boolean;
};

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 9) return "grid-cols-3";
  return "grid-cols-4";
}

function ScreenShareBanner({ name, isLocal }: { name: string; isLocal?: boolean }) {
  return (
    <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-xs text-brand-100">
      <MonitorUp className="h-4 w-4 shrink-0 text-brand-300" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {isLocal ? "You’re sharing your screen" : `${name} is sharing their screen`}
        </p>
        <p className="text-[11px] text-brand-200/80">
          {isLocal
            ? "Teammates can see your workspace to verify progress."
            : "Watch their screen to confirm they’re working on the project."}
        </p>
      </div>
      <Eye className="h-4 w-4 shrink-0 text-brand-300/80" />
    </div>
  );
}

export function CallRoom({
  localStream,
  localName,
  localAvatar,
  localMicOn,
  localCamOn,
  localSharing,
  participants,
  compact = false,
  speakerId,
}: {
  localStream: MediaStream | null;
  localName: string;
  localAvatar: string;
  localMicOn: boolean;
  localCamOn: boolean;
  localSharing: boolean;
  participants: Participant[];
  compact?: boolean;
  speakerId?: string;
}) {
  const tileProps = { speakerId };

  const tiles: Tile[] = [
    {
      key: "local",
      stream: localStream,
      name: localName,
      avatarColor: localAvatar,
      micOn: localMicOn,
      camOn: localCamOn,
      sharingScreen: localSharing,
      isLocal: true,
    },
    ...participants.map((p) => ({
      key: p.socketId,
      stream: p.stream,
      name: p.name,
      avatarColor: p.avatarColor,
      micOn: p.micOn,
      camOn: p.camOn,
      sharingScreen: p.sharingScreen,
    })),
  ];

  const spotlight = tiles.find((t) => t.sharingScreen) ?? null;
  const filmstrip = spotlight ? tiles.filter((t) => t.key !== spotlight.key) : tiles;
  const stripGrid = compact ? "grid-cols-1" : gridClass(filmstrip.length);

  if (spotlight) {
    const { key: spotlightKey, ...spotlightProps } = spotlight;
    return (
      <div className="flex flex-col gap-2 pb-3">
        <ScreenShareBanner name={spotlight.name} isLocal={spotlight.isLocal} />
        <div className="px-3">
          <CallVideoTile key={spotlightKey} {...spotlightProps} {...tileProps} large />
        </div>
        {filmstrip.length > 0 && (
          <div className={`grid gap-2 px-3 ${stripGrid}`}>
            {filmstrip.map(({ key, ...props }) => (
              <CallVideoTile key={key} {...props} {...tileProps} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 p-3 ${compact ? "grid-cols-1" : gridClass(tiles.length)}`}>
      {tiles.map(({ key, ...props }) => (
        <CallVideoTile key={key} {...props} {...tileProps} />
      ))}
    </div>
  );
}
