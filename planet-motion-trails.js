import * as Astronomy from 'astronomy-engine';
import {horizontal} from './astronomy.js';

export const PLANET_TRAIL_NAMES=['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];
// Coordinates are apparent, topocentric equatorial-of-date from Astronomy Engine.
// This matches the planet markers already drawn in the Sky Compass.
export function planetTrailPosition(name,date,lat,lon){
 if(!PLANET_TRAIL_NAMES.includes(name))return null;
 const eq=Astronomy.Equator(Astronomy.Body[name],date,new Astronomy.Observer(lat,lon,0),true,true);
 const horizon=Astronomy.Horizon(date,new Astronomy.Observer(lat,lon,0),eq.ra,eq.dec,'');
 return {ra:eq.ra*15,decl:eq.dec,az:horizon.azimuth,alt:horizon.altitude};
}
export function planetTrailDates(date,spanDays=400,stepDays=2){
 const days=Math.max(30,Math.min(730,Math.floor(spanDays)));
 const step=Math.max(1,Math.min(14,Math.floor(stepDays)));
 const start=date.getTime()-Math.floor(days/2)*86400000;
 const end=date.getTime()+Math.ceil(days/2)*86400000;
 const dates=[];
 for(let t=start;t<=end;t+=step*86400000)dates.push(new Date(t));
 if(dates.at(-1).getTime()!==end)dates.push(new Date(end));
 return dates;
}
// Sky-frame mode freezes the plotting reference at the chosen simulation
// instant. Otherwise a daily diurnal turn would hide retrograde loops.
export function planetTrailCoordinates(name,dates,{lat,lon,frame='stars',referenceDate=dates[0]}){
 return dates.map(date=>{
  const p=planetTrailPosition(name,date,lat,lon);
  if(!p)return null;
  if(frame==='horizon')return p;
  const horizon=horizontal(p.ra,p.decl,referenceDate,lat,lon);
  return {...p,az:horizon.az,alt:horizon.alt};
 });
}
export function paintPlanetSkyTrail(ctx,points,{mode='polar',width,height,belowHorizon=false,project,dots=true,line=true,zoom=1,color='#a7d9ff'}){
 const segments=[];let segment=[],count=0,previousX=null;
 const finish=()=>{if(segment.length)segments.push(segment);segment=[];previousX=null;};
 for(const p of points){
  if(!p||!Number.isFinite(p.alt)||(!belowHorizon&&p.alt<0)){finish();continue;}
  const xy=project(p.az,p.alt);
  if(!xy||!xy.every(Number.isFinite)){finish();continue;}
  if(mode==='rect'&&previousX!==null&&Math.abs(xy[0]-previousX)>width*.42)finish();
  segment.push(xy);previousX=xy[0];count++;
 }
 finish();
 ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.7/zoom;ctx.globalAlpha=.9;
 if(line)for(const part of segments){
  if(part.length<2)continue;
  ctx.beginPath();
  for(let i=0;i<part.length;i++)i?ctx.lineTo(...part[i]):ctx.moveTo(...part[i]);
  ctx.stroke();
 }
 if(dots)for(const part of segments)for(const [x,y] of part){
  ctx.beginPath();ctx.arc(x,y,2.3/zoom,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();return count;
}
