import assert from 'node:assert/strict';
import {nearestCatalogSettlement,settlementDistanceKm} from '../earth-nearest-settlement.js';

assert.ok(Math.abs(settlementDistanceKm(-98.1,49.19,-98.1,49.19))<1e-8);
assert.ok(Math.abs(settlementDistanceKm(0,0,1,0)-111.195)<.05);
assert.ok(Math.abs(settlementDistanceKm(179.5,0,-179.5,0)-111.195)<.05);
const morden=nearestCatalogSettlement(-98.101,49.191);
assert.equal(morden?.name,'Morden','known exact city position should match');
assert.ok(morden.distanceKm<.02);
const winnipeg=nearestCatalogSettlement(-97.138,49.895);
assert.equal(winnipeg?.name,'Winnipeg');
assert.ok(winnipeg.distanceKm<.05);
const rows=[['West',-5,0],['East',5,0],['North',0,50]];
assert.equal(nearestCatalogSettlement(4,0,rows)?.name,'East');
assert.equal(nearestCatalogSettlement(-4,0,rows)?.name,'West');
assert.equal(nearestCatalogSettlement(0,49,rows)?.name,'North');
assert.equal(nearestCatalogSettlement(0,0,[]),null);
assert.equal(nearestCatalogSettlement(NaN,0,rows),null);
console.log('Nearest settlement tests passed');
