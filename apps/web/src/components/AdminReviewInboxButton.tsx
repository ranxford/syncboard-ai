"use client";

import { Inbox } from "lucide-react";

/** One-click admin entry to submission inbox — toolbar only. */
export function AdminReviewInboxButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-100 sm:block"
      title="Submission inbox"
    >
      <Inbox className="h-4 w-4" />
    </button>
  );
}
