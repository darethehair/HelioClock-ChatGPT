import {RAD,DEG,wrap,solar,horizontal} from './astronomy.js';
import {projectRect,rectGeometry} from './sky-projection.js';

/**
 * Mean ecliptic of date (not a fixed J2000 grid): ecliptic latitude 0°
 * transformed by the obliquity at the selected epoch. The curve is projected
 * to local azimuth/altitude and clipped at the horizon in polar mode.
 */
export function eclipticEquatorial(lambda,obliquity){
 const la=lambda*RAD,eps=obliquity*RAD;
 return {ra:wrap(Math.atan2(Math.cos(eps)*Math.sin(la),Math.cos(la))*DEG),
  decl:Math.asin(Math.sin(eps)*Math.sin(la))*DEG};
}
export function drawEcliptic(c,{date,lat,lon,width,height,mode='polar',heading=0,zoom=1,showBelowHorizon=true}){
 const eps=solar(date).obliq;
 const g=mode==='rect'?rectGeometry(width,height):null;
 const R=(Math.min(width-35,height-20)/2-14)*zoom;
 c.save();
 c.beginPath();
 if(g){
  const bottom=showBelowHorizon?g.bottom:(g.top+g.bottom)/2;
  c.rect(g.left,g.top,g.right-g.left,bottom-g.top);
 }else c.arc(width/2,height/2,R,0,Math.PI*2);
 c.clip();
 c.lineWidth=1.35;c.strokeStyle='rgba(250,177,95,.90)';c.setLineDash([7,5]);
 // An independent segment at each ecliptic sample avoids joining across
 // rectangular azimuth wrap or across opposite sides of the polar horizon.
 const positions=[];
 for(let lambda=0;lambda<=360;lambda+=.75){
  const eq=eclipticEquatorial(lambda,eps);
  const h=horizontal(eq.ra,eq.decl,date,lat,lon);
  if(h.alt<0&&(mode!=='rect'||!showBelowHorizon)){positions.push(null);continue;}
  if(g)positions.push(projectRect(h.az,h.alt,width,height,heading));
  else{
   const theta=(h.az-90-heading)*RAD,d=R*(1-h.alt/90);
   positions.push([width/2+Math.cos(theta)*d,height/2+Math.sin(theta)*d]);
  }
 }
 c.beginPath();let previous=null;
 for(const xy of positions){
  if(xy&&previous&&Math.hypot(xy[0]-previous[0],xy[1]-previous[1])<
     (g?width*.25:Math.min(width,height)*.35))c.lineTo(xy[0],xy[1]);
  else if(xy)c.moveTo(xy[0],xy[1]);
  previous=xy;
 }
 c.stroke();c.restore();
}
