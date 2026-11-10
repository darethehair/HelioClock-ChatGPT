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
  showAltAz=true,showRaDec=false,showBelowHorizon=false,panX=0,panY=0,skyLight='black'}=opts;
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
   curve(points,'#a4d0ebc2',az%90===0?1.2:1);
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
 // Place labels ON visible grid lines within the current viewport instead
 // of only at the outside axes or at dec=0. In a zoomed/panned polar view,
 // project() coordinates are translated by the parent canvas transform.
 const occupied=[],drawnLabels=[];
 const counts={az:0,alt:0,ra:0,dec:0};
 // Keep all four coordinate families represented when both grids are on.
 // Prevent a dense Alt/Az grid from using every collision slot before
 // the equatorial labels are placed.
 const view=(p)=>{
  const [x,y]=plot(p.az,p.alt);
  return mode==='polar'?[x+panX,y+panY]:
   [w/2+(x-w/2)*zoom+panX,h/2+(y-h/2)*zoom+panY];
 };
 const inside=(point)=>{
  if(!allowed(point.alt))return false;
  const [x,y]=view(point);
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<46||x>w-68||y<30||y>h-48)return false;
  if(mode==='rect')return x>rect.left+16&&x<rect.right-20&&y>rect.top+12&&y<rect.bottom-20;
  return Math.hypot(x-w/2-panX,y-h/2-panY)<radius-8;
 };
 const addLabel=(textValue,points,kind,color,desiredX,desiredY)=>{
  let best=null,score=Infinity;
  for(const p of points){
   if(!inside(p))continue;
   const [x,y]=view(p);
   const penalty=occupied.some(q=>Math.abs(q[0]-x)<58&&Math.abs(q[1]-y)<16);
   if(penalty)continue;
   const candidate=Math.abs(x-desiredX)+Math.abs(y-desiredY);
   if(candidate<score){score=candidate;best=[x,y]}
  }
  if(!best||counts[kind]>=4)return;
  counts[kind]++;
  const [sx,sy]=best;
  occupied.push(best);drawnLabels.push({kind,text:textValue,x:sx,y:sy});
  // The actual canvas is already translated in polar mode.
  const px=mode==='polar'?sx-panX:w/2+(sx-w/2-panX)/zoom;
  const py=mode==='polar'?sy-panY:h/2+(sy-h/2-panY)/zoom;
  ctx.save();ctx.translate(px,py);
  // Rectangular sky canvas is zoomed, but coordinate annotations keep
  // a readable constant screen size.
  if(mode==='rect')ctx.scale(1/zoom,1/zoom);
  ctx.font='10px sans-serif';ctx.lineJoin='round';
  ctx.strokeStyle=skyLight==='black'?'#081322':'#24516c';
  ctx.lineWidth=2.5;
  ctx.strokeText(textValue,0,0);
  ctx.fillStyle=color;ctx.fillText(textValue,0,0);ctx.restore();
 };
 // Give each coordinate family a limited number of candidate labels.
 // Equatorial labels go first, so both enabled grids remain readable.
 if(showRaDec){
  for(let ra=0;ra<360;ra+=step.ra){
   const pts=[];for(let dec=-90;dec<=90;dec+=2)
    pts.push(horizontal(ra,dec,date,lat,lon));
   addLabel(fmtRA(ra),pts,'ra','#eac894',w*.34,h*.62);
  }
  for(let dec=-90;dec<=90;dec+=step.dec){
   const pts=[];for(let ra=0;ra<360;ra+=Math.min(2,step.ra/4))
    pts.push(horizontal(ra,dec,date,lat,lon));
   addLabel((dec>0?'+':'')+dec+'°',pts,'dec','#eac894',w*.77,h*.36);
  }
 }
 if(showAltAz){
  const baseAlt=mode==='rect'&&showBelowHorizon?-90:0;
  for(let az=0;az<360;az+=step.az){
   const pts=[];for(let alt=baseAlt;alt<=90;alt+=2)pts.push({az,alt});
   addLabel(az+'°',pts,'az','#b7d6ef',w*.55,h*.72);
  }
  for(let alt=baseAlt;alt<=90;alt+=step.alt){
   const pts=[];for(let az=0;az<360;az+=3)pts.push({az,alt});
   addLabel((alt>0?'+':'')+alt+'°',pts,'alt','#bbd9ef',w*.22,h*.37);
  }
 }
 return {altStep:step.alt,azStep:step.az,decStep:step.dec,raStep:step.ra,
  altAz:showAltAz,raDec:showRaDec,labels:drawnLabels};
}
