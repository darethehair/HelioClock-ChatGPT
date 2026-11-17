import * as Astronomy from 'astronomy-engine';
const D=Math.PI/180,T=2*Math.PI,K=.01720209895;
export const TARGETS=[{number:1,name:'Ceres',type:'Dwarf planet'},{number:2,name:'Pallas',type:'Asteroid'},{number:3,name:'Juno',type:'Asteroid'},{number:4,name:'Vesta',type:'Asteroid'}];
export function parseJplAsteroid(result,number,retrievedUtc){
 const target=TARGETS.find(x=>x.number===number);
 const v=Object.fromEntries((result?.orbit?.elements||[]).map(x=>[x.name,Number(x.value)]));
 const epochJD=Number(result?.orbit?.epoch);
 if(!target||Number(result?.object?.des)!==number||!Number.isFinite(epochJD)||
   !['a','e','i','om','w','ma'].every(k=>Number.isFinite(v[k]))||
   !(v.a>0&&v.e>=0&&v.e<1&&v.i>=0&&v.i<=180))throw Error('Invalid JPL orbit '+number);
 return {...target,aAU:v.a,eccentricity:v.e,inclinationDeg:v.i,nodeDeg:v.om,
   argPeriDeg:v.w,meanAnomalyDeg:v.ma,epochJD,retrievedUtc,orbitId:result.orbit.orbit_id};
}
function rotate(object,x,y){
 const f=Math.atan2(y,x)+object.argPeriDeg*D,r=Math.hypot(x,y);
 const O=object.nodeDeg*D,i=object.inclinationDeg*D;
 return {x:r*(Math.cos(O)*Math.cos(f)-Math.sin(O)*Math.sin(f)*Math.cos(i)),
 y:r*(Math.sin(O)*Math.cos(f)+Math.cos(O)*Math.sin(f)*Math.cos(i)),
 z:r*Math.sin(f)*Math.sin(i),distanceAU:r};
}
export function asteroidPosition(object,date){
 if(!object||!(object.aAU>0)||!(object.eccentricity>=0&&object.eccentricity<1))return null;
 const t=Astronomy.MakeTime(date),a=object.aAU,e=object.eccentricity;
 const M=((object.meanAnomalyDeg*D+K*(t.tt+2451545-object.epochJD)/Math.pow(a,1.5)+Math.PI)%T+T)%T-Math.PI;
 let E=M;
 for(let j=0;j<50;j++){const d=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=d;if(Math.abs(d)<1e-13)break}
 return {...rotate(object,a*(Math.cos(E)-e),a*Math.sqrt(1-e*e)*Math.sin(E)),epochAgeDays:Math.abs(t.tt+2451545-object.epochJD)};
}
export function asteroidPath(object,n=160){
 const points=[];
 for(let j=0;j<=n;j++){const E=j*T/n,e=object.eccentricity,a=object.aAU;
 points.push(rotate(object,a*(Math.cos(E)-e),a*Math.sqrt(1-e*e)*Math.sin(E)))}
 return points;
}
export function asteroidSky(object,date,lat,lon){
 const p=asteroidPosition(object,date);if(!p)return null;
 const t=Astronomy.MakeTime(date),r=Astronomy.RotateVector(Astronomy.Rotation_ECL_EQJ(),new Astronomy.Vector(p.x,p.y,p.z,t));
 const earth=Astronomy.HelioVector(Astronomy.Body.Earth,t),site=Astronomy.ObserverVector(t,new Astronomy.Observer(lat,lon,0),false);
 const v=Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(t),new Astronomy.Vector(r.x-earth.x-site.x,r.y-earth.y-site.y,r.z-earth.z-site.z,t));
 const eq=Astronomy.EquatorFromVector(v),h=Astronomy.Horizon(t,new Astronomy.Observer(lat,lon,0),eq.ra,eq.dec,'');
 return {ra:eq.ra*15,decl:eq.dec,az:h.azimuth,alt:h.altitude,distanceAU:eq.dist,sunDistanceAU:p.distanceAU,epochAgeDays:p.epochAgeDays,approximate:true};
}

export function parseJplQueryAsteroids(result,retrievedUtc){
 const fields=result?.fields,rows=result?.data;
 if(!Array.isArray(fields)||!Array.isArray(rows)||
  !['pdes','name','epoch','a','e','i','om','w','ma','diameter'].every(f=>fields.includes(f)))
  throw Error('Invalid SBDB Query table or fields');
 const out=[];
 for(const row of rows){
  const v=Object.fromEntries(fields.map((f,j)=>[f,row[j]]));
  const number=Number(v.pdes),a=Number(v.a),e=Number(v.e),i=Number(v.i),diameterKm=Number(v.diameter);
  if(!Number.isInteger(number)||number<1||!String(v.name||'').trim()||
    v.diameter===null||!(diameterKm>0)||!(a>0&&e>=0&&e<1&&i>=0&&i<=180)||
    ![v.epoch,v.om,v.w,v.ma].every(x=>x!==null&&Number.isFinite(Number(x))))continue;
  out.push({number,name:String(v.name).trim(),type:number===1?'Dwarf planet':'Asteroid',
   epochJD:Number(v.epoch),aAU:a,eccentricity:e,inclinationDeg:i,nodeDeg:Number(v.om),
   argPeriDeg:Number(v.w),meanAnomalyDeg:Number(v.ma),diameterKm,
   orbitClass:v.class||null,orbitId:v.orbit_id||null,equinox:v.equinox||'J2000',retrievedUtc});
 }
 return out;
}
