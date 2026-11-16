import assert from 'node:assert/strict';
import {parseMpcCometLine,parseMpcCometCatalog} from '../comet-catalog.js';
// Construct an MPC E&OE line using its published 1-based field columns.
function row(overrides={}){
 const parts=[
 [1,4,'12'],[5,5,'P'],[6,12,''],[15,18,'2027'],[20,21,'03'],
 [23,29,'12.5000'],[31,39,'0.500000'],[42,49,'0.750000'],
 [52,59,'125.0000'],[62,69,'245.0000'],[72,79,'15.0000'],
 [82,85,'2026'],[86,87,'11'],[88,89,'16'],[92,95,'12.0'],
 [97,100,'4.0'],[103,158,'12P/Pons-Brooks'],[160,168,'MPC 1234']
 ];
 let chars=Array(168).fill(' ');
 for(const [a,b,value] of parts){const v=String(overrides[a]??value);chars.splice(a-1,b-a+1,...v.padStart(b-a+1).slice(0,b-a+1));}
 return chars.join('');
}
const a=parseMpcCometLine(row());
assert.equal(a.name,'12P/Pons-Brooks');
assert.equal(a.perihelion.dayTT,12.5);
assert.equal(a.qAU,.5);
assert.equal(a.eccentricity,.75);
assert.equal(a.epochTT.year,2026);
assert.equal(a.inclinationDeg,15);
assert.equal(a.periodicNumber,12);
assert.equal(parseMpcCometLine(row({31:'*********'})),null,'invalid numeric field rejected');
assert.equal(parseMpcCometLine(row({42:'1.050000'})).eccentricity,1.05,'open orbit accepted');
assert.equal(parseMpcCometLine(row({82:'    ',86:'  ',88:'  '})).epochTT,null,'unperturbed orbit may have no epoch');
const cat=parseMpcCometCatalog('header\n'+row()+'\n'+row({31:'*********'})+'\n',{retrievedUtc:'2026-11-16T00:00:00Z'});
assert.equal(cat.count,1);
assert.equal(cat.rejected,1);
assert.equal(cat.records[0].reference,'MPC 1234');
assert.equal(cat.timeScale,'TT');
console.log('MPC comet parser checks passed');
