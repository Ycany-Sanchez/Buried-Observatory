export const PUMP_DIALS=Object.freeze([{x:146,y:140},{x:160,y:140},{x:174,y:140}]);
export const PUMP_CRANK=Object.freeze({x:160,y:174});
export const SHUTTER_KEYS=Object.freeze([1,2,3,4].map((number,i)=>({x:334+i*12,y:224,number})));
export function freshInstruments(){return {entry:[2,2,2],pump:[0,0,0],shutters:[]};}
export function restoreInstruments(raw){
  const drafts=freshInstruments();
  for(const key of ['entry','pump'])if(Array.isArray(raw?.[key])&&raw[key].length===3&&raw[key].every(n=>Number.isInteger(n)&&n>=0&&n<=2))drafts[key]=[...raw[key]];
  if(Array.isArray(raw?.shutters)&&raw.shutters.length<=4&&raw.shutters.every(n=>Number.isInteger(n)&&n>=1&&n<=4))drafts.shutters=[...raw.shutters];
  return drafts;
}
export function instrumentPart(type,p){
  if(type==='pump'){
    const dial=PUMP_DIALS.findIndex(d=>Math.hypot(d.x-p.x,d.y-p.y)<=8);
    if(dial!==-1)return {kind:'dial',index:dial,center:PUMP_DIALS[dial]};
    if(Math.hypot(PUMP_CRANK.x-p.x,PUMP_CRANK.y-p.y)<=14)return {kind:'crank',center:PUMP_CRANK};
  }
  if(type==='shutters'){const key=SHUTTER_KEYS.find(d=>Math.abs(d.x-p.x)<6.5&&Math.abs(d.y-p.y)<17);if(key)return {kind:'shutter',number:key.number};}
  return null;
}
