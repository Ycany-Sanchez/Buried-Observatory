// World coordinates span the Dome (0–320) and the Archive (320–640).
export const LIGHT_PATH = Object.freeze({
  source: Object.freeze({ x: 330, y: 258 }),
  receiver: Object.freeze({ x: 371, y: 420 }),
  initialAim: -.35,
  minAim: -.5,
  maxAim: .65,
  tolerance: 7
});
export function clampLightAim(aim) {
  return Number.isFinite(aim) ? Math.max(LIGHT_PATH.minAim, Math.min(LIGHT_PATH.maxAim, aim)) : LIGHT_PATH.initialAim;
}
export function lightEndpoint(aim) {
  return { x: LIGHT_PATH.source.x + clampLightAim(aim) * (LIGHT_PATH.receiver.y - LIGHT_PATH.source.y), y: LIGHT_PATH.receiver.y };
}
export function lightHandle(aim) {
  const source=LIGHT_PATH.source,end=lightEndpoint(aim),length=Math.hypot(end.x-source.x,end.y-source.y);
  return {x:source.x+(end.x-source.x)/length*23,y:source.y+(end.y-source.y)/length*23};
}
export function lightInView(scroll, view) {
  if (!view || ![scroll, view.scale, view.x, view.y, view.width, view.height].every(Number.isFinite) || view.scale <= 0) return false;
  // A deliberate between-floor view is part of the mechanism, even on tall displays.
  if (scroll < 64 || scroll > 256) return false;
  const panels=view.obstructions??(view.obstruction?[view.obstruction]:[]);
  if(!Array.isArray(panels)||panels.some(panel=>!panel||![panel.left,panel.right,panel.top,panel.bottom].every(Number.isFinite)))return false;
  return [LIGHT_PATH.source, LIGHT_PATH.receiver].every(p => {
    const x = view.x + p.x * view.scale, y = view.y + (p.y - scroll) * view.scale;
    const covered=panels.some(panel=>x+16>panel.left&&x-16<panel.right&&y+16>panel.top&&y-16<panel.bottom);
    return !covered && x >= 16 && x <= view.width - 16 && y >= 72 && y <= view.height - 36;
  });
}
export function lightAligned(aim, scroll, view) {
  return Number.isFinite(aim) && lightInView(scroll, view) && Math.abs(lightEndpoint(aim).x - LIGHT_PATH.receiver.x) <= LIGHT_PATH.tolerance;
}
