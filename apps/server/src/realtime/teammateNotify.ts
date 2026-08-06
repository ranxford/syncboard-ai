import { getAdminViewerIdsFor, getOverseenUserIds } from "../lib/teammates.js";
import { awareness, type TeammateStatus } from "./awareness.js";
import { emitToUser } from "./io.js";

/**
 * Live collaborator detail is for admins only.
 * Regular members only see community-shared work (board + community timeline),
 * not what peers are personally focused on.
 */
export async function notifyTeammates(userId: string): Promise<void> {
  const status = awareness.get(userId);
  const adminViewers = await getAdminViewerIdsFor(userId);

  for (const mateId of adminViewers) {
    emitToUser(mateId, "teammate:updated", {
      teammate: status,
      offline: !status,
    });
  }
}

/** Active teammates the viewer is allowed to oversee (admin projects only). */
export async function activeTeammatesFor(viewerId: string): Promise<TeammateStatus[]> {
  const overseen = await getOverseenUserIds(viewerId);
  if (overseen.length === 0) return [];
  return awareness.listActive(overseen);
}
