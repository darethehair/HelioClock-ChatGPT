import {solarEclipseGeometry} from './eclipse-geometry.js';

/**
 * Draw a location-specific, timestamp-specific apparent solar eclipse.
 * Schematic solar surface deliberately replaces the current NASA image:
 * the imagery is a mathematical diagram, not a historical photograph.
 * Celestial north is up and east is left, with no unverified photo rotation.
 */
export function renderSolarEclipse(canvas,when,latitude,longitude){
 const geometry=solarEclipseGeometry(when,latitude,longitude);
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(width<=0||height<=0)return geometry;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);
 canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');
 c.setTransform(dpr,0,0,dpr,0,0);
 c.clearRect(0,0,width,height);
 // Keep the same apparent limb as discGeometry('sun') for pan and zoom.
 const radius=Math.min(width,height)*.47;
 const cx=width/2,cy=height/2;
 // The solar background is deliberately synthetic; no NASA photograph is
 // used or dated as if it were observed at the simulation instant.
 const gradient=c.createRadialGradient(cx-radius*.25,cy-radius*.28,radius*.03,cx,cy,radius);
 gradient.addColorStop(0,'#fff0bd');
 gradient.addColorStop(.55,'#ffd273');
 gradient.addColorStop(.90,'#e99539');
 gradient.addColorStop(1,'#b75a20');
 c.save();
 c.shadowColor='#ffbc5e';c.shadowBlur=radius*.12;
 c.fillStyle=gradient;
 c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.fill();
 c.restore();
 // East is left in this north-up celestial reference frame.
 const scale=radius/geometry.sunRadius;
 const moonX=cx-geometry.x*scale;
 const moonY=cy-geometry.y*scale;
 const moonRadius=geometry.moonRadius*scale;
 // Never draw a new moon disc over an unrelated solar day. The caller uses
 // geometry.kind to decide when to activate the simulated eclipse layer.
 if(geometry.kind!=='none'){
  c.beginPath();c.arc(moonX,moonY,moonRadius,0,Math.PI*2);
  c.fillStyle='#03060c';c.fill();
  c.strokeStyle='rgba(183,200,220,.23)';
  c.lineWidth=Math.max(.5,radius*.004);c.stroke();
 }
 return geometry;
}
