import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, restoreState, applyAction, canTravel, travel, lastUnlocked, hint } from '../dist/state.mjs';
import { isWalkable, safePosition, ROOMS } from '../dist/rooms.mjs';
import { viewport } from '../dist/camera.mjs';
const act=(s,type,extra={})=>{const r=applyAction(s,{type,...extra});assert.equal(r.ok,true,r.message);return r.state;};
test('the complete mystery requires a connected return journey',()=>{
  let s=freshState();assert.equal(canTravel(s,1),false);
  s=act(s,'inspect_mural');s=act(s,'solve_entry',{code:['crescent','star','sun']});s=travel(s,1);
  assert.equal(s.room,1);assert.equal(canTravel(s,1),false);
  s=act(s,'inspect_reflection');s=act(s,'take_key');s=act(s,'unlock_pump');s=travel(s,1);
  assert.equal(applyAction(s,{type:'solve_pump',code:['crescent','star','sun']}).ok,false);
  s=act(s,'solve_pump',{code:['sun','star','crescent']});s=travel(s,1);s=act(s,'collect_prism');
  assert.equal(canTravel(s,1),false);s=travel(travel(travel(s,-1),-1),-1);s=act(s,'restore_projector');
  s=act(s,'align_beam',{aim:.25,scroll:160,view:viewport(1440,1000)});
  s=travel(s,1);s=act(s,'inspect_wall');assert.ok(s.journal.includes('projection'));
  s=travel(s,1);s=act(s,'route_generator');s=travel(s,1);s=act(s,'solve_shutters',{code:['2','4','1','3']});
  assert.equal(lastUnlocked(s),4);s=travel(s,1);s=act(s,'meet_mentor');s=act(s,'finish');assert.equal(s.flags.finished,true);
  assert.deepEqual(restoreState(JSON.stringify(s)),s);
});
test('wrong answers and remote interactions cannot mutate progression',()=>{
  const s=freshState();assert.equal(applyAction(s,{type:'solve_entry',code:['sun','sun','sun']}).ok,false);assert.equal(s.flags.archive,false);
  assert.equal(applyAction(s,{type:'collect_prism'}).ok,false);assert.equal(lastUnlocked(s),0);assert.deepEqual(travel(s,1),s);
  assert.equal(canTravel(s,4),false);assert.deepEqual(travel(s,-1),s);
});
test('drain latches and the final seal follows reversible generator power',()=>{
  let s=freshState();Object.assign(s.flags,{archive:true,key:true,pump:true,drained:true,prism:true,projector:true,beamAligned:true,shutters:true});s.room=2;
  s=act(s,'route_generator');assert.equal(lastUnlocked(s),4);s=act(s,'route_generator');assert.equal(lastUnlocked(s),3);assert.equal(s.flags.drained,true);
  s=act(s,'route_generator');assert.equal(lastUnlocked(s),4);
});
test('bad saves recover safely and every room has a valid arrival',()=>{
  assert.deepEqual(restoreState('{bad json'),freshState());assert.deepEqual(restoreState({version:2}),freshState());
  const bad={...freshState(),room:999,player:{x:NaN,y:-100},flags:{finished:true,prism:true},journal:['letter','no-such-note']};
  const s=restoreState(bad);assert.equal(s.room,0);assert.equal(s.flags.finished,false);assert.equal(s.flags.prism,false);assert.deepEqual(s.journal,['letter']);
  for(let i=0;i<ROOMS.length;i++){assert.ok(isWalkable(i,240,67));assert.ok(isWalkable(i,240,257));assert.ok(isWalkable(i,...Object.values(safePosition(i,{x:0,y:0}))));}
});
test('hint steps follow the current blocker and never reveal unseen notes in the journal',()=>{
  const s=freshState();assert.equal(hint(s).key,'entry');assert.equal(hint(s).steps.length,3);s.flags.archive=true;assert.equal(hint(s).key,'archive');assert.deepEqual(s.journal,['letter']);
});
test('walls and fixtures block movement, while every object can be approached',()=>{
  for(let room=0;room<ROOMS.length;room++){
    assert.equal(isWalkable(room,0,0),false);assert.equal(isWalkable(room,450,150),false);
    const seen=new Set(),queue=[[240,68]];const key=(x,y)=>x+','+y;
    for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(seen.has(key(x,y)))continue;seen.add(key(x,y));for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const xx=x+dx,yy=y+dy;if(isWalkable(room,xx,yy)&&!seen.has(key(xx,yy)))queue.push([xx,yy]);}}
    for(const o of ROOMS[room].objects){assert.equal(isWalkable(room,o.x,o.y),false,o.id+' blocks walking');assert.ok([...seen].some(k=>{const [x,y]=k.split(',').map(Number);return Math.hypot(x-o.x,y-o.y)<35;}),o.id+' is reachable');}
  }
});
