// ONE-OFF diagnostic. Delete after examining GitHub Actions output.
import * as satellite from 'satellite.js';
import {findIssPass} from '../iss-sky.js';
// Verified public Space-Track-derived TLE dated 2026-11-19 (isstracker.pl; NORAD 25544).
const tle1='1 25544U 98067A   26323.20494996  .00013991  00000-0  25715-3 0  9995';
const tle2='2 25544  51.6318 252.9634 0007402  42.1092 318.0465 15.49480324595789';
const model={satrec:satellite.twoline2satrec(tle1,tle2),epoch:new Date('2026-11-19T04:55:07.676Z')};
const reference=[
 {date:'2026-11-20',time:'19:35',max:53,duration:4},
 {date:'2026-11-21',time:'18:47',max:57,duration:5},
 {date:'2026-11-21',time:'20:24',max:24,duration:1},
 {date:'2026-11-22',time:'19:36',max:58,duration:3},
 {date:'2026-11-23',time:'18:48',max:54,duration:5}
];
const coord={lat:49.191944,lon:-98.100556};
console.log('ONE-SHOT MORDEN ISS TEST: TLE epoch',model.epoch.toISOString());
for(const e of reference){
 const referenceTime=Date.parse(e.date+'T'+e.time+':00-05:00');
 const start=new Date(referenceTime-30*60000);
 const p=findIssPass(model,start,coord.lat,coord.lon,1,{hours:2,visibleOnly:true,stepSeconds:20});
 const t=p?.visibleStart?.getTime(),err=t===undefined?null:Math.round((t-referenceTime)/60000*10)/10;
 console.log(JSON.stringify({date:e.date,reference:e.time+' UTC-5',referenceMax:e.max,referenceDuration:e.duration,
   predictedVisibleUTC:p?.visibleStart?.toISOString()||null,
   predictedVisibleLocal:p?.visibleStart?new Date(t-5*3600000).toISOString().slice(11,16):null,
   predictedMax:p?.maxAlt??null,
   predictedDurationMinutes:p?.visibleStart&&p?.visibleEnd?Math.round((p.visibleEnd-p.visibleStart)/60000*10)/10:null,
   deltaMinutes:err,deltaMax:p?Math.round((p.maxAlt-e.max)*10)/10:null,
   note:!p?'No match within search/epoch window':'Matched earliest visible pass after anchor'}));
}
