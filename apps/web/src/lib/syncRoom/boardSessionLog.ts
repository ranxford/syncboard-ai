import { useAuth } from "@/store/auth";
import { useCall } from "@/store/call";
import type { SessionEventKind } from "./sessionLog";

/** Record a board mutation that happened during an active SyncRoom. */
export function logBoardActivity(label: string, kind: SessionEventKind = "task_updated") {
  const call = useCall.getState();
  if (call.phase !== "in-call") return;
  const name = useAuth.getState().user?.name ?? "You";
  call.logSession(kind, `${name}: ${label}`);
}
