import * as Astro from 'astronomy-engine';
import {jd,solar,sunHorizontal,moon,sidereal,wrap} from './astronomy.js';
const pad=n=>String(n).padStart(2,'0'),stamp=d=>d?d.toLocaleString('en-CA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
const clock=d=>d?d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
const hms=h=>[Math.floor(wrap(h,24)),Math.floor(wrap(h,24)*60)%60,Math.floor(wrap(h,24)*3600)%60].map(pad).join(':');
const deg=n=>(n>=0?'+':'')+n.toFixed(2)+'°';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache={key:'',daily:null};
function search(body,obs,start,end,dir,alt=null){
 try{
  const time=alt===null?Astro.SearchRiseSet(body,obs,dir,start,1.5):Astro.SearchAltitude(body,obs,dir,start,1.5,alt);
  const d=time?.date;return d&&d>=start&&d<end?d:null;
 }catch{return null}
}
function transit(body,obs,start,end,angle){
 try{
  const event=Astro.SearchHourAngle(body,obs,angle,start,1);
  const d=event?.time?.date;return d&&d>=start&&d<end?d:null;
 }catch{return null}
}
function phases(date){
 let event=Astro.SearchMoonQuarter(date),out=[];
 for(let i=0;i<4;i++){
  out.push({title:['New Moon','First Quarter','Full Moon','Last Quarter'][event.quarter],
   date:event.time.date,icon:['●','◐','○','◑'][event.quarter]});
  event=Astro.NextMoonQuarter(event);
 }
 return out;
}
export function calculateAlmanac(date,lat,lon){
 const start=new Date(date.getFullYear(),date.getMonth(),date.getDate());
 const end=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1);
 const key=[start.getTime(),end.getTime(),lat,lon,date.getFullYear()].join('|');
 let d=cache.daily;
 if(cache.key!==key){
  const o=new Astro.Observer(lat,lon,0),sun=Astro.Body.Sun,lun=Astro.Body.Moon;
  const season=Astro.Seasons(date.getFullYear());
  d={
   start,end,
   sunRise:search(sun,o,start,end,1),sunSet:search(sun,o,start,end,-1),
   moonRise:search(lun,o,start,end,1),moonSet:search(lun,o,start,end,-1),
   sunUpper:transit(sun,o,start,end,0),sunLower:transit(sun,o,start,end,12),
   moonUpper:transit(lun,o,start,end,0),moonLower:transit(lun,o,start,end,12),
   twilight:[
    {name:'Civil',type:'civil',alt:-6},
    {name:'Nautical',type:'nautical',alt:-12},
    {name:'Astronomical',type:'astronomical',alt:-18}
   ].map(t=>({...t,dawn:search(sun,o,start,end,1,t.alt),dusk:search(sun,o,start,end,-1,t.alt)})),
   seasons:[
    {title:'March equinox',date:season.mar_equinox.date,icon:'☀'},
    {title:'June solstice',date:season.jun_solstice.date,icon:'☀'},
    {title:'September equinox',date:season.sep_equinox.date,icon:'☀'},
    {title:'December solstice',date:season.dec_solstice.date,icon:'☀'}
   ]
  };
  cache.key=key;cache.daily=d;
 }
 const s=sunHorizontal(date,lat,lon),m=moon(date,lat,lon);
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'device local';
 const zoneName=new Intl.DateTimeFormat('en-CA',{timeZoneName:'short'}).formatToParts(date).find(p=>p.type==='timeZoneName')?.value||'';
 const minutes=-date.getTimezoneOffset();
 const offset='UTC'+(minutes>=0?'+':'−')+pad(Math.floor(Math.abs(minutes)/60))+':'+pad(Math.abs(minutes)%60);
 const quarter=phases(date);
 const next=[...quarter,...d.seasons.filter(e=>e.date>=date)].sort((a,b)=>a.date-b.date).slice(0,5);
 const status=s.alt>=0?'Daylight':s.alt>=-6?'Civil twilight':s.alt>=-12?'Nautical twilight':s.alt>=-18?'Astronomical twilight':'Astronomical night';
 let season='Winter';
 if(date>=d.seasons[0].date)season='Spring';if(date>=d.seasons[1].date)season='Summer';
 if(date>=d.seasons[2].date)season='Autumn';if(date>=d.seasons[3].date)season='Winter';
 const daylight=d.sunRise&&d.sunSet&&d.sunSet>d.sunRise?Math.round((d.sunSet-d.sunRise)/60000)+' minutes':'No ordinary rise/set';
 const yearStart=new Date(date.getFullYear(),0,1);
 const dayOfYear=(date-yearStart)/86400000+1;
 const a={...d,date,lat,lon,s,m,zone,zoneName,offset,quarter,next,status,season,daylight,dayOfYear};
 a.report=report(a);
 return a;
}
function report(a){
 const s=a.s,m=a.m;
 return [
  'HELIOCLOCK ASTRONOMICAL ALMANAC',
  'LOCAL DATE/TIME: '+stamp(a.date)+'  '+a.zoneName+' '+a.offset+' ('+a.zone+')',
  'UTC: '+a.date.toISOString()+'  JULIAN: '+jd(a.date).toFixed(5),
  'LAT: '+a.lat.toFixed(5)+'°  LON: '+a.lon.toFixed(5)+'°  LST: '+hms(sidereal(a.date,a.lon)/15),
  '',
  'SUN: altitude '+deg(s.alt)+' azimuth '+s.az.toFixed(2)+'°  RISE '+clock(a.sunRise)+' SET '+clock(a.sunSet),
  'SUN: upper '+clock(a.sunUpper)+' lower '+clock(a.sunLower)+'   '+a.status+'; daylight '+a.daylight,
  'MOON: altitude '+deg(m.alt)+' azimuth '+m.az.toFixed(2)+'°  RISE '+clock(a.moonRise)+' SET '+clock(a.moonSet),
  'MOON: upper '+clock(a.moonUpper)+' lower '+clock(a.moonLower)+'   '+m.name,
  'MOON: '+(m.illuminated*100).toFixed(1)+'% illuminated; distance '+Math.round(m.distanceKm)+' km; age approx '+m.age.toFixed(1)+' days',
  '',
  'TWILIGHT:',
  ...a.twilight.map(t=>t.name+': dawn '+clock(t.dawn)+' dusk '+clock(t.dusk)+' (Sun centre '+t.alt+'°)'),
  '',
  'SEASON: '+a.season+'  DAY OF YEAR: '+a.dayOfYear.toFixed(2),
  ...a.seasons.map(e=>e.title+': '+stamp(e.date)),
  '',
  'UPCOMING EVENTS:',
  ...a.next.map(e=>e.title+': '+stamp(e.date)),
  '',
  'All event times are device-local. — = no event on this local civil date.'
 ].join('\n');
}
const row=(name,value)=>'<div class="almanac-row"><span>'+name+'</span><strong>'+value+'</strong></div>';
const group=(title,symbol,body)=>'<details open class="almanac-group"><summary><span class="almanac-symbol">'+symbol+'</span>'+title+'</summary><div class="almanac-body">'+body+'</div></details>';
export function almanacHTML(a){
 const s=a.s,m=a.m;
 const time=group('Time & location','◷',
  row('Local date/time',escape(stamp(a.date)))+row('Zone (device)',escape(a.zone)+' · '+escape(a.zoneName)+' '+a.offset)+
  row('UTC',a.date.toISOString().replace('T',' ').slice(0,19))+row('Julian Date',jd(a.date).toFixed(5))+
  row('Modified Julian Date',(jd(a.date)-2400000.5).toFixed(5))+
  row('Local mean sidereal time',hms(sidereal(a.date,a.lon)/15))+
  row('Latitude',a.lat.toFixed(5)+'°')+row('Longitude',a.lon.toFixed(5)+'°'));
 const sun=group('Sun & daylight','☀',
  row('Altitude / azimuth',deg(s.alt)+' / '+s.az.toFixed(2)+'°')+
  row('RA / declination',hms(s.ra/15)+' / '+deg(s.decl))+
  row('Sunrise / sunset',clock(a.sunRise)+' / '+clock(a.sunSet))+
  row('Upper / lower transit',clock(a.sunUpper)+' / '+clock(a.sunLower))+
  row('Current status',a.status)+row('Daylight',a.daylight)+
  row('Equation of time',s.eq.toFixed(2)+' min')+row('Earth–Sun distance',s.distance.toFixed(6)+' AU'));
 const moon=group('Moon & lunar calendar','☾',
  row('Altitude / azimuth',deg(m.alt)+' / '+m.az.toFixed(2)+'°')+
  row('RA / declination',hms(m.ra/15)+' / '+deg(m.decl))+
  row('Moonrise / moonset',clock(a.moonRise)+' / '+clock(a.moonSet))+
  row('Upper / lower transit',clock(a.moonUpper)+' / '+clock(a.moonLower))+
  row('Phase',m.name)+row('Illuminated',(m.illuminated*100).toFixed(1)+'%')+
  row('Approx. lunar age',m.age.toFixed(1)+' days')+
  row('Distance',Math.round(m.distanceKm).toLocaleString('en-CA')+' km')+
  row('Angular diameter',(2*Math.atan2(1737.4,m.distanceKm)*180/Math.PI*60).toFixed(1)+' arcmin')+
  a.quarter.map(e=>row(e.title,stamp(e.date))).join(''));
 const twilight=group('Twilight & darkness','◐',
  '<p class="almanac-note">Dawn and dusk are defined at solar centre altitudes −6°, −12° and −18°. A dash means no event on the selected local civil day.</p>'+
  a.twilight.map(t=>'<div class="twilight twilight-'+t.type+'"><span class="twilight-label"><i></i>'+t.name+'</span><span>↗ Dawn <strong>'+clock(t.dawn)+'</strong></span><span>↘ Dusk <strong>'+clock(t.dusk)+'</strong></span></div>').join('')+
  '<p class="almanac-note">Current: '+a.status+'. Moon brightness and altitude influence observing conditions.</p>');
 const seasons=group('Seasons & calendar','☼',row('Season (northern hemisphere)',a.season)+
  row('Day of year',a.dayOfYear.toFixed(2))+a.seasons.map(e=>row(e.title,stamp(e.date))).join(''));
 const next=group('Upcoming astronomical events','✦',a.next.map((e,i)=>
  '<button class="almanac-event" type="button" data-event-index="'+i+'"><span>'+escape(e.icon)+' '+escape(e.title)+'</span><strong>'+stamp(e.date)+'</strong></button>').join('')+
  '<p class="almanac-note">Select an event to jump to that date and time.</p>');
 return '<div class="almanac-grid">'+time+sun+moon+twilight+seasons+next+'</div>';
}
export function renderAlmanac(node,date,lat,lon){
 const open=[...node.querySelectorAll('details.almanac-group')].map(e=>e.open);
 const a=calculateAlmanac(date,lat,lon);
 node.innerHTML=almanacHTML(a);
 if(open.length===6)[...node.querySelectorAll('details.almanac-group')].forEach((e,i)=>e.open=open[i]);
 return a;
}
