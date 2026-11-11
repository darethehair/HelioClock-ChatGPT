import {CONSTELLATION_NAMES} from './sky-constellation-names.js';
import {RAD,horizontal,precessJ2000} from './astronomy.js';
import {projectRect} from './sky-projection.js';

// Text-only layer. It does not change star or constellation-line geometry.
export function drawConstellationNames(c,{date,lat,lon,width,height,mode='polar',zoom=1,
 heading=0,panX=0,panY=0,precession=true,showBelowHorizon=false,enabled=false}){
 if(!enabled)return {count:0,names:[]};
 const radius=(Math.min(width-35,height-20)/2-14)*zoom;
 const scale=mode==='rect'?1/zoom:1;
 const occupied=[...(c.__skyLabelRects||[])],shown=[];
 const ordered=[...CONSTELLATION_NAMES].sort((a,b)=>a[4]-b[4]);
 for(const [abbr,name,ra,dec,rank] of ordered){
  if(rank===2&&zoom<1.45 || rank===3&&zoom<2.15)continue;
  const eq=precession?precessJ2000(ra,dec,date):{ra,decl:dec};
  const h=horizontal(eq.ra,eq.decl,date,lat,lon);
  if(!Number.isFinite(h.alt)||!Number.isFinite(h.az))continue;
  if(h.alt<0&&(mode!=='rect'||!showBelowHorizon))continue;
  const theta=(h.az-90-heading)*RAD;
  const [x,y]=mode==='rect'?projectRect(h.az,h.alt,width,height,heading):
   [width/2+radius*(1-h.alt/90)*Math.cos(theta),
    height/2+radius*(1-h.alt/90)*Math.sin(theta)];
  const sx=mode==='rect'?width/2+(x-width/2)*zoom+panX:x+panX;
  const sy=mode==='rect'?height/2+(y-height/2)*zoom+panY:y+panY;
  c.font='11px sans-serif';const tw=c.measureText(name).width;
  const left=sx-tw/2-4,right=sx+tw/2+4,top=sy-9,bottom=sy+5;
  if(left<4||right>width-4||top<4||bottom>height-4)continue;
  if(occupied.some(r=>left<r.right+5&&right>r.left-5&&top<r.bottom+4&&bottom>r.top-4))continue;
  c.save();c.translate(x,y);c.scale(scale,scale);
  c.textAlign='center';c.textBaseline='middle';
  c.font='11px sans-serif';c.fillStyle='rgba(145,185,222,.85)';
  c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=3;
  c.fillText(name,0,0);c.restore();
  occupied.push({left,right,top,bottom});
  shown.push(abbr);
 }
 // Keep these rectangles available to the DSO overlay, too.
 c.__skyLabelRects=occupied;
 return {count:shown.length,names:shown};
}
