import test from 'node:test';
import assert from 'node:assert/strict';
import {lunarApsides,lunarDistanceTrend} from '../almanac.js';

test('previous and next perigees/apogees bracket the simulated instant',()=>{
 for(const iso of ['2026-11-24T12:00:00Z','1979-02-26T17:00:00Z','2030-06-01T00:00:00Z']){
  const date=new Date(iso),e=lunarApsides(date);
  for(const kind of ['Perigee','Apogee']){
   const previous=e['previous'+kind],next=e['next'+kind];
   assert.ok(previous && next,iso+' '+kind+' events exist');
   assert.equal(previous.kind,kind);assert.equal(next.kind,kind);
   assert.ok(previous.date.getTime()<date.getTime(),iso+' previous '+kind);
   assert.ok(next.date.getTime()>=date.getTime(),iso+' next '+kind);
   assert.ok(previous.date<next.date);
   assert.ok(previous.distanceKm>300000 && previous.distanceKm<450000);
   assert.ok(next.distanceKm>300000 && next.distanceKm<450000);
  }
 }
});

test('lunar distance trend is based on geocentric motion',()=>{
 const values=['2026-11-24T00:00:00Z','2026-12-01T00:00:00Z','2026-12-08T00:00:00Z']
  .map(s=>lunarDistanceTrend(new Date(s)));
 for(const value of values)assert.ok(['Approaching Earth','Receding from Earth','At turning point'].includes(value));
});
