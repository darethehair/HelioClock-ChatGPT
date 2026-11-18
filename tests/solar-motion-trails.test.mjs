import test from 'node:test';
import assert from 'node:assert/strict';
import {solarTrailSamples,subsolarPosition,addSolarBreadcrumb} from '../solar-motion-trails.js';
import {sunHorizontal} from '../astronomy.js';

test('Solar analemma sampling covers the year at fixed UTC time',()=>{
 const at=new Date('2026-11-18T17:42:09Z');
 const dates=solarTrailSamples(at);
 assert.ok(dates.length>=70&&dates.length<=80);
 assert.equal(dates[0].toISOString(),'2026-01-01T17:42:09.000Z');
 assert.equal(dates.at(-1).toISOString(),'2026-12-31T17:42:09.000Z');
 assert.ok(dates.every(d=>d.getUTCHours()===17&&d.getUTCMinutes()===42));
 assert.ok(dates.every((d,i)=>i===0||d>dates[i-1]));
});
test('Subsolar analemma respects solstices and Equation of Time',()=>{
 const jun=subsolarPosition(new Date('2026-06-21T12:00:00Z'));
 const dec=subsolarPosition(new Date('2026-12-21T12:00:00Z'));
 const mar=subsolarPosition(new Date('2026-03-20T12:00:00Z'));
 assert.ok(jun.lat>23&&jun.lat<24);
 assert.ok(dec.lat< -23&&dec.lat> -24);
 assert.ok(Math.abs(mar.lat)<1);
 for(const p of [jun,dec,mar])assert.ok(p.lon>=-180&&p.lon<180);
 // Fixed-UTC longitude should vary only by the equation of time, not drift 360 degrees.
 const dates=solarTrailSamples(new Date('2026-11-18T12:00:00Z'));
 const coords=dates.map(subsolarPosition);
 assert.ok(Math.max(...coords.map(p=>p.lon))-Math.min(...coords.map(p=>p.lon))<10);
 assert.ok(coords.some(p=>p.lat>20)&&coords.some(p=>p.lat< -20));
 const above=sunHorizontal(new Date('2026-06-21T17:42:09Z'),49.19,-98.10);
 assert.ok(above.alt>50);
});
test('Breadcrumbs deduplicate repeated frames and preserve reverse steps',()=>{
 let history=[];
 history=addSolarBreadcrumb(history,new Date('2026-11-18T12:00:00Z'));
 history=addSolarBreadcrumb(history,new Date('2026-11-18T12:00:00Z'));
 history=addSolarBreadcrumb(history,new Date('2026-11-17T12:00:00Z'));
 assert.equal(history.length,2);
 assert.ok(history[1]<history[0]);
 for(let i=0;i<15;i++)history=addSolarBreadcrumb(history,new Date(Date.UTC(2026,0,i+1)),5);
 assert.equal(history.length,5);
});
