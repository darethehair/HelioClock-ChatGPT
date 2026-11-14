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

const EARTH_RADIUS_KM=6378.137;
const ATMOSPHERIC_UMBRA_FACTOR=1.02;
const wrapDegrees=x=>((x+180)%360+360)%360-180;

/**
 * Geocentric Earth shadow at the Moon's distance.
 *
 * The umbra and penumbra are intersections of the solar-shadow cones with
 * the plane perpendicular to the anti-solar axis through the Moon.
 * The umbra radius includes the customary small atmospheric enlargement
 * (about 2%); actual eclipse colour depends on variable atmospheric conditions.
 *
 * Coordinates x/y are the shadow centre relative to the Moon centre,
 * positive toward celestial east/north respectively, in units of lunar radii.
 * The renderer's north-up lunar photograph uses -x and -y before applying
 * the existing horizon/parallactic rotation.
 */
export function lunarEclipseGeometry(date){
 const eqd=Astronomy.Rotation_EQJ_EQD(date);
 const moonVector=Astronomy.RotateVector(eqd,Astronomy.GeoMoon(date));
 const sunVector=Astronomy.RotateVector(eqd,Astronomy.GeoVector(Astronomy.Body.Sun,date,true));
 const moonEq=Astronomy.EquatorFromVector(moonVector);
 const sunEq=Astronomy.EquatorFromVector(sunVector);
 const moonKm=moonEq.dist*AU_KM,sunKm=sunEq.dist*AU_KM;
 const shadowRA=(sunEq.ra*15+180)%360;
 const shadowDec=-sunEq.dec;
 const deltaRA=wrapDegrees(shadowRA-moonEq.ra*15)*RAD;
 const dMoon=moonEq.dec*RAD,dShadow=shadowDec*RAD;
 const cosine=clamp(Math.sin(dMoon)*Math.sin(dShadow)+
  Math.cos(dMoon)*Math.cos(dShadow)*Math.cos(deltaRA),-1,1);
 const separation=Math.acos(cosine);
 const tangentUmbra=(SUN_RADIUS_KM-EARTH_RADIUS_KM)/sunKm;
 const tangentPenumbra=(SUN_RADIUS_KM+EARTH_RADIUS_KM)/sunKm;
 const umbraKm=Math.max(0,EARTH_RADIUS_KM-moonKm*tangentUmbra)*ATMOSPHERIC_UMBRA_FACTOR;
 const penumbraKm=EARTH_RADIUS_KM+moonKm*tangentPenumbra;
 const moonAngularRadius=Math.atan2(MOON_RADIUS_KM,moonKm);
 const umbraRadius=Math.atan2(umbraKm,moonKm)/moonAngularRadius;
 const penumbraRadius=Math.atan2(penumbraKm,moonKm)/moonAngularRadius;
 // Tangent-plane east/north offsets, with the exact spherical separation
 // determining their radial magnitude (stable even for tiny offsets).
 const east=Math.atan2(Math.sin(deltaRA)*Math.cos(dShadow),
  Math.sin(dShadow)*Math.cos(dMoon)-Math.cos(dShadow)*Math.sin(dMoon)*Math.cos(deltaRA));
 const x=separation*Math.sin(east)/moonAngularRadius;
 const y=separation*Math.cos(east)/moonAngularRadius;
 const active=Math.hypot(x,y)<penumbraRadius+1;
 const umbral=discOverlapFraction(1,umbraRadius,Math.hypot(x,y));
 const penumbral=discOverlapFraction(1,penumbraRadius,Math.hypot(x,y));
 const kind=!active?'none':
  umbral>=.999999?'total':umbral>0?'partial':'penumbral';
 return {date:new Date(date),kind,active,x,y,umbraRadius,penumbraRadius,
  umbralFraction:umbral,penumbralFraction:penumbral,
  moonDistanceKm:moonKm,separationDegrees:separation*DEG,
  atmosphericUmbraEnlargement:ATMOSPHERIC_UMBRA_FACTOR};
}

/**
 * Physical shadow radii above determine location and timing; this intensity
 * profile is deliberately illustrative, not a prediction of eclipse colour.
 */
export function lunarShadowShading(geometry,nx,ny){
 if(!geometry.active)return {opacity:0,umbra:0};
 const d=Math.hypot(nx-geometry.x,ny-geometry.y);
 const u=geometry.umbraRadius,p=geometry.penumbraRadius;
 if(d>=p)return {opacity:0,umbra:0};
 if(d<=u)return {opacity:.91,umbra:1};
 const t=clamp((p-d)/(p-u),0,1);
 // Smooth across penumbra to avoid an artificial hard black line.
 return {opacity:.80*t*t*(3-2*t),umbra:0};
}
