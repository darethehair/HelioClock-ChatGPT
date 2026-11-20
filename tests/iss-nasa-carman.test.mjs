import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('./fixtures/nasa-iss-carman-2026-11.json',import.meta.url));
const fixture=JSON.parse(readFileSync(source,'utf8'));
test('NASA Carman reference includes the original 19 dated sightings',()=>{
 assert.match(fixture.source,/NASA Spot the Station/);
 assert.equal(fixture.sightings.length,19);
 assert.equal(fixture.observer.name,'Carman, Manitoba, Canada');
 assert.ok(fixture.observer.latitude>49&&fixture.observer.latitude<50);
 assert.ok(fixture.observer.longitude> -99&&fixture.observer.longitude< -97);
 assert.ok(fixture.timeZone.includes('UTC-05:00'));
 const slots=new Set();
 for(const pass of fixture.sightings){
  const key=pass.date+'T'+pass.localTime;
  assert.ok(!slots.has(key),'duplicate NASA reference pass '+key);
  slots.add(key);
  assert.match(key,/^2026-(?:11|12)-\d\dT\d\d:\d\d$/);
  assert.ok(pass.durationMinutes>0&&pass.durationMinutes<=10);
  assert.ok(pass.maxHeightDeg>=pass.appearsHeightDeg);
  assert.ok(pass.maxHeightDeg>=pass.disappearsHeightDeg);
  assert.ok(pass.maxHeightDeg<=90);
 }
 assert.deepEqual(
  fixture.sightings.filter(p=>p.date==='2026-11-20').map(p=>[p.localTime,p.durationMinutes,p.maxHeightDeg]),
  [['18:35',4,57]]
 );
 assert.deepEqual(
  fixture.sightings.filter(p=>p.date==='2026-11-24').map(p=>[p.localTime,p.durationMinutes,p.maxHeightDeg]),
  [['18:36',4,88]]
 );
});
// The reference is intentionally not an accuracy assertion against arbitrary
// TLE/OMM epochs: changes in ISS orbit invalidate that comparison. A numerical
// regression must use an archived, contemporary orbital element snapshot.
