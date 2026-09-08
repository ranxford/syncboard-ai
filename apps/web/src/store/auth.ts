import { create } from "zustand";
import { api, setToken, getToken, ApiError } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  pendingVerifyEmail: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<"verified" | "needsVerification">;
  confirmEmail: (email: string, token: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<string>;
  clearPendingVerify: () => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  pendingVerifyEmail: null,

  hydrate: async () => {
    if (!getToken()) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const { user } = await api.me();
      set({ user, status: "authenticated" });
    } catch {
      setToken(null);
      set({ status: "unauthenticated", user: null });
    }
  },

  login: async (email, password) => {
    try {
      const { token, user } = await api.login({ email, password });
      setToken(token);
      set({ user, status: "authenticated", pendingVerifyEmail: null });
    } catch (e) {
      if (e instanceof ApiError && e.data.needsVerification) {
        set({ pendingVerifyEmail: (e.data.email as string) || email });
      }
      throw e;
    }
  },

  register: async (name, email, password) => {
    const res = await api.register({ name, email, password });
    if (res.needsVerification) {
      set({
        pendingVerifyEmail: res.email ?? email,
        status: "unauthenticated",
        user: null,
      });
      return "needsVerification";
    }
    if (res.token && res.user) {
      setToken(res.token);
      set({ user: res.user, status: "authenticated", pendingVerifyEmail: null });
      return "verified";
    }
    throw new Error("Unexpected registration response");
  },

  confirmEmail: async (email, token) => {
    const { token: jwt, user } = await api.confirmEmail({ email, token });
    setToken(jwt);
    set({ user, status: "authenticated", pendingVerifyEmail: null });
  },

  resendConfirmation: async (email) => {
    const res = await api.resendConfirmation(email);
    set({ pendingVerifyEmail: email });
    return res.message ?? "Confirmation email sent.";
  },

  clearPendingVerify: () => set({ pendingVerifyEmail: null }),

  logout: () => {
    setToken(null);
    disconnectSocket();
    set({ user: null, status: "unauthenticated", pendingVerifyEmail: null });
  },
}));
