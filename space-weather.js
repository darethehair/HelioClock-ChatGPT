// NOAA SWPC near-real-time space weather, independent of simulated time.
const AURORA_URL='https://services.swpc.noaa.gov/json/ovation_aurora_latest.json';
const KP_URL='https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
const UPDATE_MS=5*60*1000,MAX_AGE_MS=3*60*60*1000;
let snapshot={grid:null,forecast:null,observed:null,kp:null,kpTime:null,error:null};
let pending=false;
const notify=()=>window.dispatchEvent(new Event('helioclock-space-weather'));
const readTime=value=>{
 const str=String(value||'').trim().replace(' ','T');
 const d=new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(str)?str:str+'Z');
 return Number.isFinite(d.getTime())?d:null;
};
export function parseAurora(data){
 if(!data||!Array.isArray(data.coordinates))throw Error('Invalid NOAA OVATION coordinates');
 const forecast=readTime(data['Forecast Time']),observed=readTime(data['Observation Time']);
 if(!forecast||!observed)throw Error('Missing NOAA forecast timestamps');
 const grid=new Uint8Array(360*181);let valid=0;
 for(const row of data.coordinates){
  if(!Array.isArray(row)||row.length<3)continue;
  const lon=Number(row[0]),lat=Number(row[1]),val=Number(row[2]);
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(val)||lon<0||lon>360||lat< -90||lat>90||val<0||val>100)continue;
  const x=Math.round(lon)%360,y=Math.round(lat)+90;
  grid[y*360+x]=Math.max(grid[y*360+x],Math.round(val));valid++;
 }
 if(valid<100)throw Error('Incomplete NOAA OVATION grid');
 return {grid,forecast:forecast.toISOString(),observed:observed.toISOString()};
}
export function parseKp(data){
 if(!Array.isArray(data)||data.length<2)throw Error('Invalid NOAA Kp feed');
 const header=Array.isArray(data[0])?data[0].map(x=>String(x).toLowerCase()):[];
 const kpCol=Math.max(1,header.findIndex(x=>x==='kp'||x.includes('kp')));
 const timeCol=Math.max(0,header.findIndex(x=>x.includes('time')));
 for(let i=data.length-1;i>=1;i--){
  const row=data[i];if(!Array.isArray(row))continue;
  const kp=Number(row[kpCol]),date=readTime(row[timeCol]);
  if(date&&Number.isFinite(kp)&&kp>=0&&kp<=9)return {kp,kpTime:date.toISOString()};
 }
 throw Error('No valid Kp observation');
}
export const spaceWeather=()=>snapshot;
export function auroraFresh(){
 const time=Date.parse(snapshot.forecast||'');
 return !!snapshot.grid&&Number.isFinite(time)&&Math.abs(Date.now()-time)<MAX_AGE_MS;
}
export async function refreshSpaceWeather(){
 if(pending)return;
 pending=true;
 try{
  const fetchJSON=async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('NOAA '+r.status);return r.json()};
  const [aurora,kp]=await Promise.allSettled([
   fetchJSON(AURORA_URL).then(parseAurora),
   fetchJSON(KP_URL).then(parseKp)
  ]);
  const next={...snapshot,error:null};
  if(aurora.status==='fulfilled')Object.assign(next,aurora.value);
  else{next.grid=null;next.forecast=null;next.observed=null;next.error='Aurora data unavailable'}
  if(kp.status==='fulfilled')Object.assign(next,kp.value);
  else{next.kp=null;next.kpTime=null;next.error=[next.error,'Kp unavailable'].filter(Boolean).join(' · ')}
  snapshot=next;notify();
 }finally{pending=false}
}
export function startSpaceWeather(){
 refreshSpaceWeather().catch(()=>{snapshot={...snapshot,grid:null,kp:null,error:'NOAA offline'};notify()});
 setInterval(()=>{if(navigator.onLine)refreshSpaceWeather().catch(()=>{})},UPDATE_MS);
}
