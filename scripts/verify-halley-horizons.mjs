#!/usr/bin/env node
// Independent numerical comparison, not a model calibration.
// Each run queries Horizons for heliocentric J2000 ecliptic XYZ on dates
// that test the 1986 passage, the present distant orbit and the 2061 return.
// Horizons' TDB samples use midnight TDB; model Date is midnight UTC
// (sub-minute scale difference), explicitly labelled as an approximation.
import {readFile,writeFile} from 'node:fs/promises';
import {cometHeliocentricEcliptic} from '../comet-orbits.js';
import {parseHorizonsVector,vectorComparison} from '../horizons-validation.js';

const path=process.argv[2]||'dist/comets.json';
const output=process.argv[3]||'dist/halley-validation.json';
const catalogue=JSON.parse(await readFile(path,'utf8'));
const halley=catalogue.records.find(x=>x.name==='1P/Halley')||
 catalogue.records.find(x=>/halley/i.test(x.name)&&x.periodicNumber===1);
const dates=['1986-02-09','2026-11-17','2061-07-28'];
const report={schema:1,status:'unavailable',reference:'JPL Horizons',source:'https://ssd.jpl.nasa.gov/api/horizons.api',
 fetchedUtc:new Date().toISOString(),catalogueRetrievedUtc:catalogue.retrievedUtc,
 frame:'heliocentric J2000 ecliptic ICRF',model:'MPC two-body osculating conic, no perturbations',
 timeNote:'Horizons: midnight TDB; app model: midnight UTC/TT. Times differ slightly.',
 name:halley?.name||'1P/Halley',samples:[],errors:[]};
if(!halley)report.errors.push('Halley not found in MPC catalogue');
else{
 for(const date of dates){
  const model=cometHeliocentricEcliptic(halley,new Date(date+'T00:00:00Z'));
  if(!model){report.errors.push(date+': model propagation failed');continue}
  const next=new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const params=new URLSearchParams({
   format:'json',COMMAND:"'1P;'",MAKE_EPHEM:'YES',OBJ_DATA:'NO',EPHEM_TYPE:'VECTORS',
   CENTER:"'500@10'",START_TIME:"'"+date+"'",STOP_TIME:"'"+next+"'",
   STEP_SIZE:"'1 d'",OUT_UNITS:"'AU-D'",REF_PLANE:"'ECLIPTIC'",
   REF_SYSTEM:"'ICRF'",VEC_TABLE:'2',TIME_TYPE:"'TDB'"
  });
  try{
   const response=await fetch(report.source+'?'+params,{signal:AbortSignal.timeout(16000),headers:{'User-Agent':'HelioClock-ChatGPT orbital-validation/102'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   const reference=parseHorizonsVector(data.result);
   const comparison=vectorComparison(model,reference);
   report.samples.push({date,model:{x:model.x,y:model.y,z:model.z},
    horizons:reference,...comparison});
   console.log('JPL Horizons',date,
    'position difference',comparison.positionErrorAU.toFixed(5),'AU;',
    'direction difference',comparison.directionErrorDeg.toFixed(5),'deg',
    'model r',comparison.modelDistanceAU.toFixed(5),'JPL r',comparison.horizonsDistanceAU.toFixed(5));
  }catch(error){report.errors.push(date+': '+error.message);console.warn('Horizons unavailable',date,error.message)}
 }
}
report.status=report.samples.length===dates.length?'comparison-complete':
 report.samples.length?'partial':'unavailable';
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('Halley JPL comparison:',report.status,report.samples.length+'/'+dates.length,'dates; validation report',output);
