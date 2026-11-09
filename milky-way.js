import {geoEquirectangular,geoAzimuthalEquidistant,geoPath,geoArea} from 'd3-geo';
import {RAD,DEG,wrap,horizontal,precessJ2000,sidereal} from './astronomy.js';
import {projectRect,rectGeometry} from './sky-projection.js';

/**
 * Milky Way chart using the five published Vieira contour levels. Shading
 * comes only from their irregular filled polygons, never from an artificial
 * smooth band along the galactic equator. Nested, semi-transparent neutral
 * greys give the original SidClock-style chart appearance. The same outlines
 * can be stroked separately.
 */
let levels=[],ready=false,failed=false;
export const milkyWayStatus=()=>({ready,failed,levels:levels.length});
fetch('./sky-milkyway.json').then(r=>{
 if(!r.ok)throw Error('Milky Way contour catalogue '+r.status);
 return r.json();
}).then(data=>{levels=data;ready=true}).catch(err=>{
 failed=true;console.warn('Milky Way outline data unavailable',err);
}).finally(()=>window.dispatchEvent(new Event('helioclock-milkyway-ready')));

export function galacticToJ2000(l,b=0){
 const lr=l*RAD,br=b*RAD;
 const x=Math.cos(br)*Math.cos(lr),y=Math.cos(br)*Math.sin(lr),z=Math.sin(br);
 const ex=-.0548755604*x+.4941094279*y-.8676661490*z;
 const ey=-.8734370902*x-.4448296300*y-.1980763734*z;
 const ez=-.4838350155*x+.7469822445*y+.4559837762*z;
 return {ra:wrap(Math.atan2(ey,ex)*DEG),dec:Math.asin(Math.max(-1,Math.min(1,ez)))*DEG};
}
export const GALACTIC_CENTER=galacticToJ2000(0,0);
const eqAtDate=(ra,dec,date,precession)=>precession?precessJ2000(ra,dec,date):{ra,decl:dec};
const toAltAz=(ra,dec,date,lat,lon,precession)=>{
 const eq=eqAtDate(ra,dec,date,precession);
 return horizontal(eq.ra,eq.decl,date,lat,lon);
};
function projection({mode,width,height,zoom,heading,showBelowHorizon}){
 const X=width/2,Y=height/2,radius=(Math.min(width-35,height-20)/2-14)*zoom;
 return h=>{
  if(!Number.isFinite(h.alt)||!Number.isFinite(h.az))return null;
  if(h.alt<0&&(mode!=='rect'||!showBelowHorizon))return null;
  if(mode==='rect')return projectRect(h.az,h.alt,width,height,heading);
  const theta=(h.az-90-heading)*RAD,r=radius*(1-h.alt/90);
  return [X+Math.cos(theta)*r,Y+Math.sin(theta)*r];
 };
}
function drawSegments(c,points,maxSpan){
 let last=null;
 c.beginPath();
 for(const xy of points){
  if(xy&&last&&Math.hypot(xy[0]-last[0],xy[1]-last[1])<maxSpan)c.lineTo(xy[0],xy[1]);
  else if(xy)c.moveTo(xy[0],xy[1]);
  last=xy;
 }
 c.stroke();
}
/**
 * Project a complete closed contour, including positions below the horizon.
 * Visibility is handled by the clipping region in the caller instead of by
 * skipping vertices (which would break a filled polygon at the horizon).
 * Rectangular coordinates are unwrapped across the 0°/360° azimuth seam.
 * Interior rings are anchored to the same unwrapped longitude as the outer
 * ring so the Canvas even-odd fill retains astronomical dark holes.
 */
function projectedRings(rings,projectPoint,{mode,width,height,heading}){
 const g=mode==='rect'?rectGeometry(width,height):null;
 const span=g?g.right-g.left:0;
 const output=[];
 let reference=null;
 for(const ring of rings){
  const xy=[];
  let previous=null;
  for(const [ra,dec] of ring){
   const point=projectPoint(ra,dec);
   if(!point)continue;
   let x=point[0];
   if(g){
    const anchor=previous===null?(reference??x):previous;
    x+=Math.round((anchor-x)/span)*span;
   }
   xy.push([x,point[1]]);
   previous=x;
  }
  if(xy.length>2){
   if(reference===null)reference=xy[0][0];
   output.push(xy);
  }
 }
 return output;
}
function traceRings(c,rings,dx=0){
 c.beginPath();
 for(const ring of rings){
  c.moveTo(ring[0][0]+dx,ring[0][1]);
  for(let i=1;i<ring.length;i++)c.lineTo(ring[i][0]+dx,ring[i][1]);
  c.closePath();
 }
}
/**
 * Draw one even-odd polygon for each catalogue brightness tier, including
 * hole rings. Repeat rectangular polygons across the azimuth seam, with
 * matching hole offsets. The clip mask imposes the visible hemisphere.
 */
function paintContours(c,levels,projectPoint,opts,visibility,shade,outline){
 const g=opts.mode==='rect'?rectGeometry(opts.width,opts.height):null;
 const span=g?g.right-g.left:0;
 const alpha=[.095,.060,.060,.070,.085];
 for(let k=0;k<levels.length;k++){
  const rings=projectedRings(levels[k].rings,projectPoint,opts);
  if(!rings.length)continue;
  // Spherical contours can cross the rectangular azimuth seam; repeat each
  // uninterrupted path just far enough to cover the two sides of the map.
  const offsets=g?[-2,-1,0,1,2].map(n=>n*span):[0];
  for(const dx of offsets){
   if(g){
    let min=Infinity,max=-Infinity;
    for(const ring of rings)for(const p of ring){
     min=Math.min(min,p[0]+dx);max=Math.max(max,p[0]+dx);
    }
    if(max<g.left||min>g.right)continue;
   }
   traceRings(c,rings,dx);
   if(shade){
    c.fillStyle='rgba(190,198,209,'+(alpha[k]*visibility)+')';
    c.fill('evenodd');
   }
   if(outline){
    c.strokeStyle='rgba(192,204,222,'+((.14+.035*k)*visibility)+')';
    c.lineWidth=k===0?1.0:.7;
    c.stroke();
   }
  }
 }
}
/**
 * Fixed equatorial contour mask for rectangular shading. The Vieira outlines
 * are ordinary J2000 RA/Dec curves and never enter the azimuth projection
 * when deciding which points are *inside*. All topology (rings and holes)
 * is resolved once in a fixed 360° by 180° map. Rendering merely samples
 * that map through the inverse local horizontal projection.
 *
 * This avoids D3's time-dependent spherical complement/winding ambiguity
 * whenever a contour sweeps across the local azimuth seam or a sky pole.
 * The polar projection retains its established separate implementation.
 */
const MASK_WIDTH=1440,MASK_HEIGHT=720;
const CONTOUR_ALPHA=[.095,.060,.060,.070,.085];
let fixedContourMask=null;
function makeCanvas(w,h){
 const cv=document.createElement('canvas');
 cv.width=w;cv.height=h;
 return cv;
}
function fixedEquatorialMask(){
 if(fixedContourMask)return fixedContourMask;
 const total=new Float32Array(MASK_WIDTH*MASK_HEIGHT);
 const cv=makeCanvas(MASK_WIDTH,MASK_HEIGHT),ctx=cv.getContext('2d',{willReadFrequently:true});
 // Construct the mask with D3's spherical antimeridian clipper in the
 // *fixed* J2000 frame. The v32 planar unwrapping was not topology-safe:
 // closing a contour at a celestial seam could create a long artificial arc.
 // A spherical clipper adds only the appropriate seam-edge closure instead.
 const projection=geoEquirectangular()
  .scale(MASK_WIDTH/(2*Math.PI))
  .translate([MASK_WIDTH/2,MASK_HEIGHT/2]).precision(.12);
 const path=geoPath(projection,ctx);
 for(let tier=0;tier<levels.length;tier++){
  ctx.clearRect(0,0,MASK_WIDTH,MASK_HEIGHT);
  for(const polygon of (levels[tier].polygons||[])){
   if(!polygon.length)continue;
   const rings=polygon.filter(r=>r.length>2).map(ring=>ring.map(([ra,dec])=>[
    wrap(ra+180,360)-180,dec
   ]));
   if(!rings.length)continue;
   let shape={type:'Polygon',coordinates:rings};
   // GeoJSON winding determines which *spherical* region is inside. Always
   // select the smaller side of each original catalogue contour, in J2000.
   // All rings reverse together, preserving holes.
   if(geoArea(shape)>2*Math.PI){
    shape={type:'Polygon',coordinates:rings.map(r=>[...r].reverse())};
   }
   ctx.beginPath();path(shape);
   ctx.fillStyle='#fff';ctx.fill('evenodd');
  }
  const pixels=ctx.getImageData(0,0,MASK_WIDTH,MASK_HEIGHT).data;
  const alpha=CONTOUR_ALPHA[Math.min(tier,CONTOUR_ALPHA.length-1)];
  for(let i=0,j=3;i<total.length;i++,j+=4){
   if(pixels[j])total[i]=1-(1-total[i])*(1-alpha*pixels[j]/255);
  }
 }
 fixedContourMask=new Uint8Array(total.length);
 for(let i=0;i<total.length;i++)fixedContourMask[i]=Math.round(255*total[i]);
 return fixedContourMask;
}
function precessionInverse(date){
 // Inverse of astronomy.js's IAU 1976 J2000-to-date rotation.
 const T=(date.getTime()/86400000+2440587.5-2451545)/36525;
 const arcsec=RAD/3600;
 const zeta=(2306.2181*T+.30188*T*T+.017998*T*T*T)*arcsec;
 const z=(2306.2181*T+1.09468*T*T+.018203*T*T*T)*arcsec;
 const theta=(2004.3109*T-.42665*T*T-.041833*T*T*T)*arcsec;
 return {zeta,z,ct:Math.cos(theta),st:Math.sin(theta)};
}
function paintRectMask(c,{date,lat,lon,width,height,heading,precession},visibility){
 const source=fixedEquatorialMask(),g=rectGeometry(width,height);
 // 2px nominal cells are smoothed on display, reducing costly coordinate
 // inversions for large fullscreen charts without smearing contour structure.
 const step=2,cols=Math.ceil((g.right-g.left)/step),rows=Math.ceil((g.bottom-g.top)/step);
 const cv=makeCanvas(cols,rows),ctx=cv.getContext('2d');
 const out=ctx.createImageData(cols,rows),dst=out.data;
 const siderealDegrees=sidereal(date,lon);
 const phi=lat*RAD,sp=Math.sin(phi),cp=Math.cos(phi);
 const inv=precession?precessionInverse(date):null;
 const cosAz=new Float64Array(cols),sinAz=new Float64Array(cols);
 for(let x=0;x<cols;x++){
  const az=wrap((x+.5)/cols*360+heading)*RAD;
  cosAz[x]=Math.cos(az);sinAz[x]=Math.sin(az);
 }
 for(let y=0;y<rows;y++){
  const altitude=(90-(y+.5)/rows*180)*RAD;
  const sa=Math.sin(altitude),ca=Math.cos(altitude);
  for(let x=0;x<cols;x++){
   const cosA=cosAz[x],sinA=sinAz[x];
   const dec=Math.asin(Math.max(-1,Math.min(1,sa*sp+ca*cp*cosA)));
   const hourAngle=Math.atan2(-ca*sinA,sa*cp-ca*sp*cosA)*DEG;
   let ra=wrap(siderealDegrees-hourAngle)*RAD,decl=dec;
   if(inv){
    const a=ra-inv.z,cosd=Math.cos(decl),B=cosd*Math.cos(a),A=cosd*Math.sin(a),C=Math.sin(decl);
    ra=Math.atan2(A,inv.ct*B+inv.st*C)-inv.zeta;
    decl=Math.asin(Math.max(-1,Math.min(1,-inv.st*B+inv.ct*C)));
   }
   const u=Math.min(MASK_WIDTH-1,Math.floor(wrap(ra*DEG,360)*MASK_WIDTH/360));
   const v=Math.max(0,Math.min(MASK_HEIGHT-1,Math.floor((90-decl*DEG)*MASK_HEIGHT/180)));
   const intensity=source[v*MASK_WIDTH+u],p=(y*cols+x)*4;
   dst[p]=190;dst[p+1]=198;dst[p+2]=209;dst[p+3]=Math.round(intensity*visibility);
  }
 }
 ctx.putImageData(out,0,0);
 c.drawImage(cv,g.left,g.top,g.right-g.left,g.bottom-g.top);
}
/**
 * Outlines still use the existing vector projection and spherical seam
 * clipping. Only *fills* use the fixed mask: an outline never affects the
 * physical inside/outside choice of a contour.
 */
function paintRectContours(c,levels,opts,visibility,shade,outline){
 if(shade)paintRectMask(c,opts,visibility);
 if(!outline)return;
 const {date,lat,lon,width,height,heading,precession}=opts;
 const g=rectGeometry(width,height),span=g.right-g.left;
 const xCenter=(g.left+g.right)/2,yCenter=(g.top+g.bottom)/2;
 const baseScale=span/(Math.PI*2),verticalScale=(g.bottom-g.top)/(Math.PI*baseScale);
 // Dynamic vector outlines alone cannot cause a full-sky grey wash.
 const projection=geoEquirectangular().scale(baseScale).translate([xCenter,yCenter]).precision(.15);
 const path=geoPath(projection,c);
 c.save();c.translate(0,yCenter);c.scale(1,verticalScale);c.translate(0,-yCenter);
 for(let k=0;k<levels.length;k++){
  const converted=(levels[k].polygons||[]).map(polygon=>polygon.map(ring=>ring.map(([ra,dec])=>{
   const h=toAltAz(ra,dec,date,lat,lon,precession);
   return [wrap(h.az-heading,360)-180,h.alt];
  })));
  c.beginPath();path({type:'MultiPolygon',coordinates:converted});
  c.strokeStyle='rgba(192,204,222,'+((.14+.035*k)*visibility)+')';
  c.lineWidth=(k===0?1:.7)/Math.max(1,verticalScale);
  c.stroke();
 }
 c.restore();
}
/**
 * Polar brightness polygons must be clipped on the sphere before drawing.
 * Directly connecting J2000 rings after local Alt/Az projection can select
 * the *complement* of a Milky Way region when the contour crosses the
 * observer's horizon or encloses the zenith. Flattening MultiPolygons into
 * one even-odd path also mixes unrelated components and their hole parity.
 *
 * The azimuthal equidistant projection preserves the existing polar sky
 * geometry: distance from zenith = (90° - altitude) * radius / 90°.
 * Native spherical clipAngle(90) closes boundary-crossing polygons along
 * the horizon, rather than connecting their hidden vertices through the
 * visible hemisphere. Each original Polygon retains its interior rings.
 */
function paintPolarContours(c,levels,{date,lat,lon,width,height,zoom,heading,precession},visibility,shade,outline){
 const radius=(Math.min(width-35,height-20)/2-14)*zoom;
 const projection=geoAzimuthalEquidistant()
  .rotate([0,-90]).clipAngle(90)
  .scale(radius/(Math.PI/2))
  .translate([width/2,height/2]).precision(.2);
 const alpha=[.095,.060,.060,.070,.085];
 for(let k=0;k<levels.length;k++){
  const polygons=levels[k].polygons||[];
  for(const polygon of polygons){
   const rings=polygon.filter(r=>r.length>2).map(ring=>ring.map(([ra,dec])=>{
    const h=toAltAz(ra,dec,date,lat,lon,precession);
    // Spherical azimuthal projection centred on north pole: azimuth 0
    // (canvas up) corresponds to longitude 180°, 90° (right) to 90°.
    return [wrap(180-h.az+heading+180,360)-180,h.alt];
   }));
   if(!rings.length)continue;
   let shape={type:'Polygon',coordinates:rings};
   // d3-geo interprets winding on the sphere, not in flat chart pixels.
   // A contour represents its smaller physical region, not its complement.
   if(geoArea(shape)>2*Math.PI){
    shape={type:'Polygon',coordinates:rings.map(r=>[...r].reverse())};
   }
   // Retain each contour as a real Path2D so it can be checked against the
   // sky disc. Some horizon-crossing spherical rings have the *exterior*
   // selected after clipping; those must be inverted, otherwise practically
   // the entire polar sky acquires a grey wash.
   const region=new Path2D();
   geoPath(projection,region)(shape);
   let inside=0,samples=0;
   const sampleSteps=5;
   for(let iy=0;iy<sampleSteps;iy++)for(let ix=0;ix<sampleSteps;ix++){
    const sx=(ix+.5)/sampleSteps*2-1,sy=(iy+.5)/sampleSteps*2-1;
    if(sx*sx+sy*sy>.94)continue;
    samples++;
    if(c.isPointInPath(region,width/2+sx*radius,height/2+sy*radius,'evenodd'))inside++;
   }
   const inverted=samples>0&&inside/samples>.55;
   if(shade){
    c.fillStyle='rgba(190,198,209,'+(alpha[k]*visibility)+')';
    if(inverted){
     // Even-odd XOR with the local horizon circle selects the intended
     // smaller region. The existing outer clipping mask clips any excess.
     const positive=new Path2D();
     positive.arc(width/2,height/2,radius,0,Math.PI*2);
     positive.addPath(region);
     c.fill(positive,'evenodd');
    }else c.fill(region,'evenodd');
   }
   if(outline){
    c.strokeStyle='rgba(192,204,222,'+((.14+.035*k)*visibility)+')';
    c.lineWidth=k===0?1:.7;
    c.stroke(region);
   }
  }
 }
}
export function drawMilkyWay(c,opts){
 const {date,lat,lon,width,height,mode='polar',zoom=1,heading=0,
  precession=true,showBelowHorizon=true,showShade=false,showOutline=false,
  showCenter=false,skyLight='black',sunAltitude=-20,forceDaylight=false}=opts;
 if(!showShade&&!showOutline&&!showCenter)return;
 const position=projection({mode,width,height,zoom,heading,showBelowHorizon});
 const day=(sunAltitude+18)/22;
 // Black-sky display always permits overlays; atmospheric daylight normally
 // attenuates the galactic band. Education override shows the full-strength band.
 const visibility=forceDaylight||skyLight==='black'?1:Math.max(.10,1-Math.max(0,Math.min(1,day))*.86);
 c.save();
 if(mode==='rect'){
  const g=rectGeometry(width,height);
  c.beginPath();c.rect(g.left,g.top,g.right-g.left,(showBelowHorizon?g.bottom:(g.top+g.bottom)/2)-g.top);c.clip();
 }else{
  const R=(Math.min(width-35,height-20)/2-14)*zoom;
  c.beginPath();c.arc(width/2,height/2,R,0,2*Math.PI);c.clip();
 }
 // Clip both shaded regions and outline strokes to the appropriate view.
 // The polar sky always stops at the horizon; rectangular may show -90°.
 if((showShade||showOutline)&&ready){
  const rawProjection=h=>{
   if(!Number.isFinite(h.az)||!Number.isFinite(h.alt))return null;
   if(mode==='rect')return projectRect(h.az,h.alt,width,height,heading);
   const R=(Math.min(width-35,height-20)/2-14)*zoom;
   const angle=(h.az-90-heading)*RAD,r=R*(1-h.alt/90);
   return [width/2+Math.cos(angle)*r,height/2+Math.sin(angle)*r];
  };
  const projectPoint=(ra,dec)=>rawProjection(toAltAz(ra,dec,date,lat,lon,precession));
  if(mode==='rect'){
   paintRectContours(c,levels,{date,lat,lon,width,height,heading,precession},
    visibility,showShade,showOutline);
  }else{
   paintPolarContours(c,levels,{date,lat,lon,width,height,zoom,heading,precession},
    visibility,showShade,showOutline);
  }
 }
 if(showCenter){
  const h=toAltAz(GALACTIC_CENTER.ra,GALACTIC_CENTER.dec,date,lat,lon,precession);
  const p=position(h);
  if(p){
   const [x,y]=p;
   c.lineWidth=1.5;c.strokeStyle='rgba(255,216,145,'+visibility+')';
   c.beginPath();c.arc(x,y,7,0,2*Math.PI);c.stroke();
   c.beginPath();c.moveTo(x-11,y);c.lineTo(x-4,y);c.moveTo(x+4,y);c.lineTo(x+11,y);
   c.moveTo(x,y-11);c.lineTo(x,y-4);c.moveTo(x,y+4);c.lineTo(x,y+11);c.stroke();
   c.font='10px sans-serif';c.fillStyle='rgba(255,227,166,'+visibility+')';
   c.fillText('Galactic centre',x+12,y-9);
  }
 }
 c.restore();
}
