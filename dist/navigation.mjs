import { isWalkable } from './rooms.mjs';

const navigationGrids=new Map(),gridStep=8;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function clearPath(room,a,b) {
  const steps=Math.max(1,Math.ceil(distance(a,b)/2));
  for(let i=0;i<=steps;i++)if(!isWalkable(room,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
  return true;
}
function navigationGrid(room) {
  if(navigationGrids.has(room))return navigationGrids.get(room);
  const nodes=new Map();
  for(let x=44;x<=436;x+=gridStep)for(let y=48;y<=272;y+=gridStep)if(isWalkable(room,x,y))nodes.set(`${x},${y}`,{x,y,neighbors:[]});
  for(const n of nodes.values())for(const [dx,dy]of [[8,0],[-8,0],[0,8],[0,-8],[8,8],[-8,8],[8,-8],[-8,-8]]){
    const next=nodes.get(`${n.x+dx},${n.y+dy}`);if(next&&clearPath(room,n,next))n.neighbors.push(next);
  }
  const list=[...nodes.values()];navigationGrids.set(room,list);return list;
}
export function prepareNavigation(room){navigationGrid(room);}
export function routeTo(room,start,destination) {
  if(!isWalkable(room,start.x,start.y)||![destination.x,destination.y].every(Number.isFinite))return [];
  if(isWalkable(room,destination.x,destination.y)&&clearPath(room,start,destination))return [{x:destination.x,y:destination.y}];
  const grid=navigationGrid(room);
  const goal=isWalkable(room,destination.x,destination.y)?destination:grid.reduce((a,b)=>distance(b,destination)<distance(a,destination)?b:a);
  if(clearPath(room,start,goal))return [{x:goal.x,y:goal.y}];
  const anchor=grid.filter(n=>distance(n,start)<18&&clearPath(room,start,n)).sort((a,b)=>distance(a,start)-distance(b,start))[0];
  const finish=grid.filter(n=>distance(n,goal)<18&&clearPath(room,n,goal)).sort((a,b)=>distance(a,goal)-distance(b,goal))[0];
  if(!anchor||!finish)return [];
  const open=new Set([anchor]),cameFrom=new Map(),cost=new Map([[anchor,0]]),estimate=new Map([[anchor,distance(anchor,finish)]]);
  while(open.size){
    let current;for(const n of open)if(!current||estimate.get(n)<estimate.get(current))current=n;
    if(current===finish){
      const path=[{x:goal.x,y:goal.y}];let n=current;
      while(n){path.unshift({x:n.x,y:n.y});n=cameFrom.get(n);}
      // Keep the furthest visible waypoint so routes do not zigzag along the grid.
      const smooth=[];let from=start,index=0;
      while(index<path.length){let next=path.length-1;while(next>index&&!clearPath(room,from,path[next]))next--;smooth.push(path[next]);from=path[next];index=next+1;}
      return smooth;
    }
    open.delete(current);
    for(const next of current.neighbors){const nextCost=cost.get(current)+distance(current,next);if(nextCost<(cost.get(next)??Infinity)){cameFrom.set(next,current);cost.set(next,nextCost);estimate.set(next,nextCost+distance(next,finish));open.add(next);}}
  }
  return [];
}
