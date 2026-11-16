import test from 'node:test';
import assert from 'node:assert/strict';
import {drawSkyMoon,moonBrightDirection} from '../sky-moon-phase.js';
test('illuminated limb follows projected Sun direction',()=>{
 const project=(az,alt)=>[az,-alt];
 const east=moonBrightDirection({az:100,alt:30},{az:110,alt:30},project);
 const west=moonBrightDirection({az:100,alt:30},{az:90,alt:30},project);
 assert.ok(Math.cos(east)>0.99);
 assert.ok(Math.cos(west)<-0.99);
});
test('Moon phase marker paints zero, quarter and full illumination',()=>{
 for(const [fraction,expected] of [[0,0],[.5,1],[1,1]]){
  let strokes=0;
  const c={__skyGlyphScale:1,save(){},restore(){},translate(){},scale(){},rotate(){},beginPath(){},arc(){},fill(){},stroke(){strokes++},moveTo(){},lineTo(){}};
  drawSkyMoon(c,10,10,7,fraction,true,0);
  assert.ok(strokes>=1);
  if(expected)assert.ok(strokes>1);
  else assert.equal(strokes,1);
 }
});
