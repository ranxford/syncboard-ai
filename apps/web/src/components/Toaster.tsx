"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useToast, type ToastKind } from "@/store/toast";

const STYLES: Record<ToastKind, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: "ring-emerald-500/30", iconColor: "text-emerald-400" },
  error: { icon: AlertCircle, ring: "ring-red-500/30", iconColor: "text-red-400" },
  info: { icon: Info, ring: "ring-brand-500/30", iconColor: "text-brand-400" },
};

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const s = STYLES[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className={`card card-shadow pointer-events-auto flex items-start gap-3 p-3.5 ring-1 ${s.ring}`}
              role="status"
            >
              <s.icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconColor}`} />
              <p className="flex-1 text-sm text-gray-100">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded p-0.5 text-gray-500 transition-colors hover:text-gray-200"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
