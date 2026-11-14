import assert from 'node:assert/strict';
import {dayBands,daylightChange,seasonalEvents} from '../solar-chart.js';

for(const year of [2024,2026,2028,2030]){
 const events=seasonalEvents(year);
 assert.equal(events.length,4);
 const expectedMonths=[2,5,8,11];
 for(let i=0;i<4;i++){
  assert.equal(events[i].date.getUTCFullYear(),year);
  assert.equal(events[i].date.getUTCMonth(),expectedMonths[i]);
  assert.ok(events[i].index>60&&events[i].index<365);
  if(i)assert.ok(events[i].date>events[i-1].date);
 }
 assert.ok(events[0].date.getUTCDate()>=19&&events[0].date.getUTCDate()<=21);
 assert.ok(events[1].date.getUTCDate()>=20&&events[1].date.getUTCDate()<=22);
 assert.ok(events[2].date.getUTCDate()>=21&&events[2].date.getUTCDate()<=24);
 assert.ok(events[3].date.getUTCDate()>=20&&events[3].date.getUTCDate()<=23);
}
const nearMorden=[49.19,-98.10];
const june=new Date('2026-06-21T12:00:00Z'),dec=new Date('2026-12-21T12:00:00Z');
assert.ok(dayBands(june,...nearMorden).daylight>15);
assert.ok(dayBands(dec,...nearMorden).daylight<9);
assert.ok(daylightChange(new Date('2026-03-01T12:00:00Z'),...nearMorden)>0,'spring gains daylight');
assert.ok(daylightChange(new Date('2026-10-01T12:00:00Z'),...nearMorden)<0,'autumn loses daylight');
assert.ok(daylightChange(new Date('2026-01-01T12:00:00Z'),...nearMorden)>0,'year boundary compares with previous Dec 31');
assert.ok(daylightChange(new Date('2026-03-01T12:00:00Z'),-49.19,0)<0,'southern hemisphere inverted');
assert.equal(dayBands(june,85,0).daylight,24);
assert.equal(dayBands(dec,85,0).daylight,0);
console.log('Daylight-year seasonal dates, daylight deltas and polar cases passed.');
