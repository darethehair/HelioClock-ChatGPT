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
export function discGeometry(kind,width,height,zoom=1,panX=0,panY=0,orientation=0,viewLatitude=0) {
  // Moon matches renderMoon's exact mathematical limb (including its floor).
  // The SDO image is rendered with object-fit:contain: its square image is
  // centred inside the wide stage. Its observed limb is about 94% of the
  // square photograph's width, not 86% as the old overlay assumed.
  const radius=kind==='moon'
    ? Math.max(20,Math.floor(Math.min(width*.82,height*.90)))/2
    : Math.min(width,height)*.47;
  return {cx:width/2+panX,cy:height/2+panY,r:radius*zoom,angle:orientation*rad,tilt:kind==='sun'?viewLatitude*rad:0};
}
export function surfaceToScreen(latitude,longitude,g) {
  const lat=latitude*rad,lon=longitude*rad;
  const x=Math.cos(lat)*Math.sin(lon);
  const north=Math.sin(lat),forward=Math.cos(lat)*Math.cos(lon);
  const b=g.tilt||0,cb=Math.cos(b),sb=Math.sin(b);
  const y=-(north*cb-forward*sb),z=north*sb+forward*cb;
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
  const forward=Math.sqrt(Math.max(0,1-rr));
  const b=g.tilt||0,cb=Math.cos(b),sb=Math.sin(b);
  const north=-ny*cb+forward*sb;
  const longitude=Math.atan2(nx,ny*sb+forward*cb)*deg;
  const latitude=Math.asin(clamp(north,-1,1))*deg;
  return {latitude:latitude===0?0:latitude,longitude:longitude===0?0:longitude};
}
/**
 * Grid density responds to the apparent disc diameter, not to CSS fullscreen
 * itself: a phone still gets readable labels, while a large desktop disc
 * receives 15-degree intervals.
 */
export function gridInterval(radius) {
  return radius>=210?15:30;
}
export function paintDiscGrid(canvas,kind,g,enabled=true,apparentRadius=g.r) {
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  const c=canvas.getContext('2d');
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,width,height);
  if(!enabled||!(g.r>0))return;
  const sun=kind==='sun',step=gridInterval(apparentRadius);
  c.save();
  c.beginPath();c.arc(g.cx,g.cy,g.r,0,Math.PI*2);c.clip();
  // Thin lines are especially important when a disc fills a fullscreen panel.
  // Solar lines must be genuinely black rather than pale blue/gray.
  c.strokeStyle=sun?'rgba(0,0,0,.75)':'rgba(120,205,240,.47)';
  c.lineWidth=sun?.7:.6;
  function trace(points) {
    c.beginPath();let started=false;
    for(const [lat,lon] of points) {
      const p=surfaceToScreen(lat,lon,g);
      if(!p){started=false;continue}
      if(!started){c.moveTo(p.x,p.y);started=true}else c.lineTo(p.x,p.y);
    }
    c.stroke();
  }
  // Complete visible parallels and meridians to the actual limb, including
  // the near-polar portions previously left blank.
  for(let lat=-90+step;lat<90;lat+=step)
    trace(Array.from({length:361},(_,i)=>[lat,-90+i*.5]));
  for(let lon=-90;lon<=90;lon+=step)
    trace(Array.from({length:361},(_,i)=>[-90+i*.5,lon]));
  c.restore();
  // Draw a single crisp boundary tied to the very same geometry as the
  // graticule. This prevents the high-latitude areas looking undersized.
  c.save();c.beginPath();c.arc(g.cx,g.cy,g.r,0,Math.PI*2);
  c.lineWidth=.65;c.strokeStyle=sun?'rgba(0,0,0,.80)':'rgba(120,205,240,.58)';c.stroke();
  c.restore();
  // Labels along the central meridian and equator remain legible without
  // covering the whole photograph, even at larger zoom levels.
  c.save();c.font=(apparentRadius>210?'11px':'10px')+' sans-serif';
  c.textAlign='center';c.textBaseline='middle';
  const textColor=sun?'#080808':'#d8f4ff';
  const halo=sun?'rgba(255,185,60,.58)':'rgba(1,10,18,.92)';
  c.lineWidth=2.6;c.strokeStyle=halo;c.fillStyle=textColor;
  function annotate(lat,lon,label,dx=0,dy=0) {
    const point=surfaceToScreen(lat,lon,g);
    if(!point)return;
    const x=point.x+dx,y=point.y+dy;
    if(x<14||x>width-14||y<10||y>height-10)return;
    c.strokeText(label,x,y);c.fillText(label,x,y);
  }
  const labelStep=apparentRadius>=210?30:60;
  annotate(0,0,'0°',0,-9);
  for(let lon=labelStep;lon<=75;lon+=labelStep){
    annotate(0,lon,lon+'°E',0,-10);
    annotate(0,-lon,lon+'°W',0,-10);
  }
  for(let lat=labelStep;lat<=75;lat+=labelStep){
    annotate(lat,0,lat+'°N',24,0);
    annotate(-lat,0,lat+'°S',24,0);
  }
  c.restore();
}
export function formatSurface(point,kind){
  if(!point)return 'Outside visible disc';
  const lat=Math.abs(point.latitude).toFixed(1)+'° '+(point.latitude>=0?'N':'S');
  const lon=Math.abs(point.longitude).toFixed(1)+'° '+(point.longitude>=0?'E':'W');
  return (kind==='moon'?'Selenographic':'Heliographic reference')+' · '+lat+' · '+lon;
}
