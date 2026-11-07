import {geoEqualEarth,geoOrthographic,geoMercator,geoPath,geoGraticule10} from 'd3-geo';
import {feature,mesh} from 'topojson-client';
import atlas from 'world-atlas/countries-110m.json';
import {RAD,wrap,solar,clamp} from './astronomy.js';

const land=feature(atlas,atlas.objects.land);
const borders=mesh(atlas,atlas.objects.countries,(a,b)=>a!==b);
const graticule=geoGraticule10();
const memoCanvas=document.createElement('canvas');
const memoCtx=memoCanvas.getContext('2d');
const modeConstructors={equal:geoEqualEarth,globe:geoOrthographic,mercator:geoMercator};
const normLon=(v)=>wrap(v+180,360)-180;
let earthPixels=null;
let textureStatus='loading';
const texture=new Image();
texture.onload=()=>{
 try{
  const off=document.createElement('canvas');off.width=texture.naturalWidth;off.height=texture.naturalHeight;
  const c=off.getContext('2d',{willReadFrequently:true});c.drawImage(texture,0,0);
  earthPixels=c.getImageData(0,0,off.width,off.height);textureStatus='ready';
 }catch(error){textureStatus='failed';console.warn('Earth texture decode failed',error)}
 window.dispatchEvent(new Event('helioclock-earth-texture-ready'));
};
texture.onerror=()=>{textureStatus='failed';window.dispatchEvent(new Event('helioclock-earth-texture-ready'));};
texture.src='./earth-blue-marble.png';
function sampleEarth(lon,lat){
 if(!earthPixels)return null;
 const {width,height,data}=earthPixels;
 const u=wrap(lon+180,360)/360*width, v=clamp((90-lat)/180,0,.999999)*height;
 const x0=Math.floor(u)%width,x1=(x0+1)%width,y0=Math.min(height-1,Math.floor(v)),y1=Math.min(height-1,y0+1);
 const fx=u-Math.floor(u),fy=v-Math.floor(v);
 const i00=(y0*width+x0)*4,i10=(y0*width+x1)*4,i01=(y1*width+x0)*4,i11=(y1*width+x1)*4;
 return [0,1,2].map(ch=>{
  const top=data[i00+ch]*(1-fx)+data[i10+ch]*fx;
  const bottom=data[i01+ch]*(1-fx)+data[i11+ch]*fx;
  return top*(1-fy)+bottom*fy;
 });
}


/** Draw an Earth projection with per-pixel physically computed twilight and mapped land boundaries.
 * No third-party map services or remote tile downloads are required.
 */
export function renderEarth(context,width,height,date,state){
 const {earthProjection='equal',earthZoom=1,earthLon=0,earthLat=0,lat,lon}=state;
 const projection=modeConstructors[earthProjection]||geoEqualEarth;
 const map=projection()
   .rotate([-earthLon,-earthLat])
   .fitExtent([[9,9],[width-9,height-9]],{type:'Sphere'});
 // Fit a stable base projection before applying user zoom.
 map.scale(map.scale()*earthZoom);
 if(earthProjection==='globe')map.clipAngle(90);
 const d=solar(date);
 const utcMinutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
 const sunLon=normLon((720-utcMinutes-d.eq)/4),sunLat=d.decl*RAD;
 const sunSin=Math.sin(sunLat),sunCos=Math.cos(sunLat);
 // Rendering twilight into a lower-resolution buffer is dramatically faster during dragging.
 const rw=Math.max(120,Math.ceil(width*.68)),rh=Math.max(90,Math.ceil(height*.68));
 memoCanvas.width=rw;memoCanvas.height=rh;
 const image=memoCtx.createImageData(rw,rh);
 const globe=earthProjection==='globe';
 const center=map.translate(),radius=map.scale();
 const midnight=[6,12,28],astronomical=[14,25,49],nautical=[28,46,73],
       civil=[53,83,110],sunrise=[85,107,126];
 const stops=[[-90,midnight],[-18,astronomical],[-12,nautical],[-6,civil],[-.833,sunrise],[5,[255,255,255]],[90,[255,255,255]]];
 function sample(alt,photo){
   let k=1;while(k<stops.length-1&&alt>stops[k][0])k++;
   const [a,A]=stops[k-1],[b,B]=stops[k];
   const t=clamp((alt-a)/(b-a),0,1);
   const light=photo||[34,86,128];
   const tint=source=>source===stops[5][1]?light:source;
   const C=tint(A),D=tint(B);
   return [C[0]+(D[0]-C[0])*t,C[1]+(D[1]-C[1])*t,C[2]+(D[2]-C[2])*t];
 }
 for(let y=0;y<rh;y++){
  for(let x=0;x<rw;x++){
   const sx=(x+.5)/rw*width,sy=(y+.5)/rh*height;
   if(globe&&(sx-center[0])**2+(sy-center[1])**2>radius*radius)continue;
   const p=map.invert([(x+.5)/rw*width,(y+.5)/rh*height]);
   const i=(y*rw+x)*4;
   if(!p||!Number.isFinite(p[0])||!Number.isFinite(p[1])){
      image.data[i+3]=0;continue;
   }
   const P=p[1]*RAD,lambda=normLon(p[0]-sunLon)*RAD;
   const altitude=Math.asin(clamp(Math.sin(P)*sunSin+Math.cos(P)*sunCos*Math.cos(lambda),-1,1))/RAD;
   const photo=sampleEarth(p[0],p[1]);
   let r,g,b;
   if(photo){
    // Smoothly darken the satellite mosaic, preserving coastlines and mountains at dusk.
    const fraction=clamp((altitude+17)/20,0,1);
    const light=fraction*fraction*(3-2*fraction);
    const twilight=Math.exp(-Math.pow((altitude+3)/5,2));
    r=photo[0]*(.055+.945*light)+twilight*34;
    g=photo[1]*(.07+.93*light)+twilight*12;
    b=photo[2]*(.12+.88*light)+twilight*7;
   }else [r,g,b]=sample(altitude,null);
   image.data[i]=r;image.data[i+1]=g;image.data[i+2]=b;image.data[i+3]=255;
  }
 }
 memoCtx.putImageData(image,0,0);
 context.save();
 context.clearRect(0,0,width,height);
 context.fillStyle='#071324';context.fillRect(0,0,width,height);
 context.imageSmoothingEnabled=true;
 if(globe){context.beginPath();context.arc(center[0],center[1],radius,0,Math.PI*2);context.clip()}
 context.drawImage(memoCanvas,0,0,width,height);
 const path=geoPath(map,context);
 context.lineWidth=.65;
 context.beginPath();path(graticule);context.strokeStyle='#d4e6fb28';context.stroke();
 context.beginPath();path(land);
 context.fillStyle=earthPixels?'#00000000':'#9abd9470';context.fill();
 context.strokeStyle=earthPixels?'#d5eeff40':'#b9d3b068';context.lineWidth=.7;context.stroke();
 if(earthZoom>=1.25){
   context.beginPath();path(borders);context.lineWidth=.35;
   context.strokeStyle='#b1e8d64f';context.stroke();
 }
 const spot=map([sunLon,d.decl]);
 if(spot){
  context.strokeStyle='#ffd580';context.lineWidth=1.25;
  context.beginPath();context.arc(spot[0],spot[1],8,0,Math.PI*2);context.stroke();
  context.fillStyle='#ffd580';context.beginPath();context.arc(spot[0],spot[1],3,0,Math.PI*2);context.fill();
 }
 const user=map([lon,lat]);
 if(user){
  context.save();context.shadowColor='#fff9e3';context.shadowBlur=12;
  context.fillStyle='#fff7d8';context.beginPath();context.arc(user[0],user[1],4,0,Math.PI*2);context.fill();context.restore();
  context.beginPath();context.arc(user[0],user[1],8,0,Math.PI*2);context.strokeStyle='#fff9e9b0';context.stroke();
 }
 context.restore();
 return {sunLon,sunDecl:d.decl,textureStatus};
}
