import {drawSolarYear} from './solar-chart.js';
import {renderEarth} from './earth-renderer.js';
import {starsAbove} from './sky-catalog.js';
import {RAD,PI,wrap,clamp,solar,sunHorizontal,sunEvents,moon,orbitPositions,utcTime,durationText} from './astronomy.js';
const $=id=>document.getElementById(id);
const state={lat:49.19,lon:-98.10,date:new Date(),live:true,skyZoom:1,skyHeading:0,earthZoom:1,earthLon:0,earthLat:0,earthProjection:'equal',orreryZoom:1,playing:false};
const fmt=d=>d.toISOString().slice(0,10);
function setDateInputs(){$('observe-date').value=fmt(state.date);$('observe-time').value=utcTime(state.date)}
function selectDate(){
 const d=$('observe-date').value,t=$('observe-time').value||'12:00';
 if(!d)return;
 const next=new Date(d+'T'+t+':00Z');
 if(!Number.isFinite(next.getTime()))return;
 pausePlayback();state.date=next;state.live=false;render();
}
function notice(msg){$('message').hidden=!msg;$('message').textContent=msg||''}
function canvas(el){
 const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(!w||!h)return null;
 el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);
 const c=el.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return{c,w,h};
}
function line(c,x,y,X,Y,color='#344661',width=1){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();
}
function label(c,s,x,y,color='#90a4c0',size=11,align='left'){
 c.font=size+'px sans-serif';c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);
}
function dot(c,x,y,r,color,glow=0){
 c.save();c.fillStyle=color;if(glow){c.shadowBlur=glow;c.shadowColor=color}
 c.beginPath();c.arc(x,y,r,0,2*PI);c.fill();c.restore();
}
function daylightChart(){
 const year=state.date.getUTCFullYear();
 drawSolarYear($('daylight-chart'),{
  year,lat:state.lat,lon:state.lon,selectedDate:state.date,
  onSelect:date=>{
   pausePlayback();state.date=date;state.live=false;setDateInputs();render();
  }
 });
 $('chart-year').textContent=String(year);
}
function worldMap(){
 const o=canvas($('earth-map'));if(!o)return;
 const result=renderEarth(o.c,o.w,o.h,state.date,state);
 $('earth-zoom-value').textContent=state.earthZoom.toFixed(1)+'×';
 $('subsolar').textContent=Math.abs(result.sunDecl).toFixed(1)+'°'+(result.sunDecl>=0?'N':'S')+' / '+Math.abs(result.sunLon).toFixed(1)+'°'+(result.sunLon>=0?'E':'W');
}
function sky(){
 const o=canvas($('sky'));if(!o)return;const{c,w,h}=o;
 const X=w/2,Y=h/2,rad=(Math.min(w-35,h-20)/2-14)*state.skyZoom;
 c.save();c.strokeStyle='#395270';c.lineWidth=1.3;c.beginPath();c.arc(X,Y,rad,0,2*PI);c.stroke();
 for(let a=0;a<360;a+=10){
  const p=(a-90-state.skyHeading)*RAD;line(c,X+Math.cos(p)*(rad-5),Y+Math.sin(p)*(rad-5),X+Math.cos(p)*rad,Y+Math.sin(p)*rad,'#59708e',a%30?0.6:1.3);
 }
 for(let altitude=30;altitude<=90;altitude+=30){
  c.beginPath();c.arc(X,Y,rad*(1-altitude/90),0,2*PI);
  c.strokeStyle='#344965';c.lineWidth=1;c.stroke();
 }
 for(let a=0;a<360;a+=45){
  const p=(a-90-state.skyHeading)*RAD;line(c,X,Y,X+Math.cos(p)*rad,Y+Math.sin(p)*rad,'#2b4059');
 }
 [['N',0],['E',90],['S',180],['W',270]].forEach(([t,a])=>{
  const p=(a-90-state.skyHeading)*RAD;label(c,t,X+Math.cos(p)*(rad+11),Y+Math.sin(p)*(rad+11)+4,'#c7d7ea',11,'center');
 });
 const sun=sunHorizontal(state.date,state.lat,state.lon),m=moon(state.date,state.lat,state.lon);
 const place=(obj,col,name)=>{
  if(obj.alt<=0)return;
  const distance=rad*(1-obj.alt/90),angle=(obj.az-90-state.skyHeading)*RAD;
  const x=X+distance*Math.cos(angle),y=Y+distance*Math.sin(angle);
  dot(c,x,y,name==='Sun'?8:6,col,15);
  label(c,name,x+11,y-8,col,11);
 };
 if($('show-sky-paths').checked){
  for(const [body,color] of [['sun','#ffc56a'],['moon','#c7d6ef']]){
   c.save();c.beginPath();c.strokeStyle=color+'88';c.lineWidth=1.2;c.setLineDash([4,5]);let first=true;
   for(let hour=-12;hour<=12;hour+=.25){
    const time=new Date(state.date.getTime()+hour*3600000);
    const obj=body==='sun'?sunHorizontal(time,state.lat,state.lon):moon(time,state.lat,state.lon);
    if(obj.alt<0){first=true;continue}
    const theta=(obj.az-90-state.skyHeading)*RAD,r=rad*(1-obj.alt/90);
    const xx=X+r*Math.cos(theta),yy=Y+r*Math.sin(theta);
    if(first){c.moveTo(xx,yy);first=false}else c.lineTo(xx,yy);
   }
   c.stroke();c.restore();
  }
 }
 if($('show-stars').checked){
  const occupied=[];
  for(const star of starsAbove(state.date,state.lat,state.lon)){
   const angle=(star.az-90-state.skyHeading)*RAD;
   const distance=rad*(1-star.alt/90);
   const x=X+distance*Math.cos(angle),y=Y+distance*Math.sin(angle);
   const radius=Math.max(1.3,3.7-star.mag*.75);
   dot(c,x,y,radius,'#eaf3ff',star.mag<1?7:0);
   if($('show-labels').checked && occupied.every(([xx,yy])=>Math.hypot(xx-x,yy-y)>36)){
    label(c,star.name,x+7,y-6,'#c3d6ef',10);
    occupied.push([x,y]);
   }
  }
 }
 place(sun,'#ffca7d','Sun');place(m,'#e1ebff','Moon');
 c.restore();
}
function drawMoon(){
 const o=canvas($('moon'));if(!o)return;
 const {c,w,h}=o,m=moon(state.date,state.lat,state.lon);
 const diameter=Math.max(4,Math.round(Math.min(w*.60,h*.78)));
 const radius=diameter/2,cx=w/2,cy=h/2;
 // Generate the phase in an offscreen image with LOCAL integer pixel coordinates.
 // Then drawImage respects the on-screen canvas's high-DPI transform.
 // putImageData directly on a DPR-transformed canvas caused the old offset.
 const off=document.createElement('canvas');off.width=diameter;off.height=diameter;
 const context=off.getContext('2d');
 const pixels=context.createImageData(diameter,diameter),data=pixels.data;
 const phase=2*Math.PI*m.phase;
 // Positive x is the illuminated half during the waxing phase.
 const light=[Math.sin(phase),0,-Math.cos(phase)];
 for(let y=0;y<diameter;y++){
  for(let x=0;x<diameter;x++){
   const nx=(x+.5-radius)/radius,ny=(y+.5-radius)/radius;
   const rr=nx*nx+ny*ny;if(rr>1)continue;
   const nz=Math.sqrt(1-rr);
   const diffuse=Math.max(0,nx*light[0]+nz*light[2]);
   // Near-new-Moon earthshine, subtle enough not to create a second disc.
   const shade=.025+.96*diffuse;
   const maria=1-.15*Math.max(0,Math.sin(nx*13+ny*19)*Math.cos(ny*17-nx*11));
   const crater=.94+.035*Math.sin(nx*61+ny*21)*Math.cos(nx*37-ny*43);
   const limb=.8+.2*nz;
   const brightness=shade*maria*crater*limb;
   const edge=clamp((1-Math.sqrt(rr))*radius,0,1);
   const q=(y*diameter+x)*4;
   data[q]=Math.min(255,224*brightness);
   data[q+1]=Math.min(255,230*brightness);
   data[q+2]=Math.min(255,240*brightness);
   data[q+3]=Math.round(edge*255);
  }
 }
 context.putImageData(pixels,0,0);
 c.save();
 c.shadowColor='#b7c9ed';c.shadowBlur=14;
 c.drawImage(off,cx-radius,cy-radius,diameter,diameter);
 c.restore();
 // Deliberately no second stroked circle; the Moon is a single centered disc.
 $('moon-progress-fill').style.width=(m.phase*100).toFixed(1)+'%';
}
function orrery(){
 const o=canvas($('orrery'));if(!o)return;const{c,w,h}=o,X=w/2,Y=h/2;
 const scale=Math.min(w*.43,h*.43)/1.524*state.orreryZoom;
 for(let i=0;i<140;i++){
  const x=(i*73.7%1000)/1000*w,y=(i*137.3%1000)/1000*h;
  dot(c,x,y,.55,i%3?'#fff5dd42':'#fff5dd88');
 }
 const planets=orbitPositions(state.date);
 planets.forEach(p=>{
  const r=p.radius*scale;c.beginPath();c.ellipse(X,Y,r,r,0,0,2*PI);c.strokeStyle='#40526b88';c.lineWidth=1;c.stroke();
 });
 dot(c,X,Y,12,'#ffcd7d',22);
 planets.forEach(p=>{
  const a=(p.angle-90)*RAD,x=X+p.radius*scale*Math.cos(a),y=Y+p.radius*scale*Math.sin(a);
  dot(c,x,y,p.r,p.color,9);
  label(c,p.name,x+8,y-7,p.color,10);
 });
}
function formatCoord(n,positive,negative){return Math.abs(n).toFixed(2)+'° '+(n>=0?positive:negative)}
function render(){
 const s=sunHorizontal(state.date,state.lat,state.lon),m=moon(state.date,state.lat,state.lon);
 const ev=sunEvents(state.date,state.lat,state.lon);
 const tomorrow=new Date(Date.UTC(state.date.getUTCFullYear(),state.date.getUTCMonth(),state.date.getUTCDate()+1,12));
 const next=sunEvents(tomorrow,state.lat,state.lon);
 const delta=Math.round((next.duration-ev.duration)*60);
 const paused=$('live-indicator');paused.classList.toggle('paused',!state.live);paused.innerHTML=state.live?'<i></i> LIVE SKY':'<i></i> TIME TRAVEL';
 $('utc-clock').textContent=state.date.toISOString().slice(11,19)+' UTC';
 $('date-label').textContent=state.date.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).toUpperCase();
 $('place-summary').textContent=formatCoord(state.lat,'N','S')+'  ·  '+formatCoord(state.lon,'E','W');
 $('sunrise').textContent=ev.polar?(ev.polar==='day'?'ALL DAY':'NO SUNRISE'):utcTime(ev.sunrise);
 $('sunset').textContent=ev.polar?(ev.polar==='day'?'ALL DAY':'NO SUNSET'):utcTime(ev.sunset);
 $('solar-noon').textContent=utcTime(ev.noon);
 $('daylength').textContent='DAYLIGHT '+durationText(ev.duration);
 const start=ev.sunrise?((ev.sunrise.getUTCHours()+ev.sunrise.getUTCMinutes()/60)/24*100):0;
 const end=ev.sunset?((ev.sunset.getUTCHours()+ev.sunset.getUTCMinutes()/60)/24*100):ev.polar==='day'?100:0;
 $('dayline').style.setProperty('--start',start+'%');
 $('dayline').style.setProperty('--end',(100-end)+'%');
 $('dayline-now').style.left=((state.date.getUTCHours()+state.date.getUTCMinutes()/60)/24*100)+'%';
 $('solar-alt').textContent=s.alt.toFixed(1)+'°';
 $('azimuth').textContent=s.az.toFixed(1)+'°';
 $('eot').textContent=(s.eq>=0?'+':'')+s.eq.toFixed(2)+' min';
 $('earth-distance').textContent=s.distance.toFixed(6)+' AU';
 $('moon-illumination').textContent=(m.illuminated*100).toFixed(1)+'%';
 $('moon-age').textContent=m.age.toFixed(1)+' days';
 $('moon-phase').textContent=m.name+' · '+(m.illuminated*100).toFixed(1)+'% illuminated';
 $('declination').textContent=s.decl.toFixed(2)+'°';
 $('sun-status').textContent=s.alt>=0?'Above horizon':s.alt>=-6?'Civil twilight':s.alt>=-12?'Nautical twilight':s.alt>=-18?'Astronomical twilight':'Below horizon';
 $('moon-alt').textContent=m.alt.toFixed(1)+'°';$('moon-az').textContent=m.az.toFixed(1)+'°';
 $('daylight-delta').textContent=(delta>0?'+':'')+delta+' min';
 $('observer').textContent=formatCoord(state.lat,'N','S')+' / '+formatCoord(state.lon,'E','W');
 $('time-scrubber').value=String(state.date.getUTCHours()*60+state.date.getUTCMinutes());
 $('scrub-readout').textContent=utcTime(state.date)+' UTC';
 daylightChart();worldMap();sky();drawMoon();orrery();
}
function updateCoords(){
 const lat=Number($('latitude').value),lon=Number($('longitude').value);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){notice('Enter latitude between −90° and +90°, and longitude between −180° and +180°.');return}
 state.lat=lat;state.lon=lon;notice('');render();
}
$('latitude').addEventListener('change',updateCoords);$('longitude').addEventListener('change',updateCoords);
$('observe-date').addEventListener('change',selectDate);
$('observe-time').addEventListener('change',selectDate);
$('now').addEventListener('click',()=>{pausePlayback();state.date=new Date();state.live=true;setDateInputs();render()});
$('locate').addEventListener('click',()=>{
 if(!navigator.geolocation){notice('Geolocation is unavailable in this browser. Enter coordinates manually.');return}
 notice('Requesting your location...');
 navigator.geolocation.getCurrentPosition(position=>{
  state.lat=position.coords.latitude;state.lon=position.coords.longitude;
  $('latitude').value=state.lat.toFixed(4);$('longitude').value=state.lon.toFixed(4);
  notice('');render();
 },error=>notice('Unable to determine location: '+error.message+'. You can enter coordinates manually.'),{enableHighAccuracy:false,timeout:12000});
});
function shiftTime(minutes){
 state.date=new Date(state.date.getTime()+minutes*60000);state.live=false;setDateInputs();render();
}
function pausePlayback(){state.playing=false;$('play-time').textContent='▶ Play'}
for(const [id,minutes] of [['step-back-day',-1440],['step-back-hour',-60],['step-forward-hour',60],['step-forward-day',1440]]){
 $(id).addEventListener('click',()=>{pausePlayback();shiftTime(minutes)});
}
$('time-scrubber').addEventListener('input',e=>{
 pausePlayback();
 const minutes=Number(e.target.value);
 state.date=new Date(Date.UTC(state.date.getUTCFullYear(),state.date.getUTCMonth(),state.date.getUTCDate(),Math.floor(minutes/60),minutes%60));
 state.live=false;setDateInputs();render();
});
$('play-time').addEventListener('click',()=>{
 state.playing=!state.playing;state.live=false;setDateInputs();
 $('play-time').textContent=state.playing?'Ⅱ Pause':'▶ Play';render();
});
setInterval(()=>{if(state.playing)shiftTime(15)},180);
function viewRange(id,key){$(id).addEventListener('input',e=>{state[key]=Number(e.target.value);render()})}
viewRange('sky-zoom','skyZoom');viewRange('sky-heading','skyHeading');
viewRange('earth-zoom','earthZoom');viewRange('orrery-zoom','orreryZoom');

function selectEarthProjection(next){
 state.earthProjection=next;
 for(const button of document.querySelectorAll('[data-projection]')){
  const active=button.dataset.projection===next;
  button.classList.toggle('is-active',active);
  button.setAttribute('aria-pressed',String(active));
 }
 render();
}
for(const button of document.querySelectorAll('[data-projection]')){
 button.addEventListener('click',()=>selectEarthProjection(button.dataset.projection));
}
function adjustEarthZoom(factor){
 state.earthZoom=clamp(Math.round(state.earthZoom*factor*10)/10,1,4);
 $('earth-zoom').value=state.earthZoom;
 render();
}
$('earth-zoom-in').addEventListener('click',()=>adjustEarthZoom(1.25));
$('earth-zoom-out').addEventListener('click',()=>adjustEarthZoom(.8));
$('earth-map-home').addEventListener('click',()=>{$('earth-reset').click()});
window.addEventListener('helioclock-earth-texture-ready',render);

for(const id of ['show-stars','show-labels','show-sky-paths'])$(id).addEventListener('change',render);
function reset(id,defaults){
 $(id).addEventListener('click',()=>{for(const [key,value] of Object.entries(defaults))state[key]=value;
 const controls={skyZoom:'sky-zoom',skyHeading:'sky-heading',earthZoom:'earth-zoom',orreryZoom:'orrery-zoom'};
 for(const [key,value] of Object.entries(defaults)){if(controls[key])$(controls[key]).value=value}
 render()});
}
reset('sky-reset',{skyZoom:1,skyHeading:0});
reset('earth-reset',{earthZoom:1,earthLon:0,earthLat:0});
reset('orrery-reset',{orreryZoom:1});
function wheelZoom(canvasId,controlId,key,lo,hi){
 $(canvasId).addEventListener('wheel',e=>{e.preventDefault();state[key]=clamp(state[key]*(e.deltaY>0?.88:1.14),lo,hi);$(controlId).value=state[key];render()},{passive:false});
}
wheelZoom('sky','sky-zoom','skyZoom',1,3);
wheelZoom('earth-map','earth-zoom','earthZoom',1,4);
wheelZoom('orrery','orrery-zoom','orreryZoom',.7,3);
function dragCanvas(id,onMove){
 const el=$(id);let start=null;
 el.style.cursor='grab';el.style.touchAction='none';
 el.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);el.style.cursor='grabbing'});
 el.addEventListener('pointermove',e=>{
  if(!start)return;
  const dx=e.clientX-start.x,dy=e.clientY-start.y;start={x:e.clientX,y:e.clientY};
  onMove(dx,dy,el);render();
 });
 const end=()=>{start=null;el.style.cursor='grab'};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('lostpointercapture',end);
}
dragCanvas('sky',(dx)=>{state.skyHeading=clamp(state.skyHeading+dx*.8,-180,180);$('sky-heading').value=state.skyHeading});
dragCanvas('earth-map',(dx,dy,el)=>{
 state.earthLon=wrap(state.earthLon-dx/el.clientWidth*360/state.earthZoom+180,360)-180;
 state.earthLat=clamp(state.earthLat+dy/el.clientHeight*180/state.earthZoom,-75,75);
});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,140)});
setInterval(()=>{if(state.live){state.date=new Date();setDateInputs();render()}},15000);
setDateInputs();render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
