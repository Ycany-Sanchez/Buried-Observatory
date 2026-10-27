import test from 'node:test';
import assert from 'node:assert/strict';
import { routeTo, clearPath } from '../dist/navigation.mjs';
import { ROOMS, ROOM_FEATURES, isWalkable } from '../dist/rooms.mjs';

test('routes go around a telescope instead of stopping against it',()=>{
  const start={x:200,y:116},goal={x:285,y:116};
  assert.equal(clearPath(0,start,goal),false);
  const route=routeTo(0,start,goal);assert.ok(route.length>1);
  let previous=start;for(const p of route){assert.equal(clearPath(0,previous,p),true);previous=p;}
  assert.deepEqual(route.at(-1),goal);
});
test('every object can be reached by clicking it from the room entrance',()=>{
  for(let room=0;room<ROOMS.length;room++)for(const o of ROOMS[room].objects){
    const route=routeTo(room,{x:240,y:67},o);assert.ok(route.length,o.id+' has a route');
    assert.ok(Math.hypot(route.at(-1).x-o.x,route.at(-1).y-o.y)<39,o.id+' ends within interaction range');
    let previous={x:240,y:67};for(const p of route){assert.ok(clearPath(room,previous,p),o.id+' never crosses an obstacle');previous=p;}
  }
});
test('room features have collision and the Lens platform has curved edges',()=>{
  for(let room=0;room<ROOMS.length;room++)for(const f of ROOM_FEATURES[room])assert.equal(isWalkable(room,f.x+f.w/2,f.y+f.h/2),false);
  assert.equal(isWalkable(3,50,55),false);assert.equal(isWalkable(0,50,55),true);
  const route=routeTo(3,{x:240,y:67},{x:0,y:0});assert.ok(route.length);assert.ok(isWalkable(3,route.at(-1).x,route.at(-1).y));
});
