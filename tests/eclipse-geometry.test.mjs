import assert from 'node:assert/strict';
import {discOverlapFraction,solarEclipseGeometry} from '../eclipse-geometry.js';

// Pure circle intersections are the foundation for partial and grazing events.
assert.equal(discOverlapFraction(1,.8,2),0);
assert.ok(Math.abs(discOverlapFraction(1,.8,0)-.64)<1e-12);
assert.equal(discOverlapFraction(1,1,0),1);
assert.ok(discOverlapFraction(1,1,1)>0 && discOverlapFraction(1,1,1)<1);
assert.ok(discOverlapFraction(1,.8,1.799)>0,'tiny grazing overlap');
assert.ok(discOverlapFraction(1,.8,1.801)===0,'no overlap just outside limb');

const dallas=solarEclipseGeometry(new Date('2024-04-08T18:40:00Z'),32.7767,-96.7970);
assert.equal(dallas.kind,'total','Dallas was inside the path of totality');
assert.ok(dallas.obscuration>.99);
assert.ok(dallas.sunRadius>.25&&dallas.sunRadius<.28);
assert.ok(dallas.moonRadius>.24&&dallas.moonRadius<.29);
assert.ok(dallas.separation<dallas.sunRadius+dallas.moonRadius);
assert.equal(dallas.aboveHorizon,true);
const winnipeg=solarEclipseGeometry(new Date('2024-04-08T18:40:00Z'),49.9,-97.1);
assert.equal(winnipeg.kind,'partial');
assert.ok(winnipeg.obscuration>.1&&winnipeg.obscuration<1);
const before=solarEclipseGeometry(new Date('2024-04-06T18:40:00Z'),32.7767,-96.7970);
assert.equal(before.kind,'none');
assert.equal(before.obscuration,0);
const after=solarEclipseGeometry(new Date('2024-04-10T18:40:00Z'),32.7767,-96.7970);
assert.equal(after.obscuration,0);
console.log('Solar eclipse topocentric geometry and grazing discs passed.');
