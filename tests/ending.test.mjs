import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,applyAction,restoreState,lastUnlocked,objective,hint,travel} from '../dist/state.mjs';
import {createCompanion,advanceCompanion} from '../dist/companion.mjs';
import {isWalkable} from '../dist/rooms.mjs';
const ready=()=>{const s=freshState();Object.assign(s.flags,{archive:true,key:true,pump:true,drained:true,prism:true,projector:true,beamAligned:true,generator:true,shutters:true});s.room=4;return s;};
test('the rescue requires reunion, beacon activation, ascent, and the Dome exit',()=>{
  let s=ready();assert.equal(applyAction(s,{type:'finish'}).ok,false);
  s=applyAction(s,{type:'meet_mentor'}).state;s=applyAction(s,{type:'finish'}).state;
  assert.equal(s.flags.beaconLit,true);assert.equal(s.flags.finished,false);assert.equal(hint(s).key,'ascent');assert.match(objective(s),/Broken Dome/);
  assert.equal(applyAction(s,{type:'escape'}).ok,false);
  s=travel(s,-1);s=travel(s,-1);const unchanged=applyAction(s,{type:'route_generator'});assert.equal(unchanged.ok,false);assert.equal(unchanged.state.flags.generator,true);assert.equal(lastUnlocked(unchanged.state),4);
  s=travel(s,-1);s=travel(s,-1);s=applyAction(s,{type:'escape'}).state;assert.equal(s.flags.finished,true);assert.match(objective(s),/Journey complete/);
  assert.equal(applyAction(freshState(),{type:'escape'}).ok,false);
});
test('interrupted ascents reload as ascents, and old completions remain complete',()=>{
  let s=ready();s.journal.push('reunion');s=applyAction(s,{type:'finish'}).state;s=travel(s,-1);
  assert.deepEqual(restoreState(JSON.stringify(s)),s);
  const old=ready();delete old.flags.beaconLit;old.flags.finished=true;
  const migrated=restoreState(old);assert.equal(migrated.flags.beaconLit,true);assert.equal(migrated.flags.finished,true);assert.equal(migrated.room,4);
  const bad=ready();bad.flags.prism=false;bad.flags.beaconLit=true;bad.flags.finished=true;
  assert.equal(restoreState(bad).flags.beaconLit,false);assert.equal(restoreState(bad).flags.finished,false);
});
test('Elian spawns safely at each floor and follows around a fixture',()=>{
  for(let room=0;room<5;room++)for(const player of [{x:240,y:67},{x:240,y:257}]){const c=createCompanion(room,player);assert.ok(isWalkable(room,c.x,c.y));assert.ok(Math.hypot(c.x-player.x,c.y-player.y)<35);}
  const c=createCompanion(0,{x:200,y:116}),player={x:285,y:116};
  for(let i=0;i<600;i++){advanceCompanion(c,player,1/60,i/60);assert.ok(isWalkable(0,c.x,c.y));}
  assert.ok(Math.hypot(c.x-player.x,c.y-player.y)<=26);
});
