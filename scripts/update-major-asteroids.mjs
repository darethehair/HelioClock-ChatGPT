#!/usr/bin/env node
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {TARGETS,parseJplAsteroid} from '../asteroid-orbits.js';
const out=process.argv[2]||'dist/major-asteroids.json',retrievedUtc=new Date().toISOString();
const snapshot={schema:1,source:'NASA/JPL SBDB',url:'https://ssd-api.jpl.nasa.gov/sbdb.api',retrievedUtc,status:'ready',records:[],errors:[]};
for(const target of TARGETS){
 try{
  const u=new URL(snapshot.url);u.searchParams.set('sstr',String(target.number));u.searchParams.set('full-prec','true');
  const res=await fetch(u,{signal:AbortSignal.timeout(18000)});if(!res.ok)throw Error('HTTP '+res.status);
  snapshot.records.push(parseJplAsteroid(await res.json(),target.number,retrievedUtc));
 }catch(error){snapshot.errors.push(target.number+': '+error.message)}
}
if(snapshot.records.length!==4){snapshot.status='unavailable';snapshot.records=[]}
await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(snapshot,null,2)+'\n');
console.log('JPL asteroid snapshot',snapshot.status,snapshot.records.length,snapshot.errors.join('; '));
