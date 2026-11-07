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
const COLORS={
 night:'#081329',astronomical:'#253b72',nautical:'#3664a3',civil:'#519bd1',
 daylight:'#80c9ec',sun:'#ffd47c',green:'#76e8a7'
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
   c.strokeStyle=COLORS.green;c.lineWidth=1.7;c.setLineDash([4,3]);c.stroke();c.setLineDash([]);
 }
 for(let hr=0;hr<=24;hr+=3){
  const yy=y(hr);drawLine(c,g.left,yy,g.right,yy,'#cce3ff30');
  drawText(c,String(hr).padStart(2,'0')+':00',g.left-7,yy+3,'#b9c9de',9,'right');
 }
 for(let month=0;month<12;month++){
  const index=(Date.UTC(year,month,1)-Date.UTC(year,0,1))/86400000;
  const xx=x(index);drawLine(c,xx,g.top,xx,g.bottom,'#d6eeff15');
 }
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
 canvas.onclick=event=>{
  const rect=canvas.getBoundingClientRect();
  const f=clamp((event.clientX-rect.left-g.left)/(g.right-g.left),0,1);
  const selectedIndex=Math.round(f*(days-1));
  onSelect(new Date(Date.UTC(year,0,selectedIndex+1,selectedDate.getUTCHours(),selectedDate.getUTCMinutes())));
 };
 return {selected,data};
}
