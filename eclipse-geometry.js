import * as Astronomy from 'astronomy-engine';

const DEG=180/Math.PI;
const RAD=Math.PI/180;
const AU_KM=149597870.7;
const SUN_RADIUS_KM=695700;
const MOON_RADIUS_KM=1737.4;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/**
 * Apparent topocentric Sun and Moon discs. x increases toward celestial
 * east, y toward celestial north. Dimensions are angular degrees.
 * A caller can rotate this east/north frame into its image orientation.
 *
 * Uses the actual observer and simulation instant, not geocentric centers.
 * This is a pure geometry calculation, independent of NASA image timestamps.
 */
export function solarEclipseGeometry(date,latitude,longitude){
 const observer=new Astronomy.Observer(latitude,longitude,0);
 const sun=Astronomy.Equator(Astronomy.Body.Sun,date,observer,true,true);
 const moon=Astronomy.Equator(Astronomy.Body.Moon,date,observer,true,true);
 const decSun=sun.dec*RAD,decMoon=moon.dec*RAD;
 let dra=(moon.ra-sun.ra)*15*RAD;
 dra=Math.atan2(Math.sin(dra),Math.cos(dra));
 const sinSeparation=clamp(
  Math.sin(decSun)*Math.sin(decMoon)+Math.cos(decSun)*Math.cos(decMoon)*Math.cos(dra),-1,1);
 const separation=Math.acos(sinSeparation)*DEG;
 const sunRadius=Math.atan2(SUN_RADIUS_KM,sun.dist*AU_KM)*DEG;
 const moonRadius=Math.atan2(MOON_RADIUS_KM,moon.dist*AU_KM)*DEG;
 const east=Math.atan2(Math.sin(dra)*Math.cos(decMoon),Math.sin(decMoon)*Math.cos(decSun)-Math.cos(decMoon)*Math.sin(decSun)*Math.cos(dra));
 const x=separation*Math.sin(east),y=separation*Math.cos(east);
 const obscuration=discOverlapFraction(sunRadius,moonRadius,separation);
 const visible=separation<sunRadius+moonRadius;
 const sunHorizon=Astronomy.Horizon(date,observer,sun.ra,sun.dec,'');
 const kind=!visible?'none':separation<=Math.abs(sunRadius-moonRadius)
  ?moonRadius>=sunRadius?'total':'annular':'partial';
 return {date:new Date(date),latitude,longitude,kind,
  sunRadius,moonRadius,separation,x,y,obscuration,
  sunAltitude:sunHorizon.altitude,aboveHorizon:sunHorizon.altitude>0};
}
/**
 * Covered fraction of the apparent solar disc by the apparent lunar disc.
 * Handles disjoint, tangent, contained, and overlapping circles.
 */
export function discOverlapFraction(R,r,d){
 if(!(R>0&&r>0)||d>=R+r)return 0;
 if(d<=Math.abs(R-r))return clamp(r*r/(R*R),0,1);
 const a=clamp((d*d+R*R-r*r)/(2*d*R),-1,1);
 const b=clamp((d*d+r*r-R*R)/(2*d*r),-1,1);
 const area=R*R*Math.acos(a)+r*r*Math.acos(b)
  -.5*Math.sqrt(Math.max(0,(-d+R+r)*(d+R-r)*(d-R+r)*(d+R+r)));
 return clamp(area/(Math.PI*R*R),0,1);
}
