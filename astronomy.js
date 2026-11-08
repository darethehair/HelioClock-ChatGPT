import * as Astronomy from 'astronomy-engine';
/**
 * Standalone low-precision astronomy calculations.
 * Angular values in radians unless marked as degrees.
 * Solar equations based on common NOAA/Meeus approximations.
 * Lunar and planetary positions are schematic/approximate.
 */
export const PI=Math.PI, RAD=PI/180, DEG=180/PI;
export const sinD=x=>Math.sin(x*RAD);
export const cosD=x=>Math.cos(x*RAD);
export const tanD=x=>Math.tan(x*RAD);
export const wrap=(x,m=360)=>((x%m)+m)%m;
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const jd=(date)=>date.getTime()/86400000+2440587.5;
const atan2D=(a,b)=>Math.atan2(a,b)*DEG;
export function solar(date){
 const J=jd(date),T=(J-2451545)/36525;
 const L0=wrap(280.46646+T*(36000.76983+.0003032*T));
 const M=wrap(357.52911+T*(35999.05029-.0001537*T));
 const e=.016708634-T*(.000042037+.0000001267*T);
 const C=sinD(M)*(1.914602-T*(.004817+.000014*T))+sinD(2*M)*(.019993-.000101*T)+sinD(3*M)*.000289;
 const trueLong=L0+C;
 const omega=125.04-1934.136*T;
 const appLong=trueLong-.00569-.00478*sinD(omega);
 const meanObliq=23+(26+(21.448-T*(46.815+T*(.00059-T*.001813)))/60)/60;
 const obliq=meanObliq+.00256*cosD(omega);
 const decl=Math.asin(sinD(obliq)*sinD(appLong))*DEG;
 const y=Math.tan(obliq*RAD/2)**2;
 const eq=4*DEG*(y*Math.sin(2*L0*RAD)-2*e*Math.sin(M*RAD)+4*e*y*Math.sin(M*RAD)*Math.cos(2*L0*RAD)-.5*y*y*Math.sin(4*L0*RAD)-1.25*e*e*Math.sin(2*M*RAD));
 const distance=(1.000001018*(1-e*e))/(1+e*cosD(M+C));
 const ra=wrap(atan2D(cosD(obliq)*sinD(appLong),cosD(appLong)));
 return {jd:J,decl,eq,distance,ra,lon:appLong,obliq};
}
export function sidereal(date,lon=0){
 const J=jd(date),T=(J-2451545)/36525;
 return wrap(280.46061837+360.98564736629*(J-2451545)+.000387933*T*T-T*T*T/38710000+lon);
}
/**
 * Precess equatorial coordinates from the mean J2000 equator/equinox to the
 * mean equator/equinox at the requested epoch. IAU 1976 (Lieske) / Meeus
 * Chapter 21, angles in arcseconds, time measured in Julian centuries of
 * 36525 TT days from J2000. For this educational application UTC is used as
 * a close approximation to TT; the small TT-UTC difference is negligible
 * for precession at ordinary historical and present-day epochs.
 *
 * Does NOT include nutation, stellar proper motion, annual aberration or
 * atmospheric refraction. The polynomial is intended for centuries around
 * J2000, NOT extreme multi-millennial dates.
 */
export function precessJ2000(ra,decl,date){
 const T=(jd(date)-2451545)/36525;
 if(Math.abs(T)<1e-14)return {ra:wrap(ra),decl};
 const arcsecToRad=RAD/3600;
 const zeta=(2306.2181*T+0.30188*T*T+0.017998*T*T*T)*arcsecToRad;
 const z=(2306.2181*T+1.09468*T*T+0.018203*T*T*T)*arcsecToRad;
 const theta=(2004.3109*T-0.42665*T*T-0.041833*T*T*T)*arcsecToRad;
 const a=ra*RAD+zeta,d=decl*RAD;
 const A=Math.cos(d)*Math.sin(a);
 const B=Math.cos(theta)*Math.cos(d)*Math.cos(a)-Math.sin(theta)*Math.sin(d);
 const C=Math.sin(theta)*Math.cos(d)*Math.cos(a)+Math.cos(theta)*Math.sin(d);
 return {ra:wrap((Math.atan2(A,B)+z)/RAD),decl:Math.asin(clamp(C,-1,1))/RAD};
}
export function horizontal(ra,decl,date,lat,lon){
 const h=wrap(sidereal(date,lon)-ra+180)-180;
 const phi=lat*RAD, d=decl*RAD, H=h*RAD;
 const alt=Math.asin(Math.sin(phi)*Math.sin(d)+Math.cos(phi)*Math.cos(d)*Math.cos(H))*DEG;
 const az=wrap(atan2D(-Math.sin(H),Math.tan(d)*Math.cos(phi)-Math.sin(phi)*Math.cos(H)));
 return {alt,az};
}
export function sunHorizontal(date,lat,lon){
 const s=solar(date);
 return {...horizontal(s.ra,s.decl,date,lat,lon),...s};
}
export function sunEvents(date,lat,lon){
 // Local solar day indexed by UTC calendar date; noon can lie outside [0,24) UTC.
 const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),12));
 let eq=solar(d).eq;
 let noonMinutes=720-4*lon-eq;
 let noon=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+noonMinutes*60000);
 const s=solar(noon);eq=s.eq;noonMinutes=720-4*lon-eq;
 noon=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+noonMinutes*60000);
 const decl=solar(noon).decl;
 const c=(sinD(-.833)-sinD(lat)*sinD(decl))/(cosD(lat)*cosD(decl));
 if(c>=1) return {noon,sunrise:null,sunset:null,duration:0,polar:"night"};
 if(c<=-1) return {noon,sunrise:null,sunset:null,duration:24,polar:"day"};
 const H=Math.acos(clamp(c,-1,1))*DEG;
 let rise=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+(noonMinutes-4*H)*60000);
 let set=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+(noonMinutes+4*H)*60000);
 // Recompute declination and equation of time at each event.
 for(let i=0;i<2;i++){
  const sr=solar(rise),ss=solar(set);
  const cr=(sinD(-.833)-sinD(lat)*sinD(sr.decl))/(cosD(lat)*cosD(sr.decl));
  const cs=(sinD(-.833)-sinD(lat)*sinD(ss.decl))/(cosD(lat)*cosD(ss.decl));
  rise=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+(720-4*lon-sr.eq-4*Math.acos(clamp(cr,-1,1))*DEG)*60000);
  set=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+(720-4*lon-ss.eq+4*Math.acos(clamp(cs,-1,1))*DEG)*60000);
 }
 return {noon,sunrise:rise,sunset:set,duration:(set-rise)/3600000,polar:null};
}
/**
 * Lunar coordinates from Astronomy Engine (MIT, Donald Cross).
 * Ephemeris: VSOP/ELP-style lunar model with topocentric parallax.
 * Equator returns geocentric true equator-of-date coordinates for the
 * Moon when using a geocentric Moon vector; the display uses the observer's
 * geocentric reference for limb orientation and separate topocentric RA/Dec.
 */
export function moonEquatorial(date){
 const v=Astronomy.GeoMoon(date);
 const eq=Astronomy.EquatorFromVector(Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(date),v));
 const ecl=Astronomy.EclipticGeoMoon(date);
 return {ra:wrap(eq.ra*15),decl:eq.dec,longitude:ecl.lon,latitude:ecl.lat,
  distanceKm:ecl.dist*149597870.7};
}
export function moon(date,lat,lon){
 const observer=new Astronomy.Observer(lat,lon,0);
 const eq=Astronomy.Equator(Astronomy.Body.Moon,date,observer,true,true);
 const h=Astronomy.Horizon(date,observer,eq.ra,eq.dec,'');
 const lunar=moonEquatorial(date);
 const phase=wrap(Astronomy.MoonPhase(date),360)/360;
 const illuminated=Astronomy.Illumination(Astronomy.Body.Moon,date).phase_fraction;
 const age=phase*29.530588853;
 const phases=['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'];
 const name=phases[Math.floor(wrap(phase+1/16,1)*8)];
 return {alt:h.altitude,az:h.azimuth,ra:eq.ra*15,decl:eq.dec,
  longitude:lunar.longitude,latitude:lunar.latitude,distanceKm:eq.dist*149597870.7,
  phase,illuminated,age,name};
}
/**
 * Bright-limb position angle (Meeus chapter 48), relative to celestial north
 * and measured eastward. Parallactic angle relates celestial north to the
 * observer's vertical (zenith), hence the local horizon-facing tilt.
 * Low precision inherits the approximate Sun/Moon equatorial coordinates.
 */
export function moonOrientation(date,latitude,longitude){
 const moonEq=moonEquatorial(date),sunEq=solar(date);
 const deltaRA=(sunEq.ra-moonEq.ra)*RAD;
 const dSun=sunEq.decl*RAD,dMoon=moonEq.decl*RAD;
 const chi=Math.atan2(
  Math.cos(dSun)*Math.sin(deltaRA),
  Math.sin(dSun)*Math.cos(dMoon)-Math.cos(dSun)*Math.sin(dMoon)*Math.cos(deltaRA)
 );
 const hourAngle=(wrap(sidereal(date,longitude)-moonEq.ra+180)-180)*RAD;
 const phi=latitude*RAD;
 const q=Math.atan2(
  Math.sin(hourAngle),
  Math.tan(phi)*Math.cos(dMoon)-Math.sin(dMoon)*Math.cos(hourAngle)
 );
 const brightLimb=wrap(chi*DEG);
 const parallactic=wrap(q*DEG+180)-180;
 return {brightLimb,parallactic,fromZenith:wrap(brightLimb-parallactic+180)-180};
}
export function orbitPositions(date){
 const days=jd(date)-2451545;
 return [
 {name:"Mercury",radius:.387,period:87.969,phase:252.25,color:"#b5bac1",r:3.7},
 {name:"Venus",radius:.723,period:224.701,phase:181.98,color:"#e5b88e",r:5},
 {name:"Earth",radius:1,period:365.256,phase:100.46,color:"#76bde6",r:5.4},
 {name:"Mars",radius:1.524,period:686.98,phase:355.45,color:"#d88969",r:4.3},
 {name:"Jupiter",radius:5.203,period:4332.59,phase:34.40,color:"#dfb38c",r:6.8},
 {name:"Saturn",radius:9.537,period:10759.22,phase:49.94,color:"#e0c99a",r:6.1},
 {name:"Uranus",radius:19.191,period:30688.5,phase:313.23,color:"#91d8de",r:5.2},
 {name:"Neptune",radius:30.07,period:60182,phase:304.88,color:"#587fef",r:5.2}
 ].map(p=>({...p,angle:wrap(p.phase+360*days/p.period)}));
}
export function utcTime(date){return date?date.toISOString().slice(11,16):"—";}
export function durationText(hours){
 if(hours===0) return "00h 00m";
 if(hours===24) return "24h 00m";
 const minutes=Math.round(hours*60);
 return `${String(Math.floor(minutes/60)).padStart(2,"0")}h ${String(minutes%60).padStart(2,"0")}m`;
}
