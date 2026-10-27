import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, restoreState } from '../dist/state.mjs';
import { instrumentPart, PUMP_DIALS, PUMP_CRANK, SHUTTER_KEYS } from '../dist/instruments.mjs';
test('unfinished mechanisms survive a save without granting progression',()=>{
  const s=freshState();s.instruments.entry=[1,2,0];s.instruments.pump=[2,1,0];s.instruments.shutters=[2,4];
  assert.deepEqual(restoreState(JSON.stringify(s)).instruments,s.instruments);
  assert.equal(restoreState(s).flags.drained,false);assert.equal(restoreState(s).flags.shutters,false);
  s.instruments={entry:[9,0,0],pump:'sun',shutters:[2,0]};assert.deepEqual(restoreState(s).instruments,freshState().instruments);
});
test('physical instrument hit areas match all dials, crank and shutter tabs',()=>{
  for(let i=0;i<3;i++)assert.equal(instrumentPart('pump',PUMP_DIALS[i]).index,i);
  assert.equal(instrumentPart('pump',PUMP_CRANK).kind,'crank');
  for(const p of SHUTTER_KEYS)assert.equal(instrumentPart('shutters',p).number,p.number);
  assert.equal(instrumentPart('pump',{x:300,y:140}),null);
});
