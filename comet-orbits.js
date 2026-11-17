import * as Astronomy from 'astronomy-engine';

// Educational, unperturbed two-body comet propagation.
// MPC heliocentric J2000 ecliptic elements; no planetary perturbations,
// nongravitational accelerations or iterative light-time correction.
// Gaussian gravitational constant in AU^(3/2) / day.
const K=0.01720209895,TAU=2*Math.PI,DEG=Math.PI/180;
const finite=x=>Number.isFinite(x);
export function cometHeliocentricEcliptic(elements,date){
 const {perihelion:p,qAU:q,eccentricity:e,argPeriDeg:arg,nodeDeg:node,inclinationDeg:incl}=elements||{};
 if(!p||!finite(q)||q<=0||!finite(e)||e<0||
    ![arg,node,incl].every(finite)||!finite(p.year)||!finite(p.month)||!finite(p.dayTT))return null;
 // MPC perihelion passage is TT. Express the table calendar value as a
 // Julian date labelled TT (not UTC), then compare with Astronomy Engine TT.
 const tpJD=Date.UTC(p.year,p.month-1,Math.floor(p.dayTT))/86400000+2440587.5+
   (p.dayTT-Math.floor(p.dayTT));
 const dt=Astronomy.MakeTime(date).tt+2451545-tpJD;
 if(!finite(dt))return null;
 let anomaly,r;
 if(Math.abs(e-1)<1e-7){
  const rhs=K*dt/Math.sqrt(2*q*q*q);
  const D=2*Math.sinh(Math.asinh(1.5*rhs)/3);
  anomaly=2*Math.atan(D);r=q*(1+D*D);
 }else if(e<1){
  const a=q/(1-e);
  const M=((K*dt/Math.pow(a,1.5)+Math.PI)%TAU+TAU)%TAU-Math.PI;
  let E=e<.8?M:Math.PI*Math.sign(M||1);
  for(let j=0;j<55;j++){
   const d=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
   E-=d;
   if(Math.abs(d)<1e-13)break;
  }
  const x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E);
  anomaly=Math.atan2(y,x);r=Math.hypot(x,y);
 }else{
  const a=q/(e-1),M=K*dt/Math.pow(a,1.5);
  let H=Math.asinh(M/e);
  for(let j=0;j<60;j++){
   const d=(e*Math.sinh(H)-H-M)/(e*Math.cosh(H)-1);
   H-=d;
   if(Math.abs(d)<1e-13)break;
  }
  const x=a*(e-Math.cosh(H)),y=a*Math.sqrt(e*e-1)*Math.sinh(H);
  anomaly=Math.atan2(y,x);r=Math.hypot(x,y);
 }
 if(!finite(r)||r<=0||r>1e6)return null;
 const O=node*DEG,i=incl*DEG,u=arg*DEG+anomaly;
 const co=Math.cos(O),so=Math.sin(O),ci=Math.cos(i),su=Math.sin(u),cu=Math.cos(u);
 return {x:r*(co*cu-so*su*ci),y:r*(so*cu+co*su*ci),z:r*su*Math.sin(i),
  distanceAU:r,daysFromPerihelion:dt,orbitModel:'unperturbed two-body'};
}
export function cometTopocentricPosition(elements,date,lat,lon){
 const body=cometHeliocentricEcliptic(elements,date);
 if(!body)return null;
 const time=Astronomy.MakeTime(date);
 const ecl=new Astronomy.Vector(body.x,body.y,body.z,time);
 const eqj=Astronomy.RotateVector(Astronomy.Rotation_ECL_EQJ(),ecl);
 const earth=Astronomy.HelioVector(Astronomy.Body.Earth,time);
 const observer=new Astronomy.Observer(lat,lon,0);
 const site=Astronomy.ObserverVector(time,observer,false);
 const relative=new Astronomy.Vector(eqj.x-earth.x-site.x,eqj.y-earth.y-site.y,
  eqj.z-earth.z-site.z,time);
 const eqDate=Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(time),relative);
 const eq=Astronomy.EquatorFromVector(eqDate);
 const hor=Astronomy.Horizon(time,observer,eq.ra,eq.dec,'');
 const epoch=elements.epochTT;
 const epochJD=epoch?Date.UTC(epoch.year,epoch.month-1,epoch.day)/86400000+2440587.5:null;
 const epochAgeDays=epochJD===null?null:Math.abs(time.tt+2451545-epochJD);
 return {ra:eq.ra*15,decl:eq.dec,az:hor.azimuth,alt:hor.altitude,
  distanceAU:eq.dist,sunDistanceAU:body.distanceAU,
  epochAgeDays,daysFromPerihelion:body.daysFromPerihelion,approximate:true};
}

/** Plot clipped conic segments in heliocentric J2000 ecliptic AU. */
export function cometOrbitPath(elements,cutoffAU=150,samples=300){
 const {qAU:q,eccentricity:e,argPeriDeg:arg,nodeDeg:node,inclinationDeg:incl}=elements||{};
 if(![q,e,arg,node,incl].every(Number.isFinite)||q<=0||e<0||cutoffAU<=q)return [];
 const p=q*(1+e),extent=e<1?Math.PI:Math.acos(-1/e)-1e-5;
 const O=node*DEG,i=incl*DEG,omega=arg*DEG;
 const segments=[];let segment=[];
 for(let n=0;n<=samples;n++){
  const v=-extent+2*extent*n/samples,denom=1+e*Math.cos(v);
  const r=denom>0?p/denom:Infinity;
  if(!Number.isFinite(r)||r>cutoffAU){
   if(segment.length>1)segments.push(segment);
   segment=[];continue;
  }
  const u=omega+v,co=Math.cos(O),so=Math.sin(O),cu=Math.cos(u),su=Math.sin(u),ci=Math.cos(i);
  segment.push({x:r*(co*cu-so*su*ci),y:r*(so*cu+co*su*ci),z:r*su*Math.sin(i)});
 }
 if(segment.length>1)segments.push(segment);
 return segments;
}
