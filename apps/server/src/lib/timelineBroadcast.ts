import { emitToProject } from "../realtime/io.js";

/** Notify clients that timeline data may have changed. */
export async function broadcastTimelineUpdated(
  projectId: string,
  _userIds?: string[],
): Promise<void> {
  emitToProject(projectId, "timeline:updated", { projectId });
}
