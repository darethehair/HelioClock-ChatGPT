import assert from 'node:assert/strict';
import * as Astronomy from 'astronomy-engine';
import {cometHeliocentricEcliptic,cometTopocentricPosition} from '../comet-orbits.js';
const at=new Date('2026-11-16T12:00:00Z');
const elements={perihelion:{year:2026,month:11,dayTT:16.5},qAU:1,
 eccentricity:.5,argPeriDeg:0,nodeDeg:0,inclinationDeg:0,
 epochTT:{year:2026,month:11,day:16}};
for(const e of [0,.5,.9999,1,1.5]){
 const p=cometHeliocentricEcliptic({...elements,eccentricity:e},at);
 assert.ok(p&&Math.abs(p.x-1)<.0001&&Math.abs(p.y)<.0001&&Math.abs(p.z)<.0001,'perihelion q for e='+e);
 const later=cometHeliocentricEcliptic({...elements,eccentricity:e},new Date(at.getTime()+86400000*40));
 assert.ok(later&&later.distanceAU>p.distanceAU,'radius grows after perihelion e='+e);
}
const retro=cometHeliocentricEcliptic({...elements,inclinationDeg:160,argPeriDeg:60},new Date(at.getTime()+86400000*60));
assert.ok(Number.isFinite(retro.z)&&Math.abs(retro.z)>.01,'inclined retrograde orbit has nonzero z');
const actual=cometTopocentricPosition(elements,at,49.19,-98.10);
assert.ok(actual&&actual.ra>=0&&actual.ra<360&&Math.abs(actual.decl)<=90);
assert.ok(actual.az>=0&&actual.az<360&&Math.abs(actual.alt)<=90);
const earth=Astronomy.HelioVector(Astronomy.Body.Earth,at);
const referenceVec=new Astronomy.Vector(1-earth.x,0-earth.y,0-earth.z,at);
const eq=Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(at),referenceVec));
const raDifference=Math.abs(((actual.ra-eq.ra*15+540)%360)-180);
assert.ok(raDifference<.1,'near-perihelion ecliptic x axis matches EQJ x');
assert.ok(cometTopocentricPosition({...elements,qAU:0},at,49,-98)===null,'invalid orbit rejected');
console.log('Comet two-body orbit and sky-position checks passed.');

const {findCelestialObjects,setCometSearchObjects,celestialObjectPosition,celestialDailyEvents}=await import('../celestial-search.js');
assert.equal(setCometSearchObjects([{...elements,name:'C/Test 2026 X',designation:'2026 X1'}]),1);
const chosen=findCelestialObjects('Test 2026')[0];
assert.equal(chosen.type,'Comet');
assert.equal(chosen.name,'C/Test 2026 X');
const fromFinder=celestialObjectPosition(chosen,at,49.19,-98.1);
assert.ok(Math.abs(fromFinder.ra-actual.ra)<1e-9);
assert.ok(Math.abs(fromFinder.alt-actual.alt)<1e-9);
const daily=celestialDailyEvents(chosen,at,49.19,-98.1);
assert.ok(daily&&daily.transit&&Number.isFinite(daily.transit.alt),'comet finder rise/transit calculations');
