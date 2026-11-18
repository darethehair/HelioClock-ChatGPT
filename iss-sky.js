import * as satellite from 'satellite.js';
import {solar,sunHorizontal,RAD} from './astronomy.js';
import {issElementStatus} from './iss-tracking.js';

const EARTH_RADIUS_KM=6378.137;
const finite=Number.isFinite;
// Apparent altitude/azimuth use topocentric observer and the same SGP4 record
// as the Earth-map subpoint; geometric horizon ignores terrain/refraction.
export function issSkyPosition(model,date,lat,lon){
 if(!issElementStatus(model,date).valid)return null;
 const pv=satellite.propagate(model.satrec,date);
 if(!pv?.position||!pv?.velocity)return null;
 const p=pv.position;
 if(![p.x,p.y,p.z].every(finite))return null;
 const gmst=satellite.gstime(date);
 const ecf=satellite.eciToEcf(p,gmst);
 const obs={latitude:lat*RAD,longitude:lon*RAD,height:0};
 const look=satellite.ecfToLookAngles(obs,ecf);
 const alt=look.elevation/RAD,az=((look.azimuth/RAD)%360+360)%360;
 const rangeKm=look.rangeSat;
 if(![alt,az,rangeKm].every(finite))return null;
 // Low-precision Sun equatorial direction, adequate for an illustrative
 // cylindrical Earth umbra test, not precision illumination modelling.
 const sun=solar(date);
 const ra=sun.ra*RAD,dec=sun.decl*RAD;
 const unit=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
 const along=p.x*unit[0]+p.y*unit[1]+p.z*unit[2];
 const perpendicularSq=Math.max(0,p.x*p.x+p.y*p.y+p.z*p.z-along*along);
 const sunlit=!(along<0&&perpendicularSq<EARTH_RADIUS_KM*EARTH_RADIUS_KM);
 const sunAlt=sunHorizontal(date,lat,lon).alt;
 const likelyVisible=alt>10&&sunlit&&sunAlt< -6;
 return {date,alt,az,rangeKm,sunlit,sunAlt,likelyVisible};
}
export function issSkyTrack(model,date,lat,lon,halfMinutes=12,stepSeconds=20){
 const points=[];
 for(let seconds=-halfMinutes*60;seconds<=halfMinutes*60;seconds+=stepSeconds){
  const t=new Date(date.getTime()+seconds*1000);
  const p=issSkyPosition(model,t,lat,lon);
  if(p)points.push({...p,offsetSeconds:seconds});
 }
 return points;
}
export function paintIssSky(ctx,points,current,{mode,width,belowHorizon,project,zoom=1}){
 if(!points.length&&!current)return {count:0,visible:false};
 let count=0,segments=[],segment=[],lastX=null;
 const finish=()=>{if(segment.length)segments.push(segment);segment=[];lastX=null;};
 for(const p of points){
  if(p.alt<0&&!belowHorizon){finish();continue;}
  const xy=project(p.az,p.alt);
  if(!xy||!xy.every(finite)){finish();continue;}
  if(mode==='rect'&&lastX!==null&&Math.abs(xy[0]-lastX)>width*.42)finish();
  segment.push({...p,xy});lastX=xy[0];count++;
 }
 finish();
 ctx.save();ctx.lineWidth=1.8/zoom;ctx.lineCap='round';
 for(const part of segments){
  if(part.length<2)continue;
  ctx.beginPath();part.forEach(({xy},i)=>i?ctx.lineTo(...xy):ctx.moveTo(...xy));
  ctx.strokeStyle='#8bcdf5';ctx.setLineDash([4/zoom,4/zoom]);ctx.stroke();
 }
 ctx.setLineDash([]);
 const visible=!!current&&(current.alt>=0||belowHorizon);
 if(visible){
  const xy=project(current.az,current.alt);
  if(xy?.every(finite)){
   ctx.fillStyle=current.likelyVisible?'#b8fff0':current.sunlit?'#94d6ff':'#8199af';
   ctx.strokeStyle='#072138';ctx.lineWidth=1.6/zoom;
   ctx.beginPath();ctx.arc(xy[0],xy[1],5/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();
   ctx.fillStyle='#dff9ff';ctx.font=`${11/zoom}px sans-serif`;
   ctx.fillText('ISS',xy[0]+8/zoom,xy[1]-8/zoom);
  }
 }
 ctx.restore();
 return {count,visible};
}
// Locate the adjacent complete horizon crossing. Scan in direction of time,
// bracketing one full pass; 60-second resolution is sufficient for Stage 2.
export function findIssPass(model,date,lat,lon,direction=1,{hours=48,stepSeconds=60}={}){
 if(!model||![1,-1].includes(direction))return null;
 const limit=Math.max(1,Math.min(96,hours))*3600;
 let crossing=null,last=null,pass=[];
 for(let offset=0;offset<=limit;offset+=stepSeconds){
  const t=new Date(date.getTime()+direction*offset*1000);
  const p=issSkyPosition(model,t,lat,lon);
  if(!p)return null;
  if(last){
   const entered=last.alt<=0&&p.alt>0;
   const exited=last.alt>0&&p.alt<=0;
   if(!crossing){
    if(entered){crossing=direction===1?'rise':'set';pass=[last,p];}
   }else{
    pass.push(p);
    if(exited||entered){
     if(exited){
      const chronological=direction===1?pass:pass.reverse();
      const above=chronological.filter(x=>x.alt>0);
      if(!above.length)return null;
      const max=above.reduce((a,b)=>b.alt>a.alt?b:a);
      return {rise:chronological[0].date,set:chronological.at(-1).date,
       maximum:max.date,maxAlt:max.alt,azRise:chronological[0].az,
       azSet:chronological.at(-1).az,sunlitAtMax:max.sunlit,
       likelyVisible:above.some(x=>x.likelyVisible)};
     }
    }
   }
  }
  last=p;
 }
 return null;
}
