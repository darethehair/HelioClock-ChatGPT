import {clamp,wrap} from './astronomy.js';

/** SChronos-inspired full-sphere rectangular horizon coordinates. */
export function rectGeometry(width,height){
 return {left:Math.max(35,width*.035),right:width-Math.max(16,width*.016),
  top:12,bottom:height-28};
}
export function projectRect(az,alt,width,height,heading=0){
 const g=rectGeometry(width,height),span=g.right-g.left;
 return [g.left+wrap(az-heading,360)/360*span,
  g.top+(90-alt)/180*(g.bottom-g.top)];
}
export function rectHorizonY(width,height){
 const g=rectGeometry(width,height);return (g.top+g.bottom)/2;
}
const rgb=(v)=>'rgb('+v.map(x=>Math.round(clamp(x,0,255))).join(',')+')';
function mix(a,b,t){return a.map((v,i)=>v*(1-t)+b[i]*t)}
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
/**
 * Educational atmospheric gradient, not a physical scattering solver.
 * Inspired by the user's SChronos radial Sun-centred Cairo gradient:
 * cyan-blue zenith, warmer solar vicinity, dimming through -18° twilight.
 * The three repeated radial gradients avoid a seam at azimuth 0° / 360°.
 * Everything below altitude 0° is opaque black at all times.
 */
export function paintRectAtmosphere(c,width,height,sun,{black=false,heading=0}={}){
 const g=rectGeometry(width,height);
 const horizon=(g.top+g.bottom)/2,span=g.right-g.left;
 c.fillStyle='#000';c.fillRect(0,0,width,height);
 if(black)return;
 const daylight=smooth((sun.alt+18)/18);
 if(daylight<.0001)return;
 const blue=mix([0,0,0],[5,132,250],daylight);
 const top=rgb(blue.map(x=>x*.80));
 const bottom=rgb(mix(blue,[128,177,209],.34*daylight));
 c.save();c.beginPath();c.rect(g.left,g.top,span,horizon-g.top);c.clip();
 const vertical=c.createLinearGradient(0,g.top,0,horizon);
 vertical.addColorStop(0,top);vertical.addColorStop(1,bottom);
 c.fillStyle=vertical;c.fillRect(g.left,g.top,span,horizon-g.top);
 const solarX=projectRect(sun.az,sun.alt,width,height,heading)[0];
 const solarY=projectRect(sun.az,sun.alt,width,height,heading)[1];
 const twilight=smooth((sun.alt+18)/18);
 const warmStrength=(sun.alt>20? .55 : sun.alt>=-6? .85 : .40)*twilight;
 const glowRadius=Math.max(span*.22,60);
 for(const offset of [-span,0,span]){
  const glow=c.createRadialGradient(solarX+offset,solarY,2,solarX+offset,solarY,glowRadius);
  glow.addColorStop(0,'rgba(255,215,157,'+(warmStrength*.79)+')');
  glow.addColorStop(.34,'rgba(252,190,127,'+(warmStrength*.36)+')');
  glow.addColorStop(1,'rgba(245,187,137,0)');
  c.fillStyle=glow;c.fillRect(g.left,g.top,span,horizon-g.top);
 }
 c.restore();
}
