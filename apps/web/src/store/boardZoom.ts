import { create } from "zustand";
import {
  BOARD_ZOOM_DEFAULT,
  BOARD_ZOOM_STEP,
  BOARD_ZOOM_STORAGE_KEY,
  clampBoardZoom,
} from "@/lib/boardZoom";

interface BoardZoomState {
  levels: Record<string, number>;
  get: (projectId: string) => number;
  set: (projectId: string, level: number) => void;
  zoomIn: (projectId: string) => void;
  zoomOut: (projectId: string) => void;
  reset: (projectId: string) => void;
}

function loadLevels(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(BOARD_ZOOM_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, level]) => [id, clampBoardZoom(level)]),
    );
  } catch {
    return {};
  }
}

function saveLevels(levels: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOARD_ZOOM_STORAGE_KEY, JSON.stringify(levels));
}

export const useBoardZoom = create<BoardZoomState>((set, get) => ({
  levels: loadLevels(),

  get: (projectId) => get().levels[projectId] ?? BOARD_ZOOM_DEFAULT,

  set: (projectId, level) => {
    const next = clampBoardZoom(level);
    set((s) => {
      const levels = { ...s.levels, [projectId]: next };
      saveLevels(levels);
      return { levels };
    });
  },

  zoomIn: (projectId) => {
    const current = get().get(projectId);
    get().set(projectId, current + BOARD_ZOOM_STEP);
  },

  zoomOut: (projectId) => {
    const current = get().get(projectId);
    get().set(projectId, current - BOARD_ZOOM_STEP);
  },

  reset: (projectId) => get().set(projectId, BOARD_ZOOM_DEFAULT),
}));
