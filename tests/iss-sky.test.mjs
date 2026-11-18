import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIssPayload} from '../iss-tracking.js';
import {issSkyPosition,issSkyTrack,findIssPass,paintIssSky} from '../iss-sky.js';

const record={
 OBJECT_NAME:'ISS (ZARYA)',OBJECT_ID:'1998-067A',EPOCH:'2026-11-18T12:00:00.000',
 MEAN_MOTION:15.5,ECCENTRICITY:0.0005,INCLINATION:51.64,
 RA_OF_ASC_NODE:130,ARG_OF_PERICENTER:65,MEAN_ANOMALY:280,
 EPHEMERIS_TYPE:0,CLASSIFICATION_TYPE:'U',NORAD_CAT_ID:25544,
 ELEMENT_SET_NO:999,REV_AT_EPOCH:55000,BSTAR:0.0001,
 MEAN_MOTION_DOT:0.00001,MEAN_MOTION_DDOT:0
};
const model=normalizeIssPayload([record]);
const when=new Date('2026-11-18T12:00:00Z');
const observer={lat:49.19,lon:-98.10};
test('ISS sky position is observer-relative and reports illumination separately',()=>{
 const p=issSkyPosition(model,when,observer.lat,observer.lon);
 assert.ok(p);
 assert.ok(p.az>=0&&p.az<360&&p.alt>=-90&&p.alt<=90);
 assert.ok(p.rangeKm>100&&p.rangeKm<15000);
 assert.equal(typeof p.sunlit,'boolean');
 assert.equal(typeof p.likelyVisible,'boolean');
 assert.equal(p.likelyVisible, p.alt>10&&p.sunlit&&p.sunAlt< -6);
 assert.equal(issSkyPosition(model,new Date('2030-01-01T00:00:00Z'),observer.lat,observer.lon),null);
});
test('ISS sky pass track follows time and current position',()=>{
 const track=issSkyTrack(model,when,observer.lat,observer.lon);
 assert.ok(track.length>=70);
 assert.equal(track[Math.floor(track.length/2)].offsetSeconds,0);
 assert.ok(track.every(p=>Number.isFinite(p.alt)&&Number.isFinite(p.az)));
});
test('Next and previous pass have correct chronological boundaries',()=>{
 const options={hours:48,stepSeconds:60};
 const future=findIssPass(model,when,observer.lat,observer.lon,1,options);
 const previous=findIssPass(model,when,observer.lat,observer.lon,-1,options);
 assert.ok(future,'next pass found');
 assert.ok(previous,'previous pass found');
 for(const p of [future,previous]){
  assert.ok(p.rise<=p.maximum&&p.maximum<=p.set);
  assert.ok(p.maxAlt>0&&p.maxAlt<=90);
  assert.equal(typeof p.likelyVisible,'boolean');
 }
 assert.ok(future.rise>when);
 assert.ok(previous.set<when);
});
test('Sky track draws above-horizon points without requiring visibility',()=>{
 const track=issSkyTrack(model,when,observer.lat,observer.lon);
 const c={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
  setLineDash(){},arc(){},fill(){},fillText(){}};
 const drawn=paintIssSky(c,track,issSkyPosition(model,when,observer.lat,observer.lon),{
  mode:'rect',width:600,belowHorizon:false,project:(az,alt)=>[az,alt]
 });
 assert.ok(drawn.count>=0&&drawn.count<=track.length);
});
