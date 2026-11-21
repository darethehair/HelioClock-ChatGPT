import test from 'node:test';
import assert from 'node:assert/strict';
import {solarDirectionEvents,bearingDestination,solarBearingPath,solarShadeOpacity} from '../local-sun-geometry.js';

test('Local Sun Map finds real rise/set and twilight azimuths from Morden',()=>{
 const e=solarDirectionEvents(new Date('2026-11-20T18:00:00Z'),49.19,-98.10);
 const by=Object.fromEntries(e.map(x=>[x.key,x]));
 for(const key of ['sunrise','sunset','civil-dawn','civil-dusk','nautical-dawn','nautical-dusk','astronomical-dawn','astronomical-dusk']){
  assert.ok(by[key],key+' should occur at this latitude and date');
  assert.ok(by[key].az>=0&&by[key].az<360,key);
 }
 assert.ok(by.sunrise.az>90&&by.sunrise.az<180,'November sunrise SE');
 assert.ok(by.sunset.az>180&&by.sunset.az<270,'November sunset SW');
 assert.ok(by['astronomical-dawn'].date<by['nautical-dawn'].date);
 assert.ok(by['nautical-dawn'].date<by['civil-dawn'].date);
 assert.ok(by['civil-dawn'].date<by.sunrise.date);
 assert.ok(by.sunset.date<by['civil-dusk'].date);
 assert.ok(by['civil-dusk'].date<by['nautical-dusk'].date);
 assert.ok(by['nautical-dusk'].date<by['astronomical-dusk'].date);
});
test('Geodesic solar directions respect true north, east, and west',()=>{
 const north=bearingDestination(49.19,-98.10,0,100);
 assert.ok(north[0]>49.19&&Math.abs(north[1]+98.10)<.001);
 const east=bearingDestination(49.19,-98.10,90,100);
 assert.ok(east[1]>-98.10);
 const west=bearingDestination(49.19,-98.10,270,100);
 assert.ok(west[1]<-98.10);
 const pts=solarBearingPath(49.19,-98.10,110,200);
 assert.equal(pts.length,49);
 assert.ok(Math.abs(pts[0][0]-49.19)<1e-8);
 assert.ok(Math.abs(pts[0][1]+98.10)<1e-8);
});
test('Night dimming increases monotonically through three twilight bands',()=>{
 const alts=[8,0,-1,-7,-13,-20].map(solarShadeOpacity);
 assert.equal(alts[0],0);
 assert.ok(alts.every((value,i)=>i===0||value>=alts[i-1]));
 assert.ok(alts.at(-1)>.6);
});
