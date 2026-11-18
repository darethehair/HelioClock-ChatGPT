import test from 'node:test';
import assert from 'node:assert/strict';
import {geoEqualEarth,geoOrthographic,geoMercator} from 'd3-geo';
import {normalizeIssPayload,issPosition,issGroundTrack,issEpoch,issElementStatus,ISS_CAT_ID,paintIssEarth} from '../iss-tracking.js';

const elements={
 OBJECT_NAME:'ISS (ZARYA)',OBJECT_ID:'1998-067A',
 EPOCH:'2026-11-18T12:00:00.000',MEAN_MOTION:15.5,
 ECCENTRICITY:0.0005,INCLINATION:51.64,RA_OF_ASC_NODE:130,
 ARG_OF_PERICENTER:65,MEAN_ANOMALY:280,EPHEMERIS_TYPE:0,
 CLASSIFICATION_TYPE:'U',NORAD_CAT_ID:ISS_CAT_ID,ELEMENT_SET_NO:999,
 REV_AT_EPOCH:55000,BSTAR:0.0001,MEAN_MOTION_DOT:0.00001,MEAN_MOTION_DDOT:0
};
const start=new Date('2026-11-18T12:00:00Z');
test('CelesTrak OMM is validated and UTC epoch is parsed without local-zone drift',()=>{
 assert.equal(issEpoch(elements).toISOString(),start.toISOString());
 assert.equal(normalizeIssPayload([{...elements,NORAD_CAT_ID:12345}]),null);
 assert.equal(normalizeIssPayload([{...elements,MEAN_MOTION:0}]),null);
 const model=normalizeIssPayload([elements]);
 assert.ok(model);
 assert.equal(model.epoch.toISOString(),start.toISOString());
});
test('SGP4 ISS positions produce plausible lat, longitude, altitude and speed',()=>{
 const model=normalizeIssPayload({elements,source:'test'});
 const p=issPosition(model,start);
 assert.ok(p);
 assert.ok(Math.abs(p.lat)<60);
 assert.ok(p.lon>=-180&&p.lon<=180);
 assert.ok(p.heightKm>300&&p.heightKm<600,'ISS-like orbit altitude');
 assert.ok(p.speedKmS>6&&p.speedKmS<9,'ISS-like orbit speed');
 const past=issPosition(model,new Date(start.getTime()-60000));
 assert.ok(past&&Math.abs(past.lon-p.lon)>0.1);
});
test('Never plot ISS at dates too far from element epoch',()=>{
 const model=normalizeIssPayload([elements]);
 assert.equal(issElementStatus(model,start).valid,true);
 assert.equal(issElementStatus(model,new Date(start.getTime()+3*86400000)).valid,true);
 assert.equal(issElementStatus(model,new Date(start.getTime()+6*86400000)).valid,false);
 assert.equal(issPosition(model,new Date(start.getTime()+6*86400000)),null);
 assert.deepEqual(issGroundTrack(model,new Date(start.getTime()+6*86400000)),[]);
});
test('Ground track supports projection drawing and respects globe limb visibility',()=>{
 const model=normalizeIssPayload([elements]);
 const points=issGroundTrack(model,start);
 assert.ok(points.length>=40&&points.length<=50);
 const center=issPosition(model,start);
 const operations={beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},arc(){},closePath(){},stroke(){},fill(){},fillText(){},setLineDash(){},save(){},restore(){}};
 for(const projection of [geoEqualEarth(),geoMercator(),geoOrthographic()]){
  projection.fitSize([640,320],{type:'Sphere'});
  const state={earthProjection:projection===undefined?'equal':'equal',earthLon:center.lon,earthLat:center.lat};
  const result=paintIssEarth(operations,640,320,projection,state,points,center);
  assert.equal(result.count,points.length);
  assert.equal(result.visible,true);
 }
});
