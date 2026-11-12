// NASA GIBS daily MODIS Terra true-colour satellite mosaic.
// Produces a qualitative photographic cloud overlay, NOT a measured cloud fraction.
// Retrieved independently from HelioClock's simulated date; no credentials required.
const URL='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
const DAYS_BACK=[1,2,3,4];
const LAYER='MODIS_Terra_CorrectedReflectance_TrueColor';
let snapshot={status:'idle',image:null,day:null,error:null,requested:null};
let loading=false;
export const cloudStatus=()=>snapshot;
const notice=()=>window.dispatchEvent(new Event('helioclock-cloud-ready'));
function utcDayBack(n){
 const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()-n);
 return d.toISOString().slice(0,10);
}
export function cloudWmsUrl(date){
 const args=new URLSearchParams({SERVICE:'WMS',VERSION:'1.1.1',REQUEST:'GetMap',
  LAYERS:LAYER,STYLES:'',FORMAT:'image/jpeg',SRS:'EPSG:4326',
  BBOX:'-180,-90,180,90',WIDTH:'1024',HEIGHT:'512',TIME:date});
 return URL+'?'+args;
}
function loadImage(day){
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
  img.src=cloudWmsUrl(day);
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
   try{
    const image=await loadImage(day);
    snapshot={status:'ready',image,day,error:null,requested:Date.now()};
    notice();return;
   }catch(e){lastError=e}
  }
  snapshot={status:'unavailable',image:null,day:null,error:lastError?.message||'No satellite image',requested:Date.now()};
  notice();
 }finally{loading=false}
}
// Same global equirectangular (lon,lat) mapping as Blue Marble.
export function cloudOpacityAt(lon,lat,baseImage,opacity=.65){
 const photo=snapshot.image;if(!photo)return 0;
 const {width,height,data}=photo;
 const x=((Math.floor(((lon+180)%360+360)%360/360*width))%width);
 const y=Math.min(height-1,Math.max(0,Math.floor((90-lat)/180*height)));
 const i=(y*width+x)*4;
 const r=data[i],g=data[i+1],b=data[i+2];
 // Bright near-neutral satellite regions are potential cloud tops.
 // Suppress natural pale land/snow where the blue-marble reference is similarly light.
 const bright=Math.min(r,g,b);
 const saturation=Math.max(r,g,b)-bright;
 const pale=Math.max(0,Math.min(1,(bright-108)/93));
 const neutral=Math.max(0,Math.min(1,(64-saturation)/46));
 const baseBright=baseImage?Math.min(...baseImage):0;
 const contrast=Math.max(0,Math.min(1,(bright-baseBright+22)/70));
 return Math.max(0,Math.min(1,pale*neutral*contrast*opacity));
}
