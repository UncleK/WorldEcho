import type { ModelView } from '../types';

/** Rotate each building locally so a side view never collapses the X-axis row. */
export const COMPARISON_VIEW_POSES: Record<ModelView, { yaw: number; pitch: number }> = {
  axonometric: { yaw: 35 * Math.PI / 180, pitch: 18 * Math.PI / 180 },
  front: { yaw: 0, pitch: 0 },
  side: { yaw: Math.PI / 2, pitch: 0 },
};

export function comparisonFrame(width: number, height: number, viewportWidth: number, viewportHeight: number, metric = false) {
  const aspect = viewportWidth / Math.max(1, viewportHeight);
  const compact = viewportHeight < 360 || (viewportHeight <= 448 && viewportWidth >= 450);
  const header = compact ? 60 : viewportWidth < 760 ? 96 : 72;
  const footer = compact ? 20 : viewportWidth < 760 ? 36 : 24;
  const usableHeight = Math.max(120, viewportHeight - header - footer);
  // Keep one frame across all presets: a turn changes the view, not the scale.
  const paddedHeight = height + 0.85;
  const halfHeight = Math.max(paddedHeight * viewportHeight / (2 * usableHeight), (width + (metric ? 1.4 : .6)) / (2 * Math.max(aspect, 0.1)));
  return { aspect, halfHeight, centerOffset: (header - footer) * halfHeight / Math.max(1, viewportHeight) };
}

export function comparisonCameraPose(height: number, centerOffset: number, view: ModelView) {
  const { pitch } = COMPARISON_VIEW_POSES[view];
  // This offset is measured in screen-space vertical units, including mobile UI.
  const targetY = height / 2 + 0.06 + centerOffset / Math.cos(pitch);
  return { targetY, y: targetY + 7 * Math.sin(pitch), z: 7 * Math.cos(pitch) };
}
