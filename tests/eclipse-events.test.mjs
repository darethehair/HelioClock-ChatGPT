import assert from 'node:assert/strict';
import {findEclipse} from '../eclipse-events.js';

// 2024-04-08 total eclipse across Dallas: independent, well-known benchmark.
const dallas={latitude:32.7767,longitude:-96.7970};
const total=findEclipse({category:'solar',scope:'local',
 date:new Date('2024-01-01T00:00:00Z'),direction:1,...dallas});
assert.ok(total,'Dallas solar eclipse should be found');
assert.equal(total.kind,'total');
assert.equal(total.peak.toISOString().slice(0,10),'2024-04-08');
assert.equal(total.visibleAtPeak,true);
assert.ok(total.obscuration>.9999);
assert.ok(total.contacts.partialBegin<total.contacts.maximum);
assert.ok(total.contacts.maximum<total.contacts.partialEnd);
assert.ok(total.contacts.centralBegin<total.contacts.centralEnd);

const previous=findEclipse({category:'solar',scope:'local',
 date:new Date('2024-05-01T00:00:00Z'),direction:-1,...dallas});
assert.equal(previous.peak.toISOString().slice(0,10),'2024-04-08',
 'reverse search should find April 2024 eclipse');
const global=findEclipse({category:'solar',scope:'global',
 date:new Date('2024-01-01T00:00:00Z'),direction:1});
assert.equal(global.peak.toISOString().slice(0,10),'2024-04-08');
assert.equal(global.visibleAtPeak,null,'global peak must not claim local visibility');

const lunar=findEclipse({category:'lunar',scope:'global',
 date:new Date('2025-01-01T00:00:00Z'),direction:1,...dallas});
assert.equal(lunar.peak.toISOString().slice(0,10),'2025-03-14');
assert.equal(lunar.kind,'total');
assert.equal(lunar.obscuration,1);
assert.ok(lunar.phases.penumbral.begin<lunar.peak);
assert.ok(lunar.phases.penumbral.end>lunar.peak);
assert.ok(lunar.phases.umbral.begin<lunar.peak);
assert.ok(lunar.phases.total.begin<lunar.peak);

const penumbral=findEclipse({category:'lunar',scope:'global',
 date:new Date('2024-01-01T00:00:00Z'),direction:1,filter:'any'});
assert.ok(['penumbral','partial','total'].includes(penumbral.kind));
const priorLunar=findEclipse({category:'lunar',scope:'global',
 date:new Date('2025-04-01T00:00:00Z'),direction:-1});
assert.equal(priorLunar.peak.toISOString().slice(0,10),'2025-03-14');

assert.throws(()=>findEclipse({latitude:100}),/coordinates/);
assert.throws(()=>findEclipse({direction:0}),/direction/);
console.log('Eclipse forward/backward, local visibility, event contacts and lunar phases passed.');
