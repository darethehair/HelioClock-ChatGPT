// Phase geometry for the Moon marker in the sky compass.
// The bright limb points toward the Sun on the observer's celestial sphere.
const rad=Math.PI/180;
export function moonBrightDirection(moon,sun,project){
 const az=moon.az*rad,alt=moon.alt*rad;
 const saz=sun.az*rad,salt=sun.alt*rad;
 const east=Math.cos(salt)*Math.sin(saz-az);
 const up=Math.sin(salt)*Math.cos(alt)-Math.cos(salt)*Math.sin(alt)*Math.cos(saz-az);
 const da=.1,dh=.1;
 const [x0,y0]=project(moon.az,moon.alt);
 const [xa,ya]=project(moon.az+da,moon.alt);
 const [xh,yh]=project(moon.az,moon.alt+dh);
 // Convert the azimuth derivative into an angular eastward derivative.
 const azScale=1/Math.max(.01,Math.cos(alt));
 const dx=east*(xa-x0)*azScale+up*(xh-x0);
 const dy=east*(ya-y0)*azScale+up*(yh-y0);
 return Math.atan2(dy,dx);
}
export function drawSkyMoon(c,x,y,r,illumination,waxing,angle){
 const f=Math.max(0,Math.min(1,illumination));
 c.save();c.translate(x,y);c.rotate(angle);
 c.fillStyle='#17243a';c.strokeStyle='#d2deef';c.lineWidth=1;
 c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
 // Scan the exact projected elliptical terminator: at quarter phase it is
 // a straight diameter, while near new/full it approaches the outer limb.
 c.strokeStyle='#e9edf4';c.lineWidth=.65;
 const n=Math.ceil(r*5);
 for(let i=0;i<n;i++){
  const yy=-r+(i+.5)*2*r/n;
  const edge=Math.sqrt(Math.max(0,r*r-yy*yy));
  const terminator=(1-2*f)*edge;
  const start=waxing?terminator:-edge;
  const end=waxing?edge:-terminator;
  if(end<=start)continue;
  c.beginPath();c.moveTo(start,yy);c.lineTo(end,yy);c.stroke();
 }
 c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
 c.restore();
}
