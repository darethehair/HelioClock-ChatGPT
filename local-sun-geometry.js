import {sunEvents,sunHorizontal} from './astronomy.js';

// Find horizon or twilight threshold near a known event. No topography:
// -0.833° is standard refracted sunrise/sunset; twilight = -6/-12/-18°.
export function solarThresholdNear(anchor,lat,lon,altitude,direction){
 if(!(anchor instanceof Date)||!Number.isFinite(anchor.getTime()))return null;
 const step=5*60000, span=5*3600000;
 const begin=direction==='dawn'?anchor.getTime()-span:anchor.getTime();
 const end=direction==='dawn'?anchor.getTime():anchor.getTime()+span;
 let previous=null;
 for(let t=begin;t<=end;t+=step){
  const value=sunHorizontal(new Date(t),lat,lon).alt-altitude;
  if(previous&&((direction==='dawn'&&previous.v<=0&&value>=0)||
   (direction==='dusk'&&previous.v>=0&&value<=0))){
   let lo=previous.t,hi=t;
   for(let i=0;i<17;i++){
    const mid=(lo+hi)/2,v=sunHorizontal(new Date(mid),lat,lon).alt-altitude;
    if(direction==='dawn'?(v<0):(v>0))lo=mid;else hi=mid;
   }
   const date=new Date((lo+hi)/2);
   return {date,az:sunHorizontal(date,lat,lon).az,altitude};
  }
  previous={t,v:value};
 }
 return null;
}
export function solarDirectionEvents(date,lat,lon){
 const events=sunEvents(date,lat,lon);
 const result=[];
 if(events.sunrise&&events.sunset){
  const rise={date:events.sunrise,az:sunHorizontal(events.sunrise,lat,lon).az,altitude:-.833};
  const set={date:events.sunset,az:sunHorizontal(events.sunset,lat,lon).az,altitude:-.833};
  result.push({key:'sunrise',label:'Sunrise',...rise},{key:'sunset',label:'Sunset',...set});
  for(const [name,alt] of [['civil',-6],['nautical',-12],['astronomical',-18]]){
   const dawn=solarThresholdNear(events.sunrise,lat,lon,alt,'dawn');
   const dusk=solarThresholdNear(events.sunset,lat,lon,alt,'dusk');
   if(dawn)result.push({key:name+'-dawn',label:name+' dawn',...dawn});
   if(dusk)result.push({key:name+'-dusk',label:name+' dusk',...dusk});
  }
 }
 return result;
}
export function bearingDestination(lat,lon,bearing,distanceKm){
 const rad=Math.PI/180,delta=distanceKm/6371.0088;
 const phi=lat*rad,lambda=lon*rad,theta=bearing*rad;
 const phi2=Math.asin(Math.sin(phi)*Math.cos(delta)+Math.cos(phi)*Math.sin(delta)*Math.cos(theta));
 const lambda2=lambda+Math.atan2(Math.sin(theta)*Math.sin(delta)*Math.cos(phi),
  Math.cos(delta)-Math.sin(phi)*Math.sin(phi2));
 return [phi2/rad,((lambda2/rad+540)%360)-180];
}
export function solarBearingPath(lat,lon,bearing,lengthKm=2200){
 const steps=48,points=[];
 for(let i=0;i<=steps;i++)points.push(bearingDestination(lat,lon,bearing,lengthKm*i/steps));
 return points;
}
export function solarShadeOpacity(alt){
 if(alt>=0)return 0;
 if(alt>=-6)return .17;
 if(alt>=-12)return .35;
 if(alt>=-18)return .52;
 return .69;
}
