import {geoEqualEarth,geoOrthographic,geoMercator,geoPath,geoGraticule10,geoDistance} from 'd3-geo';
import {feature,mesh} from 'topojson-client';
import atlas from 'world-atlas/countries-110m.json';
import {RAD,wrap,solar,clamp} from './astronomy.js';

const land=feature(atlas,atlas.objects.land);
const borders=mesh(atlas,atlas.objects.countries,(a,b)=>a!==b);
const graticule=geoGraticule10();
const memoCanvas=document.createElement('canvas');
const memoCtx=memoCanvas.getContext('2d');
const modeConstructors={equal:geoEqualEarth,globe:geoOrthographic,mercator:geoMercator};
export function createEarthProjection(width,height,state){
 const {earthProjection='equal',earthZoom=1,earthLon=0,earthLat=0,lat=0}=state;
 const projection=modeConstructors[earthProjection]||geoEqualEarth;
 const map=projection();
 if(earthProjection==='globe'){
  // A globe is centered on the observing point in both axes.
  map.rotate([-earthLon,-earthLat]);
 }else{
  // A reset flat map starts north-up with the equator vertically centered.
  // But vertical drag must still tilt the whole Earth, just as earlier
  // HelioClock builds did. earthLat is the dragged orientation; subtract
  // the observer latitude so Reset (earthLat=lat) returns to zero tilt.
  const tilt=clamp(earthLat-lat,-75,75);
  map.rotate([-earthLon,-tilt]).center([0,0]);
 }
 map.fitExtent([[9,9],[width-9,height-9]],{type:'Sphere'});
 map.scale(map.scale()*earthZoom);
 if(earthProjection==='globe')map.clipAngle(90);
 return map;
}

const normLon=(v)=>wrap(v+180,360)-180;
const earthImages={};
const earthLoadState={standard:'idle',high:'idle'};
let nightImage=null,nightStatus='idle';
function loadNightLights(){
 if(nightImage||nightStatus==='loading'||nightStatus==='failed')return;
 nightStatus='loading';const img=new Image();
 img.onload=()=>{try{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  nightImage=ctx.getImageData(0,0,c.width,c.height);nightStatus='ready';
 }catch{nightStatus='failed'}window.dispatchEvent(new Event('helioclock-earth-texture-ready'))};
 img.onerror=()=>{nightStatus='failed';window.dispatchEvent(new Event('helioclock-earth-texture-ready'))};
 img.src='./earth-black-marble-lights-2016.jpg';
}
export const nightLightsStatus=()=>nightStatus;
function loadEarthTexture(quality){
 const key=quality==='4k'?'high':'standard';
 if(earthImages[key]||earthLoadState[key]==='loading')return;
 earthLoadState[key]='loading';
 const photo=new Image();
 photo.onload=()=>{
  try{
   const off=document.createElement('canvas');
   off.width=photo.naturalWidth;off.height=photo.naturalHeight;
   const cx=off.getContext('2d',{willReadFrequently:true});
   cx.drawImage(photo,0,0);
   earthImages[key]=cx.getImageData(0,0,off.width,off.height);
   earthLoadState[key]='ready';
  }catch(error){earthLoadState[key]='failed';console.warn('Earth texture decode failed',error)}
  window.dispatchEvent(new Event('helioclock-earth-texture-ready'));
 };
 photo.onerror=()=>{earthLoadState[key]='failed';window.dispatchEvent(new Event('helioclock-earth-texture-ready'))};
 photo.src=key==='high'?'./earth-blue-marble-4k.jpg':'./earth-blue-marble.png';
}
loadEarthTexture('2k');
export function earthTextureStatus(quality='2k'){
 const key=quality==='4k'?'high':'standard';
 return {selected:quality,status:earthLoadState[key],width:earthImages[key]?.width||0,height:earthImages[key]?.height||0};
}
function sampleEarth(lon,lat,quality='2k'){
 // The standard texture remains the backup if the optional high detail
 // image is still loading. Both files are shipped in the offline ZIP.
 const photo=quality==='4k'&&earthImages.high?earthImages.high:earthImages.standard;
 if(!photo)return null;
 const {width,height,data}=photo;
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


function nightLightStrength(lon,lat){
 if(!nightImage)return 0;
 const {width,height,data}=nightImage;
 const x=Math.floor(wrap(lon+180,360)/360*width)%width;
 const y=Math.min(height-1,Math.floor(clamp((90-lat)/180,0,.999999)*height));
 const i=(y*width+x)*4;
 const r=data[i],g=data[i+1],b=data[i+2];
 // Grayscale light emissions, not the colour terrain map.
 if(Math.max(r,g,b)-Math.min(r,g,b)>16)return 0;
 return clamp((Math.min(r,g,b)-5)/110,0,1);
}
/** Draw an Earth projection with per-pixel physically computed twilight and mapped land boundaries.
 * No third-party map services or remote tile downloads are required.
 */
export function renderEarth(context,width,height,date,state){
 const {earthProjection='equal',earthZoom=1,earthLon=0,earthLat=0,lat,lon,
  earthTextureQuality='2k',earthTwilight={},cityLights=false,showAurora=false,auroraGrid=null}=state;
 if(cityLights)loadNightLights();
 if(earthTextureQuality==='4k')loadEarthTexture('4k');
 // The same projection factory is used by regression tests.
 const map=createEarthProjection(width,height,state);
 const d=solar(date);
 const utcMinutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
 const sunLon=normLon((720-utcMinutes-d.eq)/4),sunLat=d.decl*RAD;
 const sunSin=Math.sin(sunLat),sunCos=Math.cos(sunLat);
 // Rendering twilight into a lower-resolution buffer is dramatically faster during dragging.
 const rasterFactor=earthTextureQuality==='4k'&&earthImages.high?.width===4096?.90:.68;
 const rw=Math.max(120,Math.min(2304,Math.ceil(width*rasterFactor)));
 const rh=Math.max(90,Math.min(1280,Math.ceil(height*rasterFactor)));
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
   const photo=sampleEarth(p[0],p[1],earthTextureQuality);
   let r,g,b;
   if(photo){
    // Smoothly darken the satellite mosaic, preserving coastlines and mountains at dusk.
    // Illuminate the real surface image with a single achromatic factor.
    // No artificial blue/purple wash or channel-specific brightness offsets.
    const fraction=clamp((altitude+17)/20,0,1);
    const light=fraction*fraction*(3-2*fraction);
    const brightness=.055+.945*light;
    r=photo[0]*brightness;
    g=photo[1]*brightness;
    b=photo[2]*brightness;
   }else [r,g,b]=sample(altitude,null);
   // Distinguish twilight stages by *brightness only*, preserving the
   // satellite texture's natural RGB ratios at every stage.
   let multiplier=1;
   if(altitude<=0&&altitude>-6&&earthTwilight.civil)multiplier=.82;
   else if(altitude<=-6&&altitude>-12&&earthTwilight.nautical)multiplier=.65;
   else if(altitude<=-12&&altitude>-18&&earthTwilight.astronomical)multiplier=.48;
   else if(altitude<=-18&&earthTwilight.night)multiplier=.78;
   r*=multiplier;g*=multiplier;b*=multiplier;
   if(cityLights&&nightImage){
    const darkness=clamp((-altitude-2)/12,0,1);
    if(darkness>0){
     const light=nightLightStrength(p[0],p[1])*darkness;
     r+=light*210;g+=light*195;b+=light*160;
    }
   }
   if(showAurora&&auroraGrid){
    const ix=((Math.round(p[0])%360)+360)%360;
    const iy=Math.max(0,Math.min(180,Math.round(p[1])+90));
    const intensity=auroraGrid[iy*360+ix]||0;
    const strength=Math.pow(intensity/100,.7)*.75;
    if(strength>.015){
     const dark=clamp((-altitude+2)/14,0,1);
     const alpha=strength*(.22+.78*dark);
     r=r*(1-alpha)+42*alpha;
     g=g*(1-alpha)+228*alpha;
     b=b*(1-alpha)+120*alpha;
    }
   }
   image.data[i]=r;image.data[i+1]=g;image.data[i+2]=b;image.data[i+3]=255;
  }
 }
 memoCtx.putImageData(image,0,0);
 context.save();
 context.clearRect(0,0,width,height);
 context.fillStyle='#071324';context.fillRect(0,0,width,height);
 context.imageSmoothingEnabled=true;
 // The inverse of Equal Earth/Mercator is defined even outside the visible
 // projected Sphere. Without this clip the satellite texture wraps into
 // phantom continents when a single-panel layout makes the canvas very wide.
 // Clip the raster to exactly the same projected Sphere as the vector layers.
 context.beginPath();
 geoPath(map,context)({type:'Sphere'});
 context.clip();
 context.drawImage(memoCanvas,0,0,width,height);
 const path=geoPath(map,context);
 context.lineWidth=.65;
 context.beginPath();path(graticule);context.strokeStyle='#d4e6fb28';context.stroke();
 context.beginPath();path(land);
 context.fillStyle=(earthImages.standard||earthImages.high)?'#00000000':'#9abd9470';context.fill();
 context.strokeStyle=(earthImages.standard||earthImages.high)?'#d5eeff40':'#b9d3b068';context.lineWidth=.7;context.stroke();
 if(earthZoom>=1.25){
   context.beginPath();path(borders);context.lineWidth=.35;
   context.strokeStyle='#b1e8d64f';context.stroke();
 }
 // The nadir is antipodal to the subsolar point (180° longitude away,
 // opposite declination). On an orthographic globe only the near hemisphere
 // can have visible markers; projection alone does not enforce this for points.
 const nadirLon=normLon(sunLon+180),nadirLat=-d.decl;
 const isVisible=point=>!globe||geoDistance(point,[earthLon,earthLat])<=Math.PI/2+1e-8;
 const zenithPoint=[sunLon,d.decl],nadirPoint=[nadirLon,nadirLat];
 if(isVisible(zenithPoint)){
  const spot=map(zenithPoint);
  if(spot){
   context.save();context.strokeStyle='#ffd580';context.lineWidth=1.6;
   context.beginPath();context.arc(spot[0],spot[1],8,0,Math.PI*2);context.stroke();
   context.fillStyle='#ffd580';context.beginPath();context.arc(spot[0],spot[1],3,0,Math.PI*2);context.fill();
   context.restore();
  }
 }
 if(isVisible(nadirPoint)){
  const spot=map(nadirPoint);
  if(spot){
   // Violet diamond and central dot, visually distinct from the zenith ring.
   const [x,y]=spot;context.save();context.strokeStyle='#daacff';context.lineWidth=1.8;
   context.beginPath();context.moveTo(x,y-9);context.lineTo(x+9,y);context.lineTo(x,y+9);context.lineTo(x-9,y);context.closePath();context.stroke();
   context.fillStyle='#daacff';context.beginPath();context.arc(x,y,2.8,0,2*Math.PI);context.fill();
   context.restore();
  }
 }
 const user=isVisible([lon,lat])?map([lon,lat]):null;
 if(user){
  context.save();context.shadowColor='#fff9e3';context.shadowBlur=12;
  context.fillStyle='#fff7d8';context.beginPath();context.arc(user[0],user[1],4,0,Math.PI*2);context.fill();context.restore();
  context.beginPath();context.arc(user[0],user[1],8,0,Math.PI*2);context.strokeStyle='#fff9e9b0';context.stroke();
 }
 context.restore();
 // Expose the exact projection geometry drawn by this frame to the
 // browser regression tests. No standalone source-module import is needed.
 const observerScreen=map([lon,lat]);
 const eastScreen=map([lon+5,lat]);
 const northScreen=map([lon,Math.min(lat+5,89)]);
 return {sunLon,sunDecl:d.decl,nadirLon,nadirLat,
  textureStatus:earthTextureStatus(earthTextureQuality).status,
  projectionProbe:{projection:earthProjection,observer:observerScreen,
   east:eastScreen,north:northScreen,viewCenter:[width/2,height/2],
   equator:map([earthLon,0]),worldBounds:geoPath(map).bounds({type:'Sphere'}),
   latitudeTilt:earthProjection==='globe'?earthLat:clamp(earthLat-lat,-75,75)}};

}
