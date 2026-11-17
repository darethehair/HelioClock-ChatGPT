import assert from 'node:assert/strict';
import {parseHorizonsVector,vectorComparison} from '../horizons-validation.js';
const sample=`Header
$$SOE
2461362.500000000 = A.D. 2026-Nov-17 00:00:00.0000 TDB
 X =  1.234567890123E+01 Y = -2.000000000000E+00 Z =  1.250000000000E+00
 VX=  9.9999E-04 VY= 3.0E-03 VZ=0
$$EOE
Footer`;
assert.deepEqual(parseHorizonsVector(sample),{x:12.34567890123,y:-2,z:1.25});
assert.throws(()=>parseHorizonsVector('bad input'),/ephemeris/);
const same=vectorComparison({x:3,y:4,z:0},{x:3,y:4,z:0});
assert.ok(same.positionErrorAU<1e-12);
assert.ok(same.directionErrorDeg<1e-5);
const opposite=vectorComparison({x:1,y:0,z:0},{x:-1,y:0,z:0});
assert.equal(opposite.directionErrorDeg,180);
assert.equal(opposite.positionErrorAU,2);
console.log('Horizons vector parser and XYZ comparison test passed.');
