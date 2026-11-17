#!/usr/bin/env node
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {parseJplQueryAsteroids} from '../asteroid-orbits.js';
const out=process.argv[2]||'dist/major-asteroids.json',retrievedUtc=new Date().toISOString();
const url=new URL('https://ssd-api.jpl.nasa.gov/sbdb_query.api');
for(const [k,v] of Object.entries({'fields':'pdes,name,epoch,a,e,i,om,w,ma,diameter,class,orbit_id,equinox',
 'sb-kind':'a','sb-ns':'n','sort':'-diameter','limit':'100','full-prec':'true'}))url.searchParams.set(k,v);
const snapshot={schema:2,source:'NASA/JPL SBDB Query',url:String(url),retrievedUtc,
 selection:'100 numbered minor planets ranked by published diameter',status:'unavailable',count:0,records:[],errors:[]};
try{
 const res=await fetch(url,{signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error('JPL HTTP '+res.status);
 snapshot.records=parseJplQueryAsteroids(await res.json(),retrievedUtc);
 if(snapshot.records.length!==100)throw Error('Only '+snapshot.records.length+' valid records returned; expected 100');
 snapshot.status='ready';snapshot.count=100;
}catch(err){snapshot.errors.push(String(err));snapshot.records=[]}
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(snapshot,null,2)+'\n');
console.log('100 minor planets:',snapshot.status,snapshot.count,snapshot.errors.join(' '));
if(snapshot.status!=='ready')process.exitCode=1;
