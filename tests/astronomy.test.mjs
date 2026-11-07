import assert from 'node:assert/strict';
import {solar,sunEvents,sunHorizontal,moon,orbitPositions,precessJ2000,horizontal} from '../astronomy.js';
const at=(s)=>new Date(s);
const vernal=solar(at('2026-03-20T14:00:00Z'));
assert.ok(Math.abs(vernal.decl)<.5,'March equinox solar declination');
const summer=solar(at('2026-06-21T12:00:00Z'));
assert.ok(summer.decl>23&&summer.decl<24,'June solstice declination');
const winnipeg=[49.19,-98.10];
const summerDay=sunEvents(at('2026-06-21T12:00:00Z'),...winnipeg);
const winterDay=sunEvents(at('2026-12-21T12:00:00Z'),...winnipeg);
assert.ok(summerDay.duration>15&&summerDay.duration<17,'summer day length near Morden');
assert.ok(winterDay.duration>7&&winterDay.duration<9,'winter day length near Morden');
const northSummer=sunEvents(at('2026-06-21T12:00:00Z'),85,0);
assert.equal(northSummer.polar,'day');
const northWinter=sunEvents(at('2026-12-21T12:00:00Z'),85,0);
assert.equal(northWinter.polar,'night');
const position=sunHorizontal(at('2026-06-21T18:00:00Z'),...winnipeg);
assert.ok(position.alt>50,'local mid-day summer Sun');
const lunar=moon(at('2026-11-07T12:00:00Z'),...winnipeg);
assert.ok(lunar.illuminated>=0&&lunar.illuminated<=1,'lunar illumination range');
assert.equal(orbitPositions(at('2026-11-07T12:00:00Z')).length,8);
console.log('Astronomy smoke tests passed.');

 // Precession: J2000 identity, century-scale motion, equinox-of-date positions.
 const j2000=at('2000-01-01T12:00:00Z');
 const unchanged=precessJ2000(0,0,j2000);
 assert.ok(Math.abs(unchanged.ra)<1e-9&&Math.abs(unchanged.decl)<1e-9,
  'J2000 origin unchanged at reference epoch');
 const nextCentury=at('2100-01-01T12:00:00Z');
 const beforeCentury=at('1900-01-01T12:00:00Z');
 const p2100=precessJ2000(0,0,nextCentury);
 const p1900=precessJ2000(0,0,beforeCentury);
 assert.ok(p2100.ra>1.27&&p2100.ra<1.30,'one-century RA precession near 1.28 degrees');
 assert.ok(p2100.decl>.54&&p2100.decl<.57,'one-century declination precession near 0.56 degrees');
 assert.ok(p1900.ra>358.70&&p1900.ra<358.74,'past century precession moves backward in RA');
 assert.ok(p1900.decl<-.54&&p1900.decl>-.57,'past century declination reversed');
 // On/off must actually change the rendered horizon location for a catalogued star.
 const observedOn=horizontal(p2100.ra,p2100.decl,nextCentury,49.19,-98.10);
 const observedOff=horizontal(0,0,nextCentury,49.19,-98.10);
 assert.ok(Math.hypot(observedOn.alt-observedOff.alt,observedOn.az-observedOff.az)>.2,
  'precession must affect sky coordinates in a real horizon projection');
 const vega=precessJ2000(279.235,38.784,nextCentury);
 assert.ok(Number.isFinite(vega.ra)&&Number.isFinite(vega.decl));
