import test from 'node:test';
import assert from 'node:assert/strict';
import {discGeometry,screenToSurface,surfaceToScreen,formatSurface,gridInterval} from '../disc-coordinates.js';
import {solarDiscOrientation} from '../solar-disc-orientation.js';
import {LUNAR_FEATURES,findLunarFeature,lunarFeatureScreen,visibleLunarLabels} from '../moon-features.js';
import {EXTRA_LUNAR_CRATERS} from '../moon-extra-craters.js';
test('Moon grid centre and latitude/longitude reference',()=>{
 const g=discGeometry('moon',400,400);
 assert.deepEqual(screenToSurface(200,200,g),{latitude:0,longitude:0});
 const p=surfaceToScreen(30,45,g);
 assert.ok(p);
 const recovered=screenToSurface(p.x,p.y,g);
 assert.ok(Math.abs(recovered.latitude-30)<1e-8);
 assert.ok(Math.abs(recovered.longitude-45)<1e-8);
});
test('Rotation and zoom preserve reference inverse mapping',()=>{
 const g=discGeometry('moon',640,360,2,50,-20,37);
 const p=surfaceToScreen(-40,-60,g),back=screenToSurface(p.x,p.y,g);
 assert.ok(Math.abs(back.latitude+40)<1e-8);
 assert.ok(Math.abs(back.longitude+60)<1e-8);
 assert.equal(screenToSurface(1e6,1e6,g),null);
});
test('Solar reference readout clearly avoids unsupported Carrington claim',()=>{
 assert.match(formatSurface({latitude:12,longitude:-15},'sun'),/reference/);
});

test('Disc radii reflect their rendered viewports',()=>{
 const moon=discGeometry('moon',1600,660);
 assert.equal(moon.r,Math.floor(Math.min(1600*.82,660*.90))/2);
 const sun=discGeometry('sun',1600,660);
 assert.ok(Math.abs(sun.r-660*.47)<1e-10);
 assert.ok(sun.r>660*.45);
});
test('Large discs use a denser 15 degree grid, ordinary discs 30 degrees',()=>{
 assert.equal(gridInterval(180),30);
 assert.equal(gridInterval(280),15);
});

test('Solar B0 and P reproduce the 2026 November 13 solar orientation',()=>{
 const {B0,P}=solarDiscOrientation(new Date('2026-11-13T11:34:32Z'));
 assert.ok(Math.abs(B0-3.06)<.2,`B0=${B0}`);
 assert.ok(Math.abs(P-21.8)<.3,`P=${P}`);
});
test('Solar pole viewing tilt changes projected coordinates and round-trips',()=>{
 const B0=solarDiscOrientation(new Date('2026-11-13T11:34:32Z')).B0;
 const tilted=discGeometry('sun',1000,600,1,0,0,0,B0);
 const flat=discGeometry('sun',1000,600);
 assert.ok(Math.abs(tilted.tilt-B0*Math.PI/180)<1e-10);
 const solarPole=surfaceToScreen(90,0,tilted);
 const noTiltPole=surfaceToScreen(90,0,flat);
 assert.ok(solarPole && noTiltPole);
 assert.ok(Math.abs(solarPole.y-noTiltPole.y)>.1);
 for(const [lat,lon] of [[0,0],[35,55],[-30,-60],[75,5]]){
  const point=surfaceToScreen(lat,lon,tilted);
  assert.ok(point);
  const back=screenToSurface(point.x,point.y,tilted);
  assert.ok(Math.abs(back.latitude-lat)<1e-8);
  assert.ok(Math.abs(back.longitude-lon)<1e-8);
 }
});

test('Lunar feature catalogue and north-up photo have the same east-west handedness',()=>{
 const g=discGeometry('moon',800,800);
 for(const [name,lat,lon,side] of [
  ['Tycho',-43.3,-11.2,'left'],
  ['Copernicus',9.7,-20.1,'left'],
  ['Mare Crisium',17,59.1,'right'],
  ['Oceanus Procellarum',18.4,-57.4,'left']
 ]){
  const feature=findLunarFeature(name);
  assert.ok(feature,name+' exists');
  assert.equal(feature.lat,lat);
  assert.equal(feature.lon,lon);
  const p=lunarFeatureScreen(feature,g);
  assert.ok(p,name+' must be visible');
  assert.ok(side==='left'?p.x<g.cx:p.x>g.cx,name+' must lie '+side+' of centre');
  assert.ok(lat<0?p.y>g.cy:p.y<g.cy,name+' latitude sign');
  const recovered=screenToSurface(p.x,p.y,g);
  assert.ok(Math.abs(recovered.latitude-lat)<1e-8,name+' latitude readout');
  assert.ok(Math.abs(recovered.longitude-lon)<1e-8,name+' longitude readout');
 }
});

test('Expanded 500-feature lunar atlas is unique, searchable and on the visible hemisphere',()=>{
 assert.equal(LUNAR_FEATURES.length,500);
 const names=new Set();
 for(const feature of LUNAR_FEATURES){
  const key=feature.name.toLocaleLowerCase();
  assert.ok(!names.has(key),'Duplicate feature '+feature.name);
  names.add(key);
  assert.ok(Number.isFinite(feature.lat)&&Number.isFinite(feature.lon),feature.name);
  assert.ok(feature.lat>=-90&&feature.lat<=90&&Math.abs(feature.lon)<=180,feature.name);
  assert.equal(findLunarFeature(feature.name)?.name,feature.name);
 }
 for(const feature of EXTRA_LUNAR_CRATERS){
  assert.ok(lunarFeatureScreen(feature,discGeometry('moon',800,800)),feature.name+' must project onto the near side');
 }
 assert.ok(LUNAR_FEATURES.filter(x=>x.type==='crater').length>400);
});

test('Lunar labels use the available viewport at 1x without crowding',()=>{
 const wide=discGeometry('moon',1600,660),small=discGeometry('moon',360,360);
 const largeLabels=visibleLunarLabels(wide,{zoom:1},1600,660);
 const smallLabels=visibleLunarLabels(small,{zoom:1},360,360);
 assert.ok(largeLabels.length>11,'desktop 1x view should show more than the original eleven labels');
 assert.ok(largeLabels.length>smallLabels.length,'desktop should support more labels than phone');
 for(const labels of [largeLabels,smallLabels]){
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
   const a=labels[i],b=labels[j];
   assert.ok(a.labelX+Math.min(168,a.name.length*6.1+8)+4<=b.labelX ||
    b.labelX+Math.min(168,b.name.length*6.1+8)+4<=a.labelX ||
    a.labelY+17<=b.labelY || b.labelY+17<=a.labelY,
    'overlapping labels: '+a.name+' and '+b.name);
  }
 }
});
