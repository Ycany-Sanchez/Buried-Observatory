import { lightAligned } from './light.mjs';
import { freshInstruments, restoreInstruments } from './instruments.mjs';
export const SAVE_KEY = 'buried-observatory:v1';
export const SYMBOLS = ['crescent', 'star', 'sun'];
export const ROOM_NAMES = ['Broken Dome', 'The Archive', 'Pump Room', 'Lens Chamber', 'Buried Beacon'];
export const NOTES = {
  letter: { title: 'A letter from Elian', room: 'Before the descent', text: 'If I am not back by morning, follow the old observatory stairs. Bring your lantern. I found a passage the old charts leave blank. — Elian' },
  trail: { title: 'A fresh trail', room: 'Broken Dome', text: 'Elian’s initials are stitched inside the satchel. Its leather is still supple. Fresh bootprints cut through the dust toward the southern stairs; the prints on the return path are much older.' },
  mural: { title: 'The celestial procession', room: 'Broken Dome', text: 'Three figures are carved around the dome, in this order: CRESCENT → STAR → SUN. Beneath them: “As above, the first door remembers.”' },
  reflection: { title: 'Maintenance memorandum', room: 'The Archive', text: 'To the keeper of the lower instruments: the sky is read from beneath. Reverse the celestial procession when setting the water regulator. The Archive door uses the original order.' },
  mentor: { title: 'A page in Elian’s hand', room: 'The Archive', text: 'Water has cut off the lower passage. I’ve gone ahead to find a dry ledge. The instruments below don’t match the charts. There must be another way through. — E.' },
  knock: { title: 'Three taps in the pipes', room: 'Pump Room', text: 'Three measured taps. A pause. Then three more. The sound travels up the pipes from somewhere deeper. Too deliberate to be falling stone.' },
  plaque: { title: 'The latched sluice', room: 'Pump Room', text: 'DRAIN first. Once the lower chamber is empty, the sluice latches permanently. Water may then be routed to the GENERATOR without flooding the chamber again. Keep the beacon turbine supplied.' },
  prism: { title: 'A light without a source', room: 'Lens Chamber', text: 'A triangular prism rests inside the lens housing. Its brass foot matches the empty socket of the projector in the Broken Dome. A brass mirror beside the Dome’s southern stairs directs its beam into the Archive. Four numbered shutters surround the southern seal.' },
  light: { title: 'One instrument, two floors', room: 'Between the Dome and Archive', text: 'The Dome’s shaft mirror and the silver receiver in the Archive belong to one instrument. View both floors together, then turn the mirror until the beam meets the receiver. The brass catch holds the alignment once it is set.' },
  projection: { title: 'Writing in the light', room: 'The Archive', text: 'The restored beam exposes silver lettering on the blank wall: “For the keeper below: open the shutters 2 → 4 → 1 → 3.” A drawing connects the light, the waterwheel, and the final seal.' },
  diagram: { title: 'An unfinished circuit', room: 'Lens Chamber', text: 'Three unfinished channels converge beneath the chamber: a beam of light, a turning waterwheel, and four shutters. The drawing continues beyond the edge of the page. Whatever the instrument does, its light belongs below.' },
  reunion: { title: 'What the observatory was for', room: 'Buried Beacon', text: 'Elian is alive. The buried lens was built to send a signal through the mountain: a way home for anyone lost in the dark. The stars on its walls were instructions, not observations.' }
};
export function freshState() {
  return { version: 1, room: 0, player: { x: 240, y: 86 }, flags: { archive: false, key: false, pump: false, drained: false, prism: false, projector: false, beamAligned: false, generator: false, shutters: false, beaconLit:false, finished: false }, journal: ['letter'], pinnedNote:null, hints: {}, instruments:freshInstruments(), muted: true };
}
export function lastUnlocked(s) {
  if(s.flags.beaconLit)return 4;
  if (s.flags.projector && s.flags.beamAligned && s.flags.generator && s.flags.shutters) return 4;
  if (s.flags.drained) return 3;
  if (s.flags.pump) return 2;
  return s.flags.archive ? 1 : 0;
}
export function restoreState(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.version !== 1 || !data.flags || !Array.isArray(data.journal)) return freshState();
    const s = freshState();
    for (const k of Object.keys(s.flags)) s.flags[k] = data.flags[k] === true;
    if (!s.flags.archive) s.flags.key = s.flags.pump = false;
    if (!s.flags.key) s.flags.pump = false;
    if (!s.flags.pump) s.flags.drained = false;
    if (!s.flags.drained) s.flags.prism = s.flags.generator = s.flags.shutters = false;
    if (!s.flags.prism) s.flags.projector = false;
    // Older saves already past the projection keep their solved light path.
    if (!Object.hasOwn(data.flags, 'beamAligned') && s.flags.projector && (data.journal.includes('projection') || s.flags.shutters || s.flags.finished)) s.flags.beamAligned = true;
    if (!s.flags.projector) s.flags.beamAligned = false;
    const finalReady=s.flags.projector&&s.flags.beamAligned&&s.flags.generator&&s.flags.shutters;
    if(!finalReady)s.flags.beaconLit=s.flags.finished=false;
    // Before beaconLit existed, finished meant the rescue was already complete.
    if(s.flags.finished)s.flags.beaconLit=true;
    s.room = Math.max(0, Math.min(lastUnlocked(s), Number.isInteger(data.room) ? data.room : 0));
    if (data.player && Number.isFinite(data.player.x) && Number.isFinite(data.player.y)) {
      s.player = { x: Math.max(46, Math.min(434, data.player.x)), y: Math.max(48, Math.min(278, data.player.y)) };
    }
    s.journal = [...new Set(['letter', ...data.journal.filter(k => Object.hasOwn(NOTES, k))])];
    if(s.flags.beaconLit&&!s.journal.includes('reunion'))s.journal.push('reunion');
    s.pinnedNote=typeof data.pinnedNote==='string'&&s.journal.includes(data.pinnedNote)?data.pinnedNote:null;
    s.muted = data.muted !== false;
    s.instruments=restoreInstruments(data.instruments);
    if (data.hints && typeof data.hints === 'object') for (const [k, v] of Object.entries(data.hints)) if (Number.isInteger(v) && v >= 0 && v <= 3) s.hints[k] = v;
    return s;
  } catch { return freshState(); }
}
export function canTravel(s, direction) {
  const next = s.room + direction;
  return Math.abs(direction) === 1 && next >= 0 && next <= lastUnlocked(s);
}
export function travel(s, direction) {
  if (!canTravel(s, direction)) return s;
  return { ...s, room: s.room + direction, player: { x: 240, y: direction > 0 ? 67 : 257 } };
}
export function applyAction(original, action) {
  const s = structuredClone(original);
  const finish = (ok, message) => ({ state: s, ok, message });
  const note = id => { if (!s.journal.includes(id)) s.journal.push(id); };
  if(action.type==='pin_note'){
    if(action.id!==null&&(typeof action.id!=='string'||!s.journal.includes(action.id)))return finish(false,'Discover this page before pinning it.');
    s.pinnedNote=action.id;return finish(true,action.id?'Clue pinned.':'Clue unpinned.');
  }
  if(action.type==='enter_room'){
    if(s.room===2&&lastUnlocked(s)>=2&&!s.flags.finished&&!s.flags.beaconLit&&!s.journal.includes('knock')){
      note('knock');return {...finish(true,'Three measured taps travel up the pipes. A pause. Then three more. Kept in your field journal.'),discovery:'knock'};
    }
    return finish(false,'');
  }
  if (action.type === 'align_beam') {
    if (!s.flags.projector || (s.room !== 0 && s.room !== 1)) return finish(false, 'The prism must be installed in the Dome before you can aim its light.');
    if (!lightAligned(action.aim, action.scroll, action.view)) return finish(false, 'Keep the upstairs mirror and downstairs receiver in view, and aim the beam into the receiver.');
    s.flags.beamAligned = true; note('light');
    return finish(true, 'The brass catch clicks. Light fills the Archive receiver, revealing silver writing on the wall below.');
  }
  const rooms = { inspect_mural: 0, inspect_satchel:0, escape:0, solve_entry: 0, restore_projector: 0, take_key: 1, inspect_reflection: 1, inspect_mentor: 1, inspect_wall: 1, unlock_pump: 1, inspect_plaque: 2, solve_pump: 2, route_generator: 2, collect_prism: 3, inspect_diagram:3, solve_shutters: 3, meet_mentor: 4, finish: 4 };
  if (!(action.type in rooms) || s.room !== rooms[action.type]) return finish(false, 'You need to be beside the mechanism to use it.');
  switch (action.type) {
    case 'inspect_mural': note('mural'); return finish(true, NOTES.mural.text);
    case 'inspect_satchel': note('trail'); return finish(true, NOTES.trail.text);
    case 'inspect_diagram': note('diagram'); return finish(true, NOTES.diagram.text);
    case 'inspect_reflection': note('reflection'); return finish(true, NOTES.reflection.text);
    case 'inspect_mentor': note('mentor'); return finish(true, NOTES.mentor.text);
    case 'inspect_plaque': note('plaque'); return finish(true, NOTES.plaque.text);
    case 'inspect_wall':
      if (!s.flags.projector) return finish(false, 'A blank plaster wall. Silver flecks glimmer beneath a dark light shaft. Something is missing above.');
      if (!s.flags.beamAligned) return finish(false, 'The silver receiver is dark. Light spills from above, but the Dome’s shaft mirror is pointing past it.');
      note('projection'); return finish(true, NOTES.projection.text);
    case 'solve_entry':
      if (action.code?.join(',') !== 'crescent,star,sun') return finish(false, 'The brass teeth turn, then settle back. The procession is not right.');
      s.flags.archive = true; return finish(true, 'Stone slides against stone. The Archive is open. Scroll down to descend.');
    case 'take_key': s.flags.key = true; return finish(true, 'You pocket the brass maintenance key. Its bow is shaped like a waterwheel.');
    case 'unlock_pump':
      if (!s.flags.key) return finish(false, 'A brass maintenance lock. The key must be somewhere in this archive.');
      s.flags.pump = true; return finish(true, 'The maintenance key turns. You hear water below. The Pump Room is open.');
    case 'solve_pump':
      if (action.code?.join(',') !== 'sun,star,crescent') return finish(false, 'The regulator shudders. These instruments read the sky differently.');
      s.flags.drained = true; return finish(true, 'The water recedes. The sluice latches open, revealing stairs to the Lens Chamber.');
    case 'route_generator':
      if (!s.flags.drained) return finish(false, 'Drain the lower chamber before routing water to the turbine.');
      if(s.flags.beaconLit)return finish(false,'The routing lever is latched to the turbine. Keep the beacon burning while you and Elian return to the surface.');
      s.flags.generator = !s.flags.generator; return finish(true, s.flags.generator ? 'Water turns the turbine. Power flows to the buried beacon. The drain remains latched.' : 'Water returns to the bypass. The beacon turbine slows; the drain remains latched.');
    case 'collect_prism': s.flags.prism = true; note('prism'); return finish(true, 'The projection prism is yours. Its brass foot looks familiar.');
    case 'restore_projector':
      if (!s.flags.prism) return finish(false, 'An empty triangular socket. The projector is missing its prism.');
      s.flags.projector = true; note('light'); return finish(true, 'The prism catches the moonlight. Adjust the shaft mirror beside the southern stairs, then scroll until you can see its receiver in the Archive below.');
    case 'solve_shutters':
      if (action.code?.join(',') !== '2,4,1,3') return finish(false, 'The shutters close again. Their opening order must be written somewhere.');
      s.flags.shutters = true; return finish(true, s.flags.beamAligned && s.flags.generator ? 'The shutters align. Light and power meet at the seal. The final stairs open.' : 'The shutters align, but the seal still needs both the aligned light and turbine power.');
    case 'meet_mentor': note('reunion'); return finish(true, '“You found me.” Elian smiles in the lantern light. “They built this to bring people home. Will you help me send the signal?”');
    case 'finish':
      if (lastUnlocked(s) !== 4) return finish(false, 'The beacon needs light, water, and aligned shutters.');
      if(!s.journal.includes('reunion'))return finish(false,'Elian is beside the eastern wall. Speak with him before sending the signal.');
      s.flags.beaconLit=true;return finish(true,'A light answers above. Elian is coming with you. Return to the Broken Dome and leave through its upper exit.');
    case 'escape':
      if(!s.flags.beaconLit)return finish(false,'The upper gate is held by the observatory’s unlit signal catch. Find Elian and restore the beacon below.');
      s.flags.finished=true;return finish(true,'You and Elian made it home.');
  }
}
export function objective(s) {
  if (s.flags.finished) return 'Journey complete. You and Elian made it home.';
  if(s.flags.beaconLit)return 'Return to the Broken Dome with Elian. Leave through the upper exit.';
  if (!s.flags.archive) return 'Find a way through the first celestial seal.';
  if (!s.flags.pump) return 'Search the Archive for a route farther down.';
  if (!s.flags.drained) return 'Work out how the lower instruments read the sky.';
  if (!s.flags.prism) return 'Explore the newly drained Lens Chamber.';
  if (!s.flags.projector) return 'Find a home for the projection prism.';
  if (!s.flags.beamAligned) return 'Aim the Dome’s shaft mirror into the Archive receiver. View both floors together.';
  if (!s.journal.includes('projection')) return 'Follow the restored beam. What has changed?';
  if (!s.flags.shutters) return 'Use the hidden instructions to align the shutters.';
  if (!s.flags.generator) return 'The final seal needs a steady source of power.';
  return s.journal.includes('reunion')?'Help Elian light the beacon.':'Find Elian beside the beacon and speak with him.';
}
export function hint(s) {
  let key, steps;
  if(s.flags.finished){key='complete';steps=['You and Elian are safely outside.','You can revisit the observatory freely.','Begin a new descent from the menu to replay the journey.'];}
  else if(s.flags.beaconLit){key='ascent';steps=['The answering light has opened a way back. Elian will follow you.','Scroll upward through the restored rooms to the Broken Dome.','In the Broken Dome, click the open gate at the top center to leave together.'];}
  else if (!s.flags.archive) { key = 'entry'; steps = ['The first door remembers something carved in this room.', 'Read the mural at the upper-left wall. Its figures have an order.', 'Set the door dials to CRESCENT → STAR → SUN, then turn the seal.']; }
  else if (!s.flags.pump) { key = 'archive'; steps = ['Search the Archive’s desks and shelves.', 'The small brass key opens the southern maintenance lock. Read the memorandum before leaving.', 'Pick up the key from the right-hand desk, then use the lock at the southern stairs.']; }
  else if (!s.flags.drained) { key = 'drain'; steps = ['An earlier room explains how to read this instrument.', 'Combine the Dome’s procession with the Archive’s maintenance memorandum.', 'Reverse the mural order: SUN → STAR → CRESCENT. Turn the water regulator.']; }
  else if (!s.flags.prism) { key = 'prism'; steps = ['The drained chamber contains a portable part.', 'Examine the triangular lens housing in the Lens Chamber.', 'Collect the prism from the central lens housing.']; }
  else if (!s.flags.projector) { key = 'projector'; steps = ['You have seen an empty socket that matches this object.', 'Return to the Broken Dome, above the Archive.', 'Use the projector on the right side of the Dome to install the prism.']; }
  else if (!s.flags.beamAligned) { key = 'light'; steps = ['The mirror and its receiver are on different floors. You need to see them together.', 'Use the shaft mirror beside the Dome’s southern stairs. Scroll partway down until its beam and the Archive’s silver receiver are visible.', 'Aim the beam into the silver receiver below, using the mirror handle or the left/right controls. Lock the beam while both ends are in view.']; }
  else if (!s.journal.includes('projection')) { key = 'projection'; steps = ['The aligned light has changed an earlier room.', 'Follow the beam down into the Archive.', 'Inspect the formerly blank wall on the right of the Archive.']; }
  else if (!s.flags.shutters) { key = 'shutters'; steps = ['The hidden writing describes a sequence, not a final arrangement.', 'Return to the four numbered shutters in the Lens Chamber.', 'Press shutters 2, then 4, then 1, then 3.']; }
  else if (!s.flags.generator) { key = 'generator'; steps = ['The seal is aligned, but its power indicator is dark.', 'The Pump Room can send water to a different destination without flooding the chamber.', 'Use the routing lever on the right of the Pump Room to power the generator.']; }
  else { key = 'beacon'; steps = ['The deepest passage is now open.', 'Scroll down beyond the Lens Chamber to reach the Buried Beacon.', 'Find Elian in the Buried Beacon, then activate the central beacon.']; }
  return { key, steps };
}
