import {projectRect,rectGeometry} from './sky-projection.js';
import {RAD,wrap,clamp,horizontal,precessJ2000} from './astronomy.js';
import {BRIGHT_STARS} from './sky-catalog.js';

// D3-Celestial J2000 star positions and stick-figure constellation paths
// are bundled as local JSON at build time; fallback to the original named stars.
let faint=[],constellations=[],ready=false,loadError=false;
export function skyAtlasStatus(){return {ready,error:loadError,count:ready?faint.length:BRIGHT_STARS.length};}
Promise.all([
 fetch('./sky-stars.json').then(r=>{if(!r.ok)throw Error('Star atlas '+r.status);return r.json()}),
 fetch('./sky-constellations.json').then(r=>{if(!r.ok)throw Error('Constellation atlas '+r.status);return r.json()})
]).then(([stars,lines])=>{
 faint=stars.map(([ra,dec,mag,bv])=>({ra,dec,mag,bv}));
 constellations=lines;ready=true;
}).catch(e=>{console.warn('Using bright-star fallback:',e);loadError=true}).finally(()=>{
 window.dispatchEvent(new Event('helioclock-sky-atlas-ready'));
});
const mod=(v,m)=>((v%m)+m)%m;
// Off: show the legacy untransformed J2000 coordinates. On: use the
// mean equator/equinox of date consistently for every star and line vertex.
const toAltAz=(star,date,latitude,longitude,precession)=> {
 const eq=precession?precessJ2000(star.ra,star.dec,date):{ra:star.ra,decl:star.dec};
 return horizontal(eq.ra,eq.decl,date,latitude,longitude);
};
/** Approximate perceptual colours by B-V; preserves white fallback. */
export function stellarColor(bv){
 if(!Number.isFinite(bv))return '#ffffff';
 const anchors=[[-.35,[163,190,255]],[0,[213,227,255]],[.30,[247,248,255]],[.65,[255,241,213]],[1.05,[255,203,153]],[1.70,[255,153,124]]];
 if(bv<=anchors[0][0])return '#a3beff';
 if(bv>=anchors.at(-1)[0])return '#ff997c';
 for(let i=1;i<anchors.length;i++){
  if(bv<=anchors[i][0]){
   const [b0,c0]=anchors[i-1],[b1,c1]=anchors[i],t=(bv-b0)/(b1-b0);
   return '#'+c0.map((v,j)=>Math.round(v+(c1[j]-v)*t).toString(16).padStart(2,'0')).join('');
  }
 }
 return '#ffffff';
}
/** Brightness is represented by disc size; a gentle halo is only for mag < 1. */
export function stellarRadius(mag,zoom=1){
 return Math.max(.85,Math.min(6.1,4.6-.63*(mag+1.2)))*Math.max(.9,Math.min(1.45,zoom**.35));
}
function drawDot(c,x,y,r,color){c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.fillStyle=color;c.fill();}
export function drawSkyAtlas(c,{
 date,lat,lon,width,height,mode='polar',zoom=1,heading=0,magLimit=3.5,
 showLabels=true,showStars=true,showConstellations=false,precession=true,brightSky=false,showBelowHorizon=true,stellarColors=true
}){
 const X=width/2,Y=height/2,radius=(Math.min(width-35,height-20)/2-14)*zoom;
 const project=(az,alt)=>{
  if(alt<0&&(mode!=='rect'||!showBelowHorizon))return null;
  if(mode==='rect'){
   return projectRect(az,alt,width,height,heading);
  }
  const angle=(az-90-heading)*RAD,distance=radius*(1-alt/90);
  return [X+distance*Math.cos(angle),Y+distance*Math.sin(angle)];
 };
 if(showConstellations&&ready){
  c.save();c.strokeStyle=brightSky?'#12355299':'#88b5e077';c.lineWidth=1;
  for(const chain of constellations){
   let previous=null;
   for(const [ra,dec] of chain){
    const h=toAltAz({ra,dec},date,lat,lon,precession),pos=project(h.az,h.alt);
    if(pos&&previous&&Math.hypot(pos[0]-previous[0],pos[1]-previous[1])<width*.42){
     c.beginPath();c.moveTo(previous[0],previous[1]);c.lineTo(pos[0],pos[1]);c.stroke();
    }
    previous=pos;
   }
  }c.restore();
 }
 if(!showStars)return;
 const source=ready?faint:BRIGHT_STARS;
 let total=0;
 c.save();
 for(const star of source){
  if(star.mag>magLimit)continue;
  const h=toAltAz(star,date,lat,lon,precession),pos=project(h.az,h.alt);
  if(!pos)continue;
  const [x,y]=pos;
  if(x<0||x>width||y<0||y>height)continue;
  // Solid stars with more expressive magnitude-dependent radii. Catalogue
  // B-V supplies an illustrative temperature hue; missing B-V stays white.
  const r=stellarRadius(star.mag,zoom),color=stellarColors?stellarColor(star.bv):'#ffffff';
  c.globalAlpha=1;
  if(star.mag<.65){
   c.save();c.shadowColor=color;c.shadowBlur=star.mag<0?8:4;
   drawDot(c,x,y,r,color);c.restore();
  }else drawDot(c,x,y,r,color);
  total++;
 }
 c.globalAlpha=1;
 // Do not label the full 7th-magnitude catalogue: only named stars, and
 // suppress ALL labels when the user enables faint-star mode.
 if(showLabels&&magLimit<=4.5){
  for(const star of BRIGHT_STARS){
   if(star.mag>Math.min(magLimit,3.4))continue;
   const h=toAltAz(star,date,lat,lon,precession),p=project(h.az,h.alt);
   if(!p||p[0]<8||p[0]>width-40||p[1]<10||p[1]>height-9)continue;
   c.fillStyle='#ffffff';c.font='10px sans-serif';c.fillText(star.name,p[0]+5,p[1]-6);
  }
 }
 c.restore();
 return total;
}
