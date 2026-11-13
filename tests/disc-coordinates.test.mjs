import test from 'node:test';
import assert from 'node:assert/strict';
import {discGeometry,screenToSurface,surfaceToScreen,formatSurface} from '../disc-coordinates.js';
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
