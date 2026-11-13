// NASA GIBS daily NOAA-20/21 VIIRS true-colour satellite mosaics.
// Produces a qualitative photographic cloud overlay, NOT a measured cloud fraction.
// Retrieved independently from HelioClock's simulated date; no credentials required.
const URL='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const DAYS_BACK=[1,2,3,4];
// Suomi-NPP stopped delivering new observations in November 2026.
// Request active successor satellites and fall back if one has no imagery.
const LAYERS=[['NOAA-20','VIIRS_NOAA20_CorrectedReflectance_TrueColor'],['NOAA-21','VIIRS_NOAA21_CorrectedReflectance_TrueColor']];
let snapshot={status:'idle',images:[],day:null,satellite:null,error:null,requested:null};
let loading=false;
export const cloudStatus=()=>snapshot;
const notice=()=>window.dispatchEvent(new Event('helioclock-cloud-ready'));
function utcDayBack(n){
 const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()-n);
 return d.toISOString().slice(0,10);
}
export function cloudWmsUrl(date,layer=LAYERS[0][1]){
 const args=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',
  LAYERS:layer,STYLES:'',FORMAT:'image/jpeg',SRS:'EPSG:4326',
  BBOX:'-180,-90,180,90',WIDTH:'1024',HEIGHT:'512',TIME:date});
 return URL+'?'+args;
}
function loadImage(day,layer){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.crossOrigin='anonymous';
  img.onload=()=>{
   try{
    if(img.naturalWidth!==1024||img.naturalHeight!==512)
     throw Error('Unexpected GIBS mosaic dimensions');
    const cv=document.createElement('canvas');cv.width=1024;cv.height=512;
    const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
    const data=cx.getImageData(0,0,1024,512);
    // Sparse observations, empty swaths and dark oceans should not be painted.
    let lit=0;
    for(let j=0;j<data.data.length;j+=256)
     if(data.data[j]>90&&data.data[j+1]>90&&data.data[j+2]>90)lit++;
    if(lit<25)throw Error('Empty or missing daily mosaic');
    resolve(data);
   }catch(error){reject(error)}
  };
  img.onerror=()=>reject(Error('Satellite image missing or blocked'));
  img.src=cloudWmsUrl(day,layer);
 });
}
export async function refreshClouds(force=false){
 if(loading)return;
 if(snapshot.status==='ready'&&!force)return;
 loading=true;snapshot={...snapshot,status:'loading',error:null};notice();
 try{
  let lastError=null;
  for(const offset of DAYS_BACK){
   const day=utcDayBack(offset);
   // Fetch both satellites on the SAME day. A whole-globe fallback leaves
   // large empty wedges even when the other satellite observed that region.
   const results=await Promise.allSettled(LAYERS.map(async([satellite,layer])=>({
    satellite,image:await loadImage(day,layer)
   })));
   const images=[];
   for(const result of results){
    if(result.status==='fulfilled')images.push(result.value);
    else lastError=result.reason;
   }
   if(images.length){
    snapshot={status:'ready',images,day,satellite:images.map(x=>x.satellite).join(' + '),
     error:null,requested:Date.now()};
    notice();return;
   }
  }
  snapshot={status:'unavailable',images:[],day:null,satellite:null,error:lastError?.message||'No satellite image',requested:Date.now()};
  notice();
 }finally{loading=false}
}
// Same global equirectangular (lon,lat) mapping as Blue Marble.
export function cloudOpacityAt(lon,lat,baseImage,opacity=.65){
 if(!snapshot.images.length)return 0;
 const baseBright=baseImage?Math.min(...baseImage):0;
 let best=0;
 // Use the strongest valid cloud signal from the *same day's* swaths.
 // Missing-data black pixels produce zero signal. This combines actual
 // observations without painting fictional cloud cover into remaining gaps.
 for(const {image:photo} of snapshot.images){
  const {width,height,data}=photo;
  const x=Math.floor((((lon+180)%360+360)%360)/360*width)%width;
  const y=Math.min(height-1,Math.max(0,Math.floor((90-lat)/180*height)));
  const i=(y*width+x)*4;
  const r=data[i],g=data[i+1],b=data[i+2];
  const bright=Math.min(r,g,b),saturation=Math.max(r,g,b)-bright;
  const pale=Math.max(0,Math.min(1,(bright-108)/93));
  const neutral=Math.max(0,Math.min(1,(64-saturation)/46));
  const contrast=Math.max(0,Math.min(1,(bright-baseBright+22)/70));
  best=Math.max(best,pale*neutral*contrast);
 }
 return Math.max(0,Math.min(1,best*opacity));
}
