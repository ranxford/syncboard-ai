import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

const DURATION: Record<ToastKind, number> = {
  success: 3500,
  info: 3500,
  error: 6000,
};

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => get().dismiss(id), DURATION[kind]);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative helpers — usable from stores and event handlers alike. */
export const toast = {
  success: (message: string) => useToast.getState().push("success", message),
  error: (message: string) => useToast.getState().push("error", message),
  info: (message: string) => useToast.getState().push("info", message),
};
