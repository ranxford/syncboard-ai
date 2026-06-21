import { create } from "zustand";
import { api, setToken, getToken } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: "loading",

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
    const { token, user } = await api.login({ email, password });
    setToken(token);
    set({ user, status: "authenticated" });
  },

  register: async (name, email, password) => {
    const { token, user } = await api.register({ name, email, password });
    setToken(token);
    set({ user, status: "authenticated" });
  },

  logout: () => {
    setToken(null);
    disconnectSocket();
    set({ user: null, status: "unauthenticated" });
  },
}));
