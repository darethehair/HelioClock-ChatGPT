import {drawSkyAtlas,skyAtlasStatus} from './sky-atlas.js';
import {renderMoon} from './moon-renderer.js';
import {drawSolarYear} from './solar-chart.js';
import {renderEarth} from './earth-renderer.js';
import {starsAbove} from './sky-catalog.js';
import {RAD,PI,wrap,clamp,solar,sunHorizontal,sunEvents,moon,orbitPositions,sidereal,utcTime,durationText} from './astronomy.js';
const $=id=>document.getElementById(id);
const state={lat:49.19,lon:-98.10,date:new Date(),live:true,skyZoom:1,skyHeading:0,earthZoom:1,earthLon:0,earthLat:0,earthProjection:'equal',orreryZoom:1,moonZoom:1,orbitMode:'inner',skyLight:'daylight',skyProjection:'polar',magLimit:3.5,usePrecession:true,playing:false};
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
function skyColor(altitude){
 // Approximate visual daytime/twilight colours, using solar elevation.
 const stops=[
  [-90,[0,0,0]],[-18,[0,0,0]],[-12,[6,9,24]],
  [-6,[16,33,65]],[-1,[61,91,136]],[3,[91,155,199]],
  [15,[78,169,220]],[50,[53,151,220]],[90,[40,139,213]]
 ];
 let i=1;while(i<stops.length-1&&altitude>stops[i][0])i++;
 const [a,A]=stops[i-1],[b,B]=stops[i];
 const t=clamp((altitude-a)/(b-a),0,1);
 return A.map((v,j)=>Math.round(v*(1-t)+B[j]*t));
}
function fillSkyBackground(c,w,h,altitude){
 if(state.skyLight==='black'){
  c.fillStyle='#000000';c.fillRect(0,0,w,h);return;
 }
 const base=skyColor(altitude);
 // Small vertical horizon glow makes sunrise/sunset distinguishable from noon.
 const gradient=c.createLinearGradient(0,0,0,h);
 const upper=base.map(v=>Math.round(v*.69));
 const lower=base.map((v,i)=>Math.min(255,Math.round(v+(altitude>-10&&altitude<8?[41,21,8][i]*(1-Math.abs(altitude+1)/11):0))));
 gradient.addColorStop(0,'rgb('+upper.join(',')+')');
 gradient.addColorStop(1,'rgb('+lower.join(',')+')');
 c.fillStyle=gradient;c.fillRect(0,0,w,h);
}
function sky(){
 const o=canvas($('sky'));if(!o)return;const{c,w,h}=o;
 const X=w/2,Y=h/2,rad=(Math.min(w-35,h-20)/2-14)*state.skyZoom;
 const skySun=sunHorizontal(state.date,state.lat,state.lon);
 fillSkyBackground(c,w,h,skySun.alt);
 $('sky-light-status').textContent=state.skyLight==='black'?'Pure black background':(skySun.alt>=0?'Daylight':skySun.alt>=-6?'Civil twilight':skySun.alt>=-12?'Nautical twilight':skySun.alt>=-18?'Astronomical twilight':'Night')+' · Sun '+skySun.alt.toFixed(1)+'°';
 c.save();
 if(state.skyProjection==='polar'){
  c.strokeStyle='#395270';c.lineWidth=1.3;c.beginPath();c.arc(X,Y,rad,0,2*PI);c.stroke();
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
 } else {
  const L=w*.06,R=w*.94,T=h*.10,B=h*.90;
  c.strokeStyle='#b8d4ec77';c.strokeRect(L,T,R-L,B-T);
  for(let alt=0;alt<=90;alt+=15){
   const y=B-alt/90*(B-T);line(c,L,y,R,y,'#8db5df40',1);
   label(c,alt+'°',L-4,y+3,'#d0e6fa',10,'right');
  }
  for(let az=0;az<=360;az+=45){
   const x=L+az/360*(R-L);
   line(c,x,T,x,B,'#8db5df40',1);
   label(c,az===360?'N':az===0?'N':az===90?'E':az===180?'S':az===270?'W':az+'°',x,B+14,'#d0e6fa',10,'center');
  }
 }
 const sun=sunHorizontal(state.date,state.lat,state.lon),m=moon(state.date,state.lat,state.lon);
 const place=(obj,col,name)=>{
  if(obj.alt<=0)return;
  let x,y;
  if(state.skyProjection==='rect'){
   x=w*.06+wrap(obj.az-state.skyHeading,360)/360*w*.88;
   y=h*.90-obj.alt/90*h*.80;
  }else{
   const distance=rad*(1-obj.alt/90),angle=(obj.az-90-state.skyHeading)*RAD;
   x=X+distance*Math.cos(angle);y=Y+distance*Math.sin(angle);
  }
  dot(c,x,y,name==='Sun'?8:6,col,15);
  label(c,name,x+11,y-8,col,11);
 };
 if($('show-sky-paths').checked){
  for(const [body,color] of [['sun','#ffc56a'],['moon','#c7d6ef']]){
   c.save();c.beginPath();c.strokeStyle=color+'88';c.lineWidth=1.2;c.setLineDash([4,5]);let first=true,lastX=0;
   for(let hour=-12;hour<=12;hour+=.25){
    const time=new Date(state.date.getTime()+hour*3600000);
    const obj=body==='sun'?sunHorizontal(time,state.lat,state.lon):moon(time,state.lat,state.lon);
    if(obj.alt<0){first=true;continue}
    let xx,yy;
    if(state.skyProjection==='rect'){
     xx=w*.06+wrap(obj.az-state.skyHeading,360)/360*w*.88;
     yy=h*.90-obj.alt/90*h*.80;
    }else{
     const theta=(obj.az-90-state.skyHeading)*RAD,r=rad*(1-obj.alt/90);
     xx=X+r*Math.cos(theta);yy=Y+r*Math.sin(theta);
    }
    if(!first&&state.skyProjection==='rect'&&Math.abs(xx-lastX)>w*.42)first=true;
    if(first){c.moveTo(xx,yy);first=false}else c.lineTo(xx,yy);
    lastX=xx;
   }
   c.stroke();c.restore();
  }
 }
 const plotted=drawSkyAtlas(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  magLimit:state.magLimit,showStars:$('show-stars').checked,
  showLabels:$('show-labels').checked&&state.magLimit<=4.5,
  showConstellations:$('show-constellations').checked,
  precession:state.usePrecession
 });
 const status=skyAtlasStatus();
 $('sky-atlas-count').textContent=(status.ready?plotted||0:'Loading')+' stars'+(status.ready?' visible':' · catalog loading');
 $('precession-status').textContent=state.usePrecession?'Precession on · mean equinox of date':'Precession off · fixed J2000 coordinates';
 place(sun,'#ffca7d','Sun');place(m,'#e1ebff','Moon');
 c.restore();
}
function drawMoon(){
 const info=renderMoon($('moon'),state.date,state.lat,state.lon,state.moonZoom);
 const m=moon(state.date,state.lat,state.lon);
 $('moon-zoom-value').textContent=state.moonZoom.toFixed(1)+'×';
 $('moon-progress-fill').style.width=(m.phase*100).toFixed(1)+'%';
 if(info){
  $('moon-tilt').textContent='Bright limb from zenith: '+(info.fromZenith>0?'+':'')+info.fromZenith.toFixed(1)+'°';
  $('moon-source').textContent=info.photoLoaded?'NASA LRO near-side mosaic · horizon-aligned':'Loading lunar photography…';
 }
}
function orrery(){
 const o=canvas($('orrery'));if(!o)return;
 const {c,w,h}=o,X=w/2,Y=h/2,outer=state.orbitMode==='outer';
 // The background is permanently black: solar daylight cannot illuminate space.
 c.fillStyle='#000000';c.fillRect(0,0,w,h);
 const all=orbitPositions(state.date),planets=outer?all:all.slice(0,4);
 const maximum=outer?30.07:1.524;
 const scale=Math.min(w*.44,h*.43)/maximum*state.orreryZoom;
 // Faint orbital trajectories remain visible independently of AU guide rings.
 planets.forEach(p=>{
  const r=p.radius*scale;
  c.beginPath();c.arc(X,Y,r,0,2*PI);
  c.strokeStyle='#40526b70';c.lineWidth=.8;c.stroke();
 });
 if($('show-au-rings').checked){
  const values=outer?[5,10,15,20,25,30]:[.25,.5,.75,1,1.25,1.5];
  c.save();
  c.setLineDash([3,5]);c.lineWidth=.8;
  for(const au of values){
   const radius=au*scale;
   if(radius<8||radius>Math.max(w,h))continue;
   c.beginPath();c.arc(X,Y,radius,0,2*PI);
   c.strokeStyle='#72bddd77';c.stroke();
   // Labels sit at 315° instead of on the planetary orbital path at the right.
   const xx=X+Math.cos(-Math.PI/4)*radius,yy=Y+Math.sin(-Math.PI/4)*radius;
   if(xx>10&&xx<w-22&&yy>12&&yy<h-10){
    c.setLineDash([]);
    c.font='10px sans-serif';
    c.textAlign='left';
    c.fillStyle='#aeddf4';
    c.fillText((Number.isInteger(au)?au:au.toFixed(2).replace(/0$/,''))+' AU',xx+4,yy-4);
    c.setLineDash([3,5]);
   }
  }
  c.restore();
 }
 // No decorative fake stars in the orrery: an uncluttered black backdrop.
 dot(c,X,Y,outer?5:12,'#ffcd7d',18);
 planets.forEach(p=>{
  const a=(p.angle-90)*RAD,x=X+p.radius*scale*Math.cos(a),y=Y+p.radius*scale*Math.sin(a);
  dot(c,x,y,outer?Math.max(2.6,p.r*.75):p.r,p.color,9);
  if(outer||p.radius*scale>20)label(c,p.name,x+8,y-7,p.color,10);
 });
 $('planet-legend').innerHTML=planets.map(p=>'<span style="color:'+p.color+'">● '+p.name+'</span>').join('');
 $('au-scale-description').textContent=outer?'Outer view · 5 AU intervals':'Inner view · 0.25 AU intervals';
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
 updateLocalDisplay();
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
 const hSid=sidereal(state.date,state.lon)/15;
 const sidTime=String(Math.floor(hSid)).padStart(2,'0')+':'+String(Math.floor(hSid%1*60)).padStart(2,'0')+':'+String(Math.floor(hSid*3600%60)).padStart(2,'0');
 $('sidereal-time').textContent=sidTime+' LMST';
 $('dock-sidereal').textContent=sidTime;
 daylightChart();worldMap();sky();drawMoon();orrery();
}
function browserZone(){
 return Intl.DateTimeFormat().resolvedOptions().timeZone||'Device local time';
}
function localParts(date){
 const pad=n=>String(n).padStart(2,'0');
 return {date:date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()),
  time:pad(date.getHours())+':'+pad(date.getMinutes())};
}
function localLabel(date){
 const zone=browserZone();
 const time=new Intl.DateTimeFormat('en-CA',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone}).format(date);
 const tz=new Intl.DateTimeFormat('en-CA',{timeZone:zone,timeZoneName:'short'}).formatToParts(date).find(x=>x.type==='timeZoneName')?.value||zone;
 const offset=-date.getTimezoneOffset(),sign=offset>=0?'+':'−',pad=n=>String(n).padStart(2,'0');
 const offsetStr='UTC'+sign+pad(Math.floor(Math.abs(offset)/60))+':'+pad(Math.abs(offset)%60);
 return {time,tz,zone,offsetStr};
}
function updateLocalDisplay(){
 const v=localLabel(state.date),p=localParts(state.date);
 $('local-clock').textContent=v.time+' '+v.tz;
 $('dock-local-time').textContent=v.time;
 $('dock-time-zone').textContent=v.zone+' · '+v.offsetStr;
 $('dock-date').value=p.date;$('dock-time').value=p.time;
 $('dock-scrubber').value=state.date.getHours()*60+state.date.getMinutes();
 $('dock-play').textContent=state.playing?'Ⅱ':'▶';
 $('dock-live').classList.toggle('is-live',state.live);
}
function selectDockLocal(){
 const date=$('dock-date').value,time=$('dock-time').value;
 if(!date||!time)return;
 const next=new Date(date+'T'+time+':00');
 if(!Number.isFinite(next.getTime()))return;
 pausePlayback();state.date=next;state.live=false;setDateInputs();render();
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
viewRange('moon-zoom','moonZoom');
$('show-au-rings').addEventListener('change',render);
for(const button of document.querySelectorAll('[data-orbit-mode]')){
 button.addEventListener('click',()=>{
  state.orbitMode=button.dataset.orbitMode;
  for(const other of document.querySelectorAll('[data-orbit-mode]')){
   const selected=other===button;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));
  }
  state.orreryZoom=1;$('orrery-zoom').value=1;render();
 });
}
function changeMoonZoom(factor){state.moonZoom=clamp(Math.round(state.moonZoom*factor*10)/10,.7,2.8);$('moon-zoom').value=state.moonZoom;render()}
$('moon-zoom-in').addEventListener('click',()=>changeMoonZoom(1.25));
$('moon-zoom-out').addEventListener('click',()=>changeMoonZoom(.8));
$('moon-reset').addEventListener('click',()=>{state.moonZoom=1;$('moon-zoom').value=1;render()});


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
window.addEventListener('helioclock-moon-texture-ready',render);

for(const button of document.querySelectorAll('[data-sky-light]')){
 button.addEventListener('click',()=>{
  state.skyLight=button.dataset.skyLight;
  for(const other of document.querySelectorAll('[data-sky-light]')){
   const selected=other===button;
   other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));
  }
  render();
 });
}
for(const button of document.querySelectorAll('[data-sky-projection]')){
 button.addEventListener('click',()=>{
  state.skyProjection=button.dataset.skyProjection;
  for(const other of document.querySelectorAll('[data-sky-projection]')){
   const active=other===button;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active));
  }render();
 });
}
$('star-magnitude').addEventListener('change',e=>{
 state.magLimit=Number(e.target.value);
 $('show-labels').checked=state.magLimit<=4.5;
 render();
});
$('show-constellations').addEventListener('change',render);
$('use-precession').addEventListener('change',e=>{state.usePrecession=e.target.checked;render()});
window.addEventListener('helioclock-sky-atlas-ready',render);
const SIDEREAL_DAY_MS=86164090.5;
for(const [id,sign] of [['sky-prev-sidereal',-1],['sky-next-sidereal',1]]){
 $(id).addEventListener('click',()=>{
  pausePlayback();state.date=new Date(state.date.getTime()+sign*SIDEREAL_DAY_MS);
  state.live=false;setDateInputs();render();
 });
}
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
wheelZoom('moon','moon-zoom','moonZoom',.7,2.8);
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

for(const [id,minutes] of [['dock-prev-day',-1440],['dock-prev-hour',-60],['dock-next-hour',60],['dock-next-day',1440]]){
 $(id).addEventListener('click',()=>{pausePlayback();shiftTime(minutes)});
}
$('dock-date').addEventListener('change',selectDockLocal);
$('dock-time').addEventListener('change',selectDockLocal);
$('dock-scrubber').addEventListener('input',e=>{
 pausePlayback();const minutes=Number(e.target.value);
 const d=state.date;
 state.date=new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(minutes/60),minutes%60);
 state.live=false;setDateInputs();render();
});
$('dock-play').addEventListener('click',()=>$('play-time').click());
$('dock-live').addEventListener('click',()=>$('now').click());
for(const button of document.querySelectorAll('[data-fullscreen]')){
 button.addEventListener('click',async()=>{
  const panel=button.closest('.panel');
  try{
   if(document.fullscreenElement===panel)await document.exitFullscreen();
   else if(document.fullscreenElement){await document.exitFullscreen();await panel.requestFullscreen()}
   else await panel.requestFullscreen();
  }catch(e){notice('Fullscreen could not be opened: '+e.message)}
 });
}
// The browser fullscreen top layer hides siblings of the fullscreen element.
// Move the SAME dock (not a copy) into the active panel and restore it afterward,
// retaining all input state and event listeners.
const timeDock=$('time-dock');
const dockHome=timeDock.parentNode;
const dockNext=timeDock.nextSibling;
document.addEventListener('fullscreenchange',()=>{
 const activePanel=document.fullscreenElement;
 if(activePanel?.classList.contains('panel')){
  activePanel.appendChild(timeDock);
 }else if(dockHome){
  dockHome.insertBefore(timeDock,dockNext);
 }
 for(const button of document.querySelectorAll('[data-fullscreen]')){
  const active=activePanel===button.closest('.panel');
  button.textContent=active?'⤢ Exit':'⛶ Expand';button.setAttribute('aria-pressed',String(active));
 }
 requestAnimationFrame(render);
});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(render,140)});
setInterval(()=>{if(state.live){state.date=new Date();setDateInputs();render()}},15000);
setDateInputs();render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
