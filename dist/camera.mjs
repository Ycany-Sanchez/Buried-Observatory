import { W, H } from './rooms.mjs';

export function viewport(width, height) {
  const scale = Math.min(width / W, height / H);
  return { width, height, scale, x: (width - W * scale) / 2, y: (height - H * scale) / 2 };
}
export function clampScroll(y, unlocked) {
  return Math.max(0, Math.min(unlocked * H, y));
}
export function roomAtScroll(y, unlocked) {
  return Math.max(0, Math.min(unlocked, Math.round(y / H)));
}
export function screenToWorld(x, y, view, scroll) {
  return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale + scroll };
}
export function worldToScreen(x, y, view, scroll) {
  return { x: view.x + x * view.scale, y: view.y + (y - scroll) * view.scale };
}
export function wheelDistance(delta, mode, view) {
  return delta * (mode === 1 ? 16 : mode === 2 ? view.height : 1) / view.scale;
}
