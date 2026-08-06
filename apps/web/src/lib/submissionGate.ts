import { api } from "@/lib/api";
import type { SubmissionReadiness } from "@/lib/types";

export async function fetchSubmissionReadiness(projectId: string) {
  return api.getSubmissionReadiness(projectId);
}

/** Run AI gate; submit for review when marking personal work complete. */
export async function autoSubmitIfReady(projectId: string): Promise<{
  ready: boolean;
  readiness: SubmissionReadiness;
  submitted: boolean;
}> {
  const { readiness, existingSubmission } = await fetchSubmissionReadiness(projectId);
  if (!readiness.ready) {
    return { ready: false, readiness, submitted: false };
  }
  if (
    existingSubmission?.status === "submitted" ||
    existingSubmission?.status === "accepted"
  ) {
    return { ready: true, readiness, submitted: false };
  }
  await api.submitDeliverable(projectId);
  return { ready: true, readiness, submitted: true };
}

export function isPersonalCloseoutMilestone(title: string) {
  return /wrapped|wrap-up|wrap up|close-out|close out|handover|done/i.test(title);
}
