import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, applyAction, restoreState, NOTES } from '../dist/state.mjs';
test('Elian’s trail and diagram are discovered locally without granting puzzle progress',()=>{
  let s=freshState();s=applyAction(s,{type:'inspect_satchel'}).state;
  assert.ok(s.journal.includes('trail'));assert.equal(s.flags.archive,false);
  assert.equal(applyAction(s,{type:'inspect_diagram'}).ok,false);
  Object.assign(s.flags,{archive:true,key:true,pump:true,drained:true});s.room=3;
  s=applyAction(s,{type:'inspect_diagram'}).state;assert.ok(s.journal.includes('diagram'));assert.equal(s.flags.shutters,false);
});
test('the pipe discovery happens once and stays recorded after reload',()=>{
  const locked=freshState();locked.room=2;assert.equal(applyAction(locked,{type:'enter_room'}).ok,false);
  const s=freshState();Object.assign(s.flags,{archive:true,key:true,pump:true});s.room=2;
  const result=applyAction(s,{type:'enter_room'});assert.equal(result.discovery,'knock');assert.ok(result.state.journal.includes('knock'));
  assert.equal(applyAction(restoreState(result.state),{type:'enter_room'}).ok,false);
  assert.deepEqual(result.state.flags,s.flags);
});
test('the early writing leaves the rescue purpose for Elian’s reunion',()=>{
  assert.doesNotMatch(NOTES.letter.text,/never watching|transmitter|signal/i);
  assert.doesNotMatch(NOTES.mentor.text,/transmitter|restore the beacon|surface will see/i);
  assert.match(NOTES.reunion.text,/send a signal|way home/i);
});
