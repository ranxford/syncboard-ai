"use client";

import type { Participant } from "@/lib/webrtc/types";
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

export function CallRoom({
  localStream,
  localName,
  localAvatar,
  localMicOn,
  localCamOn,
  localSharing,
  participants,
}: {
  localStream: MediaStream | null;
  localName: string;
  localAvatar: string;
  localMicOn: boolean;
  localCamOn: boolean;
  localSharing: boolean;
  participants: Participant[];
}) {
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

  const spotlight =
    tiles.find((t) => t.sharingScreen) ?? null;
  const filmstrip = spotlight ? tiles.filter((t) => t.key !== spotlight.key) : tiles;

  if (spotlight) {
    const { key: spotlightKey, ...spotlightProps } = spotlight;
    return (
      <div className="flex flex-col gap-2 p-3">
        <CallVideoTile key={spotlightKey} {...spotlightProps} large />
        {filmstrip.length > 0 && (
          <div className={`grid gap-2 ${gridClass(filmstrip.length)}`}>
            {filmstrip.map(({ key, ...props }) => (
              <CallVideoTile key={key} {...props} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`grid gap-2 p-3 ${gridClass(tiles.length)}`}>
      {tiles.map(({ key, ...props }) => (
        <CallVideoTile key={key} {...props} />
      ))}
    </div>
  );
}
