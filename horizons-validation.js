/**
 * Convert JPL Horizons heliocentric ICRF/J2000 ecliptic VECTORS output into
 * an XYZ vector (astronomical units). Both XYZ and velocities may be present;
 * extract only the first position triplet between the $$SOE/$$EOE delimiters.
 */
export function parseHorizonsVector(raw){
 const result=String(raw||'');
 const start=result.indexOf('$$SOE'),end=result.indexOf('$$EOE');
 if(start<0||end<start)throw Error('Horizons did not return a vector ephemeris');
 const body=result.slice(start+5,end);
 const number='([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[EeDd][+-]?\\d+)?)';
 const coordinates=['X','Y','Z'].map(axis=>{
  const match=body.match(new RegExp('(?:^|\\s)'+axis+'\\s*=\\s*'+number,'m'));
  if(!match)throw Error('Missing Horizons '+axis+' coordinate');
  return Number(match[1].replace(/[dD]/,'E'));
 });
 if(!coordinates.every(Number.isFinite))throw Error('Nonfinite Horizons coordinates');
 return {x:coordinates[0],y:coordinates[1],z:coordinates[2]};
}
export function vectorComparison(model,reference){
 if(!model||!reference||![model.x,model.y,model.z,reference.x,reference.y,reference.z].every(Number.isFinite))throw Error('Invalid vectors');
 const length=p=>Math.hypot(p.x,p.y,p.z);
 const m=length(model),r=length(reference);
 const delta=Math.hypot(model.x-reference.x,model.y-reference.y,model.z-reference.z);
 const cosine=(model.x*reference.x+model.y*reference.y+model.z*reference.z)/(m*r);
 return {modelDistanceAU:m,horizonsDistanceAU:r,positionErrorAU:delta,
  distanceErrorAU:m-r,
  directionErrorDeg:Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI};
}
