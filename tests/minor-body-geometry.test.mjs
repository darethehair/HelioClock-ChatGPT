import assert from 'node:assert/strict';
import {minorBodyGeometry} from '../minor-body-geometry.js';
const asteroid=minorBodyGeometry({name:'Vesta',type:'Asteroid',elements:{
 aAU:2.5,eccentricity:.2,inclinationDeg:7,nodeDeg:103,argPeriDeg:150
}},{x:1,y:2,z:-.4,epochAgeDays:10});
assert.equal(asteroid.perihelionAU,2);
assert.equal(asteroid.aphelionAU,3);
assert.equal(asteroid.heightAU,-.4);
assert.equal(asteroid.inclinationDeg,7);
assert.ok(Math.abs(asteroid.sunDistanceAU-Math.sqrt(5.16))<1e-12);
const halley=minorBodyGeometry({name:'1P/Halley',type:'Comet',elements:{
 qAU:.586,eccentricity:.967,inclinationDeg:162.3,nodeDeg:58,argPeriDeg:112
}},{x:1,y:2,z:3});
assert.ok(halley.aphelionAU>30&&halley.aphelionAU<40);
const unbound=minorBodyGeometry({name:'Open comet',type:'Comet',elements:{
 qAU:1,eccentricity:1.1,inclinationDeg:45
}},{x:1,y:0,z:1});
assert.equal(unbound.aphelionAU,null);
assert.equal(minorBodyGeometry({type:'Comet',elements:{qAU:0,eccentricity:0,inclinationDeg:0}},{x:1,y:0,z:0}),null);
console.log('Minor-body orbital geometry validation passed.');
