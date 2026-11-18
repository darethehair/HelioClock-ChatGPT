import * as satellite from 'satellite.js';
import {geoDistance,geoPath} from 'd3-geo';

export const ISS_CAT_ID=25544;
export const ISS_SOURCE='https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON';
export const ISS_MAX_DAYS=5;
const DAY_MS=86400000;
const DEG=180/Math.PI;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function issEpoch(elements){
 if(!elements||typeof elements.EPOCH!=='string')return null;
 const epoch=elements.EPOCH.trim();
 const date=new Date(/[zZ]|[+-]\d\d:\d\d$/.test(epoch)?epoch:epoch+'Z');
 return Number.isFinite(date.getTime())?date:null;
}
export function normalizeIssPayload(data){
 const record=Array.isArray(data)?data[0]:data?.elements;
 if(!record||Number(record.NORAD_CAT_ID)!==ISS_CAT_ID)return null;
 const epoch=issEpoch(record);
 if(!epoch||!Number.isFinite(Number(record.MEAN_MOTION))||Number(record.MEAN_MOTION)<=0)return null;
 const satrec=satellite.json2satrec(record);
 if(!satrec||!finite(satrec.no)||satrec.no<=0||satrec.error)return null;
 return {elements:record,epoch,satrec,source:data?.source||ISS_SOURCE,retrieved:data?.retrieved||null};
}
export function issElementAgeDays(model,date){
 return model?Math.abs(date.getTime()-model.epoch.getTime())/DAY_MS:Infinity;
}
export function issElementStatus(model,date){
 if(!model)return {valid:false,label:'No ISS orbital elements loaded',ageDays:Infinity};
 const ageDays=issElementAgeDays(model,date);
 return {valid:ageDays<=ISS_MAX_DAYS,ageDays,
  label:ageDays>ISS_MAX_DAYS?'Elements too far from selected time':
   ageDays>2?'Approximate · older elements':'Recent elements'};
}
export function issPosition(model,date){
 if(!issElementStatus(model,date).valid)return null;
 const pv=satellite.propagate(model.satrec,date);
 if(!pv||!pv.position||!pv.velocity)return null;
 const p=pv.position,v=pv.velocity;
 if(![p.x,p.y,p.z,v.x,v.y,v.z].every(finite))return null;
 const geo=satellite.eciToGeodetic(p,satellite.gstime(date));
 const lat=geo.latitude*DEG,lon=satellite.degreesLong(geo.longitude);
 const heightKm=geo.height;
 const speedKmS=Math.hypot(v.x,v.y,v.z);
 if(![lat,lon,heightKm,speedKmS].every(finite)||heightKm<100||heightKm>3000)return null;
 return {lat,lon,heightKm,speedKmS,date};
}
export function issGroundTrack(model,date,{halfMinutes=45,stepMinutes=2}={}){
 if(!model)return [];
 const positions=[];
 const half=Math.max(0,Math.min(90,Math.floor(halfMinutes)));
 const step=Math.max(1,Math.min(10,Math.floor(stepMinutes)));
 for(let minute=-half;minute<=half;minute+=step){
  const t=new Date(date.getTime()+minute*60000);
  const p=issPosition(model,t);
  if(p)positions.push({...p,offsetMinutes:minute});
 }
 return positions;
}
export function paintIssEarth(ctx,width,height,projection,state,track,center){
 if(!center)return {count:0,visible:false};
 const globe=state.earthProjection==='globe';
 const inView=p=>!globe||geoDistance([p.lon,p.lat],[state.earthLon,state.earthLat])<=Math.PI/2+1e-8;
 // D3's geometry stream handles map seams, map rotations and the globe limb.
 const past=track.filter(p=>p.offsetMinutes<=0).map(p=>[p.lon,p.lat]);
 const future=track.filter(p=>p.offsetMinutes>=0).map(p=>[p.lon,p.lat]);
 const path=geoPath(projection,ctx);
 ctx.save();ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
 ctx.strokeStyle='#64d5ff';ctx.setLineDash([4,4]);
 if(past.length>1){ctx.beginPath();path({type:'LineString',coordinates:past});ctx.stroke();}
 ctx.strokeStyle='#f7df9b';ctx.setLineDash([6,5]);
 if(future.length>1){ctx.beginPath();path({type:'LineString',coordinates:future});ctx.stroke();}
 ctx.setLineDash([]);
 const visible=inView(center);
 if(visible){
  const xy=projection([center.lon,center.lat]);
  if(xy&&xy.every(finite)){
   ctx.shadowColor='#8ee9ff';ctx.shadowBlur=12;ctx.fillStyle='#9bf0ff';
   ctx.beginPath();ctx.arc(xy[0],xy[1],5,0,Math.PI*2);ctx.fill();
   ctx.shadowBlur=0;ctx.strokeStyle='#062f43';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(xy[0],xy[1],5,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#dffbff';ctx.font='bold 12px sans-serif';
   ctx.fillText('ISS',xy[0]+9,xy[1]-9);
  }
 }
 ctx.restore();
 return {count:track.length,visible};
}
