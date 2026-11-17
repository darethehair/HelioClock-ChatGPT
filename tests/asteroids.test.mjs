import assert from 'node:assert/strict';
import {parseJplAsteroid,asteroidPosition,asteroidPath,asteroidSky,parseJplQueryAsteroids} from '../asteroid-orbits.js';
const elements=[['a',2.77],['e',.1],['i',10],['om',80],['w',70],['ma',0]].map(([name,value])=>({name,value:String(value)}));
const a=parseJplAsteroid({object:{des:'1'},orbit:{epoch:'2461000.5',elements}},1,'2026-11-17T00:00:00Z');
assert.equal(a.name,'Ceres');
assert.ok(asteroidPosition(a,new Date('2026-11-21T00:00:00Z')).distanceAU>2);
const path=asteroidPath(a);assert.equal(path.length,161);
assert.ok(Math.hypot(path[0].x-path.at(-1).x,path[0].y-path.at(-1).y)<1e-9);
const sky=asteroidSky(a,new Date('2026-11-21T00:00:00Z'),49,-98);
assert.ok(sky.az>=0&&sky.az<360&&sky.distanceAU>0);
assert.throws(()=>parseJplAsteroid({object:{des:'2'},orbit:{epoch:'2461000.5',elements}},1,''),/Invalid/);
console.log('Asteroid model checks passed.');

const fields=['pdes','name','epoch','a','e','i','om','w','ma','diameter'];
const parsed=parseJplQueryAsteroids({fields,data:[
 ['1','Ceres','2461000.5','2.77','.1','10','80','70','0','939'],
 ['4','Vesta','2461000.5','2.77','.1','10','80','70','0','525'],
 ['5','Psyche','2461000.5','2.77','.1','10','80','70','0',null]]},'now');
assert.equal(parsed.length,2);assert.equal(parsed[0].type,'Dwarf planet');assert.equal(parsed[1].number,4);
