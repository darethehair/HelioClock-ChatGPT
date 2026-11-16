#!/usr/bin/env node
// Node 22; refreshes a release snapshot. Usage: node scripts/update-comets.mjs
// For offline import/testing: node scripts/update-comets.mjs --input path/to/CometEls.txt
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {MPC_COMET_URL,parseMpcCometCatalog} from '../comet-catalog.js';

const args=process.argv.slice(2);
const index=args.indexOf('--input');
const local=index>=0?args[index+1]:null;
if(index>=0&&!local)throw Error('--input requires a path');
const fallbackIndex=args.indexOf('--fallback');
const fallback=fallbackIndex>=0?args[fallbackIndex+1]:null;
if(fallbackIndex>=0&&!fallback)throw Error('--fallback requires a path');
const outputIndex=args.indexOf('--output');
const output=outputIndex>=0?args[outputIndex+1]:'dist/comets.json';
if(!output)throw Error('--output requires a path');
async function download(){
 let last;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(MPC_COMET_URL,{redirect:'follow',signal:AbortSignal.timeout(45000),headers:{'User-Agent':'HelioClock-ChatGPT/95 (educational comet catalogue)'}});
   if(!response.ok)throw Error('MPC returned HTTP '+response.status);
   const text=await response.text();
   if(text.length<10000)throw Error('MPC catalogue unexpectedly small');
   return text;
  }catch(error){last=error;console.warn('MPC fetch attempt '+attempt+': '+error.message)}
 }
 throw new Error('Unable to refresh MPC comet data: '+last?.message);
}
let parsed;
try{
 const raw=local?await readFile(local,'utf8'):await download();
 parsed=parseMpcCometCatalog(raw,{
  retrievedUtc:new Date().toISOString(),sourceUrl:local?'local CometEls.txt':MPC_COMET_URL
 });
 if(parsed.count<(local?1:100)||parsed.rejected>Math.max(30,parsed.count*.15))
  throw Error('Invalid MPC catalogue: '+parsed.count+' valid; '+parsed.rejected+' rejected');
 parsed.status='ready';
}catch(error){
 if(local||!fallback)throw error;
 console.warn('MPC refresh unavailable: '+error.message);
 try{
  const candidate=JSON.parse(await readFile(fallback,'utf8'));
  if(candidate.schema!==1||candidate.count<100||candidate.records?.length!==candidate.count||
     candidate.source!=='Minor Planet Center')throw Error('bad fallback catalogue');
  parsed={...candidate,status:'cached',refreshAttemptUtc:new Date().toISOString()};
 }catch{
  parsed={schema:1,status:'unavailable',source:'Minor Planet Center',
   sourceUrl:MPC_COMET_URL,retrievedUtc:null,
   frame:'heliocentric J2000 ecliptic',timeScale:'TT',
   format:'CometEls.txt fixed-width E&OE',count:0,rejected:0,ignored:0,records:[]};
 }
}
await mkdir(dirname(output),{recursive:true});
await writeFile(output+'.tmp',JSON.stringify(parsed)+'\n');
await rename(output+'.tmp',output);
console.log('MPC comet elements: '+parsed.count+'; status='+parsed.status+'; '+output);
