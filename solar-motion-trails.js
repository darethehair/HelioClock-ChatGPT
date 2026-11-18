import {solar,sunHorizontal,wrap} from './astronomy.js';
import {geoPath,geoDistance} from 'd3-geo';

// Fixed UTC instant per calendar day gives a solar analemma without DST jumps.
// Earth subsolar coordinates intentionally match earth-renderer.js.
export function subsolarPosition(date){
 const s=solar(date);
 const utcMinutes=date.getUTCHours()*60+date.getUTCMinutes()+
  (date.getUTCSeconds()+date.getUTCMilliseconds()/1000)/60;
 return {lat:s.decl,lon:wrap((720-utcMinutes-s.eq)/4+180,360)-180};
}
export function solarTrailSamples(selected,{mode='analemma',stepDays=5,year=selected.getUTCFullYear()}={}){
 if(mode!=='analemma')return [];
 const base=new Date(Date.UTC(year,0,1,selected.getUTCHours(),selected.getUTCMinutes(),selected.getUTCSeconds()));
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const step=Math.max(1,Math.min(30,Math.floor(stepDays)||5));
 const dates=[];
 for(let day=0;day<days;day+=step)dates.push(new Date(base.getTime()+day*86400000));
 dates.push(new Date(base.getTime()+(days-1)*86400000));
 return dates;
}
export function addSolarBreadcrumb(history,date,max=700){
 const ms=date.getTime();
 if(!Number.isFinite(ms)||history.at(-1)===ms)return history;
 return [...history,ms].slice(-max);
}
function pathParts(points,project,visible,seam){
 const parts=[];let segment=[],dots=[];
 for(const entry of points){
  const p=project(entry);
  if(!p||!visible(entry,p)||!Number.isFinite(p[0])||!Number.isFinite(p[1])){
   if(segment.length)parts.push(segment);
   segment=[];continue;
  }
  if(segment.length&&seam&&Math.abs(p[0]-segment.at(-1)[0])>seam){
   parts.push(segment);segment=[];
  }
  segment.push(p);dots.push(p);
 }
 if(segment.length)parts.push(segment);
 return {parts,dots};
}
export function paintSkySolarTrail(ctx,dates,{width,height,mode,heading=0,lat,lon,belowHorizon=false,project,dots=true,line=true,zoom=1}){
 if(!dates.length)return 0;
 const coordinates=dates.map(date=>sunHorizontal(date,lat,lon));
 const segments=pathParts(coordinates,p=>project(p.az,p.alt),p=>belowHorizon||p.alt>=0,mode==='rect'?width*.42:0);
 ctx.save();ctx.strokeStyle='#ffbc59';ctx.fillStyle='#ffdc80';
 ctx.lineWidth=1.8/zoom;ctx.globalAlpha=.95;
 if(line)for(const part of segments.parts){
  if(part.length<2)continue;
  ctx.beginPath();part.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
 }
 if(dots)for(const [x,y] of segments.dots){
  ctx.beginPath();ctx.arc(x,y,2.6/zoom,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();return segments.dots.length;
}
export function paintEarthSolarTrail(ctx,dates,projection,{globe=false,earthLon=0,earthLat=0,dots=true,line=true}={}){
 if(!dates.length)return 0;
 const locations=dates.map(date=>subsolarPosition(date));
 ctx.save();ctx.strokeStyle='#ffba54';ctx.fillStyle='#ffdf86';ctx.lineWidth=2;
 ctx.globalAlpha=.95;
 // d3-geo clips the geometry correctly at the map seam and the globe limb.
 if(line&&locations.length>1){
  const path=geoPath(projection,ctx);
  ctx.beginPath();
  path({type:'LineString',coordinates:locations.map(p=>[p.lon,p.lat])});
  ctx.stroke();
 }
 let visible=0;
 if(dots)for(const p of locations){
  if(globe&&geoDistance([p.lon,p.lat],[earthLon,earthLat])>Math.PI/2)continue;
  const xy=projection([p.lon,p.lat]);if(!xy)continue;
  ctx.beginPath();ctx.arc(xy[0],xy[1],2.7,0,Math.PI*2);ctx.fill();visible++;
 }
 ctx.restore();return visible;
}
