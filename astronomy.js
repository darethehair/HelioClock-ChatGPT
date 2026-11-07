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
export function moonEquatorial(date){
 // Low-precision lunar orbit: largest periodic terms, suitable for visualizations.
 const D=jd(date)-2451545;
 const L=wrap(218.316+13.176396*D);
 const Mm=wrap(134.963+13.064993*D);
 const Ms=wrap(357.529+.98560028*D);
 const F=wrap(93.272+13.22935*D);
 const elong=wrap(297.850+12.190749*D);
 const lon=wrap(L+6.289*sinD(Mm)+1.274*sinD(2*elong-Mm)+.658*sinD(2*elong)+.214*sinD(2*Mm)-.186*sinD(Ms)-.114*sinD(2*F));
 const lat=5.128*sinD(F)+.280*sinD(Mm+F)+.277*sinD(Mm-F)+.173*sinD(2*elong-F);
 const eps=solar(date).obliq;
 const x=cosD(lon)*cosD(lat);
 const y=sinD(lon)*cosD(lat)*cosD(eps)-sinD(lat)*sinD(eps);
 const z=sinD(lon)*cosD(lat)*sinD(eps)+sinD(lat)*cosD(eps);
 return {ra:wrap(atan2D(y,x)),decl:Math.asin(z)*DEG,longitude:lon,latitude:lat};
}
export function moon(date,lat,lon){
 const m=moonEquatorial(date),s=solar(date);
 const h=horizontal(m.ra,m.decl,date,lat,lon);
 const synodic=29.530588853;
 // Mean phase angle estimate from 2000-Jan-06 18:14 UTC reference new moon.
 const age=wrap(jd(date)-2451550.259,synodic);
 const phase=age/synodic;
 const illuminated=(1-Math.cos(2*Math.PI*phase))/2;
 const phases=["New Moon","Waxing Crescent","First Quarter","Waxing Gibbous","Full Moon","Waning Gibbous","Last Quarter","Waning Crescent"];
 const name=phases[Math.floor(wrap(phase+1/16,1)*8)];
 return {...h,...m,age,phase,illuminated,name};
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
 {name:"Mars",radius:1.524,period:686.98,phase:355.45,color:"#d88969",r:4.3}
 ].map(p=>({...p,angle:wrap(p.phase+360*days/p.period)}));
}
export function utcTime(date){return date?date.toISOString().slice(11,16):"—";}
export function durationText(hours){
 if(hours===0) return "00h 00m";
 if(hours===24) return "24h 00m";
 const minutes=Math.round(hours*60);
 return `${String(Math.floor(minutes/60)).padStart(2,"0")}h ${String(minutes%60).padStart(2,"0")}m`;
}
