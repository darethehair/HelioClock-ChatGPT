/**
 * Surface-coordinate reference overlays for the HelioClock celestial discs.
 *
 * The existing lunar photograph is a fixed near-side orthographic mosaic:
 * it currently has no date-dependent libration. The SDO photograph is not
 * astrometrically registered. Hence these are explicitly REFERENCE grids,
 * not precise lunar/solar feature coordinates.
 */
const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function discGeometry(kind,width,height,zoom=1,panX=0,panY=0,orientation=0) {
  // Match the lunar renderer's visible disc diameter. Solar reference disk
  // occupies roughly 86% of the shorter dimension in the square SDO image.
  const radius=kind==='moon'
    ? Math.max(20,Math.floor(Math.min(width*.82,height*.90)))/2
    : Math.min(width,height)*.43;
  return {cx:width/2+panX,cy:height/2+panY,r:radius*zoom,angle:kind==='moon'?orientation*rad:0};
}
export function surfaceToScreen(latitude,longitude,g) {
  const lat=latitude*rad,lon=longitude*rad;
  const x=Math.cos(lat)*Math.sin(lon),y=-Math.sin(lat),z=Math.cos(lat)*Math.cos(lon);
  if(z<0)return null;
  const ca=Math.cos(g.angle),sa=Math.sin(g.angle);
  return {x:g.cx+g.r*(x*ca-y*sa),y:g.cy+g.r*(x*sa+y*ca)};
}
export function screenToSurface(x,y,g) {
  const dx=(x-g.cx)/g.r,dy=(y-g.cy)/g.r;
  const ca=Math.cos(g.angle),sa=Math.sin(g.angle);
  const nx=dx*ca+dy*sa,ny=-dx*sa+dy*ca;
  const rr=nx*nx+ny*ny;
  if(rr>1)return null;
  return {latitude:-Math.asin(clamp(ny,-1,1))*deg,
    longitude:Math.atan2(nx,Math.sqrt(Math.max(0,1-rr)))*deg};
}
export function paintDiscGrid(canvas,kind,g,enabled=true) {
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const c=canvas.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,width,height);
  if(!enabled)return;
  c.save();c.beginPath();c.arc(g.cx,g.cy,g.r,0,Math.PI*2);c.clip();
  c.strokeStyle=kind==='moon'?'rgba(115,210,245,.60)':'rgba(45,55,65,.72)';
  c.lineWidth=1;
  function trace(points) {
    c.beginPath();let started=false;
    for(const [lat,lon] of points) {
      const p=surfaceToScreen(lat,lon,g);
      if(!p){started=false;continue}
      if(!started){c.moveTo(p.x,p.y);started=true}else c.lineTo(p.x,p.y);
    }
    c.stroke();
  }
  for(let lat=-60;lat<=60;lat+=30)
    trace(Array.from({length:181},(_,i)=>[lat,-90+i]));
  for(let lon=-90;lon<=90;lon+=30)
    trace(Array.from({length:181},(_,i)=>[-90+i,lon]));
  c.restore();
  const equator=surfaceToScreen(0,0,g);
  if(equator){
    c.fillStyle=kind==='moon'?'#b5edff':'#1b2937';
    c.font='bold 11px sans-serif';c.textAlign='center';
    c.fillText('0°',equator.x,equator.y-5);
  }
}
export function formatSurface(point,kind){
  if(!point)return 'Outside visible disc';
  const lat=Math.abs(point.latitude).toFixed(1)+'° '+(point.latitude>=0?'N':'S');
  const lon=Math.abs(point.longitude).toFixed(1)+'° '+(point.longitude>=0?'E':'W');
  return (kind==='moon'?'Selenographic':'Heliographic reference')+' · '+lat+' · '+lon;
}
