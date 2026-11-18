import test from 'node:test';
import assert from 'node:assert/strict';
import {planetTrailDates,planetTrailPosition,planetTrailCoordinates,PLANET_TRAIL_NAMES} from '../planet-motion-trails.js';
import {horizontal} from '../astronomy.js';
const observer={lat:49.19,lon:-98.10};
test('Planet trails cover Mercury through Neptune with finite apparent positions',()=>{
 const d=new Date('2026-11-18T18:00:00Z');
 assert.equal(PLANET_TRAIL_NAMES.length,7);
 for(const name of PLANET_TRAIL_NAMES){
  const p=planetTrailPosition(name,d,observer.lat,observer.lon);
  assert.ok(p&&[p.ra,p.decl,p.az,p.alt].every(Number.isFinite),name);
  assert.ok(p.ra>=0&&p.ra<360&&p.decl>=-90&&p.decl<=90,name);
 }
 assert.equal(planetTrailPosition('Sun',d,observer.lat,observer.lon),null);
});
test('Computed planetary paths span time and stay in chronological order',()=>{
 const d=new Date('2026-11-18T18:00:00Z');
 const dates=planetTrailDates(d);
 assert.ok(dates.length>=200&&dates.length<=205);
 assert.ok(dates[0]<d&&dates.at(-1)>d);
 assert.ok(dates.every((v,i)=>i===0||v>dates[i-1]));
 const stars=planetTrailCoordinates('Mars',dates,{...observer,frame:'stars',referenceDate:d});
 const horizon=planetTrailCoordinates('Mars',dates,{...observer,frame:'horizon',referenceDate:d});
 assert.equal(stars.length,dates.length);
 assert.ok(stars.every(p=>p&&Number.isFinite(p.alt)&&Number.isFinite(p.az)));
 const sample=stars[20];
 const fixed=horizontal(sample.ra,sample.decl,d,observer.lat,observer.lon);
 assert.ok(Math.abs(fixed.alt-sample.alt)<1e-9);
 assert.ok(Math.abs(horizon[20].alt-stars[20].alt)>0.1);
});
test('Planetary retrograde spans are retained by star-frame sampling',()=>{
 const dates=planetTrailDates(new Date('2026-11-18T18:00:00Z'));
 const path=planetTrailCoordinates('Mars',dates,{...observer,frame:'stars',referenceDate:new Date('2026-11-18T18:00:00Z')});
 const delta=path.slice(1).map((p,i)=>((p.ra-path[i].ra+540)%360)-180);
 assert.ok(delta.some(x=>x<0),'Mars should show westward retrograde motion');
 assert.ok(delta.some(x=>x>0),'Mars should show prograde motion');
});
