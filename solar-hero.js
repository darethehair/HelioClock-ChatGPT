// The Sun's observed altitude, sampled across the browser-local civil day.
// This graphic is a TIME-versus-ALTITUDE plot, not a compass direction map.
const NS='http://www.w3.org/2000/svg';
const HORIZON_Y=167,TOP_Y=22,LOW_Y=218,LEFT_X=20,RIGHT_X=480;
const hourFraction=(date,start,end)=>(date-start)/(end-start);
const xAt=f=>LEFT_X+f*(RIGHT_X-LEFT_X);
const yAt=alt=>Math.max(TOP_Y,Math.min(LOW_Y,HORIZON_Y-alt*2.05));
let lastPhase='';
export function renderSolarJourney(date,lat,lon,alt,sunHorizontal){
 const wrap=document.querySelector('.hero');
 const arc=document.getElementById('solar-journey-arc');
 const marker=document.getElementById('solar-journey-sun');
 if(!wrap||!arc||!marker)return;
 const dayStart=new Date(date.getFullYear(),date.getMonth(),date.getDate());
 const dayEnd=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1);
 const ms=dayEnd.getTime()-dayStart.getTime();
 let path='',drawing=false;
 for(let i=0;i<=288;i++){
  const when=new Date(dayStart.getTime()+ms*i/288);
  const a=sunHorizontal(when,lat,lon).alt;
  const visible=a>=0;
  const x=xAt(i/288).toFixed(2),y=yAt(a).toFixed(2);
  if(visible){path+=(drawing?' L ':' M ')+x+' '+y;drawing=true}
  else drawing=false;
 }
 arc.setAttribute('d',path);
 const fraction=hourFraction(date,dayStart,dayEnd);
 marker.setAttribute('transform','translate('+xAt(fraction).toFixed(2)+' '+yAt(alt).toFixed(2)+')');
 marker.setAttribute('visibility',alt>=0?'visible':'hidden');
 const phase=alt>=6?'day':alt>=0?'golden':alt>=-6?'civil':alt>=-12?'nautical':alt>=-18?'astronomical':'night';
 if(phase!==lastPhase){wrap.dataset.solarPhase=phase;lastPhase=phase}
 const label=phase==='day'?'Daylight':phase==='golden'?'Golden hour':phase==='civil'?'Civil twilight':phase==='nautical'?'Nautical twilight':phase==='astronomical'?'Astronomical twilight':'Night';
 document.getElementById('solar-journey-phase').textContent=label;
 document.getElementById('solar-journey-chart').setAttribute('aria-label','Solar altitude during the local day: current altitude '+alt.toFixed(1)+' degrees, '+label);
}
