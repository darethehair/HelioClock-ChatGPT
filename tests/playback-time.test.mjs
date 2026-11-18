import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYBACK_RATES,DEFAULT_PLAYBACK_RATE,advancePlayback} from '../playback-time.js';

test('Playback rate names describe exact fixed simulated durations',()=>{
 assert.deepEqual(PLAYBACK_RATES.map(r=>r.value),[
  1,60,3600,86400,604800,2592000,31536000
 ]);
 assert.equal(DEFAULT_PLAYBACK_RATE,3600);
 assert.match(PLAYBACK_RATES.at(-1).label,/365 days/);
});
test('Elapsed time advances simulation and reverses identically',()=>{
 const start=new Date('2026-11-18T12:34:56.000Z');
 for(const {value} of PLAYBACK_RATES){
  const advanced=advancePlayback(start,1500,value,1);
  assert.equal(advanced.getTime()-start.getTime(),1500*value);
  const back=advancePlayback(advanced,1500,value,-1);
  assert.equal(back.getTime(),start.getTime());
 }
});
test('Playback has no timezone/DST induced hour jumps and validates invalid input',()=>{
 const start=new Date('2026-03-08T07:00:00.000Z');
 assert.equal(advancePlayback(start,1000,86400).toISOString(),'2026-03-09T07:00:00.000Z');
 assert.equal(advancePlayback(start,-1000,86400),start);
 assert.equal(advancePlayback(start,1000,12345),start);
});
