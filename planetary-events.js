// Astronomy Engine event searches; events are relative to the simulated UTC date.
// Calculations are independent of the observing location.
import * as Astronomy from 'astronomy-engine';
const DAY=86400000;
const SYN={Mercury:116,Venus:584,Mars:780,Jupiter:399,Saturn:378,Uranus:370,Neptune:367};
const inner=['Mercury','Venus'];
export const eventPlanets=mode=>mode==='outer'?['Mars','Jupiter','Saturn','Uranus','Neptune']:['Mercury','Venus','Mars'];
export const eventOptions=planet=>inner.includes(planet)
 ?[{value:'inferior',label:'Inferior conjunction'},{value:'superior',label:'Superior conjunction'},
   {value:'east',label:'Greatest eastern elongation'},{value:'west',label:'Greatest western elongation'}]
 :SYN[planet]?[{value:'opposition',label:'Opposition'},{value:'conjunction',label:'Conjunction'},
  {value:'quad-east',label:'Eastern quadrature'},{value:'quad-west',label:'Western quadrature'}]:[];
const shift=(date,days)=>new Date(date.getTime()+days*DAY);
const cutoff=(date,direction)=>date.getTime()+direction*3600000; // avoids rediscovering an event on successive clicks
function alignment(body,event,reference,direction){
 const target=event==='opposition'||event==='inferior'?0:180;
 if(direction>0){
  return Astronomy.SearchRelativeLongitude(body,target,new Date(cutoff(reference,1))).date;
 }
 const stop=cutoff(reference,-1);
 let start=shift(reference,-2.4*SYN[body]),last=null;
 for(let i=0;i<9;i++){
  const date=Astronomy.SearchRelativeLongitude(body,target,start).date;
  if(date.getTime()>=stop)break;
  last=date;start=shift(date,2);
 }
 if(!last)throw Error('Previous alignment not found');
 return last;
}
function elongation(body,event,reference,direction){
 const kind=event==='east'?'evening':'morning',stop=cutoff(reference,direction);
 const start=direction>0?new Date(stop):shift(reference,-3*SYN[body]);
 let cursor=start,last=null;
 for(let i=0;i<24;i++){
  const result=Astronomy.SearchMaxElongation(body,cursor);
  const date=result.time.date;
  if(result.visibility===kind){
   if(direction>0&&date.getTime()>stop)return {date,angle:result.elongation};
   if(direction<0&&date.getTime()<stop)last={date,angle:result.elongation};
   if(direction<0&&date.getTime()>=stop)break;
  }
  cursor=shift(date,2);
 }
 if(last)return last;
 throw Error('Elongation not found');
}
function quadrature(body,event,reference,direction){
 // Astronomical quadrature is an ecliptic longitude separation of 90°,
 // not necessarily an exact 90° three-dimensional Sun-planet angle.
 const kind=event==='quad-east'?'evening':'morning',stop=cutoff(reference,direction);
 let t=direction>0?new Date(stop):shift(reference,-2.2*SYN[body]);
 const end=direction>0?shift(reference,2.2*SYN[body]):new Date(stop);
 let previous=null,f0=Astronomy.Elongation(body,t).ecliptic_separation-90;
 for(let step=0;step<1250&&t.getTime()<end.getTime();step++){
  const next=shift(t,2),f1=Astronomy.Elongation(body,next).ecliptic_separation-90;
  if(f0*f1<=0){
   let a=t.getTime(),b=next.getTime(),fa=f0;
   for(let iter=0;iter<40;iter++){
    const mid=(a+b)/2, fm=Astronomy.Elongation(body,new Date(mid)).ecliptic_separation-90;
    if(fa*fm<=0)b=mid;else{a=mid;fa=fm}
   }
   const date=new Date((a+b)/2),observed=Astronomy.Elongation(body,date);
   if(observed.visibility===kind){
    if(direction>0&&date.getTime()>stop)return {date,angle:90};
    if(direction<0&&date.getTime()<stop)previous={date,angle:90};
   }
  }
  t=next;f0=f1;
 }
 if(previous)return previous;
 throw Error('Quadrature not found');
}
export function findPlanetaryEvent(planet,event,reference,direction){
 if(!SYN[planet]||!eventOptions(planet).some(option=>option.value===event))
  throw Error('Unsupported planet/event combination');
 if(!(reference instanceof Date)||!Number.isFinite(reference.getTime()))
  throw Error('Invalid simulation date');
 if(direction!==1&&direction!==-1)throw Error('Direction must be previous or next');
 const body=Astronomy.Body[planet];
 let found;
 if(event==='east'||event==='west')found=elongation(body,event,reference,direction);
 else if(event.startsWith('quad-'))found=quadrature(body,event,reference,direction);
 else found={date:alignment(body,event,reference,direction)};
 const earth=Astronomy.HelioVector(Astronomy.Body.Earth,found.date),
       other=Astronomy.HelioVector(body,found.date);
 const distanceAU=Math.hypot(earth.x-other.x,earth.y-other.y,earth.z-other.z);
 return {...found,planet,event,distanceAU};
}
