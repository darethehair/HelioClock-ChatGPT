import assert from 'node:assert/strict';
import {solarShadowAt,solarShadowTrack,solarCentralFootprint} from '../eclipse-earth-shadow.js';

const close=(x,y,tolerance)=>Math.abs(x-y)<tolerance;
const date=new Date('1979-02-26T16:30:00Z');
const eclipse=solarShadowAt(date);
assert.equal(eclipse.active,true,'1979 solar eclipse must be detected');
assert.ok(eclipse.center,'1979 eclipse central shadow must intersect Earth');
assert.ok(eclipse.center.every(Number.isFinite),'geographic center must be finite');
assert.ok(eclipse.center[0]>=-180&&eclipse.center[0]<=180);
assert.ok(eclipse.center[1]>=-90&&eclipse.center[1]<=90);
const middle=eclipse.sample(...eclipse.center);
assert.ok(middle.penumbra>0.8,'central point must lie inside penumbra');
assert.ok(middle.umbra>0.2,'central point must lie inside umbra/antumbra');
const track=solarShadowTrack(date,120,12);
assert.ok(track.length>4,'1979 eclipse has a geographic central track');
assert.ok(track.every(point=>point.every(Number.isFinite)));
const footprint=solarCentralFootprint(solarShadowAt(new Date('1979-02-26T16:45:00Z')));
assert.equal(footprint?.type,'totality','1979 eclipse must have a distinct totality footprint');
assert.equal(footprint.coordinates.length,73,'closed boundary polygon must contain 72 bearings');
assert.ok(footprint.coordinates.every(p=>p.every(Number.isFinite)));
const earthRadius=6378.137,deg=Math.PI/180;
const center45=solarShadowAt(new Date('1979-02-26T16:45:00Z')).center;
function earthDistanceKm(a,b){
 const dlat=(b[1]-a[1])*deg,dlon=(b[0]-a[0])*deg;
 const h=Math.sin(dlat/2)**2+Math.cos(a[1]*deg)*Math.cos(b[1]*deg)*Math.sin(dlon/2)**2;
 return 2*earthRadius*Math.asin(Math.sqrt(h));
}
const footprintDiameter=earthDistanceKm(footprint.coordinates[18],footprint.coordinates[54]);
assert.ok(footprintDiameter>150&&footprintDiameter<500,'1979 totality footprint must have realistic breadth');
console.log('1979 totality diagnostic',JSON.stringify({
 center:center45,widthKm:footprintDiameter,
 morden:solarShadowAt(new Date('1979-02-26T16:45:00Z')).sample(-98.10,49.19)
}));
const ordinary=solarShadowAt(new Date('2026-11-14T12:00:00Z'));
assert.equal(ordinary.active,false,'ordinary date must not render eclipse');
assert.equal(ordinary.sample(0,0).penumbra,0);
console.log('Earth eclipse shadow checks passed',eclipse.center,track.length);
