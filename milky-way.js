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
 * Both sky projections sample the same fixed equatorial mask.
 */
const MASK_WIDTH=1440,MASK_HEIGHT=720;
const CONTOUR_ALPHA=[.095,.060,.060,.070,.085];
let fixedContourMasks=new Map();
let fixedMaskDiagnostics=new Map();
export function milkyWayDebugStatus(mode='planar'){
 return fixedMaskDiagnostics.get(mode)||{mode,status:ready?'not generated':'loading'};
}
function makeCanvas(w,h){
 const cv=document.createElement('canvas');
 cv.width=w;cv.height=h;
 return cv;
}
function fixedEquatorialMask(mode='planar'){
 if(fixedContourMasks.has(mode))return fixedContourMasks.get(mode);
 const total=new Float32Array(MASK_WIDTH*MASK_HEIGHT);
 let seamClosures=0;
 const cv=makeCanvas(MASK_WIDTH,MASK_HEIGHT),ctx=cv.getContext('2d',{willReadFrequently:true});
 // Diagnostics compare two independent J2000 rasterization methods.
 // 'planar': periodic RA unwrapping, which restores large continuous regions.
 // 'spherical': D3 great-circle clipping, which v33 showed loses regions.
 const projection=geoEquirectangular().scale(MASK_WIDTH/(2*Math.PI))
  .translate([MASK_WIDTH/2,MASK_HEIGHT/2]).precision(.12);
 const d3path=geoPath(projection,ctx);
 for(let tier=0;tier<levels.length;tier++){
  ctx.clearRect(0,0,MASK_WIDTH,MASK_HEIGHT);
  for(const polygon of (levels[tier].polygons||[])){
   if(!polygon.length)continue;
   if(mode==='spherical'){
    const rings=polygon.filter(r=>r.length>2).map(ring=>ring.map(([ra,dec])=>[wrap(ra+180,360)-180,dec]));
    if(!rings.length)continue;
    let shape={type:'Polygon',coordinates:rings};
    if(geoArea(shape)>2*Math.PI)shape={type:'Polygon',coordinates:rings.map(r=>[...r].reverse())};
    ctx.beginPath();d3path(shape);ctx.fillStyle='#fff';ctx.fill('evenodd');
   }else{
    // Keep holes anchored to their outer boundary and repeat whole polygon
    // at every relevant RA wrap. Even-odd retains catalogue interior holes.
    // Every ring receives a consistent seam copy. Anchor holes to the
    // outer polygon centroid, not to an arbitrary starting vertex.
    const path=new Path2D();let outerCentre=null;
    for(const ring of polygon){
     if(ring.length<3)continue;
     const points=[];let previous=null;
     for(const [ra,dec] of ring){
      let x=wrap(ra,360);
      if(previous!==null)x+=360*Math.round((previous-x)/360);
      points.push([x,(90-dec)*MASK_HEIGHT/180]);previous=x;
     }
     const count=points.length>1&&
      Math.abs(points[0][0]-points.at(-1)[0])<1e-6&&
      Math.abs(points[0][1]-points.at(-1)[1])<1e-6?
      points.length-1:points.length;
     const centre=points.slice(0,count).reduce((sum,p)=>sum+p[0],0)/count;
     if(outerCentre===null)outerCentre=centre;
     const offset=360*Math.round((outerCentre-centre)/360);
     points.forEach(([x,y],i)=>{
      const px=(x+offset)*MASK_WIDTH/360;
      if(i===0)path.moveTo(px,y);else path.lineTo(px,y);
     });
     // Two Vieira boundary contours wind fully around RA. Their final
     // coordinate is the *same sky point* but 360° away in unwrapped X.
     // A direct closePath draws a false diagonal across the entire chart.
     // Close via the north pole instead: both caps share the same pole,
     // so even-odd filling produces the legitimate band between them.
     // Keep the previously verified polar mask unchanged for comparison.
     if(mode!=='planar-legacy'&&Math.abs(points.at(-1)[0]-points[0][0])>300){
      path.lineTo((points.at(-1)[0]+offset)*MASK_WIDTH/360,0);
      path.lineTo((points[0][0]+offset)*MASK_WIDTH/360,0);
      seamClosures++;
     }
     path.closePath();
    }
    ctx.fillStyle='#fff';
    for(const dx of [-2,-1,0,1,2]){
     ctx.save();ctx.translate(dx*MASK_WIDTH,0);ctx.fill(path,'evenodd');ctx.restore();
    }
   }
  }
  const pixels=ctx.getImageData(0,0,MASK_WIDTH,MASK_HEIGHT).data;
  const alpha=CONTOUR_ALPHA[Math.min(tier,CONTOUR_ALPHA.length-1)];
  for(let i=0,j=3;i<total.length;i++,j+=4){
   if(pixels[j])total[i]=1-(1-total[i])*(1-alpha*pixels[j]/255);
  }
 }
 // Every published Vieira contour boundary lies close to the galactic
 // plane. A global complement or erroneous RA closure cannot legitimately
 // shade points farther from that plane than *all* boundary vertices.
 // Derive this bound from the catalogue rather than a guessed sky width.
 const poleRa=192.85948*RAD,poleDec=27.12825*RAD;
 const pole=[Math.cos(poleDec)*Math.cos(poleRa),
  Math.cos(poleDec)*Math.sin(poleRa),Math.sin(poleDec)];
 const galacticLatitude=(ra,dec)=>{
  const r=ra*RAD,d=dec*RAD;
  return Math.asin(Math.max(-1,Math.min(1,
   Math.cos(d)*(Math.cos(r)*pole[0]+Math.sin(r)*pole[1])+Math.sin(d)*pole[2]
  )))*DEG;
 };
 let maxBoundaryLat=0;
 for(const tier of levels)for(const polygon of (tier.polygons||[]))
  for(const ring of polygon)for(const [ra,dec] of ring)
   maxBoundaryLat=Math.max(maxBoundaryLat,Math.abs(galacticLatitude(ra,dec)));
 // Allow one degree for raster sampling and anti-aliasing. This guard is
 // intentionally outside every original contour, so legitimate catalogue
 // silhouettes are not cropped.
 const safeLimit=maxBoundaryLat+1;
 const fixedContourMask=new Uint8Array(total.length);
 const cosRa=new Float64Array(MASK_WIDTH),sinRa=new Float64Array(MASK_WIDTH);
 for(let x=0;x<MASK_WIDTH;x++){
  const ra=(x+.5)/MASK_WIDTH*2*Math.PI;
  cosRa[x]=Math.cos(ra);sinRa[x]=Math.sin(ra);
 }
 for(let y=0;y<MASK_HEIGHT;y++){
  const dec=(90-(y+.5)/MASK_HEIGHT*180)*RAD;
  const cosd=Math.cos(dec),sind=Math.sin(dec);
  for(let x=0;x<MASK_WIDTH;x++){
   const b=Math.asin(Math.max(-1,Math.min(1,
    cosd*(cosRa[x]*pole[0]+sinRa[x]*pole[1])+sind*pole[2]
   )))*DEG;
   const i=y*MASK_WIDTH+x;
   fixedContourMask[i]=Math.abs(b)>safeLimit?0:Math.round(255*total[i]);
  }
 }
 let filled=0,totalIntensity=0;
 for(const intensity of fixedContourMask){if(intensity>0)filled++;totalIntensity+=intensity}
 const stats={mode,status:'ready',maskWidth:MASK_WIDTH,maskHeight:MASK_HEIGHT,
  footprintLimitDeg:Number(safeLimit.toFixed(3)),filledPixels:filled,
  filledPercent:Number((filled/fixedContourMask.length*100).toFixed(2)),
  meanAlpha:Number((totalIntensity/fixedContourMask.length/255).toFixed(4)),
  sourceLevels:levels.length,sourcePolygons:levels.reduce((n,l)=>n+(l.polygons||[]).length,0),seamClosures};
 fixedContourMasks.set(mode,fixedContourMask);
 fixedMaskDiagnostics.set(mode,stats);
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
/**
 * Cursor diagnostic: evaluate a displayed equatorial position against the
 * actual J2000 mask used by the selected sky projection. Never infer shade
 * from the rendered screenshot or from an approximate galactic stripe.
 */
export function milkyWaySample(raOfDate,decOfDate,date,precession=true,mode='planar'){
 if(!ready)return {ready:false};
 const inverse=precession?precessionInverse(date):null;
 let ra=raOfDate*RAD,decl=decOfDate*RAD;
 if(inverse){
  const angle=ra-inverse.z,cosd=Math.cos(decl);
  const B=cosd*Math.cos(angle),A=cosd*Math.sin(angle),C=Math.sin(decl);
  ra=Math.atan2(A,inverse.ct*B+inverse.st*C)-inverse.zeta;
  decl=Math.asin(Math.max(-1,Math.min(1,-inverse.st*B+inverse.ct*C)));
 }
 const raJ2000=wrap(ra*DEG,360),decJ2000=decl*DEG;
 const poleRA=192.85948*RAD,poleDec=27.12825*RAD;
 const sinB=Math.sin(decl)*Math.sin(poleDec)+
  Math.cos(decl)*Math.cos(poleDec)*Math.cos(ra-poleRA);
 const galacticLatitude=Math.asin(Math.max(-1,Math.min(1,sinB)))*DEG;
 const actualMode=mode==='planar-legacy'?'planar-legacy':'planar';
 const mask=fixedEquatorialMask(actualMode);
 const u=Math.min(MASK_WIDTH-1,Math.floor(raJ2000*MASK_WIDTH/360));
 const v=Math.max(0,Math.min(MASK_HEIGHT-1,
  Math.floor((90-decJ2000)*MASK_HEIGHT/180)));
 const intensity=mask[v*MASK_WIDTH+u];
 return {ready:true,mode:actualMode,raJ2000,decJ2000,
  galacticLatitude,intensity,alphaPercent:intensity/255*100};
}
function paintRectMask(c,{date,lat,lon,width,height,heading,precession,debugMaskMode='planar'},visibility){
 const source=fixedEquatorialMask(debugMaskMode),g=rectGeometry(width,height);
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
 * Polar outlines remain spherical paths; they never affect the fill.
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
/**
 * A single fixed J2000 mask determines which sky positions are shaded.
 * Only inverse-projection sampling changes with zoom; no projected polygon
 * can reverse its inside/outside meaning when the view is magnified.
 */
function paintPolarMask(c,{date,lat,lon,width,height,zoom,heading,precession,debugMaskMode='planar',panX=0,panY=0},visibility){
 // Corrected pole-aware closure, shared with rectangular shading.
 const mask=fixedEquatorialMask(debugMaskMode);
 const R=(Math.min(width-35,height-20)/2-14)*zoom;
 const cols=Math.ceil(width/2),rows=Math.ceil(height/2);
 const cv=makeCanvas(cols,rows),ctx=cv.getContext('2d');
 const out=ctx.createImageData(cols,rows),dst=out.data;
 const lst=sidereal(date,lon),phi=lat*RAD,sp=Math.sin(phi),cp=Math.cos(phi);
 const inv=precession?precessionInverse(date):null;
 for(let y=0;y<rows;y++){
  const yy=(y+.5)*height/rows-height/2-panY;
  for(let x=0;x<cols;x++){
   const xx=(x+.5)*width/cols-width/2-panX;
   const dist=Math.hypot(xx,yy);
   if(dist>R)continue;
   const alt=(90*(1-dist/R))*RAD;
   const az=wrap(Math.atan2(yy,xx)*DEG+90+heading)*RAD;
   const sa=Math.sin(alt),ca=Math.cos(alt);
   const dec=Math.asin(Math.max(-1,Math.min(1,sa*sp+ca*cp*Math.cos(az))));
   const ha=Math.atan2(-ca*Math.sin(az),sa*cp-ca*sp*Math.cos(az))*DEG;
   let ra=wrap(lst-ha)*RAD,decl=dec;
   if(inv){
    const a=ra-inv.z,B=Math.cos(decl)*Math.cos(a),
     A=Math.cos(decl)*Math.sin(a),C=Math.sin(decl);
    ra=Math.atan2(A,inv.ct*B+inv.st*C)-inv.zeta;
    decl=Math.asin(Math.max(-1,Math.min(1,-inv.st*B+inv.ct*C)));
   }
   const u=Math.min(MASK_WIDTH-1,Math.floor(wrap(ra*DEG,360)*MASK_WIDTH/360));
   const v=Math.max(0,Math.min(MASK_HEIGHT-1,
    Math.floor((90-decl*DEG)*MASK_HEIGHT/180)));
   const i=(y*cols+x)*4;
   dst[i]=190;dst[i+1]=198;dst[i+2]=209;
   dst[i+3]=Math.round(mask[v*MASK_WIDTH+u]*visibility);
  }
 }
 ctx.putImageData(out,0,0);
 // Cancel the existing sky translation so the image covers the viewport.
 c.drawImage(cv,-panX,-panY,width,height);
}
function paintPolarContours(c,levels,opts,visibility,shade,outline){
 if(shade)paintPolarMask(c,opts,visibility);
 if(!outline)return;
 const {date,lat,lon,width,height,zoom,heading,precession}=opts;
 const R=(Math.min(width-35,height-20)/2-14)*zoom;
 const proj=geoAzimuthalEquidistant().rotate([0,-90]).clipAngle(90)
  .scale(R/(Math.PI/2)).translate([width/2,height/2]).precision(.2);
 const path=geoPath(proj,c);
 for(let k=0;k<levels.length;k++)for(const polygon of (levels[k].polygons||[])){
  const rings=polygon.filter(r=>r.length>2).map(ring=>ring.map(([ra,dec])=>{
   const h=toAltAz(ra,dec,date,lat,lon,precession);
   return [wrap(180-h.az+heading+180,360)-180,h.alt];
  }));
  if(!rings.length)continue;
  c.beginPath();path({type:'Polygon',coordinates:rings});
  c.strokeStyle='rgba(192,204,222,'+((.14+.035*k)*visibility)+')';
  c.lineWidth=k===0?1:.7;c.stroke();
 }
}
export function drawMilkyWay(c,opts){
 const {date,lat,lon,width,height,mode='polar',zoom=1,heading=0,
  precession=true,showBelowHorizon=true,showShade=false,showOutline=false,
  debugMaskMode='planar',panX=0,panY=0,
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
   paintRectContours(c,levels,{date,lat,lon,width,height,heading,precession,debugMaskMode},
    visibility,showShade,showOutline);
  }else{
   paintPolarContours(c,levels,{date,lat,lon,width,height,zoom,heading,precession,debugMaskMode,panX,panY},
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
