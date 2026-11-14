import {RAD,clamp,solar,sunHorizontal,wrap} from './astronomy.js';

/**
 * Daily solar horizon bands. The vertical time coordinate is LOCAL MEAN SOLAR
 * TIME (UTC + longitude/15h), intentionally not a guessed legal timezone.
 * Values are in hours 0..24 for each civil-date label.
 */
export const SOLAR_LEVELS=[
 {key:'astronomical',alt:-18,label:'Astronomical'},
 {key:'nautical',alt:-12,label:'Nautical'},
 {key:'civil',alt:-6,label:'Civil'},
 {key:'sun',alt:-.833,label:'Sunrise / sunset'}
];
export function dayBands(date,latitude,longitude){
 const instant=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),12));
 const eph=solar(instant);
 const phi=latitude*RAD,dec=eph.decl*RAD;
 const noon=12-eph.eq/60;
 const levels={};
 for(const spec of SOLAR_LEVELS){
  const denominator=Math.cos(phi)*Math.cos(dec);
  let c;
  if(Math.abs(denominator)<1e-12){
   const alt=Math.asin(Math.sin(phi)*Math.sin(dec))*180/Math.PI;
   c=alt>spec.alt?-2:2;
  }else{
   c=(Math.sin(spec.alt*RAD)-Math.sin(phi)*Math.sin(dec))/denominator;
  }
  let halfDuration=c>=1?0:c<=-1?12:Math.acos(clamp(c,-1,1))*12/Math.PI;
  levels[spec.key]={dawn:noon-halfDuration,dusk:noon+halfDuration,halfDuration,allDay:halfDuration===12,allNight:halfDuration===0};
 }
 return {noon,levels,daylight:levels.sun.halfDuration*2};
}
// The Sun's apparent ecliptic longitude reaches 0/90/180/270 degrees at
// the equinoxes and solstices. Find actual instants for the selected year,
// rather than assuming the events always fall on the same calendar dates.
export function seasonalEvents(year){
 const seeds=[
  {kind:'March equinox',target:0,month:2,day:20},
  {kind:'June solstice',target:90,month:5,day:21},
  {kind:'September equinox',target:180,month:8,day:22},
  {kind:'December solstice',target:270,month:11,day:21}
 ];
 return seeds.map(event=>{
  const seed=Date.UTC(year,event.month,event.day,12),d=86400000;
  const difference=t=>wrap(solar(new Date(t)).lon-event.target+180,360)-180;
  let lo=seed-9*d,hi=seed+9*d;
  // Both brackets are within 20 degrees of the season boundary; the
  // wrapped longitude difference is monotonic across this short interval.
  for(let i=0;i<39;i++){
   const mid=(lo+hi)/2;
   if(difference(mid)<0)lo=mid;else hi=mid;
  }
  return {kind:event.kind,date:new Date((lo+hi)/2),index:((lo+hi)/2-Date.UTC(year,0,1))/d};
 });
}
export function daylightChange(date,lat,lon){
 const previous=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-1,12));
 const seconds=Math.round((dayBands(date,lat,lon).daylight-dayBands(previous,lat,lon).daylight)*3600);
 return seconds;
}
const dayLengthText=hours=>{
 const seconds=Math.round(hours*3600);
 return String(Math.floor(seconds/3600)).padStart(2,'0')+'h '+String(Math.floor(seconds%3600/60)).padStart(2,'0')+'m';
};
const gainText=seconds=>{
 if(seconds===0)return 'No change from yesterday';
 const amount=Math.abs(seconds),minutes=Math.floor(amount/60),remainder=amount%60;
 return (seconds>0?'Gaining ':'Losing ')+(minutes?minutes+'m ':'')+String(remainder).padStart(2,'0')+'s of daylight vs yesterday';
};
const COLORS={
 night:'#081329',astronomical:'#253b72',nautical:'#3664a3',civil:'#519bd1',
 daylight:'#80c9ec',sun:'#ffd47c',duration:'#10335f'
};
export const chartGeometry=(width,height)=>({left:49,right:width-18,top:16,bottom:height-27});
function drawLine(c,x1,y1,x2,y2,color,width=1){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function drawText(c,t,x,y,color='#a2b7d2',size=10,align='left'){
 c.font=size+'px sans-serif';c.textAlign=align;c.fillStyle=color;c.fillText(t,x,y);
}
function stamp(hours){
 const total=(Math.round(hours*60)+1440*4)%(1440);
 return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
/**
 * Paint each 365-day region as ONE continuous closed polygon. Earlier versions
 * drew 365 overlapping rectangles, creating dark vertical hatch artifacts.
 * Nested regions overpaint one another from astronomical dusk to daylight.
 */
function fillSolarRegion(c,g,data,key,color){
 const x=i=>g.left+i/(data.length-1)*(g.right-g.left);
 const y=hour=>g.bottom-clamp(hour,0,24)/24*(g.bottom-g.top);
 c.beginPath();
 data.forEach((d,i)=>{
  const edge=d.levels[key].dawn;
  if(i===0)c.moveTo(x(i),y(edge));else c.lineTo(x(i),y(edge));
 });
 for(let i=data.length-1;i>=0;i--)c.lineTo(x(i),y(data[i].levels[key].dusk));
 c.closePath();
 c.fillStyle=color;c.fill();
}
export function drawSolarYear(canvas,{year,lat,lon,selectedDate,onSelect}){
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(width<=0||height<=0)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const g=chartGeometry(width,height),days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const data=Array.from({length:days},(_,i)=>dayBands(new Date(Date.UTC(year,0,i+1)),lat,lon));
 c.clearRect(0,0,width,height);
 // One contiguous fill per band, no overlapping day-by-day rectangles.
 c.save();
 c.beginPath();c.rect(g.left,g.top,g.right-g.left,g.bottom-g.top);c.clip();
 c.fillStyle=COLORS.night;c.fillRect(g.left,g.top,g.right-g.left,g.bottom-g.top);
 for(const [key,color] of [['astronomical',COLORS.astronomical],['nautical',COLORS.nautical],['civil',COLORS.civil],['sun',COLORS.daylight]]){
  fillSolarRegion(c,g,data,key,color);
 }
 c.restore();
 const y=hour=>g.bottom-hour/24*(g.bottom-g.top),x=i=>g.left+i/(days-1)*(g.right-g.left);
 // Twilight boundary strokes, dawn and dusk, with polarity flipping at poles.
 for(const [key,color] of [['astronomical','#7585c8'],['nautical','#70bbf2'],['civil','#a4d9ff'],['sun','#ffcf77']]){
  for(const edge of ['dawn','dusk']){
   c.beginPath();
   data.forEach((d,i)=>{const v=d.levels[key][edge];if(i===0)c.moveTo(x(i),y(v));else c.lineTo(x(i),y(v))});
   c.strokeStyle=color;c.lineWidth=key==='sun'?1.65:.75;c.stroke();
  }
 }
 // Day length line on a separate scale to the right (8 to 17h view in mid latitudes).
 // Omit the green overlay at polar extremes to keep the twilight bands legible.
 const showDuration=Math.abs(lat)<66;
 if(showDuration){
   c.beginPath();data.forEach((d,i)=>{const yy=g.bottom-d.daylight/24*(g.bottom-g.top);i?c.lineTo(x(i),yy):c.moveTo(x(i),yy)});
   c.save();
   c.strokeStyle='#f7fcff';c.lineWidth=4.4;c.setLineDash([]);c.stroke();
   c.strokeStyle=COLORS.duration;c.lineWidth=2.8;c.setLineDash([7,3]);c.stroke();c.restore();
 }
 for(let hr=0;hr<=24;hr+=3){
  const yy=y(hr);drawLine(c,g.left,yy,g.right,yy,'#cce3ff30');
  drawText(c,String(hr).padStart(2,'0')+':00',g.left-7,yy+3,'#b9c9de',9,'right');
 }
 for(let month=0;month<12;month++){
  const index=(Date.UTC(year,month,1)-Date.UTC(year,0,1))/86400000;
  const xx=x(index);drawLine(c,xx,g.top,xx,g.bottom,'#d6eeff15');
 }
 // Year-specific astronomical seasons. Labels alternate above/below
 // the plot to keep them distinct from the selected-day annotation.
 const seasons=seasonalEvents(year);
 c.save();c.beginPath();c.rect(g.left,g.top,g.right-g.left,g.bottom-g.top);c.clip();
 for(const [n,event] of seasons.entries()){
  const xx=g.left+event.index/(days-1)*(g.right-g.left);
  c.save();c.setLineDash([3,5]);drawLine(c,xx,g.top,xx,g.bottom,'#ffe2a17a',1);c.restore();
  c.beginPath();c.arc(xx,n%2?g.bottom-6:g.top+6,3,0,Math.PI*2);c.fillStyle='#ffe2a1';c.fill();
 }
 c.restore();
 const index=clamp((Date.UTC(year,selectedDate.getUTCMonth(),selectedDate.getUTCDate())-Date.UTC(year,0,1))/86400000,0,days-1);
 const selected=data[index],markerX=x(index);
 drawLine(c,markerX,g.top,markerX,g.bottom,'#ffe4aa',1.4);
 // The selected instant is placed at its actual local mean solar hour.
 // This is a vertical position on the existing 0–24h axis, not solar altitude.
 const utcHours=selectedDate.getUTCHours()+selectedDate.getUTCMinutes()/60+selectedDate.getUTCSeconds()/3600;
 const meanSolarHour=wrap(utcHours+lon/15,24);
 const timeY=y(meanSolarHour);
 const actualSun=sunHorizontal(selectedDate,lat,lon);
 const sunny=actualSun.alt>=-.833;
 c.save();
 c.beginPath();c.arc(markerX,timeY,7,0,Math.PI*2);
 c.fillStyle=sunny?'#ffbd4a':'#d9e9ff';c.shadowColor=sunny?'#ffc46c':'#b7c7ff';
 c.shadowBlur=14;c.fill();
 c.lineWidth=1.5;c.strokeStyle='#ffffff';c.stroke();c.restore();
 drawLine(c,markerX-17,timeY,markerX+17,timeY,'#ffffffbb',.8);
 const nowLabel=stamp(meanSolarHour)+' LMT';
 const labelY=timeY<g.top+29?timeY+22:timeY-12;
 drawText(c,nowLabel,clamp(markerX,g.left+39,g.right-39),labelY,'#ffffff',10,'center');
 const timeText=document.getElementById('solar-chart-time');
 if(timeText)timeText.textContent='Selected Sun: '+stamp(meanSolarHour)+' mean solar time · '+actualSun.alt.toFixed(1)+'° altitude'+(sunny?' (above horizon)':' (below horizon)');

 for(const edge of ['dawn','dusk']){
  const yy=y(selected.levels.sun[edge]);
  if(yy>=g.top&&yy<=g.bottom){
   c.beginPath();c.arc(markerX,yy,3.5,0,Math.PI*2);c.fillStyle='#ffde95';c.fill();
  }
 }
 const legend=['SUN '+stamp(selected.levels.sun.dawn)+'–'+stamp(selected.levels.sun.dusk),
 'CIVIL '+stamp(selected.levels.civil.dawn)+'–'+stamp(selected.levels.civil.dusk),
 'DAYLIGHT '+Math.floor(selected.daylight)+'h '+String(Math.round((selected.daylight%1)*60)).padStart(2,'0')+'m'];
 drawText(c,legend[0],clamp(markerX,g.left+76,g.right-76),Math.max(27,g.top+13),'#ffdea4',10,'center');
 const summary=document.getElementById('solar-chart-readout');
 if(summary)summary.textContent=selected.levels.sun.allNight?'No sunrise / polar night':selected.levels.sun.allDay?'24-hour daylight':legend.join('   ·   ');
 const dayText=document.getElementById('solar-chart-date');
 if(dayText)dayText.textContent=selectedDate.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 // A DOM overlay tracks pointer/touch inspection without repainting 365
 // solar bands on every pointer move. Clicking still selects that date.
 const seasonLabels=document.getElementById('solar-chart-seasons');
 if(seasonLabels)seasonLabels.replaceChildren(...seasons.map(event=>{
  const item=document.createElement('span');
  const name=document.createElement('strong');name.textContent=event.kind;
  const date=document.createElement('span');date.textContent=event.date.toLocaleDateString('en-CA',{month:'short',day:'numeric',timeZone:'UTC'});
  item.title=event.kind+' · '+event.date.toISOString().slice(0,16).replace('T',' ')+' UTC';
  item.append(name,date);return item;
 }));
 const inspector=document.getElementById('solar-chart-inspector');
 const inspectionDate=document.getElementById('solar-inspect-date');
 const inspectionDetails=document.getElementById('solar-inspect-details');
 const inspectionGain=document.getElementById('solar-inspect-gain');
 const pointerLine=document.getElementById('solar-chart-inspection-line');
 const inspectDate=i=>new Date(Date.UTC(year,0,i+1,12));
 const selectedIndex=index;
 function inspect(i){
  canvas.dataset.inspectIndex=String(i);
  const d=inspectDate(i),day=data[i];
  const previous=i?data[i-1]:dayBands(new Date(Date.UTC(year-1,11,31,12)),lat,lon);
  const gain=Math.round((day.daylight-previous.daylight)*3600);
  if(inspectionDate)inspectionDate.textContent=d.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
  const sun=day.levels.sun,civil=day.levels.civil,nautical=day.levels.nautical,astro=day.levels.astronomical;
  const display=(level)=>level.allDay?'all day':level.allNight?'none':stamp(level.dawn)+'–'+stamp(level.dusk);
  if(inspectionDetails)inspectionDetails.textContent='Sun '+display(sun)+' · Civil '+display(civil)+' · Nautical '+display(nautical)+' · Astronomical '+display(astro)+' · Daylight '+dayLengthText(day.daylight)+' (mean solar time)';
  if(inspectionGain)inspectionGain.textContent=gainText(gain)+' · approximate';
  if(inspector)inspector.hidden=false;
  if(pointerLine){pointerLine.hidden=false;pointerLine.style.left=(100*(g.left+i/(days-1)*(g.right-g.left))/width)+'%';}
 }
 const indexAt=e=>{
  const rect=canvas.getBoundingClientRect();
  const px=(e.clientX-rect.left)*width/rect.width;
  return Math.round(clamp((px-g.left)/(g.right-g.left),0,1)*(days-1));
 };
 // Pointermove is suitable for a mouse/pen; touch uses a tap for inspection
 // and never suppresses scrolling, pinching or other application gestures.
 canvas.onpointermove=e=>{if(e.pointerType!=='touch')inspect(indexAt(e))};
 // Keep the inspected day when the pointer leaves for the Use this date button.
 canvas.onpointerleave=null;
 canvas.onclick=e=>{
  const i=indexAt(e);
  inspect(i);
  if(e.pointerType!=='touch')onSelect(new Date(Date.UTC(year,0,i+1,selectedDate.getUTCHours(),selectedDate.getUTCMinutes())));
 };
 canvas.onpointerdown=e=>{if(e.pointerType==='touch')inspect(indexAt(e))};
 const choose=document.getElementById('solar-inspect-select');
 if(choose)choose.onclick=()=>{
  const i=Number(canvas.dataset.inspectIndex||selectedIndex);
  onSelect(new Date(Date.UTC(year,0,i+1,selectedDate.getUTCHours(),selectedDate.getUTCMinutes())));
 };
 const stored=Number(canvas.dataset.inspectIndex);
 inspect(Number.isInteger(stored)&&stored>=0&&stored<days?stored:selectedIndex);
 return {selected,data,seasons};
}
