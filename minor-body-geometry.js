/**
 * Values for the educational minor-body orbit inspector. Coordinates are
 * heliocentric J2000 ecliptic AU; inclination is relative to the ecliptic.
 * A two-body osculating conic is NOT an N-body integrated ephemeris.
 */
export function minorBodyGeometry(object,position){
 if(!object||!position||![position.x,position.y,position.z].every(Number.isFinite))return null;
 const elements=object.elements||{};
 const e=Number(elements.eccentricity),i=Number(elements.inclinationDeg);
 const q=object.type==='Comet'?Number(elements.qAU):
   Number(elements.aAU)*(1-e);
 if(!Number.isFinite(e)||e<0||!Number.isFinite(i)||!Number.isFinite(q)||q<=0)return null;
 const aphelion=e<1?q*(1+e)/(1-e):null;
 const height=position.z;
 return {name:object.name,type:object.type,inclinationDeg:i,eccentricity:e,
  perihelionAU:q,aphelionAU:Number.isFinite(aphelion)?aphelion:null,
  heightAU:height,planeDistanceAU:Math.hypot(position.x,position.y),
  sunDistanceAU:Math.hypot(position.x,position.y,position.z),
  nodeDeg:Number(elements.nodeDeg),argPeriDeg:Number(elements.argPeriDeg),
  epochAgeDays:Number.isFinite(position.epochAgeDays)?position.epochAgeDays:null};
}
