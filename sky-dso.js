import {MESSIER_DSOS} from './dso-catalog.js';
import {RAD,horizontal,precessJ2000} from './astronomy.js';
import {projectRect} from './sky-projection.js';

const prominent=new Set(['M31','M42','M45','M13','M8','M57','M27','M51','M44','M33','M81','M82','M1','M16','M17','M20']);
export function drawSkyDSOs(c,{date,lat,lon,width,height,mode='polar',zoom=1,heading=0,
 panX=0,panY=0,precession=true,showBelowHorizon=false,
 showGalaxies=false,showNebulae=false,showClusters=false,showLabels=true}){
 const enabled={galaxy:showGalaxies,nebula:showNebulae,cluster:showClusters};
 const radius=(Math.min(width-35,height-20)/2-14)*zoom;
 const scale=mode==='rect'?1/zoom:1;
 const occupied=[...(c.__skyLabelRects||[])],visible=[],objects=[];
 for(const [id,ra,dec,family,subclass,mag,name] of MESSIER_DSOS){
  if(!enabled[family])continue;
  const equatorial=precession?precessJ2000(ra,dec,date):{ra,decl:dec};
  const h=horizontal(equatorial.ra,equatorial.decl,date,lat,lon);
  if(!Number.isFinite(h.az)||!Number.isFinite(h.alt))continue;
  if(h.alt<0&&(mode!=='rect'||!showBelowHorizon))continue;
  const angle=(h.az-90-heading)*RAD;
  const [x,y]=mode==='rect'?projectRect(h.az,h.alt,width,height,heading):
   [width/2+radius*(1-h.alt/90)*Math.cos(angle),
    height/2+radius*(1-h.alt/90)*Math.sin(angle)];
  const sx=mode==='rect'?width/2+(x-width/2)*zoom+panX:x+panX;
  const sy=mode==='rect'?height/2+(y-height/2)*zoom+panY:y+panY;
  if(sx<6||sx>width-6||sy<6||sy>height-6)continue;
  visible.push(id);objects.push({id,x,y,sx,sy,family,subclass,mag,name});
 }
 objects.sort((a,b)=>Number(prominent.has(b.id))-Number(prominent.has(a.id))||a.mag-b.mag);
 let labels=0;
 for(const {id,x,y,sx,sy,family,subclass,mag} of objects){
  c.save();c.translate(x,y);c.scale(scale,scale);
  const size=Math.max(2.1,Math.min(5.2,3.9+(zoom-1)*.55-(mag-7)*.13));
  if(family==='galaxy'){
   const glow=c.createRadialGradient(0,0,.3,0,0,size*1.8);
   glow.addColorStop(0,'rgba(220,226,242,.82)');
   glow.addColorStop(.45,'rgba(167,185,218,.40)');
   glow.addColorStop(1,'rgba(167,185,218,0)');
   c.scale(1.42,.62);c.fillStyle=glow;c.beginPath();c.arc(0,0,size*1.8,0,Math.PI*2);c.fill();
  }else if(family==='nebula'){
   if(subclass==='pn'){
    c.strokeStyle='rgba(154,221,225,.75)';c.lineWidth=1.15;
    c.beginPath();c.arc(0,0,size*.75,0,Math.PI*2);c.stroke();
   }else{
    const glow=c.createRadialGradient(0,0,.3,0,0,size*1.8);
    glow.addColorStop(0,'rgba(176,218,217,.65)');
    glow.addColorStop(.55,'rgba(118,166,191,.27)');
    glow.addColorStop(1,'rgba(118,166,191,0)');
    c.fillStyle=glow;c.beginPath();c.ellipse(0,0,size*1.8,size*1.24,-.25,0,Math.PI*2);c.fill();
   }
  }else if(subclass==='gc'){
   const glow=c.createRadialGradient(0,0,.3,0,0,size*1.5);
   glow.addColorStop(0,'rgba(232,217,185,.85)');
   glow.addColorStop(.4,'rgba(206,193,169,.44)');
   glow.addColorStop(1,'rgba(206,193,169,0)');
   c.fillStyle=glow;c.beginPath();c.arc(0,0,size*1.5,0,Math.PI*2);c.fill();
  }else{
   const points=[[-2.3,-1.4],[1.7,-2.3],[2.6,1.7],[-1.7,2.2],[.4,.1]];
   c.fillStyle='rgba(209,220,229,.80)';
   for(const [dx,dy] of points){c.beginPath();c.arc(dx*size/3,dy*size/3,.75,0,Math.PI*2);c.fill();}
  }
  c.restore();
  if(!showLabels)continue;
  if(!prominent.has(id) && (zoom<1.35 || (zoom<2.3&&mag>7.2)))continue;
  if(labels>=Math.round(8+zoom*13))continue;
  c.font='10px sans-serif';
  const tw=c.measureText(id).width;
  for(const [dx,dy] of [[8,-6],[-tw-8,-6],[8,15],[-tw-8,15]]){
   const rect={left:sx+dx-2,right:sx+dx+tw+2,top:sy+dy-11,bottom:sy+dy+3};
   if(rect.left<3||rect.right>width-3||rect.top<3||rect.bottom>height-3)continue;
   if(occupied.some(q=>rect.left<q.right+4&&rect.right>q.left-4&&rect.top<q.bottom+3&&rect.bottom>q.top-3))continue;
   c.save();c.translate(x,y);c.scale(scale,scale);
   c.font='10px sans-serif';c.fillStyle='#d8e5ef';
   c.fillText(id,dx,dy);c.restore();
   occupied.push(rect);labels++;break;
  }
 }
 return {count:visible.length,labels,visible};
}
