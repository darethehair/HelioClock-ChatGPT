import * as Astronomy from 'astronomy-engine';

// Geocentric Sun/Moon vectors, rotated to the equator and equinox of date.
// The shadow is defined in real Earth-centred geometry, not in map pixels.
const AU=149597870.7, RE=6378.137, RS=695700, RM=1737.4, RAD=Math.PI/180;
const norm=v=>Math.hypot(...v);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const wrap=x=>((x+180)%360+360)%360-180;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function equatorialVector(body,date){
 const v=Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date),Astronomy.GeoVector(body,date,true));
 return [v.x*AU,v.y*AU,v.z*AU];
}
function geographicFromVector(v,siderealDegrees){
 return [wrap(Math.atan2(v[1],v[0])/RAD-siderealDegrees),Math.atan2(v[2],Math.hypot(v[0],v[1]))/RAD];
}
export function solarShadowAt(date){
 const sun=equatorialVector(Astronomy.Body.Sun,date);
 const moon=equatorialVector(Astronomy.Body.Moon,date);
 const sunToMoon=sub(moon,sun), distance=norm(sunToMoon);
 const axis=sunToMoon.map(x=>x/distance); // extends from Moon away from Sun
 const siderealDegrees=Astronomy.SiderealTime(date)*15;
 const anti= -dot(moon,axis);
 const discriminant=anti*anti-(dot(moon,moon)-RE*RE);
 let center=null;
 if(discriminant>=0){
  const t=anti-Math.sqrt(discriminant);
  if(t>0){
   const impact=moon.map((m,i)=>m+t*axis[i]);
   const where=geographicFromVector(impact,siderealDegrees);
   // Reject far-side/night-side intersections.
   if(dot(impact,sub(sun,impact))>0)center=where;
  }
 }
 // Early-out is essential for normal day/night Earth rendering.
 const moonSunAngle=Math.acos(clamp(dot(sun,moon)/(norm(sun)*norm(moon)),-1,1))/RAD;
 const active=moonSunAngle<2.1;
 const phase=siderealDegrees*RAD;
  function sample(lon,lat){
  if(!active)return {penumbra:0,umbra:0,totality:false,annularity:false};
  const p=lat*RAD,l=(lon*RAD)+phase;
  const c=RE*Math.cos(p), surface=[c*Math.cos(l),c*Math.sin(l),RE*Math.sin(p)];
  // Only the sunlit hemisphere receives solar eclipse shadows.
  if(dot(surface,sub(sun,surface))<=0)return {penumbra:0,umbra:0,totality:false,annularity:false};
  const offset=sub(surface,moon),t=dot(offset,axis);
  if(t<=0)return {penumbra:0,umbra:0,totality:false,annularity:false};
  const radial=Math.sqrt(Math.max(0,dot(offset,offset)-t*t));
  const penRadius=RM+t*(RS+RM)/distance;
  const umbraRadius=RM-t*(RS-RM)/distance; // negative means antumbra
  if(radial>=penRadius)return {penumbra:0,umbra:0,totality:false,annularity:false};
  const fringe=clamp((penRadius-radial)/(penRadius-Math.abs(umbraRadius)+1),0,1);
  const core=radial<Math.abs(umbraRadius)?clamp((Math.abs(umbraRadius)-radial)/100,0,1):0;
  return {penumbra:fringe,umbra:core,annular:umbraRadius<0,
   totality:umbraRadius>0&&radial<=umbraRadius,
   annularity:umbraRadius<0&&radial<=-umbraRadius};
 }
 return {active,center,sample,moonSunAngle};
}
// Sample ground track at regular physical time intervals. Date-relative so
// the trail can be explored forwards/backwards with the minute controls.
export function solarShadowTrack(date,halfMinutes=150,stepMinutes=3){
 const points=[];
 for(let offset=-halfMinutes;offset<=halfMinutes;offset+=stepMinutes){
  const g=solarShadowAt(new Date(date.getTime()+offset*60000));
  if(g.center)points.push(g.center);
 }
 return points;
}

/**
 * Trace the *instantaneous* geographic totality/annularity footprint.
 * This is an actual surface intersection with the shadow cone, not a
 * fixed-radius symbol or an arbitrary display-sized disk.
 * Boundary is located independently along each great-circle bearing.
 * Zoom, pan and each map projection are handled by the Earth renderer.
 */
export function solarCentralFootprint(shadow,bearings=72){
 if(!shadow?.active||!shadow.center)return null;
 const origin=shadow.center, core=shadow.sample(...origin);
 const type=core.totality?'totality':core.annularity?'annularity':null;
 if(!type)return null;
 const lon0=origin[0]*RAD, lat0=origin[1]*RAD;
 function destination(bearing,kilometres){
  const angular=kilometres/RE, br=bearing*RAD;
  const sinLat=Math.sin(lat0)*Math.cos(angular)+Math.cos(lat0)*Math.sin(angular)*Math.cos(br);
  const lat=Math.asin(clamp(sinLat,-1,1));
  const lon=lon0+Math.atan2(Math.sin(br)*Math.sin(angular)*Math.cos(lat0),Math.cos(angular)-Math.sin(lat0)*Math.sin(lat));
  return [wrap(lon/RAD),lat/RAD];
 }
 const coordinates=[];
 for(let i=0;i<bearings;i++){
  const bearing=360*i/bearings;
  let low=0,high=450;
  // At the horizon or at a grazing point the footprint may extend
  // farther than 450 km; double rather than silently truncate.
  while(high<2500&&shadow.sample(...destination(bearing,high))[type])high*=2;
  if(shadow.sample(...destination(bearing,high))[type])return null;
  for(let n=0;n<16;n++){
   const mid=(low+high)/2;
   if(shadow.sample(...destination(bearing,mid))[type])low=mid;
   else high=mid;
  }
  coordinates.push(destination(bearing,(low+high)/2));
 }
 coordinates.push(coordinates[0]);
 return {type,coordinates};
}
