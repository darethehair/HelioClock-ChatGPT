import {clamp,moon,moonOrientation} from './astronomy.js';
import {lunarNearsideTexture} from './moon-renderer.js';

const RAD=Math.PI/180,TAU=2*Math.PI;
// NASA SVS CGI Moon Kit, LROC global albedo map, centered at 0° longitude.
// An equirectangular 360° texture contains the near side AND the far side.
let lunarGlobalTexture=null,textureStatus='loading';
const globalImage=new Image();
globalImage.onload=()=>{
 try{
  const cv=document.createElement('canvas');
  cv.width=globalImage.naturalWidth;cv.height=globalImage.naturalHeight;
  if(cv.width<1024||cv.height<512)throw Error('Global Moon texture unexpectedly small');
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(globalImage,0,0);
  lunarGlobalTexture=cx.getImageData(0,0,cv.width,cv.height);
  textureStatus='ready';
 }catch(error){
  console.warn('3D lunar global texture could not be decoded',error);
  textureStatus='unavailable';
 }
 window.dispatchEvent(new Event('helioclock-moon-globe-texture-ready'));
};
globalImage.onerror=()=>{textureStatus='unavailable';window.dispatchEvent(new Event('helioclock-moon-globe-texture-ready'))};
globalImage.src='./lroc-global-2k.jpg';
export function lunarGlobeTextureStatus(){return textureStatus}
/**
 * NASA texture is centred on 0° E, with north at the top.
 * A globe body normal (x,y,z) has 0° longitude on the +Z Earth-facing
 * meridian. +X points toward 90° E, -Y toward the north lunar pole.
 */
export function lunarGlobeUv({x,y,z}){
 const longitude=Math.atan2(x,z);
 const latitude=Math.asin(clamp(-y,-1,1));
 return {u:(.5+longitude/TAU+1)%1,v:clamp(.5-latitude/Math.PI,0,1)};
}
export function globeVector(x,y,z,yaw,pitch){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 // Object rotates about its lunar poles, then the camera's horizontal axis.
 const x1=cy*x+sy*z,z1=-sy*x+cy*z;
 return {x:x1,y:cp*y-sp*z1,z:sp*y+cp*z1};
}
export function globeInverse(x,y,z,yaw,pitch){
 const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw);
 const y1=cp*y+sp*z,z1=-sp*y+cp*z;
 return {x:cy*x-sy*z1,y:y1,z:sy*x+cy*z1};
}
export function renderMoonGlobe(canvas,date,lat,lon,{yaw=0,pitch=0,fullyLit=false}={}){
 const w=canvas.clientWidth,h=canvas.clientHeight;
 if(w<1||h<1)return null;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const shownDiameter=Math.round(Math.min(w*.82,h*.9));
 const diameter=Math.max(16,Math.min(shownDiameter,340)),r=diameter/2;
 const scratch=document.createElement('canvas');scratch.width=diameter;scratch.height=diameter;
 const g=scratch.getContext('2d'),pixels=g.createImageData(diameter,diameter);
 const m=moon(date,lat,lon),tilt=moonOrientation(date,lat,lon);
 const cosine=clamp(m.illuminated*2-1,-1,1);
 const side=Math.sqrt(Math.max(0,1-cosine*cosine));
 const angle=tilt.brightLimb*RAD;
 // Sun direction in body-space at home view: match current 2D lunar phase.
 const sun={x:-Math.sin(angle)*side,y:-Math.cos(angle)*side,z:cosine};
 const texture=lunarGlobalTexture;
 const nearsideBackup=lunarNearsideTexture();
 let near=0,far=0;
 for(let py=0;py<diameter;py++){
  const y=(py+.5-r)/r;
  for(let px=0;px<diameter;px++){
   const x=(px+.5-r)/r,rr=x*x+y*y;if(rr>=1)continue;
   const z=Math.sqrt(1-rr),body=globeInverse(x,y,z,yaw,pitch);
   const dot=body.x*sun.x+body.y*sun.y+body.z*sun.z;
   const diffuse=fullyLit?1.03:.025+1.13*Math.pow(Math.max(0,dot),.83);
   const limb=Math.min(1,(1-Math.sqrt(rr))*r);
   const i=(py*diameter+px)*4;
   let red=183,green=185,blue=190;
   if(body.z>=0)near++;else far++;
   if(texture){
    const {u,v}=lunarGlobeUv(body);
    const sx=Math.min(texture.width-1,Math.floor(u*texture.width));
    const sy=Math.min(texture.height-1,Math.floor(v*(texture.height-1)));
    const si=(sy*texture.width+sx)*4;
    red=texture.data[si];green=texture.data[si+1];blue=texture.data[si+2];
   }else if(body.z>=0&&nearsideBackup){
    // Safe fallback: the historical 2D near-side texture, never falsely
    // projected onto the unknown far-side hemisphere.
    const sx=clamp(Math.round((body.x+1)*.5*(nearsideBackup.width-1)),0,nearsideBackup.width-1);
    const sy=clamp(Math.round((body.y+1)*.5*(nearsideBackup.height-1)),0,nearsideBackup.height-1);
    const si=(sy*nearsideBackup.width+sx)*4;
    red=nearsideBackup.data[si];green=nearsideBackup.data[si+1];blue=nearsideBackup.data[si+2];
   }else{
    // Plain placeholder if the complete global asset could not be loaded.
    red=128;green=127;blue=124;
   }
   pixels.data[i]=clamp(red*diffuse,0,255);
   pixels.data[i+1]=clamp(green*diffuse,0,255);
   pixels.data[i+2]=clamp(blue*diffuse,0,255);
   pixels.data[i+3]=Math.round(limb*255);
  }
 }
 g.putImageData(pixels,0,0);
 c.imageSmoothingEnabled=true;
 c.drawImage(scratch,(w-shownDiameter)/2,(h-shownDiameter)/2,shownDiameter,shownDiameter);
 canvas.dataset.globeNearPixels=String(near);
 canvas.dataset.globeFarPixels=String(far);
 canvas.dataset.globeYaw=String(yaw);
 canvas.dataset.globePitch=String(pitch);
 canvas.dataset.globeTextureStatus=textureStatus;
 return {illumination:m.illuminated,nearSideReady:!!(texture||nearsideBackup),farSideIllustrative:!texture,globalTextureReady:!!texture};
}
