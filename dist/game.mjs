import { SAVE_KEY, SYMBOLS, NOTES, freshState, restoreState, lastUnlocked, applyAction, objective, hint } from './state.mjs';
import { W, H, ROOMS, isWalkable, safePosition, nearbyObject } from './rooms.mjs';
import { makeScene, drawFrame, drawLightPath } from './art.mjs';
import { viewport, clampScroll, roomAtScroll, screenToWorld, worldToScreen, wheelDistance } from './camera.mjs';
import { LIGHT_PATH, clampLightAim, lightHandle, lightInView, lightAligned } from './light.mjs';
import { routeTo, clearPath, prepareNavigation } from './navigation.mjs';
import { instrumentPart } from './instruments.mjs';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const pixels = document.createElement('canvas'); pixels.width = W; pixels.height = H;
const pc = pixels.getContext('2d'); pc.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
const dialog = $('dialog'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const icons = { crescent: '☾', star: '✦', sun: '☀' };
const roman = ['I', 'II', 'III', 'IV', 'V'];
let storageAvailable = true, saved = null;
try { saved = localStorage.getItem(SAVE_KEY); } catch { storageAvailable = false; }
let state = restoreState(saved), running = false, target = null, pointer = null, busy = false, images = {}, lastTime = 0, moved = false, saveTime = 0, toastTimer, audio;
let view = viewport(innerWidth, innerHeight), cameraY = state.room * H, scrollingUntil = 0, boundaryNotice = 0;
let canvasDpr=0;
const scenes = new Map(), roomPositions = new Map();
let adjustingLight = false, lightAim = LIGHT_PATH.initialAim, lightDrag = null;
let route=[],routeGoal=null,routeRoom=-1,nextRouteAt=0,pendingInteraction=null;
const heldDirections=new Set();
// Prepare one room per idle task while the title screen is available.
let nextNavigationRoom=0;
function warmNavigation(){if(nextNavigationRoom>=ROOMS.length)return;prepareNavigation(nextNavigationRoom++);if(window.requestIdleCallback)window.requestIdleCallback(warmNavigation);else setTimeout(warmNavigation,40);}
if(window.requestIdleCallback)window.requestIdleCallback(warmNavigation);else setTimeout(warmNavigation,40);
let activeInstrument=null,instrumentDrag=null,suppressCanvasClick=false;
let visual={water:state.flags.drained?0:1,power:state.flags.generator?1:0,shutters:[0,0,0,0],crank:0,wheel:0,pulse:null};
state.player = safePosition(state.room, state.player);
let hasSave = !!saved && state.version === 1;
if (hasSave) { $('continueButton').hidden = false; $('beginButton').textContent = 'Begin a new descent ↓'; }

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); storageAvailable = true; }
  catch { storageAvailable = false; }
  $('saveStatus').innerHTML = `<span class="live-dot"></span> ${storageAvailable ? 'PROGRESS SAVED LOCALLY' : 'SAVING UNAVAILABLE · KEEP THIS TAB OPEN'}`;
}
function updateUI() {
  const room = ROOMS[state.room], last = lastUnlocked(state);
  $('roomName').textContent = room.name;
  $('roomNumber').textContent = `CHAMBER ${roman[state.room]} / V`;
  $('depthValue').textContent = room.depth;
  $('roomSubtitle').textContent = room.subtitle;
  $('objectiveText').textContent = objective(state);
  $('hudObjective').textContent = objective(state);
  $('roomProgress').textContent = `${String(last + 1).padStart(2, '0')} / 05`;
  $('journalCount').textContent = String(state.journal.length).padStart(2, '0');
  $('roomList').innerHTML = ROOMS.map((r,i) => `<li class="${i<=last?'unlocked':''} ${i===state.room?'current':''}" ${i===state.room?'aria-current="location"':''}><span>${i<=last?r.name:'Undiscovered chamber'}</span><small>${i<=last?r.depth+'m':'—'}</small></li>`).join('');
  const items = [];
  if (state.flags.key) items.push('<span class="inventory-item"><svg class="icon"><use href="#i-key"/></svg> Maintenance key</span>');
  if (state.flags.prism && !state.flags.projector) items.push('<span class="inventory-item"><svg class="icon"><use href="#i-prism"/></svg> Projection prism</span>');
  $('inventoryItems').innerHTML = items.length ? items.join('') : '<span class="empty-inventory">A lantern. A little courage.</span>';
  $('soundButton').setAttribute('aria-label', state.muted ? 'Unmute ambient sound' : 'Mute ambient sound');
  $('soundButton').setAttribute('aria-pressed', String(!state.muted));
  $('soundButton').innerHTML = `<svg class="icon"><use href="#i-${state.muted?'mute':'sound'}"/></svg>`;
}
function rebuildScene() { scenes.clear(); }
function roomScene(room) {
  if (!scenes.has(room)) scenes.set(room, makeScene(room, images[['dome','archive','pump','lens','beacon'][room]]));
  return scenes.get(room);
}
function resize() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (!r.width || !r.height) return;
  if(canvasDpr===dpr&&canvas.width===Math.round(r.width*dpr)&&canvas.height===Math.round(r.height*dpr)&&view.width===r.width&&view.height===r.height)return;
  view = viewport(r.width, r.height);
  canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  canvasDpr=dpr;
  target = null; pointer = null;instrumentDrag=null;lightDrag=null;
}
function activateRoom(room) {
  if (room === state.room || room < 0 || room > lastUnlocked(state)) return;
  roomPositions.set(state.room, { ...state.player });
  state.room = room;
  state.player = safePosition(room, roomPositions.get(room) || { x: 240, y: 67 });
  target = null; pointer = null; updateUI(); save();
}
function scrollDungeon(distance) {
  if (!running || dialog.open || busy) return;
  if(activeInstrument)leaveInstrument();
  const next = clampScroll(cameraY + distance, lastUnlocked(state));
  if (Math.abs(next - cameraY) < .01) {
    if (distance > 0 && performance.now() - boundaryNotice > 2200) {
      toast(lastUnlocked(state) === 4 ? 'This is the deepest chamber.' : 'The next chamber is sealed. Solve its mechanism to go deeper.', 2200);
      boundaryNotice = performance.now();
    }
    return;
  }
  cameraY = next; scrollingUntil = performance.now() + 140;
  target = null; pointer = null; $('hoverLabel').hidden = true;
  activateRoom(roomAtScroll(cameraY, lastUnlocked(state)));
  updateLightControls();
}
function lightViewport() {
  const r=$('lightControls').getBoundingClientRect();
  return {...view,obstruction:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
}
function updateLightControls() {
  if (!adjustingLight) return;
  const lightView=lightViewport(),visible=lightInView(cameraY,lightView),aligned=lightAligned(lightAim,cameraY,lightView);
  const text=!visible?'Scroll between the Dome and Archive until both ends are in view.':aligned?'The receiver is lit. Lock the beam to hold this alignment.':'Both floors are in view. Turn the mirror until the beam enters the silver ring.';
  if($('lightStatus').textContent!==text)$('lightStatus').textContent=text;
  $('lockLight').disabled=!visible;
}
function leaveLight() {
  adjustingLight=false;lightDrag=null;target=null;pointer=null;
  $('lightControls').hidden=true;$('app').classList.remove('aiming-light');
}
function beginLight() {
  leaveInstrument();heldDirections.clear();
  if(!state.flags.projector)return description('The shaft mirror','An unlit mirror points down through a narrow slit in the stone. Restore the Dome projector first.');
  if(state.flags.beamAligned)return description('The latched mirror','The brass catch holds the beam on the Archive receiver. The hidden writing is waiting below.');
  adjustingLight=true;target=null;pointer=null;
  $('hoverLabel').hidden=true;$('lightControls').hidden=false;$('app').classList.add('aiming-light');
  updateLightControls();canvas.focus({preventScroll:true});
}
function turnLight(amount) {
  lightAim=clampLightAim(Math.round((lightAim+amount)*1000)/1000);updateLightControls();
}
function lockLight() {
  if(!adjustingLight||dialog.open)return;
  const result=commit({type:'align_beam',aim:lightAim,scroll:cameraY,view:lightViewport()});
  if(result.ok){leaveLight();canvas.focus({preventScroll:true});}
  toast(result.message,6500);
}
function dragLight(p) {
  if(p.y>LIGHT_PATH.source.y+8)lightAim=clampLightAim((p.x-LIGHT_PATH.source.x)/(p.y-LIGHT_PATH.source.y));
  updateLightControls();
}
function toast(text, duration = 3800) {
  clearTimeout(toastTimer); $('toast').textContent = text; $('toast').hidden = false;
  toastTimer = setTimeout(() => $('toast').hidden = true, duration);
}
function commit(action) {
  const before=state.flags,result=applyAction(state,action);state=result.state;updateUI();save();
  if(result.ok){
    const changed=Object.keys(state.flags).find(key=>before[key]!==state.flags[key]);
    if(changed){const object=ROOMS[state.room].objects.find(o=>o.action===action.type||o.puzzle===action.type.replace('solve_',''));
      visual.pulse={room:state.room,x:object?.x??240,y:object?.y??160,started:performance.now()/1000};soundCue(changed);
    }else chime(1);
  }
  return result;
}
function shell(eyebrow, title, body, footer = '') {
  heldDirections.clear();pendingInteraction=null;
  target = null; moved = false; pointer = null; $('hoverLabel').hidden = true;
  $('dialogContent').innerHTML = `<div class="dialog-inner"><div class="dialog-top"><p class="eyebrow">${eyebrow}</p><button class="close-button" data-close aria-label="Close dialog">×</button></div><h2 id="dialogTitle">${title}</h2>${body}${footer ? `<div class="dialog-bottom">${footer}</div>` : ''}</div>`;
  for (const button of dialog.querySelectorAll('[data-close]')) button.addEventListener('click', () => dialog.close());
  if (!dialog.open) dialog.showModal();
}
function notePanel(id, journalBack = false) {
  const n = NOTES[id];
  shell(n.room.toUpperCase(), n.title, `<p class="dialog-note">${n.text}</p>`, `<span class="journal-tag">✓ KEPT IN YOUR FIELD JOURNAL</span><button class="secondary" id="noteDone">${journalBack?'Back to journal':'Keep exploring'} <span>↗</span></button>`);
  $('noteDone').onclick = journalBack ? openJournal : () => dialog.close();
}
function description(title, text) {
  shell(ROOMS[state.room].name.toUpperCase(), title, `<p class="dialog-copy">${text}</p>`, '<span class="journal-tag">LOOK CLOSER. GO DEEPER.</span><button class="secondary" data-close>Keep exploring <span>↗</span></button>');
}
function openJournal() {
  shell('YOUR FIELD JOURNAL', 'Things worth remembering', `<p class="dialog-copy">Clues travel with you. Sometimes an old discovery makes sense only after a new one.</p><div class="journal-list">${state.journal.map((id,i)=>`<button class="journal-entry" data-note="${id}"><span><small>${String(i+1).padStart(2,'0')}</small>${NOTES[id].title}</span><span>↗</span></button>`).join('')}</div>`, '<span class="journal-tag">J TO OPEN · ESC TO CLOSE</span>');
  for (const b of dialog.querySelectorAll('[data-note]')) b.onclick = () => notePanel(b.dataset.note, true);
}
function openExpedition() {
  shell('YOUR EXPEDITION', 'A thread through the dark', `<p class="dialog-note">${objective(state)}</p><div class="expedition-details"><section><p class="section-label">THE DESCENT</p><ol class="room-list">${$('roomList').innerHTML}</ol></section><section><p class="section-label">IN YOUR SATCHEL</p><div class="inventory-items">${$('inventoryItems').innerHTML}</div></section></div>`, '<span class="journal-tag">SCROLL DOWN TO DESCEND · UP TO RETURN</span><button class="secondary" data-close>Keep exploring <span>↗</span></button>');
}
function openHint() {
  if (state.flags.finished) return description('You found your way', 'The beacon is lit. You can keep exploring the observatory, or begin another descent from the menu.');
  const h = hint(state), level = state.hints[h.key] || 0;
  shell('A LITTLE DIRECTION', 'Every clue has a home', `<p class="dialog-copy">A hint starts small. Ask again only when you need a stronger nudge.</p>${level?`<p class="hint-step">HINT ${level} OF 3</p><p class="dialog-note" id="hintText">${h.steps[level-1]}</p>`:'<p class="dialog-note" id="hintText">Ready for a nudge?</p>'}`, `<span class="journal-tag">NO PENALTIES. TAKE YOUR TIME.</span><button class="primary" id="nextHint">${level===3?'Read again':level?'A stronger hint':'Show first hint'} <span>✧</span></button>`);
  $('nextHint').onclick = () => { state.hints[h.key] = Math.min(3, (state.hints[h.key] || 0) + 1); save(); openHint(); };
}
function openPuzzle(type) {
  if (type === 'entry' && state.flags.archive) return description('The celestial seal', 'The Archive is already open. Scroll down anywhere to descend.');
  if (type === 'pump' && state.flags.drained) return description('The latched regulator', 'The lower chamber is drained and the sluice has latched. The routing lever on the right can now supply the generator.');
  if (type === 'shutters' && state.flags.shutters) return description('The aligned shutters', `The four shutters stand open. ${state.flags.generator&&state.flags.beamAligned?'The final stairs are ready.':'The seal still needs aligned light from the Dome mirror and power from the Pump Room turbine.'}`);
  if (type === 'shutters'||type==='pump') return beginInstrument(type);
  const code = state.instruments.entry.map(n=>SYMBOLS[n]);
  const renderDial = (id) => `<span class="symbol" aria-hidden="true">${icons[id]}</span><small>${id.toUpperCase()}</small>`;
  shell(type === 'entry' ? 'THE FIRST CELESTIAL SEAL' : 'THE LOWER INSTRUMENT', type === 'entry' ? 'A procession in brass' : 'The sky, from beneath', `<p class="dialog-copy">${type==='entry'?'Three brass dials turn beneath a worn inscription: “As above, the first door remembers.”':'The regulator has three celestial dials. Its inscription reads: “The keeper below sees a different sky.”'}</p><div class="dial-row">${code.map((id,i)=>`${i?'<span class="dial-divider">·</span>':''}<button class="dial" data-dial="${i}" aria-label="Dial ${i+1}: ${id}. Click to change.">${renderDial(id)}</button>`).join('')}</div><p class="mechanism-result" id="mechanismResult" role="status">Click each dial to change its symbol.</p>`, `<button class="secondary" id="puzzleJournal">Consult journal</button><button class="primary" id="solvePuzzle">${type==='entry'?'Turn the seal':'Turn regulator'} <span>↗</span></button>`);
  for (const b of dialog.querySelectorAll('[data-dial]')) b.onclick = () => { const i=Number(b.dataset.dial);state.instruments.entry[i]=(state.instruments.entry[i]+1)%3;code[i]=SYMBOLS[state.instruments.entry[i]];save();b.innerHTML=renderDial(code[i]);b.setAttribute('aria-label',`Dial ${i+1}: ${code[i]}. Click to change.`);chime(1); };
  $('puzzleJournal').onclick = openJournal;
  $('solvePuzzle').onclick = () => {const r=commit({type:type==='entry'?'solve_entry':'solve_pump',code});if(r.ok){dialog.close();toast(r.message,6000);}else{$('mechanismResult').textContent=r.message;}};
}
function leaveInstrument(){activeInstrument=null;instrumentDrag=null;$('mechanismControls').hidden=true;$('app').classList.remove('operating-instrument');}
function beginInstrument(type){
  leaveLight();heldDirections.clear();target=null;pointer=null;
  activeInstrument={type,room:state.room};const pump=type==='pump',panel=$('mechanismControls');
  panel.innerHTML=`<div class="light-controls-heading"><span class="eyebrow">${pump?'THE LOWER INSTRUMENT':'THE SOUTHERN SEAL'}</span><button id="leaveInstrument" class="close-button" aria-label="Leave instrument">×</button></div><h2 id="mechanismTitle">${pump?'Turn the sky beneath.':'Four shutters. One order.'}</h2><p>${pump?'Drag the brass dials on the regulator, then turn the round crank below it. You can also use these controls.':'Lift the numbered tabs on the instrument. Watch each shutter open as you build the sequence.'}</p>${pump?'<div class="instrument-dials">'+[0,1,2].map(i=>`<button class="dial" data-dial="${i}"></button>`).join('')+'</div>':'<div class="instrument-tabs">'+[1,2,3,4].map(n=>`<button class="shutter" data-shutter="${n}" aria-label="Lift shutter ${n}">${n}</button>`).join('')+'</div><div id="sequenceReadout" class="sequence-readout"></div>'}<p id="mechanismResult" class="light-status" role="status">${pump?'Set the three dials, then turn the crank.':'Choose four shutters in sequence.'}</p><div class="instrument-actions"><button id="puzzleJournal" class="secondary">Journal</button>${pump?'':'<button id="resetSequence" class="secondary">Reset</button>'}<button id="${pump?'solvePuzzle':'solveShutters'}" class="primary">${pump?'Turn crank':'Align shutters'}</button></div><small>${pump?'1–3 TURN DIALS · ENTER CRANK':'1–4 LIFT SHUTTERS · ENTER ALIGN'} · ESC LEAVE</small>`;
  panel.hidden=false;$('app').classList.add('operating-instrument');$('hoverLabel').hidden=true;
  $('leaveInstrument').onclick=()=>{leaveInstrument();canvas.focus({preventScroll:true});};$('puzzleJournal').onclick=openJournal;
  for(const b of panel.querySelectorAll('[data-dial]'))b.onclick=()=>turnInstrumentDial(Number(b.dataset.dial),1);
  for(const b of panel.querySelectorAll('[data-shutter]'))b.onclick=()=>liftShutter(Number(b.dataset.shutter));
  if(!pump)$('resetSequence').onclick=()=>{state.instruments.shutters=[];save();updateInstrumentControls();$('mechanismResult').textContent='Choose four shutters in sequence.';};
  $(pump?'solvePuzzle':'solveShutters').onclick=attemptInstrument;updateInstrumentControls();canvas.focus({preventScroll:true});
}
function updateInstrumentControls(){
  if(!activeInstrument)return;
  const panel=$('mechanismControls');
  if(activeInstrument.type==='pump')for(const b of panel.querySelectorAll('[data-dial]')){const i=Number(b.dataset.dial),value=SYMBOLS[state.instruments.pump[i]];b.innerHTML=`<span class="symbol" aria-hidden="true">${icons[value]}</span><small>${value}</small>`;b.setAttribute('aria-label',`Dial ${i+1}: ${value}. Turn clockwise.`);}
  else {const code=state.instruments.shutters;$('sequenceReadout').textContent=[...code,...Array(4-code.length).fill('—')].join(' ');$('solveShutters').disabled=code.length!==4;for(const b of panel.querySelectorAll('[data-shutter]'))b.disabled=code.length===4;}
}
function turnInstrumentDial(index,direction){state.instruments.pump[index]=(state.instruments.pump[index]+direction+3)%3;save();updateInstrumentControls();chime(1);}
function liftShutter(number){if(state.instruments.shutters.length>=4)return;state.instruments.shutters.push(number);save();updateInstrumentControls();chime(1);}
function attemptInstrument(){
  if(!activeInstrument||dialog.open)return;
  const pump=activeInstrument.type==='pump',code=pump?state.instruments.pump.map(n=>SYMBOLS[n]):state.instruments.shutters.map(String);
  const result=commit({type:pump?'solve_pump':'solve_shutters',code});
  if(result.ok){leaveInstrument();canvas.focus({preventScroll:true});toast(result.message,6000);}else{$('mechanismResult').textContent=result.message;soundCue('wrong');}
}
function beginInstrumentDrag(e,p){
  const part=instrumentPart(activeInstrument.type,p);if(!part)return;
  instrumentDrag={...part,moved:false,total:0,angle:part.center?Math.atan2(p.y-part.center.y,p.x-part.center.x):0};
  canvas.setPointerCapture(e.pointerId);e.preventDefault();
}
function moveInstrumentDrag(p){
  const drag=instrumentDrag;if(!drag?.center)return;
  const angle=Math.atan2(p.y-drag.center.y,p.x-drag.center.x),delta=Math.atan2(Math.sin(angle-drag.angle),Math.cos(angle-drag.angle));drag.angle=angle;
  if(Math.abs(delta)>.04)drag.moved=true;drag.total+=delta;
  if(drag.kind==='dial'&&Math.abs(drag.total)>.65){turnInstrumentDial(drag.index,Math.sign(drag.total));drag.total=0;}
  if(drag.kind==='crank'){visual.crank+=delta;if(drag.total>Math.PI/2){instrumentDrag=null;attemptInstrument();}}
}
function finishInstrumentDrag(){
  const drag=instrumentDrag;instrumentDrag=null;if(!drag||!activeInstrument||dialog.open)return;
  if(drag.kind==='shutter')liftShutter(drag.number);
  else if(!drag.moved){if(drag.kind==='dial')turnInstrumentDial(drag.index,1);else attemptInstrument();}
}
function interact(o) {
  if (!o || busy || dialog.open) return;
  target = null;
  if(o.id==='shaftMirror')return beginLight();
  if (o.puzzle) return openPuzzle(o.puzzle);
  if (o.text) return description(o.label, o.text);
  if (o.action === 'finish') {
    shell('THE BURIED BEACON', 'Send a light home', '<p class="dialog-copy">The restored lens hums softly. Water turns the turbine somewhere above. With a single turn of the brass wheel, you can send your signal through the mountain.</p>', '<button class="secondary" data-close>Look around first</button><button class="primary" id="lightBeacon">Light the beacon <span>✧</span></button>');
    $('lightBeacon').onclick = () => { const r=commit({type:'finish'});if(r.ok)ending();else toast(r.message); };return;
  }
  if(o.action==='collect_prism'&&state.flags.prism)return description('An empty lens housing',state.flags.projector?'The prism is back in the Dome, carrying light into the Archive.':'You have the prism in your satchel. The empty projector upstairs is waiting for it.');
  if(o.action==='take_key'&&state.flags.key)return description('The maintenance desk','The maintenance key is safely in your satchel.');
  if(o.action==='restore_projector'&&state.flags.projector)return description('A restored projector',state.flags.beamAligned?'The aligned beam lights the Archive wall below.':'Light reaches the shaft mirror beside the southern stairs. Adjust that mirror while viewing the Dome and Archive together.');
  const r=commit({type:o.action});
  const noteIds={inspect_mural:'mural',inspect_reflection:'reflection',inspect_mentor:'mentor',inspect_plaque:'plaque',inspect_wall:'projection',collect_prism:'prism'};
  if(r.ok&&(o.action==='collect_prism'||o.action==='take_key'||o.action==='unlock_pump')){toast(r.message,5000);return;}
  if(r.ok&&noteIds[o.action])return notePanel(noteIds[o.action]);
  if(o.action==='meet_mentor')return description('Elian',r.message);
  if(o.action==='route_generator'){toast(r.message,5000);return;}
  description(o.label,r.message);
}
function ending() {
  shell('THE END OF THE DESCENT', 'A light answers.', '<div class="ending-star" aria-hidden="true">✧</div><p class="dialog-copy">A column of warm light climbs through the mountain.<br>For a moment, the observatory is quiet.<br><br>Then, far above, a light answers.<br><br>Elian takes your hand. “Let’s go home.”</p>', '<button class="primary" id="endingDone">Stay a little longer <span>✧</span></button>');
  $('dialogContent').firstElementChild.classList.add('ending');$('endingDone').onclick=()=>dialog.close();
}
function instructions() {
  shell('YOUR FIRST DESCENT', 'Follow your little light', '<p class="dialog-copy">Move your mouse across the chamber. Your explorer follows and finds a way around obstacles.<br><br>Click an object to walk over and investigate it. Hold arrow keys or WASD for direct control. Scroll down to go deeper, and scroll up to revisit earlier rooms.<br><br>Keep your field journal close. A clue from an earlier room may be exactly what you need below. Hints are always optional.</p><p class="journal-tag">ENTER TO INTERACT · PAGE UP / DOWN TO TRAVEL<br>J JOURNAL · H HINT · F FULLSCREEN</p>', '<span class="journal-tag">NO CLOCK. NO PENALTIES.</span><button class="primary" data-close>Light the lantern <span>✧</span></button>');
}
function start(continueSave=false) {
  leaveLight();leaveInstrument();lightAim=LIGHT_PATH.initialAim;
  if (!continueSave) { state=freshState();hasSave=true; }
  state.player=safePosition(state.room,state.player);running=true;target=null;pointer=null;roomPositions.clear();cameraY=state.room*H;
  route=[];routeGoal=null;pendingInteraction=null;heldDirections.clear();
  visual={water:state.flags.drained?0:1,power:state.flags.generator?1:0,shutters:[0,0,0,0].map(()=>state.flags.shutters?1:0),crank:0,wheel:0,pulse:null};
  $('startScreen').hidden=true;$('app').hidden=false;rebuildScene();resize();updateUI();save();
  if (!state.muted) setAudio();
  if (!continueSave) instructions(); else if(state.flags.finished) toast('Welcome back. The beacon is still burning.');
}
function confirmNew() {
  shell('BEGIN AGAIN', 'Start a new descent?', '<p class="dialog-copy">This replaces your saved journey, including collected notes and solved mechanisms.</p>', '<button class="secondary" data-close>Keep my journey</button><button class="primary danger" id="confirmNew">Start again <span>↓</span></button>');
  $('confirmNew').onclick=()=>{dialog.close();start(false);};
}
function menu() {
  shell('PAUSE & TAKE A BREATH', 'A moment in the quiet', '<p class="dialog-copy">Your journey saves automatically in this browser.</p><div class="menu-actions"><button class="secondary" id="resume">Return to the chamber <span>↗</span></button><button class="secondary" id="howTo">How to explore <span>↗</span></button><button class="secondary" id="menuJournal">Field journal <span>↗</span></button><button class="secondary danger" id="newJourney">Begin a new descent <span>↓</span></button></div>', '<span class="journal-tag">FIVE CHAMBERS · ONE WAY HOME</span>');
  $('resume').onclick=()=>dialog.close();$('howTo').onclick=instructions;$('menuJournal').onclick=openJournal;$('newJourney').onclick=confirmNew;
}
function doTravel(direction) {
  if (!running||busy||dialog.open)return;
  scrollDungeon(direction * H);
}
function point(event){const r=canvas.getBoundingClientRect(),p=screenToWorld(event.clientX-r.left,event.clientY-r.top,view,cameraY),room=Math.floor(p.y/H);return{x:p.x,y:p.y-room*H,room};}
function followPointer(event){
  if(!running||dialog.open||busy||adjustingLight||activeInstrument)return;
  const p=point(event);
  if(p.room<0||p.room>lastUnlocked(state)||p.x<0||p.x>W){pointer=null;target=null;return;}
  activateRoom(p.room);pointer={x:p.x,y:p.y};
  if(!target||Math.hypot(target.x-p.x,target.y-p.y)>2){target={...pointer};pendingInteraction=null;}
}
function objectUnder(p){return ROOMS[state.room].objects.find(o=>Math.abs(p.x-o.x)<o.w/2+7&&Math.abs(p.y-o.y)<o.h/2+7);}
canvas.addEventListener('pointermove',e=>{
  if(activeInstrument){if(!dialog.open&&instrumentDrag){const p=point(e);if(p.room===activeInstrument.room)moveInstrumentDrag(p);}return;}
  if(adjustingLight){
    if(dialog.open||!lightDrag)return;
    if(lightDrag.kind==='mirror'){const p=point(e);dragLight({x:p.x,y:p.room*H+p.y});}
    else {scrollDungeon((lightDrag.y-e.clientY)/view.scale);lightDrag.y=e.clientY;}
    return;
  }
  followPointer(e);
});
canvas.addEventListener('pointerleave',()=>{target=null;pointer=null;$('hoverLabel').hidden=true;});
canvas.addEventListener('pointerdown',e=>{
  suppressCanvasClick=!!activeInstrument;
  if(!running||dialog.open||busy)return;
  canvas.focus({preventScroll:true});
  if(activeInstrument){const p=point(e);if(p.room===activeInstrument.room)beginInstrumentDrag(e,p);return;}
  if(adjustingLight){
    const p=point(e),world={x:p.x,y:p.room*H+p.y},handle=lightHandle(lightAim);
    if(Math.hypot(world.x-handle.x,world.y-handle.y)<=18||Math.hypot(world.x-LIGHT_PATH.source.x,world.y-LIGHT_PATH.source.y)<=18)lightDrag={kind:'mirror'};
    else if(e.pointerType==='touch')lightDrag={kind:'scroll',y:e.clientY};
    if(lightDrag){canvas.setPointerCapture(e.pointerId);e.preventDefault();}
    return;
  }
  followPointer(e);if(e.pointerType==='touch')e.preventDefault();
});
function endLightDrag(e){if(e.type==='pointerup')finishInstrumentDrag();else instrumentDrag=null;lightDrag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
canvas.addEventListener('pointerup',endLightDrag);
canvas.addEventListener('pointercancel',endLightDrag);
canvas.addEventListener('lostpointercapture',()=>{lightDrag=null;instrumentDrag=null;});
canvas.addEventListener('click',e=>{if(suppressCanvasClick){suppressCanvasClick=false;return;}if(!running||dialog.open||busy||adjustingLight||activeInstrument)return;const p=point(e);if(p.room!==state.room)return;const o=objectUnder(p);if(o){if(Math.hypot(o.x-state.player.x,o.y-state.player.y)<=42)interact(o);else{target={x:o.x,y:o.y};routeGoal=null;pendingInteraction={room:state.room,object:o};toast('Walking to '+o.label.toLowerCase()+'…',1600);}}});
document.addEventListener('wheel',e=>{if(!running||dialog.open||e.ctrlKey)return;e.preventDefault();scrollDungeon(wheelDistance(e.deltaY,e.deltaMode,view));},{passive:false});
document.addEventListener('keydown',e=>{
  if(!running||dialog.open)return;
  const k=e.key.toLowerCase();
  if(activeInstrument){
    if(k==='escape'){e.preventDefault();leaveInstrument();canvas.focus({preventScroll:true});return;}
    if(k==='enter'&&e.target.closest('button'))return;
    if(/^[1-4]$/.test(k)){e.preventDefault();const n=Number(k);if(activeInstrument.type==='pump'){if(n<=3)turnInstrumentDial(n-1,1);}else liftShutter(n);return;}
    if(k==='enter'||k==='e'){e.preventDefault();attemptInstrument();return;}
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){e.preventDefault();return;}
  }
  if(adjustingLight){
    if(k==='escape'){e.preventDefault();leaveLight();canvas.focus({preventScroll:true});return;}
    // Native buttons retain their Enter/Space behavior when tabbed to.
    if(k==='enter'&&e.target.closest('button'))return;
    if(k==='arrowleft'||k==='arrowright'){e.preventDefault();turnLight(k==='arrowleft'?-.05:.05);return;}
    if(k==='arrowup'||k==='arrowdown'||k==='pageup'||k==='pagedown'){e.preventDefault();scrollDungeon(k==='arrowup'||k==='pageup'?-32:32);return;}
    if(k==='enter'||k==='e'){e.preventDefault();lockLight();return;}
    if(['w','a','s','d'].includes(k))return;
  }
  if(k==='j'){e.preventDefault();openJournal();return;}if(k==='h'){e.preventDefault();openHint();return;}if(k==='escape'){menu();return;}
  if(k==='f'){e.preventDefault();toggleFullscreen();return;}
  if(k==='pagedown'||k==='pageup'){e.preventDefault();doTravel(k==='pagedown'?1:-1);return;}
  if(k==='enter'||k==='e'){e.preventDefault();interact(nearbyObject(state.room,state.player));return;}
  const directions={arrowup:[0,-20],w:[0,-20],arrowdown:[0,20],s:[0,20],arrowleft:[-20,0],a:[-20,0],arrowright:[20,0],d:[20,0]};
  if(directions[k]){e.preventDefault();heldDirections.add(k);target=null;pointer=null;pendingInteraction=null;}
});
document.addEventListener('keyup',e=>heldDirections.delete(e.key.toLowerCase()));
dialog.addEventListener('close',()=>{target=null;pointer=null;if(running)canvas.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
$('beginButton').onclick=()=>hasSave?confirmNew():start(false);
$('continueButton').onclick=()=>start(true);
$('journalButton').onclick=openJournal;$('hintButton').onclick=openHint;$('menuButton').onclick=menu;$('titleLink').onclick=e=>{e.preventDefault();menu();};
$('expeditionButton').onclick=openExpedition;
$('leaveLight').onclick=()=>{leaveLight();canvas.focus({preventScroll:true});};
$('lightViewUp').onclick=()=>scrollDungeon(-32);$('lightViewDown').onclick=()=>scrollDungeon(32);
$('lightLeft').onclick=()=>turnLight(-.05);$('lightRight').onclick=()=>turnLight(.05);
$('lockLight').onclick=lockLight;
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Fullscreen is unavailable here. F11 also fills the screen.');}}
$('fullscreenButton').onclick=toggleFullscreen;
document.addEventListener('fullscreenchange',()=>{const on=!!document.fullscreenElement;$('fullscreenButton').setAttribute('aria-pressed',String(on));$('fullscreenButton').setAttribute('aria-label',on?'Exit fullscreen':'Enter fullscreen');resize();});
window.addEventListener('resize',resize);
new ResizeObserver(resize).observe(canvas);
$('soundButton').onclick=()=>{state.muted=!state.muted;setAudio();updateUI();save();};
window.addEventListener('blur',()=>{target=null;pointer=null;lightDrag=null;instrumentDrag=null;heldDirections.clear();save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){target=null;pointer=null;heldDirections.clear();save();audio?.context.suspend();}else if(!state.muted&&running)audio?.context.resume();});
window.addEventListener('pagehide',save);

function setAudio(){
  if(!audio){
    try{const context=new(window.AudioContext||window.webkitAudioContext)(),master=context.createGain();master.gain.value=0;master.connect(context.destination);for(const [frequency,volume]of [[110,.025],[164.81,.012],[220,.007]]){const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=frequency;gain.gain.value=volume;osc.connect(gain).connect(master);osc.start();}audio={context,master};}catch{return;}
  }
  audio.context.resume();audio.master.gain.setTargetAtTime(state.muted?0:1,audio.context.currentTime,.15);
}
function chime(quiet=0){if(state.muted||!audio)return;const {context,master}=audio;const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=quiet?440:659.25;gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(quiet?.025:.05,context.currentTime+.01);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.35);osc.connect(gain).connect(master);osc.start();osc.stop(context.currentTime+.4);}
function soundCue(kind){
  if(state.muted||!audio)return;
  const notes=kind==='wrong'?[145,130]:kind==='key'||kind==='prism'?[523.25,783.99,1046.5]:kind==='drained'||kind==='generator'?[110,164.81,220]:[329.63,493.88,659.25];
  const {context,master}=audio;
  notes.forEach((frequency,i)=>{const start=context.currentTime+i*.08,osc=context.createOscillator(),gain=context.createGain();osc.type=kind==='drained'?'triangle':'sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.5);osc.connect(gain).connect(master);osc.start(start);osc.stop(start+.55);});
}
function tick(time){
  const dt=Math.min((time-lastTime)/1000,.04)||0;lastTime=time;moved=false;
  if(!target){route=[];routeGoal=null;pendingInteraction=null;}
  if(running&&!dialog.open&&!busy&&!adjustingLight&&!activeInstrument){
    const p=state.player;
    const dx=Number(heldDirections.has('arrowright')||heldDirections.has('d'))-Number(heldDirections.has('arrowleft')||heldDirections.has('a'));
    const dy=Number(heldDirections.has('arrowdown')||heldDirections.has('s'))-Number(heldDirections.has('arrowup')||heldDirections.has('w'));
    if(dx||dy){
      const length=Math.hypot(dx,dy),vx=dx/length*94*dt,vy=dy/length*94*dt;
      if(clearPath(state.room,p,{x:p.x+vx,y:p.y})){p.x+=vx;moved=true;}
      if(clearPath(state.room,p,{x:p.x,y:p.y+vy})){p.y+=vy;moved=true;}
    }else if(target){
      if(!routeGoal||routeRoom!==state.room||(Math.hypot(target.x-routeGoal.x,target.y-routeGoal.y)>5&&time>=nextRouteAt)){
        route=routeTo(state.room,p,target);routeGoal={...target};routeRoom=state.room;nextRouteAt=time+100;
      }
      while(route.length&&Math.hypot(route[0].x-p.x,route[0].y-p.y)<.5)route.shift();
      if(route.length){const next=route[0],distance=Math.hypot(next.x-p.x,next.y-p.y),step=Math.min(distance,94*dt),destination={x:p.x+(next.x-p.x)/distance*step,y:p.y+(next.y-p.y)/distance*step};
        if(clearPath(state.room,p,destination)){p.x=destination.x;p.y=destination.y;moved=true;}else{routeGoal=null;}
      }
      if(pendingInteraction&&pendingInteraction.room===state.room&&Math.hypot(p.x-pendingInteraction.object.x,p.y-pendingInteraction.object.y)<=39){const object=pendingInteraction.object;pendingInteraction=null;target=null;interact(object);}
    }
  }
  if(running){
    const approach=(current,goal,speed)=>reduced?goal:current+Math.max(-speed*dt,Math.min(speed*dt,goal-current));
    visual.water=approach(visual.water,state.flags.drained?0:1,.75);visual.power=approach(visual.power,state.flags.generator?1:0,1.5);
    visual.wheel+=reduced?0:dt*visual.power*2.5;
    visual.shutters=visual.shutters.map((v,i)=>approach(v,state.flags.shutters||state.instruments.shutters.includes(i+1)?1:0,4));
    ctx.fillStyle='#08151a';ctx.fillRect(0,0,view.width,view.height);
    // Draw the rock field beyond the chamber edges so every aspect ratio fills the window.
    for(let x=0;x<view.width;x+=48)for(let y=0;y<view.height;y+=40){ctx.fillStyle=(Math.sin(x*7+y*13)>.4)?'#102128':'#0a1920';ctx.fillRect(x+2,y+2,43,34);}
    const near=dialog.open?null:nearbyObject(state.room,state.player);
    for(let room=0;room<=lastUnlocked(state);room++){
      const p=worldToScreen(0,room*H,view,cameraY),height=H*view.scale;
      if(p.y+height<0||p.y>view.height)continue;
      const active=room===state.room,renderState=active?state:{...state,room};
      drawFrame(pc,roomScene(room),renderState,time/1000,active?near:null,active?pointer:null,active&&moved,images,reduced,active,visual);
      ctx.drawImage(pixels,p.x,p.y,W*view.scale,height);
    }
    drawLightPath(ctx,view,cameraY,state,lightAim,adjustingLight);
    if(adjustingLight)updateLightControls();
    if(!dialog.open&&!busy&&pointer&&time>scrollingUntil){const o=objectUnder(pointer);if(o){const p=worldToScreen(o.x,state.room*H+o.y-o.h/2-10,view,cameraY);$('hoverLabel').hidden=false;$('hoverLabel').innerHTML=`${o.label}<small>${Math.hypot(o.x-state.player.x,o.y-state.player.y)<=42?'CLICK TO INVESTIGATE':'CLICK TO APPROACH'}</small>`;$('hoverLabel').style.left=`${Math.max(120,Math.min(view.width-120,p.x))}px`;$('hoverLabel').style.top=`${Math.max(45,p.y)}px`;}else $('hoverLabel').hidden=true;}else $('hoverLabel').hidden=true;
    $('travelPrompt').hidden=dialog.open;
    $('travelPrompt').textContent=cameraY<1?(lastUnlocked(state)>0?'SCROLL DOWN ↓ · THE DESCENT CONTINUES':'↓ SOLVE THE SEAL TO GO DEEPER'):cameraY>=lastUnlocked(state)*H-1?'↑ SCROLL UP TO REVISIT EARLIER ROOMS':'↑ RETURN · SCROLL TO EXPLORE · DESCEND ↓';
    $('scrollMarker').style.top=`${cameraY/(H*4)*100}%`;
    if(time-saveTime>1500&&moved){save();saveTime=time;}
  }
  requestAnimationFrame(tick);
}
for(const name of ['dome','archive','pump','lens','beacon','explorer']){const image=new Image();image.src=`./assets/${name}.webp`;image.onload=()=>{images[name]=image;if(running)rebuildScene();};}
// Read-only observability helps verify movement and progression without adding cheat controls.
Object.defineProperty(window,'observatory',{value:Object.freeze({get state(){return structuredClone(state);},get running(){return running;},get camera(){return{scrollY:cameraY,...view};},get light(){return{adjusting:adjustingLight,aim:lightAim};},get instrument(){return activeInstrument?.type??null;},get effects(){return{water:visual.water,power:visual.power,shutters:[...visual.shutters]};}})});
updateUI();requestAnimationFrame(tick);
