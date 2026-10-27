import { isWalkable } from './rooms.mjs';
import { routeTo, clearPath } from './navigation.mjs';

export function createCompanion(room,player){
  const candidates=[{x:player.x-22,y:player.y+12},{x:player.x+22,y:player.y+12},{x:player.x,y:player.y-22}];
  const position=candidates.find(p=>isWalkable(room,p.x,p.y)&&clearPath(room,player,p))??player;
  return {room,x:position.x,y:position.y,route:[],goal:null,nextRouteAt:0,moving:false};
}
export function advanceCompanion(companion,player,dt,time){
  companion.moving=false;
  const separation=Math.hypot(companion.x-player.x,companion.y-player.y);
  if(separation<=25){companion.route=[];return;}
  if(time>=companion.nextRouteAt&&(!companion.goal||!companion.route.length||Math.hypot(companion.goal.x-player.x,companion.goal.y-player.y)>12)){
    companion.route=routeTo(companion.room,companion,player);companion.goal={...player};companion.nextRouteAt=time+.2;
  }
  while(companion.route.length&&Math.hypot(companion.route[0].x-companion.x,companion.route[0].y-companion.y)<.5)companion.route.shift();
  if(!companion.route.length)return;
  const next=companion.route[0],distance=Math.hypot(next.x-companion.x,next.y-companion.y);
  const step=Math.min(distance,105*dt,separation-24),destination={x:companion.x+(next.x-companion.x)/distance*step,y:companion.y+(next.y-companion.y)/distance*step};
  if(clearPath(companion.room,companion,destination)){companion.x=destination.x;companion.y=destination.y;companion.moving=step>0;}
  else{companion.route=[];companion.goal=null;}
}
