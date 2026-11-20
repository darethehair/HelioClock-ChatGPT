import * as satellite from 'satellite.js';
import {solar,sunHorizontal,RAD} from './astronomy.js';
import {issElementStatus} from './iss-tracking.js';

const EARTH_RADIUS_KM=6378.137;
const SUN_RADIUS_KM=695700;
const AU_KM=149597870.7;
const DAY_MS=86400000;
export const ISS_VISIBLE_MIN_ALT=10;
export const ISS_VISIBLE_MAX_SUN_ALT=-6;
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
 // Solar disk geometry: classify full umbra and partial penumbra.
 // TEME-versus-equatorial-frame differences are small at this precision.
 const sun=solar(date),ra=sun.ra*RAD,dec=sun.decl*RAD;
 const sunDistanceKm=sun.distance*AU_KM;
 const sunUnit=[Math.cos(dec)*Math.cos(ra),Math.cos(dec)*Math.sin(ra),Math.sin(dec)];
 const axis=p.x*sunUnit[0]+p.y*sunUnit[1]+p.z*sunUnit[2];
 const crossTrackKm=Math.sqrt(Math.max(0,p.x*p.x+p.y*p.y+p.z*p.z-axis*axis));
 const behindKm=Math.max(0,-axis);
 const umbraRadiusKm=EARTH_RADIUS_KM-behindKm*(SUN_RADIUS_KM-EARTH_RADIUS_KM)/sunDistanceKm;
 const penumbraRadiusKm=EARTH_RADIUS_KM+behindKm*(SUN_RADIUS_KM+EARTH_RADIUS_KM)/sunDistanceKm;
 const inUmbra=axis<0&&umbraRadiusKm>0&&crossTrackKm<=umbraRadiusKm;
 const inPenumbra=axis<0&&crossTrackKm<penumbraRadiusKm;
 const illumination=inUmbra?'shadow':inPenumbra?'partial':'sunlit';
 // Partial illumination is intentionally not counted as a reliable sighting.
 const sunlit=illumination==='sunlit';
 const sunAlt=sunHorizontal(date,lat,lon).alt;
 const likelyVisible=alt>=ISS_VISIBLE_MIN_ALT&&sunlit&&sunAlt<=ISS_VISIBLE_MAX_SUN_ALT;
 return {date,alt,az,rangeKm,sunlit,sunAlt,likelyVisible,illumination};
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
   ctx.fillStyle=current.likelyVisible?'#b8fff0':current.illumination==='shadow'?'#687e94':
    current.illumination==='partial'?'#c5a86d':'#94d6ff';
   ctx.strokeStyle='#072138';ctx.lineWidth=1.6/zoom;
   ctx.beginPath();ctx.arc(xy[0],xy[1],5/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(current.likelyVisible){
    ctx.beginPath();ctx.arc(xy[0],xy[1],9/zoom,0,Math.PI*2);
    ctx.strokeStyle='#b8fff0';ctx.lineWidth=1.4/zoom;ctx.stroke();
   }else if(current.illumination==='shadow'){
    ctx.beginPath();ctx.arc(xy[0],xy[1],2/zoom,0,Math.PI*2);
    ctx.fillStyle='#14283d';ctx.fill();
   }
   ctx.fillStyle=current.likelyVisible?'#c9fff2':'#dff9ff';
   ctx.font=`${11/zoom}px sans-serif`;
   ctx.fillText('ISS',xy[0]+8/zoom,xy[1]-8/zoom);
  }
 }
 ctx.restore();
 return {count,visible};
}
// Scan complete passes chronologically within the validity window. This also
// fixes reverse searching, which must encounter SET first in reverse time.
// Return only passes completely after/before the requested time.
export function findIssPass(model,date,lat,lon,direction=1,{hours=120,stepSeconds=60,visibleOnly=false}={}){
 if(!model||![1,-1].includes(direction)||!issElementStatus(model,date).valid)return null;
 const stepMs=Math.max(10,Math.min(120,stepSeconds))*1000;
 const limitMs=Math.min(120,Math.max(1,hours))*3600000;
 const epoch=model.epoch.getTime(),validStart=epoch-5*DAY_MS,validEnd=epoch+5*DAY_MS;
 const anchor=date.getTime();
 const start=direction===1?Math.max(validStart,anchor-stepMs):Math.max(validStart,anchor-limitMs);
 const end=direction===1?Math.min(validEnd,anchor+limitMs):Math.min(validEnd,anchor+stepMs);
 if(end-start<stepMs)return null;
 let prev=null,open=null;
 const passes=[];
 // Use sub-minute interpolation at horizon crossings.
 function crossing(a,b){
  const frac=a.alt/(a.alt-b.alt);
  const t=a.date.getTime()+(b.date.getTime()-a.date.getTime())*Math.max(0,Math.min(1,frac));
  return new Date(t);
 }
 for(let ms=start;ms<=end;ms+=stepMs){
  const p=issSkyPosition(model,new Date(ms),lat,lon);
  if(!p)continue;
  if(prev){
   if(prev.alt<=0&&p.alt>0){
    open={rise:crossing(prev,p),maximum:p.date,maxAlt:p.alt,samples:[p],max:p};
   }else if(open&&p.alt>0){
    open.samples.push(p);
    if(p.alt>open.maxAlt){open.maxAlt=p.alt;open.maximum=p.date;open.max=p;}
   }else if(open&&prev.alt>0&&p.alt<=0){
    const set=crossing(prev,p);
    const visibleSamples=open.samples.filter(x=>x.likelyVisible);
    // NASA/observer-facing peak is the highest point while illuminated
    // against a dark sky, not the peak of the full geometric pass.
    const visiblePeak=visibleSamples.reduce((best,p)=>!best||p.alt>best.alt?p:best,null);
    const pass={
     rise:open.rise,set,maximum:open.maximum,maxAlt:open.maxAlt,
     visibleMaximum:visiblePeak?.date||null,
     visibleMaxAlt:visiblePeak?.alt??null,
     azRise:open.samples[0].az,azSet:prev.az,
     sunlitAtMax:open.max.sunlit,
     likelyVisible:visibleSamples.length>0,
     visibleStart:visibleSamples[0]?.date||null,
     visibleEnd:visibleSamples.at(-1)?.date||null
    };
    if((direction===1&&pass.rise>date)||(direction===-1&&pass.set<date)){
     if(!visibleOnly||pass.likelyVisible){
      if(direction===1)return pass;
      passes.push(pass);
     }
    }
    open=null;
   }
  }
  prev=p;
 }
 return direction===-1?passes.at(-1)||null:null;
}
