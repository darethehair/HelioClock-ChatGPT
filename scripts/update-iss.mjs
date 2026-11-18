#!/usr/bin/env node
// Optional network snapshot for standalone offline PWA. Never fabricate current orbital elements.
import {writeFile} from 'node:fs/promises';
const url='https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
const output=process.argv[2]||'dist/iss-elements.json';
let result={schema:1,source:url,retrieved:null,elements:null,status:'unavailable'};
try{
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'HelioClock/1.0 ISS educational tracker','Accept':'application/json'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 const rows=await response.json();
 const e=Array.isArray(rows)?rows.find(row=>Number(row.NORAD_CAT_ID)===25544):null;
 if(!e||!e.EPOCH||!Number.isFinite(Number(e.MEAN_MOTION))||Number(e.MEAN_MOTION)<=0)
  throw Error('Invalid ISS OMM record');
 const epoch=new Date(e.EPOCH.endsWith('Z')?e.EPOCH:e.EPOCH+'Z');
 if(!Number.isFinite(epoch.getTime()))throw Error('Invalid epoch');
 result={...result,elements:e,retrieved:new Date().toISOString(),status:'available'};
 console.log('Bundled CelesTrak ISS OMM epoch:',epoch.toISOString());
}catch(error){
 console.warn('ISS OMM download unavailable; bundle contains explicit unavailable status:',error.message);
}
await writeFile(output,JSON.stringify(result,null,2)+'\n');
