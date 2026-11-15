import assert from 'node:assert/strict';
import {admin1Lines} from '../earth-admin1-data.js';
import {cities,regions,countries} from '../earth-gazetteer.js';

// The offline bundle must retain enough genuine geography to be useful.
assert.ok(admin1Lines.length>=500,'expected bundled Natural Earth admin-1 linework');
const codeSet=new Set(admin1Lines.map(x=>x[0]));
for(const code of ['CAN','USA','AUS','BRA','IND','CHN','RUS','ZAF'])
 assert.ok(codeSet.has(code),'missing region boundaries for '+code);
for(const [code,points] of admin1Lines){
 assert.ok(code.length===3&&points.length>=2);
 for(const [lon,lat] of points)assert.ok(Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90);
}
for(const group of [cities,regions,countries]){
 assert.ok(group.length>20);
 for(const row of group)assert.ok(typeof row[0]==='string'&&row[0].length>1&&Math.abs(row[1])<=180&&Math.abs(row[2])<=90);
}
for(const name of ['Morden','Winkler','Winnipeg','Fargo','Regina'])
 assert.ok(cities.some(row=>row[0]===name),'missing locally significant city: '+name);
assert.ok(cities.some(row=>row[0]==='Morden'&&Math.abs(row[1]+98.1)<.1&&Math.abs(row[2]-49.19)<.1));
console.log('Offline political geography tests passed:',admin1Lines.length,'lines,',cities.length,'cities');
