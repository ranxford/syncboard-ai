export const BOARD_ZOOM_MIN = 0.6;
export const BOARD_ZOOM_MAX = 1.5;
export const BOARD_ZOOM_STEP = 0.1;
export const BOARD_ZOOM_DEFAULT = 1;

export const BOARD_ZOOM_STORAGE_KEY = "syncboard.boardZoom";

/** Column width (w-72) + horizontal gap between columns. */
export const BOARD_COLUMN_WIDTH = 288;
export const BOARD_COLUMN_GAP = 16;
export const BOARD_HORIZONTAL_PADDING = 48;

export function clampBoardZoom(value: number): number {
  return Math.round(Math.min(BOARD_ZOOM_MAX, Math.max(BOARD_ZOOM_MIN, value)) * 100) / 100;
}

export function formatBoardZoom(level: number): string {
  return `${Math.round(level * 100)}%`;
}

/** Zoom out enough to fit every column in the viewport (never zooms in past 100%). */
export function fitBoardZoom(columnCount: number, viewportWidth: number): number {
  if (columnCount <= 0 || viewportWidth <= 0) return BOARD_ZOOM_DEFAULT;
  const needed =
    columnCount * BOARD_COLUMN_WIDTH +
    Math.max(0, columnCount - 1) * BOARD_COLUMN_GAP +
    BOARD_HORIZONTAL_PADDING;
  return clampBoardZoom(Math.min(1, viewportWidth / needed));
}
