import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,applyAction,restoreState} from '../dist/state.mjs';
import {clueSketch} from '../dist/journal.mjs';
test('only discovered pages can be pinned and pins survive reload',()=>{
  let s=freshState();assert.equal(applyAction(s,{type:'pin_note',id:'projection'}).ok,false);
  s=applyAction(s,{type:'pin_note',id:'letter'}).state;assert.equal(restoreState(s).pinnedNote,'letter');
  s=applyAction(s,{type:'inspect_mural'}).state;s=applyAction(s,{type:'pin_note',id:'mural'}).state;
  assert.equal(s.pinnedNote,'mural');assert.equal(applyAction(s,{type:'pin_note',id:null}).state.pinnedNote,null);
  assert.equal(restoreState({...s,pinnedNote:'projection'}).pinnedNote,null);
  assert.equal(restoreState({...s,pinnedNote:'<script>'}).pinnedNote,null);
});
test('pinning a page preserves drafts and does not discover other clues',()=>{
  const s=freshState();s.instruments.entry=[1,2,0];s.instruments.pump=[2,1,0];s.instruments.shutters=[2,4];
  const next=applyAction(s,{type:'pin_note',id:'letter'}).state;
  assert.deepEqual(next.instruments,s.instruments);assert.deepEqual(next.journal,['letter']);assert.deepEqual(next.flags,s.flags);
});
test('the visual journal has scalable, labelled clue sketches',()=>{
  assert.match(clueSketch('mural'),/viewBox="0 0 280 122"/);assert.match(clueSketch('mural'),/aria-label="The celestial procession"/);
  assert.match(clueSketch('projection'),/>2<.*>4<.*>1<.*>3</);
});
