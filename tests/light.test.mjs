import test from 'node:test';
import assert from 'node:assert/strict';
import { LIGHT_PATH, lightEndpoint, lightInView, lightAligned } from '../dist/light.mjs';
import { viewport } from '../dist/camera.mjs';
import { freshState, applyAction, restoreState, hint, lastUnlocked } from '../dist/state.mjs';

const aim = (LIGHT_PATH.receiver.x - LIGHT_PATH.source.x) / (LIGHT_PATH.receiver.y - LIGHT_PATH.source.y);
const view = viewport(1440, 1000);
const ready = () => { const s = freshState(); Object.assign(s.flags, { archive:true, key:true, pump:true, drained:true, prism:true, projector:true }); return s; };

test('alignment requires a correct beam and a visible between-floor view', () => {
  assert.equal(lightEndpoint(aim).x, LIGHT_PATH.receiver.x);
  for (const [width, height] of [[1440,1000],[1280,800],[390,844],[640,320]]) {
    const v = viewport(width,height);
    assert.equal(lightInView(160,v), true);
    assert.equal(lightAligned(aim,160,v), true);
    assert.equal(lightAligned(aim,0,v), false);
    assert.equal(lightAligned(aim,320,v), false);
    assert.equal(lightAligned(LIGHT_PATH.initialAim,160,v), false);
  }
  assert.equal(lightAligned(NaN,160,view),false);
  assert.equal(lightAligned(aim,160,{...view,scale:0}),false);
  assert.equal(lightAligned(aim,160,null),false);
  assert.equal(lightAligned(aim,160,{...view,obstruction:{left:1000,right:1200,top:700,bottom:900}}),false,'A receiver behind the controls is not visible');
});

test('installing the prism does not reveal the wall until the cross-floor puzzle is solved', () => {
  let s = ready(); s.room = 1;
  assert.equal(hint(s).key,'light');
  assert.equal(applyAction(s,{type:'inspect_wall'}).ok,false);
  for (const extra of [{aim:LIGHT_PATH.initialAim,scroll:160,view},{aim,scroll:0,view}]) {
    const result = applyAction(s,{type:'align_beam',...extra});
    assert.equal(result.ok,false); assert.deepEqual(result.state,s);
  }
  s = applyAction(s,{type:'align_beam',aim,scroll:160,view}).state;
  assert.equal(s.flags.beamAligned,true);
  assert.ok(s.journal.includes('light'));
  assert.equal(applyAction(s,{type:'inspect_wall'}).ok,true);
  assert.deepEqual(restoreState(JSON.stringify(s)),s);
  assert.equal(applyAction(freshState(),{type:'align_beam',aim,scroll:160,view}).ok,false);
  s.room = 2; assert.equal(applyAction(s,{type:'align_beam',aim,scroll:160,view}).ok,false);
});

test('light remains required for the final seal, including guessed shutter answers', () => {
  const s = ready(); Object.assign(s.flags,{generator:true,shutters:true});
  assert.equal(lastUnlocked(s),3);
  s.flags.beamAligned=true; assert.equal(lastUnlocked(s),4);
});

test('old saves past the revealed writing migrate without losing progress', () => {
  const old = ready(); delete old.flags.beamAligned;
  assert.equal(restoreState(old).flags.beamAligned,false);
  old.journal.push('projection'); assert.equal(restoreState(old).flags.beamAligned,true);
  old.room=4; Object.assign(old.flags,{generator:true,shutters:true,finished:true});
  const restored=restoreState(old); assert.equal(restored.room,4); assert.equal(restored.flags.finished,true);
  old.flags.prism=false; assert.equal(restoreState(old).flags.beamAligned,false);
});
