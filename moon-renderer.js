import {clamp,moon,moonOrientation} from './astronomy.js';

let lunarPhoto=null;
let loading='loading';
const image=new Image();
image.onload=()=>{
 try{
  const source=document.createElement('canvas');
  source.width=image.naturalWidth;source.height=image.naturalHeight;
  const ctx=source.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  lunarPhoto=ctx.getImageData(0,0,source.width,source.height);
  loading='ready';
 }catch(e){console.warn('Lunar texture unavailable',e);loading='unavailable';}
 window.dispatchEvent(new Event('helioclock-moon-texture-ready'));
};
image.onerror=()=>{loading='unavailable';window.dispatchEvent(new Event('helioclock-moon-texture-ready'))};
image.src='./moon-nearside-lro.jpg';

/**
 * Texture frame: image north-up, lunar east to image left.
 * χ = celestial bright-limb angle eastward from lunar north,
 * q = parallactic angle (celestial north -> observer zenith);
 * clockwise canvas rotation +q makes the photograph horizon aligned.
 *
 * Libration and topocentric parallax of the lunar orientation are not yet
 * modelled. The phase fraction uses an approximate synodic calculation.
 */
export function renderMoon(canvas,when,latitude,longitude){
 const w=canvas.clientWidth,h=canvas.clientHeight;
 if(w<=0||h<=0)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 c.clearRect(0,0,w,h);
 const m=moon(when,latitude,longitude),tilt=moonOrientation(when,latitude,longitude);
 const size=Math.max(20,Math.floor(Math.min(w*.58,h*.80)));
 const radius=size/2;
 // Illuminate image coordinates before rotating the entire lunar photograph.
 // The surface normal of the visible sphere is (nx,ny,nz).
 const z=clamp(m.illuminated*2-1,-1,1);
 const side=Math.sqrt(Math.max(0,1-z*z));
 const chi=tilt.brightLimb*Math.PI/180;
 const sunX=-Math.sin(chi)*side,sunY=-Math.cos(chi)*side;
 const temp=document.createElement('canvas');temp.width=size;temp.height=size;
 const ctx=temp.getContext('2d');
 const pixels=ctx.createImageData(size,size);
 const photo=lunarPhoto;
 for(let y=0;y<size;y++){
  for(let x=0;x<size;x++){
   const nx=(x+.5-radius)/radius,ny=(y+.5-radius)/radius,rr=nx*nx+ny*ny;
   if(rr>=1)continue;
   const nz=Math.sqrt(1-rr);
   const light=Math.max(0,nx*sunX+ny*sunY+nz*z);
   const earthshine=.022;
   const shade=earthshine+.978*light;
   const fade=clamp((1-Math.sqrt(rr))*radius,0,1);
   const q=(y*size+x)*4;
   let red=180,green=185,blue=195;
   if(photo){
    // The original NASA mosaic is an orthographic near-side image.
    const sx=Math.min(photo.width-1,Math.max(0,Math.round((x+.5)/size*photo.width)));
    const sy=Math.min(photo.height-1,Math.max(0,Math.round((y+.5)/size*photo.height)));
    const p=(sy*photo.width+sx)*4;
    red=photo.data[p];green=photo.data[p+1];blue=photo.data[p+2];
   }
   pixels.data[q]=red*shade;
   pixels.data[q+1]=green*shade;
   pixels.data[q+2]=blue*shade;
   pixels.data[q+3]=Math.round(fade*255);
  }
 }
 ctx.putImageData(pixels,0,0);
 c.save();c.translate(w/2,h/2);c.rotate(tilt.parallactic*Math.PI/180);
 c.shadowBlur=8;c.shadowColor='#a7bcd355';
 c.drawImage(temp,-radius,-radius);
 c.restore();
 return {...tilt,photoLoaded:loading==='ready',illumination:m.illuminated};
}
