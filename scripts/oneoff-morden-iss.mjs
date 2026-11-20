// ONE-OFF diagnostic. Delete after examining GitHub Actions output.
import * as satellite from 'satellite.js';
import {findIssPass} from '../iss-sky.js';
const tle1='1 25544U 98067A   26322.30200954  .00012483  00000-0  23055-3 0  9994';
const tle2='2 25544  51.6316 257.4339 0007388  38.9132 321.2387 15.49454822595648';
const model={satrec:satellite.twoline2satrec(tle1,tle2),epoch:new Date('2026-11-18T07:14:53.624Z')};
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
 const start=new Date(referenceTime-2*3600000);
 const p=findIssPass(model,start,coord.lat,coord.lon,1,{hours:4,visibleOnly:true,stepSeconds:20});
 const t=p?.visibleStart?.getTime(),err=t===undefined?null:Math.round((t-referenceTime)/60000*10)/10;
 console.log(JSON.stringify({date:e.date,reference:e.time+' UTC-5',referenceMax:e.max,referenceDuration:e.duration,
   predictedVisibleUTC:p?.visibleStart?.toISOString()||null,
   predictedVisibleLocal:p?.visibleStart?new Date(t-5*3600000).toISOString().slice(11,16):null,
   predictedMax:p?.maxAlt??null,
   predictedDurationMinutes:p?.visibleStart&&p?.visibleEnd?Math.round((p.visibleEnd-p.visibleStart)/60000*10)/10:null,
   deltaMinutes:err,deltaMax:p?Math.round((p.maxAlt-e.max)*10)/10:null,
   note:!p?'No match within search/epoch window':'Matched earliest visible pass after anchor'}));
}
