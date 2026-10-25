import test from 'node:test';
import assert from 'node:assert/strict';
import { viewport, clampScroll, roomAtScroll, screenToWorld, worldToScreen, wheelDistance } from '../dist/camera.mjs';

test('the world fits all viewport shapes without stretching or clipping its width',()=>{
  for(const [width,height] of [[1440,900],[1280,800],[1920,1080],[390,844]]){
    const v=viewport(width,height);
    assert.ok(v.x>=0&&v.y>=0);assert.ok(480*v.scale<=width+.001);assert.ok(320*v.scale<=height+.001);
    const world={x:104,y:320+82},screen=worldToScreen(world.x,world.y,v,241.5),back=screenToWorld(screen.x,screen.y,v,241.5);
    assert.ok(Math.abs(back.x-world.x)<.00001);assert.ok(Math.abs(back.y-world.y)<.00001);
  }
});
test('continuous scroll preserves partial distances and stops at unlocked boundaries',()=>{
  assert.equal(clampScroll(96.5,1),96.5);assert.equal(clampScroll(-200,4),0);
  assert.equal(clampScroll(10000,0),0);assert.equal(clampScroll(10000,2),640);
  assert.equal(roomAtScroll(150,4),0);assert.equal(roomAtScroll(170,4),1);assert.equal(roomAtScroll(1300,2),2);
});
test('mouse wheels and trackpads use their actual pixel, line, or page distances',()=>{
  const v=viewport(1440,960);assert.equal(wheelDistance(90,0,v),30);
  assert.equal(wheelDistance(3,1,v),16);assert.equal(wheelDistance(1,2,v),320);
  assert.equal(wheelDistance(-90,0,v),-30);
});
