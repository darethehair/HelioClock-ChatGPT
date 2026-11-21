import {clamp,moon,moonOrientation} from './astronomy.js';
import {lunarNearsideTexture} from './moon-renderer.js';

const RAD=Math.PI/180,TAU=2*Math.PI;
const frac=n=>n-Math.floor(n);
const noise=(x,y)=>frac(Math.sin(x*127.1+y*311.7)*43758.5453);
// Placeholder terrain, unmistakably illustrative and NOT a far-side survey.
function provisionalFarSide(x,y,z){
 const lat=Math.asin(clamp(y,-1,1)),lon=Math.atan2(x,-z);
 let v=174+12*Math.sin(19*lon+8*lat)*Math.cos(16*lat);
 v+=7*Math.sin(53*lon+31*lat)+5*Math.sin(97*lon-79*lat);
 for(let i=0;i<21;i++){
  const a=noise(i+11,6)*TAU,b=(noise(i+31,13)-.5)*Math.PI;
  const dx=(lon-a+Math.PI*3)%TAU-Math.PI,dy=lat-b;
  const dist=Math.hypot(dx*Math.cos(lat),dy);
  const radius=.035+noise(i+12,44)*.085;
  if(dist<radius){
   const f=dist/radius;
   v+=f>.74?24*(1-(f-.74)/.26):f<.38?-19*(1-f/.38):0;
  }
 }
 return clamp(v,92,225);
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
 const diameter=Math.round(Math.min(w*.82,h*.9,550)),r=diameter/2;
 const scratch=document.createElement('canvas');scratch.width=diameter;scratch.height=diameter;
 const g=scratch.getContext('2d'),pixels=g.createImageData(diameter,diameter);
 const m=moon(date,lat,lon),tilt=moonOrientation(date,lat,lon);
 const cosine=clamp(m.illuminated*2-1,-1,1);
 const side=Math.sqrt(Math.max(0,1-cosine*cosine));
 const angle=tilt.brightLimb*RAD;
 // Sun direction in body-space at home view: match current 2D lunar phase.
 const sun={x:-Math.sin(angle)*side,y:-Math.cos(angle)*side,z:cosine};
 const texture=lunarNearsideTexture();
 const fallbackR=180;
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
   if(body.z>=0){
    near++;
    if(texture){
     // Orthographic near-side photo: lunar north up, matching 2D.
     const sx=clamp(Math.round((body.x+1)*.5*(texture.width-1)),0,texture.width-1);
     const sy=clamp(Math.round((body.y+1)*.5*(texture.height-1)),0,texture.height-1);
     const si=(sy*texture.width+sx)*4;
     red=texture.data[si];green=texture.data[si+1];blue=texture.data[si+2];
    }
   }else{
    far++;
    const grey=provisionalFarSide(body.x,body.y,body.z);
    red=grey;green=grey*.99;blue=grey*.96;
   }
   pixels.data[i]=clamp(red*diffuse,0,255);
   pixels.data[i+1]=clamp(green*diffuse,0,255);
   pixels.data[i+2]=clamp(blue*diffuse,0,255);
   pixels.data[i+3]=Math.round(limb*255);
  }
 }
 g.putImageData(pixels,0,0);
 c.drawImage(scratch,(w-diameter)/2,(h-diameter)/2);
 canvas.dataset.globeNearPixels=String(near);
 canvas.dataset.globeFarPixels=String(far);
 canvas.dataset.globeYaw=String(yaw);
 canvas.dataset.globePitch=String(pitch);
 return {illumination:m.illuminated,nearSideReady:!!texture,farSideIllustrative:true};
}
