import {RAD,clamp,wrap,horizontal} from './astronomy.js';
import {projectRect,rectGeometry} from './sky-projection.js';

/** Fine grids appear when the projected sky has room for their lines. */
export function skyGridIntervals(zoom=1){
 if(zoom>=2.8)return {alt:5,az:5,dec:2,ra:3.75};
 if(zoom>=2.0)return {alt:10,az:10,dec:5,ra:7.5};
 if(zoom>=1.4)return {alt:15,az:15,dec:10,ra:15};
 return {alt:15,az:30,dec:15,ra:30};
}
const fmtRA=degrees=>{
 const minutes=Math.round(wrap(degrees,360)*4); // 360° = 24h = 1440m.
 return String(Math.floor(minutes/60)%24).padStart(2,'0')+'h'+
  (minutes%60?String(minutes%60).padStart(2,'0')+'m':'');
};
export function drawSkyGrid(ctx,opts){
 const {width:w,height:h,date,lat,lon,mode='polar',zoom=1,heading=0,
  showAltAz=true,showRaDec=false,showBelowHorizon=false}=opts;
 const step=skyGridIntervals(zoom);
 const radius=(Math.min(w-35,h-20)/2-14)*zoom;
 const rect=rectGeometry(w,h),rectSpan=rect.right-rect.left;
 const plot=(az,alt)=>{
  if(mode==='rect')return projectRect(az,alt,w,h,heading);
  const r=radius*(1-alt/90),angle=(az-90-heading)*RAD;
  return [w/2+r*Math.cos(angle),h/2+r*Math.sin(angle)];
 };
 const allowed=(alt)=>mode==='rect'?(showBelowHorizon||alt>=0):alt>=0;
 function curve(points,color,width=0.8){
  ctx.beginPath();let started=false,prev=null,count=0;
  for(const point of points){
   if(!allowed(point.alt)){started=false;prev=null;continue}
   const [x,y]=plot(point.az,point.alt);
   if(!Number.isFinite(x)||!Number.isFinite(y)){started=false;prev=null;continue}
   // Rectangular sky wraps at the 0/360° azimuth seam.
   if(prev&&mode==='rect'&&Math.abs(x-prev[0])>rectSpan*.45)started=false;
   if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
   prev=[x,y];count++;
  }
  if(count>1){ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke()}
 }
 ctx.save();
 if(mode==='rect'){
  ctx.beginPath();ctx.rect(rect.left,rect.top,rectSpan,rect.bottom-rect.top);ctx.clip();
 }else{
  ctx.beginPath();ctx.arc(w/2,h/2,radius,0,Math.PI*2);ctx.clip();
 }
 if(showAltAz){
  const firstAlt=mode==='rect'&&showBelowHorizon?-90:0;
  for(let alt=firstAlt;alt<=90;alt+=step.alt){
   const points=[];for(let az=0;az<=360;az+=3)points.push({az,alt});
   curve(points,alt===0?'#e8f3ffbb':'#9cbedb79',alt===0?1.2:.8);
  }
  for(let az=0;az<360;az+=step.az){
   const points=[];for(let alt=firstAlt;alt<=90;alt+=3)points.push({az,alt});
   curve(points,'#90b9d89f',az%90===0?1.1:.85);
  }
 }
 if(showRaDec){
  const firstDec=-90,lastDec=90;
  for(let dec=firstDec;dec<=lastDec;dec+=step.dec){
   const points=[];
   for(let ra=0;ra<=360;ra+=Math.min(2,step.ra/4)){
    const p=horizontal(ra,dec,date,lat,lon);points.push(p);
   }
   curve(points,dec===0?'#f8cf947e':'#d8a9655e',dec===0?1.15:.75);
  }
  for(let ra=0;ra<360;ra+=step.ra){
   const points=[];
   for(let dec=-90;dec<=90;dec+=2){
    points.push(horizontal(ra,dec,date,lat,lon));
   }
   curve(points,'#d6aa6759',.7);
  }
 }
 ctx.restore();
 // Sparse equatorial labels for orientation. Position from the same
 // coordinates as the grid, and skip locations outside the visible field.
 if(showRaDec){
  ctx.save();ctx.font='10px sans-serif';ctx.fillStyle='#f1c88ecb';
  let labels=0;
  for(let ra=0;ra<360;ra+=step.ra*2){
   const p=horizontal(ra,0,date,lat,lon);
   if(!allowed(p.alt))continue;
   const [x,y]=plot(p.az,p.alt);
   if(x<20||x>w-58||y<16||y>h-16)continue;
   if(mode==='polar'&&Math.hypot(x-w/2,y-h/2)>radius-5)continue;
   ctx.fillText(fmtRA(ra),x+3,y-4);labels++;
   if(labels>=12)break;
  }
  ctx.restore();
 }
 return {altStep:step.alt,azStep:step.az,decStep:step.dec,raStep:step.ra,
  altAz:showAltAz,raDec:showRaDec};
}
