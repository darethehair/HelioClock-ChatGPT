import {RAD,DEG,wrap,horizontal,precessJ2000,sidereal} from './astronomy.js';
import {projectRect,rectGeometry} from './sky-projection.js';

/**
 * Milky Way overlay. The glow follows the actual IAU J2000 galactic equator,
 * with a brighter central bulge around l=0°, but it is illustrative, not a
 * calibrated surface-brightness or dust-extinction map. The separate outline
 * layer uses Vieira's five-level Milky Way Outline Catalog (D3-Celestial).
 */
let levels=[],ready=false,failed=false;
export const milkyWayStatus=()=>({ready,failed,levels:levels.length});
fetch('./sky-milkyway.json').then(r=>{
 if(!r.ok)throw Error('Milky Way contour catalogue '+r.status);
 return r.json();
}).then(data=>{levels=data;ready=true}).catch(err=>{
 failed=true;console.warn('Milky Way outline data unavailable',err);
}).finally(()=>window.dispatchEvent(new Event('helioclock-milkyway-ready')));

export function galacticToJ2000(l,b=0){
 const lr=l*RAD,br=b*RAD;
 const x=Math.cos(br)*Math.cos(lr),y=Math.cos(br)*Math.sin(lr),z=Math.sin(br);
 const ex=-.0548755604*x+.4941094279*y-.8676661490*z;
 const ey=-.8734370902*x-.4448296300*y-.1980763734*z;
 const ez=-.4838350155*x+.7469822445*y+.4559837762*z;
 return {ra:wrap(Math.atan2(ey,ex)*DEG),dec:Math.asin(Math.max(-1,Math.min(1,ez)))*DEG};
}
export const GALACTIC_CENTER=galacticToJ2000(0,0);
const eqAtDate=(ra,dec,date,precession)=>precession?precessJ2000(ra,dec,date):{ra,decl:dec};
const toAltAz=(ra,dec,date,lat,lon,precession)=>{
 const eq=eqAtDate(ra,dec,date,precession);
 return horizontal(eq.ra,eq.decl,date,lat,lon);
};
function projection({mode,width,height,zoom,heading,showBelowHorizon}){
 const X=width/2,Y=height/2,radius=(Math.min(width-35,height-20)/2-14)*zoom;
 return h=>{
  if(!Number.isFinite(h.alt)||!Number.isFinite(h.az))return null;
  if(h.alt<0&&(mode!=='rect'||!showBelowHorizon))return null;
  if(mode==='rect')return projectRect(h.az,h.alt,width,height,heading);
  const theta=(h.az-90-heading)*RAD,r=radius*(1-h.alt/90);
  return [X+Math.cos(theta)*r,Y+Math.sin(theta)*r];
 };
}
function drawSegments(c,points,maxSpan){
 let last=null;
 c.beginPath();
 for(const xy of points){
  if(xy&&last&&Math.hypot(xy[0]-last[0],xy[1]-last[1])<maxSpan)c.lineTo(xy[0],xy[1]);
  else if(xy)c.moveTo(xy[0],xy[1]);
  last=xy;
 }
 c.stroke();
}
export function drawMilkyWay(c,opts){
 const {date,lat,lon,width,height,mode='polar',zoom=1,heading=0,
  precession=true,showBelowHorizon=true,showShade=false,showOutline=false,
  showCenter=false,skyLight='black',sunAltitude=-20,forceDaylight=false}=opts;
 if(!showShade&&!showOutline&&!showCenter)return;
 const position=projection({mode,width,height,zoom,heading,showBelowHorizon});
 const day=(sunAltitude+18)/22;
 // Black-sky display always permits overlays; atmospheric daylight normally
 // attenuates the galactic band. Education override shows the full-strength band.
 const visibility=forceDaylight||skyLight==='black'?1:Math.max(.10,1-Math.max(0,Math.min(1,day))*.86);
 c.save();
 if(mode==='rect'){
  const g=rectGeometry(width,height);
  c.beginPath();c.rect(g.left,g.top,g.right-g.left,g.bottom-g.top);c.clip();
 }else{
  const R=(Math.min(width-35,height-20)/2-14)*zoom;
  c.beginPath();c.arc(width/2,height/2,R,0,2*Math.PI);c.clip();
 }
 if(showShade){
  // Thick antialiased luminous strokes on the projected galactic plane.
  // Width adapts to plot dimensions but remains an illustrative angular band.
  const baseline=mode==='rect'?(height-40)/180:Math.min(width,height)/180;
  const bandScale=Math.max(1,baseline)*zoom;
  for(let i=0;i<180;i++){
   const l=i*2,points=[];
   // 2° arc step keeps curved transitions smooth while respecting seams.
   for(let j=0;j<3;j++){
    const ll=l+j;
    const eq=galacticToJ2000(ll,0);
    points.push(position(toAltAz(eq.ra,eq.dec,date,lat,lon,precession)));
   }
   const centralBoost=Math.exp(-Math.pow(Math.min(Math.abs(wrap(l+180,360)-180),180)/37,2));
   const maxSpan=mode==='rect'?width*.24:Math.min(width,height)*.37;
   for(const [degrees,alpha] of [[36,.013],[23,.026],[12,.038]]){
    c.strokeStyle='rgba(215,226,255,'+(alpha*visibility*(1+centralBoost*.85))+')';
    c.lineWidth=Math.max(1,degrees*bandScale);c.lineCap='round';c.lineJoin='round';
    drawSegments(c,points,maxSpan);
   }
  }
 }
 if(showOutline&&ready){
  c.lineWidth=1;
  c.lineCap='round';
  const maxSpan=mode==='rect'?width*.18:Math.min(width,height)*.34;
  for(let k=0;k<levels.length;k++){
   c.strokeStyle='rgba(197,214,249,'+((.15+.055*k)*visibility)+')';
   c.lineWidth=k===0?1.25:.8;
   for(const ring of levels[k].rings){
    const points=ring.map(([ra,dec])=>position(toAltAz(ra,dec,date,lat,lon,precession)));
    drawSegments(c,points,maxSpan);
   }
  }
 }
 if(showCenter){
  const h=toAltAz(GALACTIC_CENTER.ra,GALACTIC_CENTER.dec,date,lat,lon,precession);
  const p=position(h);
  if(p){
   const [x,y]=p;
   c.lineWidth=1.5;c.strokeStyle='rgba(255,216,145,'+visibility+')';
   c.beginPath();c.arc(x,y,7,0,2*Math.PI);c.stroke();
   c.beginPath();c.moveTo(x-11,y);c.lineTo(x-4,y);c.moveTo(x+4,y);c.lineTo(x+11,y);
   c.moveTo(x,y-11);c.lineTo(x,y-4);c.moveTo(x,y+4);c.lineTo(x,y+11);c.stroke();
   c.font='10px sans-serif';c.fillStyle='rgba(255,227,166,'+visibility+')';
   c.fillText('Galactic centre',x+12,y-9);
  }
 }
 c.restore();
}
