import {sunEvents,sunHorizontal} from './astronomy.js';
import {solarDirectionEvents,solarBearingPath,localSolarSectors} from './local-sun-geometry.js';

// Small self-contained Web Mercator slippy map. Standard OSM raster tiles,
// requested only for the viewport (no API key, bulk download or prefetch).
const MAX_Z=18,MIN_Z=2,TILE=256;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const wrapX=(x,world)=>((x%world)+world)%world;
function project(lat,lon,z){
 const scale=TILE*2**z,phi=clamp(lat,-85.051129,85.051129)*Math.PI/180;
 return {x:((lon+180)/360)*scale,y:(1-Math.asinh(Math.tan(phi))/Math.PI)/2*scale};
}
function unproject(x,y,z){
 const scale=TILE*2**z;
 return {lon:((x/scale)%1+1)%1*360-180,
  lat:Math.atan(Math.sinh(Math.PI*(1-2*clamp(y/scale,0,1))))*180/Math.PI};
}
const directionalColors={sunrise:'#eab94a',sunset:'#e27945',
 'civil-dawn':'#a8b7eb','civil-dusk':'#a8b7eb',
 'nautical-dawn':'#7497ce','nautical-dusk':'#7497ce',
 'astronomical-dawn':'#b1a0d8','astronomical-dusk':'#b1a0d8'};
export function createLocalSunMap({
 container,tileLayer,shadeCanvas,raysCanvas,observerDot,output,onObserverChange
}){
 let lat=49.19,lon=-98.10,mapCenter={lat,lon},z=11;
 let mode='both',mapInitialized=false;
 let lineOptions={solar:true,civil:true,nautical:true,astronomical:true};
 let date=new Date(),tileSignature='',eventsKey='',events=[];
 let activePointers=new Map(),drag=null,pinch=null,scheduled=false;
 const renderLater=()=>{
  if(scheduled)return;
  scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw()});
 };
 function mapBox(){return {w:container.clientWidth,h:container.clientHeight}}
 function mapCoords(x,y){
  const box=mapBox(),center=project(mapCenter.lat,mapCenter.lon,z);
  return unproject(center.x+x-box.w/2,center.y+y-box.h/2,z);
 }
 function screenCoords(point){
  const {w,h}=mapBox(),center=project(mapCenter.lat,mapCenter.lon,z),pos=project(point.lat,point.lon,z);
  const world=TILE*2**z;
  let dx=pos.x-center.x;
  if(dx>world/2)dx-=world;
  if(dx< -world/2)dx+=world;
  return {x:w/2+dx,y:h/2+pos.y-center.y};
 }
 function setCenter(next){
  mapCenter={lat:clamp(next.lat,-85.051,85.051),lon:((next.lon+540)%360)-180};
  renderLater();
 }
 function setZoom(next,point){
  next=clamp(Math.round(next),MIN_Z,MAX_Z);
  if(next===z)return;
  const {w,h}=mapBox(),at=point||{x:w/2,y:h/2};
  const before=mapCoords(at.x,at.y);
  z=next;
  const projected=project(before.lat,before.lon,z);
  mapCenter=unproject(projected.x+(w/2-at.x),projected.y+(h/2-at.y),z);
  renderLater();
 }
 function updateObserver(next,{center=false,notify=true}={}){
  lat=clamp(next.lat,-89.99,89.99);
  lon=((next.lon+540)%360)-180;
  eventsKey='';
  if(center)setCenter({lat,lon});
  if(notify)onObserverChange({lat,lon});
  renderLater();
 }
 function fetchTiles(w,h){
  const center=project(mapCenter.lat,mapCenter.lon,z),world=2**z;
  const left=center.x-w/2,top=center.y-h/2;
  const minX=Math.floor(left/TILE),maxX=Math.floor((left+w)/TILE);
  const minY=Math.max(0,Math.floor(top/TILE)),maxY=Math.min(world-1,Math.floor((top+h)/TILE));
  const key=[z,minX,maxX,minY,maxY].join('/');
  if(key===tileSignature){
   // Tile pixel offsets may change while the visible tile indices do not.
   for(const tile of tileLayer.children){
    tile.style.left=(Number(tile.dataset.x)*TILE-left)+'px';
    tile.style.top=(Number(tile.dataset.y)*TILE-top)+'px';
   }
   return;
  }
  tileSignature=key;
  const keep=new Set();
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const identity=z+'/'+wrapX(x,world)+'/'+y;
   const key=identity+'@'+x;
   keep.add(key);
   let img=[...tileLayer.children].find(el=>el.dataset.key===key);
   if(!img){
    img=document.createElement('img');img.alt='';img.draggable=false;
    img.loading='lazy';img.decoding='async';img.className='local-sun-tile';
    img.dataset.key=key;img.dataset.x=String(x);img.dataset.y=String(y);
    img.src='https://tile.openstreetmap.org/'+identity+'.png';
    img.addEventListener('error',()=>{img.classList.add('tile-error')});
    tileLayer.appendChild(img);
   }
   img.style.left=(x*TILE-left)+'px';img.style.top=(y*TILE-top)+'px';
  }
  for(const img of [...tileLayer.children])if(!keep.has(img.dataset.key))img.remove();
 }
 function setCanvas(canvas,w,h){
  const dpr=Math.min(devicePixelRatio||1,2);
  const cw=Math.max(1,Math.round(w*dpr)),ch=Math.max(1,Math.round(h*dpr));
  if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  return ctx;
 }
 function shadeMap(w,h){
  const ctx=setCanvas(shadeCanvas,w,h);
  if(mode==='lines')return;
  ensureEvents();
  const ev=sunEvents(date,lat,lon);
  if(!ev.noon||!events.length)return;
  const noonAz=sunHorizontal(ev.noon,lat,lon).az;
  const sectors=localSolarSectors(events,noonAz);
  const anchor=screenCoords({lat,lon});
  const reach=Math.hypot(w,h)+Math.hypot(anchor.x,anchor.y)+30;
  // Angular shading makes the *directional compass* readable at any
  // street-map zoom. It deliberately does not pretend that nearby streets
  // have different day/night states.
  const rad=Math.PI/180;
  for(const band of sectors){
   const arc=((band.end-band.start)%360+360)%360;
   ctx.beginPath();ctx.moveTo(anchor.x,anchor.y);
   ctx.arc(anchor.x,anchor.y,reach,(band.start-90)*rad,
    (band.start+arc-90)*rad);
   ctx.closePath();
   ctx.fillStyle='rgba(8,17,39,'+band.opacity+')';
   ctx.fill();
  }
  container.dataset.localSunShadeSectors=String(sectors.length);
 }
 function ensureEvents(){
  const key=[date.toISOString().slice(0,10),lat.toFixed(5),lon.toFixed(5)].join('/');
  if(key===eventsKey)return;
  eventsKey=key;events=solarDirectionEvents(date,lat,lon);
 }
 function rayMap(w,h){
  const ctx=setCanvas(raysCanvas,w,h);
  ensureEvents();
  const anchor=screenCoords({lat,lon});
  const filtered=events.filter(e=>lineOptions[e.key.startsWith('sun')?'solar':e.key.split('-')[0]]);
  if(mode!=='shade'){
   // Match geodesic sampling to the map's current metres-per-pixel.
   // The previous 50 km minimum produced >1,000-pixel jumps between
   // adjacent samples at zoom 18; the discontinuity guard then discarded
   // the entire path, so no rays appeared at street-level zoom.
   const kmPerPixel=40075.016686*Math.cos(lat*Math.PI/180)/(TILE*2**z);
   const km=clamp(Math.max(w,h)*kmPerPixel*1.8,0.001,9000);
   for(const e of filtered){
    const points=solarBearingPath(lat,lon,e.az,km);
    ctx.beginPath();
    let last=null;
    for(const [pLat,pLon] of points){
     const point=screenCoords({lat:pLat,lon:pLon});
     if(last&&Math.hypot(point.x-last.x,point.y-last.y)>w*.75){last=null;continue}
     if(last)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);
     last=point;
    }
    ctx.strokeStyle=directionalColors[e.key]||'#ffca82';
    ctx.lineWidth=e.key.startsWith('sun')?2.8:1.5;
    ctx.setLineDash(e.key.startsWith('sun')?[]:[5,5]);ctx.stroke();
   }
   ctx.setLineDash([]);
  }
  observerDot.style.left=anchor.x+'px';observerDot.style.top=anchor.y+'px';
  observerDot.style.display=anchor.x> -30&&anchor.x<w+30&&anchor.y> -30&&anchor.y<h+30?'block':'none';
  const degrees=(value,positive,negative)=>Math.abs(value).toFixed(4)+'° '+(value>=0?positive:negative);
  const browserTime=d=>d.toLocaleTimeString('en-CA',{hour:'2-digit',minute:'2-digit'});
  const summaryWithTimes=filtered.map(e=>e.label+' '+Math.round(e.az)+'° ('+browserTime(e.date)+')').join(' · ');
  output.textContent=degrees(lat,'N','S')+' · '+degrees(lon,'E','W')+' · '+summaryWithTimes+
   ' · Times use device timezone';
  container.dataset.localSunLineCount=String(mode==='shade'?0:filtered.length);
  container.dataset.localSunEventCount=String(events.length);
  container.dataset.localSunObserver=JSON.stringify({lat,lon});
 }
 function draw(){
  if(!container.isConnected||container.offsetParent===null)return;
  const {w,h}=mapBox();if(w<2||h<2)return;
  fetchTiles(w,h);shadeMap(w,h);rayMap(w,h);
  mapInitialized=true;
  container.dataset.localSunTiles=String(tileLayer.children.length);
  container.dataset.localSunZoom=String(z);
 }
 function relative(event){
  const b=container.getBoundingClientRect();
  return {x:event.clientX-b.left,y:event.clientY-b.top};
 }
 container.addEventListener('pointerdown',e=>{
  if(e.target.closest('button'))return;
  const p=relative(e);activePointers.set(e.pointerId,p);
  container.setPointerCapture(e.pointerId);
  if(activePointers.size===1){
   drag={p,center:project(mapCenter.lat,mapCenter.lon,z),moved:false,
    marker:e.target===observerDot||observerDot.contains(e.target)};
  }else if(activePointers.size===2){
   const [a,b]=[...activePointers.values()];
   pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:z};
   drag=null;
  }
 });
 container.addEventListener('pointermove',e=>{
  if(!activePointers.has(e.pointerId))return;
  const p=relative(e);activePointers.set(e.pointerId,p);
  if(activePointers.size===2&&pinch){
   const [a,b]=[...activePointers.values()];
   const dist=Math.hypot(a.x-b.x,a.y-b.y);
   if(dist>pinch.distance*1.35)setZoom(pinch.zoom+1,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   else if(dist<pinch.distance*.74)setZoom(pinch.zoom-1,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
   if(dist>pinch.distance*1.35||dist<pinch.distance*.74){pinch.distance=dist;pinch.zoom=z}
  }else if(drag){
   const dx=p.x-drag.p.x,dy=p.y-drag.p.y;
   if(Math.hypot(dx,dy)>5)drag.moved=true;
   if(drag.marker){
    if(drag.moved)updateObserver(mapCoords(p.x,p.y));
   }else if(drag.moved){
    setCenter(unproject(drag.center.x-dx,drag.center.y-dy,z));
   }
  }
 });
 const release=e=>{
  if(!activePointers.has(e.pointerId))return;
  const p=relative(e);
  activePointers.delete(e.pointerId);
  if(drag&&!drag.moved&&activePointers.size===0)updateObserver(mapCoords(p.x,p.y));
  if(activePointers.size<2)pinch=null;
  drag=null;
  try{container.releasePointerCapture(e.pointerId)}catch{}
 };
 container.addEventListener('pointerup',release);
 container.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);pinch=null;drag=null});
 container.addEventListener('wheel',e=>{
  e.preventDefault();setZoom(z+(e.deltaY<0?1:-1),relative(e));
 },{passive:false});
 return {
  draw:renderLater,
  setDate(value){if(+date!==+value){date=value;renderLater()}},
  setMode(value){mode=value;renderLater()},
  setLineOption(group,enabled){if(group in lineOptions){lineOptions[group]=!!enabled;renderLater()}},
  setObserver:updateObserver,
  getObserver:()=>({lat,lon}),
  centerOnObserver(){setCenter({lat,lon})},
  zoom(delta){setZoom(z+delta)},
  getState:()=>({zoom:z,center:mapCenter,observer:{lat,lon},initialized:mapInitialized})
 };
}
