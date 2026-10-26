export const W = 480, H = 320;
export const ROOMS = [
  { name: 'Broken Dome', subtitle: 'Where the sky fell in', depth: '00', color: '#9a9d8a', objects: [
    { id: 'mural', x: 104, y: 82, w: 50, h: 22, label: 'Celestial mural', kind: 'mural', action: 'inspect_mural' },
    { id: 'telescope', x: 240, y: 116, w: 42, h: 24, label: 'Abandoned telescope', kind: 'telescope', text: 'The telescope is tilted toward the floor. There is no eyepiece. Fine brass channels carry light into the stone below.' },
    { id: 'projector', x: 370, y: 112, w: 24, h: 25, label: 'Moonlight projector', kind: 'projector', action: 'restore_projector' },
    { id: 'entrySeal', x: 196, y: 258, w: 23, h: 20, label: 'Celestial seal', kind: 'seal', puzzle: 'entry' },
    { id: 'shaftMirror', x: 330, y: 258, w: 22, h: 20, label: 'Shaft mirror', kind: 'mirror' },
    { id: 'satchel', x: 96, y: 225, w: 19, h: 16, label: 'Elian’s satchel', kind: 'satchel', text: 'Elian’s initials are stitched inside. A lantern-shaped imprint rests in the dust, and a line of footprints leads to the southern stairs.' }
  ] },
  { name: 'The Archive', subtitle: 'Some words wait for light', depth: '12', color: '#bca078', objects: [
    { id: 'memo', x: 108, y: 110, w: 35, h: 24, label: 'Maintenance memorandum', kind: 'desk', action: 'inspect_reflection' },
    { id: 'key', x: 360, y: 214, w: 29, h: 22, label: 'Brass maintenance key', kind: 'keydesk', action: 'take_key' },
    { id: 'mentorNote', x: 113, y: 224, w: 30, h: 22, label: 'Elian’s notebook', kind: 'desk', action: 'inspect_mentor' },
    { id: 'wall', x: 371, y: 100, w: 27, h: 30, label: 'Silver-flecked wall', kind: 'wall', action: 'inspect_wall' },
    { id: 'pumpLock', x: 197, y: 259, w: 20, h: 18, label: 'Maintenance lock', kind: 'seal', action: 'unlock_pump' }
  ] },
  { name: 'Pump Room', subtitle: 'The mountain remembers water', depth: '28', color: '#6baba7', objects: [
    { id: 'regulator', x: 160, y: 142, w: 47, h: 29, label: 'Water regulator', kind: 'pump', puzzle: 'pump' },
    { id: 'routing', x: 363, y: 181, w: 25, h: 26, label: 'Water routing lever', kind: 'lever', action: 'route_generator' },
    { id: 'plaque', x: 98, y: 224, w: 33, h: 18, label: 'Sluice maintenance plaque', kind: 'plaque', action: 'inspect_plaque' }
  ] },
  { name: 'Lens Chamber', subtitle: 'A borrowed piece of moonlight', depth: '43', color: '#9a9cba', objects: [
    { id: 'prism', x: 240, y: 136, w: 31, h: 26, label: 'Projection prism', kind: 'prism', action: 'collect_prism' },
    { id: 'shutters', x: 351, y: 224, w: 46, h: 26, label: 'Numbered shutters', kind: 'shutters', puzzle: 'shutters' },
    { id: 'diagram', x: 114, y: 115, w: 35, h: 25, label: 'Seal schematic', kind: 'mural', text: 'Three channels lead to the southern seal: a beam of light, a turning waterwheel, and four aligned shutters. Each channel has a small indicator.' }
  ] },
  { name: 'Buried Beacon', subtitle: 'A way home through the dark', depth: '61', color: '#e0bd7b', objects: [
    { id: 'elian', x: 350, y: 155, w: 16, h: 20, label: 'Elian', kind: 'mentor', action: 'meet_mentor' },
    { id: 'beacon', x: 240, y: 169, w: 37, h: 33, label: 'The buried beacon', kind: 'beacon', action: 'finish' }
  ] }
];
export function isWalkable(room, x, y) {
  if (x < 44 || x > 436 || y < 47 || y > 279) return false;
  return !ROOMS[room].objects.some(o => x > o.x - o.w / 2 - 5 && x < o.x + o.w / 2 + 5 && y > o.y - o.h / 2 - 3 && y < o.y + o.h / 2 + 7);
}
export function safePosition(room, p) {
  if (isWalkable(room, p.x, p.y)) return p;
  return { x: 240, y: 67 };
}
export function nearbyObject(room, p, limit = 39) {
  return ROOMS[room].objects.map(o => ({ o, d: Math.hypot(o.x - p.x, o.y - p.y) })).filter(v => v.d <= limit).sort((a, b) => a.d - b.d)[0]?.o;
}
