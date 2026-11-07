import {RAD,PI,wrap,clamp,solar,sunHorizontal,sunEvents,moon,orbitPositions,utcTime,durationText} from './astronomy.js';
const $=id=>document.getElementById(id);
const state={lat:49.19,lon:-98.10,date:new Date(),live:true,skyZoom:1,skyHeading:0,earthZoom:1,earthLon:0,earthLat:0,orreryZoom:1,playing:false};
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
 const o=canvas($('daylight-chart'));if(!o)return;const{c,w,h}=o;
 const L=36,R=w-15,T=15,B=h-24,W=R-L,H=B-T,year=state.date.getUTCFullYear();
 const count=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const data=Array.from({length:count},(_,i)=>sunEvents(new Date(Date.UTC(year,0,i+1,12)),state.lat,state.lon).duration);
 for(let v=0;v<=24;v+=6){const y=B-v/24*H;line(c,L,y,R,y,'#2b3b51');label(c,v+'h',L-7,y+4,'#8294ae',10,'right')}
 const gradient=c.createLinearGradient(0,T,0,B);gradient.addColorStop(0,'#f3c37b6b');gradient.addColorStop(1,'#f3c37b00');
 c.beginPath();c.moveTo(L,B);data.forEach((v,i)=>c.lineTo(L+i/(count-1)*W,B-v/24*H));c.lineTo(R,B);c.closePath();c.fillStyle=gradient;c.fill();
 c.beginPath();data.forEach((v,i)=>i?c.lineTo(L+i/(count-1)*W,B-v/24*H):c.moveTo(L,B-v/24*H));
 c.strokeStyle='#efbf81';c.lineWidth=2;c.stroke();
 const index=Math.floor((Date.UTC(year,state.date.getUTCMonth(),state.date.getUTCDate())-Date.UTC(year,0,1))/86400000);
 const x=L+index/(count-1)*W,y=B-data[index]/24*H;
 line(c,x,T,x,B,'#b8c7ddaa');dot(c,x,y,4,'#ffd48f',12);
 label(c,durationText(data[index]),clamp(x,L+42,R-42),Math.max(T+12,y-12),'#f4d6a5',11,'center');
 $('chart-year').textContent=String(year);
 $('daylight-chart').onclick=e=>{
  const rect=e.currentTarget.getBoundingClientRect();
  const day=Math.round(clamp((e.clientX-rect.left-L)/W,0,1)*(count-1));
  state.date=new Date(Date.UTC(year,0,day+1,state.date.getUTCHours(),state.date.getUTCMinutes()));
  state.live=false;setDateInputs();render();
 };
}
function worldMap(){
 const o=canvas($('earth-map'));if(!o)return;const{c,w,h}=o,s=solar(state.date);
 const utc=state.date.getUTCHours()+state.date.getUTCMinutes()/60+state.date.getUTCSeconds()/3600;
 // Solar noon happens where local solar time is 12:00.
 const sublon=wrap((720-utc*60-s.eq)/4+180,360)-180;
 $('subsolar').textContent=Math.abs(s.decl).toFixed(1)+'°'+(s.decl>=0?'N':'S')+' / '+Math.abs(sublon).toFixed(1)+'°'+(sublon>=0?'E':'W');
 const image=c.createImageData(Math.ceil(w),Math.ceil(h));
 const colors=[[14,25,44],[32,47,76],[57,74,107],[94,112,146],[193,155,104],[228,190,125]];
 const ll=state.lat*RAD,lo=state.lon*RAD;
 for(let y=0;y<image.height;y++){
  const lat=clamp(90-(((y+.5)/h-.5)/state.earthZoom+.5)*180+state.earthLat,-90,90)*RAD,sinLat=Math.sin(lat),cosLat=Math.cos(lat);
  for(let x=0;x<image.width;x++){
   const lon=(wrap((((x+.5)/w-.5)/state.earthZoom)*360+state.earthLon-sublon+180,360)-180)*RAD;
   const cosZ=sinLat*Math.sin(s.decl*RAD)+cosLat*Math.cos(s.decl*RAD)*Math.cos(lon);
   const alt=Math.asin(clamp(cosZ,-1,1))/RAD;
   let color;
   if(alt>=0) color=colors[5];else if(alt>=-6)color=colors[4];else if(alt>=-12)color=colors[3];else if(alt>=-18)color=colors[2];else color=colors[0];
   const k=(y*image.width+x)*4;
   const shade=.80+.12*Math.cos(lat)**2;
   image.data[k]=color[0]*shade;image.data[k+1]=color[1]*shade;image.data[k+2]=color[2]*shade;image.data[k+3]=255;
  }
 }
 c.putImageData(image,0,0);
 for(let lat=-60;lat<=60;lat+=30){
  const y=((.5-(lat-state.earthLat)/180)*state.earthZoom+.5)*h;
  if(y>=0&&y<=h)line(c,0,y,w,y,'#f4e6ca36',.7);
 }
 for(let lon=-180;lon<=180;lon+=30){
  const x=((lon-state.earthLon)/360*state.earthZoom+.5)*w;
  if(x>=0&&x<=w)line(c,x,0,x,h,'#f4e6ca36',.7);
 }
 const x=((wrap(state.lon-state.earthLon+180,360)-180)/360*state.earthZoom+.5)*w;
 const y=((.5-(state.lat-state.earthLat)/180)*state.earthZoom+.5)*h;
 if(x>=0&&x<w&&y>=0&&y<h){dot(c,x,y,4,'#fff7e0',10);c.beginPath();c.arc(x,y,8,0,2*PI);c.strokeStyle='#fff7e0a0';c.lineWidth=1;c.stroke()}
 // Rectangular projection intentionally shows illumination, not invented coastlines.
 label(c,'180°W',5,h-7,'#edf2ff99',10);label(c,'0°',w/2,h-7,'#edf2ff99',10,'center');
 label(c,'180°E',w-5,h-7,'#edf2ff99',10,'right');
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
 place(sun,'#ffca7d','Sun');place(m,'#e1ebff','Moon');
 c.restore();
}
function drawMoon(){
 const o=canvas($('moon'));if(!o)return;const{c,w,h}=o;
 const m=moon(state.date,state.lat,state.lon),radius=Math.min(w*.3,h*.39),cx=w/2,cy=h/2;
 const phase=2*PI*m.phase;
 // Draw a Lambert-lit sphere from an approximate Sun direction.
 const light=[-Math.sin(phase),0,-Math.cos(phase)];
 const pixels=c.createImageData(Math.ceil(w),Math.ceil(h));
 for(let y=Math.max(0,Math.floor(cy-radius));y<Math.min(h,Math.ceil(cy+radius));y++){
  for(let x=Math.max(0,Math.floor(cx-radius));x<Math.min(w,Math.ceil(cx+radius));x++){
   const nx=(x-cx)/radius,ny=(y-cy)/radius,d2=nx*nx+ny*ny;if(d2>1)continue;
   const nz=Math.sqrt(1-d2),illum=Math.max(0,nx*light[0]+nz*light[2]);
   const shade=.08+.92*illum,texture=.91+.04*Math.sin(nx*26+ny*9)*Math.sin(ny*31);
   const q=(y*pixels.width+x)*4;
   pixels.data[q]=Math.min(255,208*shade*texture);
   pixels.data[q+1]=Math.min(255,218*shade*texture);
   pixels.data[q+2]=Math.min(255,233*shade*texture);
   pixels.data[q+3]=255;
  }
 }
 c.putImageData(pixels,0,0);
 c.beginPath();c.arc(cx,cy,radius,0,2*PI);c.strokeStyle='#bdcbe94a';c.lineWidth=.8;c.stroke();
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
