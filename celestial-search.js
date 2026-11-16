import {BRIGHT_STARS} from './sky-catalog.js';
import {MESSIER_DSOS} from './dso-catalog.js';
import {CONSTELLATION_NAMES} from './sky-constellation-names.js';
import {horizontal,precessJ2000} from './astronomy.js';
import {skyPlanets} from './sky-planets.js';

const PLANET_NAMES=['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];
export const SEARCH_OBJECTS=[
 ...PLANET_NAMES.map(name=>({name,type:'Planet',dynamic:true})),
 ...BRIGHT_STARS.map(s=>({name:s.name,type:'Star',ra:s.ra,dec:s.dec,mag:s.mag})),
 ...MESSIER_DSOS.map(([id,ra,dec,family,,mag,name])=>({name:id,type:family,ra,dec,mag,alias:name||''})),
 ...CONSTELLATION_NAMES.map(([abbr,name,ra,dec])=>({name,type:'Constellation',ra,dec,alias:abbr,approximate:true}))
];
export function findCelestialObjects(query,limit=12){
 const q=String(query||'').trim().toLocaleLowerCase();
 if(!q)return [];
 return SEARCH_OBJECTS.filter(o=>[o.name,o.alias].some(n=>n&&n.toLocaleLowerCase().includes(q)))
  .sort((a,b)=>Number(a.name.toLocaleLowerCase()===q)-Number(b.name.toLocaleLowerCase()===q)||
    Number(a.name.toLocaleLowerCase().startsWith(q))-Number(b.name.toLocaleLowerCase().startsWith(q))||
    a.name.localeCompare(b.name)).reverse().slice(0,limit);
}
export function celestialObjectPosition(object,date,lat,lon,precession=true){
 if(object.type==='Planet'&&object.dynamic){
  const planet=skyPlanets(date,lat,lon).find(p=>p.name===object.name);
  return planet?{ra:planet.ra,decl:planet.decl,az:planet.az,alt:planet.alt}:null;
 }
 const eq=precession?precessJ2000(object.ra,object.dec,date):{ra:object.ra,decl:object.dec};
 return {...eq,...horizontal(eq.ra,eq.decl,date,lat,lon)};
}

/**
 * Rise, upper transit, and set events on the UTC calendar date containing
 * the simulation timestamp. Geometric centre crossing altitude 0 degrees:
 * no refraction, atmospheric extinction, or local terrain horizon.
 * Planet positions are recomputed at each sample (not frozen at midnight).
 */
export function celestialDailyEvents(object,date,lat,lon,precession=true){
 const midnight=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
 const end=midnight+86400000;
 const interval=20*60000;
 const altitude=ms=>celestialObjectPosition(object,new Date(ms),lat,lon,precession)?.alt;
 const samples=[];
 for(let ms=midnight;ms<=end;ms+=interval){
  const alt=altitude(ms);
  if(!Number.isFinite(alt))return null;
  samples.push({ms,alt});
 }
 const refineCrossing=(a,b)=>{
  let lo=a.ms,hi=b.ms,fa=a.alt;
  for(let k=0;k<26&&hi-lo>1000;k++){
   const mid=(lo+hi)/2,fm=altitude(mid);
   if((fa<=0&&fm<=0)||(fa>=0&&fm>=0)){lo=mid;fa=fm;}
   else hi=mid;
  }
  return new Date((lo+hi)/2);
 };
 const rises=[],sets=[];
 for(let i=1;i<samples.length;i++){
  const a=samples[i-1],b=samples[i];
  if(a.alt<0&&b.alt>=0)rises.push(refineCrossing(a,b));
  if(a.alt>=0&&b.alt<0)sets.push(refineCrossing(a,b));
 }
 // Every day spans slightly more than one sidereal rotation. For planets
 // we still search every peak, rather than assuming a fixed transit time.
 const peaks=[];
 for(let i=1;i<samples.length-1;i++){
  if(samples[i].alt>=samples[i-1].alt&&samples[i].alt>=samples[i+1].alt){
   let lo=samples[i-1].ms,hi=samples[i+1].ms;
   for(let k=0;k<32&&hi-lo>1000;k++){
    const x=lo+(hi-lo)*.38196601125,y=lo+(hi-lo)*.61803398875;
    if(altitude(x)<altitude(y))lo=x;else hi=y;
   }
   const ms=(lo+hi)/2;
   peaks.push({date:new Date(ms),alt:altitude(ms)});
  }
 }
 const transit=peaks.sort((a,b)=>b.alt-a.alt)[0]||null;
 const alwaysAbove=samples.every(s=>s.alt>0);
 const alwaysBelow=samples.every(s=>s.alt<0);
 return {date:new Date(midnight),rises,sets,transit,
  horizonStatus:alwaysAbove?'always-above':alwaysBelow?'always-below':'crosses',
  definition:'Geometric centre at 0° altitude, no refraction or terrain'};
}
