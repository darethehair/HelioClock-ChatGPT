import {renderAlmanac} from './almanac.js';
import {drawEcliptic} from './ecliptic.js';
import {drawMilkyWay,milkyWayStatus,milkyWayDebugStatus,milkyWaySample} from './milky-way.js';
import {rectGeometry,projectRect,rectHorizonY,paintRectAtmosphere} from './sky-projection.js';
import {drawSkyAtlas,skyAtlasStatus} from './sky-atlas.js';
import {drawSkyDSOs} from './sky-dso.js';
import {drawConstellationNames} from './sky-constellation-labels.js';
import {renderMoon} from './moon-renderer.js';
import {drawSolarYear} from './solar-chart.js';
import {drawSkyGrid} from './sky-grid.js';
import {skyPlanets} from './sky-planets.js';
import {renderEarth,earthTextureStatus} from './earth-renderer.js';
import {starsAbove} from './sky-catalog.js';
import {RAD,PI,wrap,clamp,solar,sunHorizontal,sunEvents,moon,orbitPositions,sidereal,equatorialFromHorizontal,utcTime,durationText} from './astronomy.js';
const $=id=>document.getElementById(id);
const state={lat:49.19,lon:-98.10,date:new Date(),live:true,skyZoom:1,skyPanX:0,skyPanY:0,skyHeading:0,earthZoom:1,earthLon:-98.10,earthLat:49.19,earthProjection:'equal',earthTextureQuality:'2k',orreryZoom:1,moonZoom:1,discView:'moon',sunZoom:1,moonPanX:0,moonPanY:0,sunPanX:0,sunPanY:0,orbitMode:'inner',skyLight:'daylight',skyProjection:'polar',magLimit:3.5,stellarColors:true,usePrecession:true,playing:false};
const fmt=d=>d.toISOString().slice(0,10);
function setDateInputs(){$('observe-date').value=fmt(state.date);$('observe-time').value=utcTime(state.date)}
function selectDate(){
 const d=$('observe-date').value,t=$('observe-time').value||'12:00';
 if(!d)return;
 const next=new Date(d+'T'+t+':00Z');
 if(!Number.isFinite(next.getTime()))return;
 pausePlayback();state.date=next;state.live=false;render();
}
function notice(msg){$('message').hidden=!msg;$('message').textContent=msg||''}
function canvas(el){
 const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(!w||!h)return null;
 el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);
 const c=el.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);return{c,w,h};
}
function line(c,x,y,X,Y,color='#344661',width=1){
 c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();
}
function label(c,s,x,y,color='#90a4c0',size=11,align='left'){
 c.save();
 const glyphScale=c.__skyGlyphScale||1;
 if(glyphScale!==1){c.translate(x,y);c.scale(glyphScale,glyphScale)}
 c.font=size+'px sans-serif';c.fillStyle=color;c.textAlign=align;
 c.fillText(s,glyphScale===1?x:0,glyphScale===1?y:0);c.restore();
}
function dot(c,x,y,r,color,glow=0){
 c.save();const glyphScale=c.__skyGlyphScale||1;
 // Retain literal arc centre coordinates for the ordinary polar/orrery
 // canvases. Only rectangular sky uses a local compensating scale.
 if(glyphScale!==1){c.translate(x,y);c.scale(glyphScale,glyphScale)}
 c.fillStyle=color;if(glow){c.shadowBlur=glow;c.shadowColor=color}
 c.beginPath();c.arc(glyphScale===1?x:0,glyphScale===1?y:0,r,0,2*PI);c.fill();c.restore();
}
function daylightChart(){
 const year=state.date.getUTCFullYear();
 drawSolarYear($('daylight-chart'),{
  year,lat:state.lat,lon:state.lon,selectedDate:state.date,
  onSelect:date=>{
   pausePlayback();state.date=date;state.live=false;setDateInputs();render();
  }
 });
 $('chart-year').textContent=String(year);
}
function worldMap(){
 const o=canvas($('earth-map'));if(!o)return;
 const twilight={
  civil:$('earth-twilight-civil').checked,
  nautical:$('earth-twilight-nautical').checked,
  astronomical:$('earth-twilight-astronomical').checked,
  night:$('earth-twilight-night').checked
 };
 const result=renderEarth(o.c,o.w,o.h,state.date,{...state,earthTwilight:twilight});
 const highStatus=earthTextureStatus(state.earthTextureQuality);
 $('earth-texture-status').textContent=state.earthTextureQuality==='4k'
  ?highStatus.status==='ready'?'4K image · 4096 × 2048 · offline':
    highStatus.status==='failed'?'4K unavailable · using 2K fallback':'Loading 4K · showing 2K temporarily'
  :highStatus.status==='ready'?'2K image · 2048 × 1024 · offline':
    highStatus.status==='failed'?'2K image unavailable':'Loading 2K image…';
 $('earth-map').dataset.projectionProbe=JSON.stringify(result.projectionProbe);
 $('earth-zoom-value').textContent=state.earthZoom.toFixed(1)+'×';
 $('subsolar').textContent=Math.abs(result.sunDecl).toFixed(1)+'°'+(result.sunDecl>=0?'N':'S')+' / '+Math.abs(result.sunLon).toFixed(1)+'°'+(result.sunLon>=0?'E':'W');
 $('subsolar').title='Solar nadir (antipode): '+Math.abs(result.nadirLat).toFixed(1)+'°'+(result.nadirLat>=0?'N':'S')+' / '+Math.abs(result.nadirLon).toFixed(1)+'°'+(result.nadirLon>=0?'E':'W');
}
function skyColor(altitude){
 // Approximate visual daytime/twilight colours, using solar elevation.
 const stops=[
  [-90,[0,0,0]],[-18,[0,0,0]],[-12,[6,9,24]],
  [-6,[16,33,65]],[-1,[61,91,136]],[3,[91,155,199]],
  [15,[78,169,220]],[50,[53,151,220]],[90,[40,139,213]]
 ];
 let i=1;while(i<stops.length-1&&altitude>stops[i][0])i++;
 const [a,A]=stops[i-1],[b,B]=stops[i];
 const t=clamp((altitude-a)/(b-a),0,1);
 return A.map((v,j)=>Math.round(v*(1-t)+B[j]*t));
}
function fillSkyBackground(c,w,h,altitude){
 if(state.skyLight==='black'){
  c.fillStyle='#000000';c.fillRect(0,0,w,h);return;
 }
 const base=skyColor(altitude);
 // Small vertical horizon glow makes sunrise/sunset distinguishable from noon.
 const gradient=c.createLinearGradient(0,0,0,h);
 const upper=base.map(v=>Math.round(v*.69));
 const lower=base.map((v,i)=>Math.min(255,Math.round(v+(altitude>-10&&altitude<8?[41,21,8][i]*(1-Math.abs(altitude+1)/11):0))));
 gradient.addColorStop(0,'rgb('+upper.join(',')+')');
 gradient.addColorStop(1,'rgb('+lower.join(',')+')');
 c.fillStyle=gradient;c.fillRect(0,0,w,h);
}
function sky(){
 const o=canvas($('sky'));if(!o)return;const{c,w,h}=o;
 const X=w/2,Y=h/2,rad=(Math.min(w-35,h-20)/2-14)*state.skyZoom;
 const skySun=sunHorizontal(state.date,state.lat,state.lon);
 // Rectangular zoom uses one canvas transform shared by the atmosphere,
 // galactic mask, stars, ecliptic, planets, coordinate grids and labels.
 // Scaling the entire chart keeps these layers in exact alignment.
 const rectSky=state.skyProjection==='rect';
 // Keep marker radii and lettering in screen pixels when rectangular
 // celestial coordinates are magnified.
 c.__skyGlyphScale=rectSky?1/state.skyZoom:1;
 c.save();
 if(rectSky){
  c.fillStyle='#000';c.fillRect(0,0,w,h);
  c.beginPath();c.rect(0,0,w,h);c.clip();
  c.translate(w/2+state.skyPanX,h/2+state.skyPanY);
  c.scale(state.skyZoom,state.skyZoom);
  c.translate(-w/2,-h/2);
  paintRectAtmosphere(c,w,h,skySun,{black:state.skyLight==='black',heading:state.skyHeading});
 }else fillSkyBackground(c,w,h,skySun.alt);
 $('sky-light-status').textContent=state.skyLight==='black'?'Pure black background':(skySun.alt>=0?'Daylight':skySun.alt>=-6?'Civil twilight':skySun.alt>=-12?'Nautical twilight':skySun.alt>=-18?'Astronomical twilight':'Night')+' · Sun '+skySun.alt.toFixed(1)+'°';
 c.save();
 // The background remains fixed; all polar sky geometry, stars, ecliptic,
 // Milky Way and annotations share this one translated coordinate frame.
 if(state.skyProjection==='polar'){
  c.translate(state.skyPanX,state.skyPanY);
  // Test probe reads the actual applied sky transform, not subsequent
  // translations used to draw individual text and star markers.
  if(window.__helioclockCaptureZoom){
   const transform=c.getTransform(),scale=$('sky').width/w;
   window.__skyTranslate=[transform.e/scale,transform.f/scale];
  }
 }
 if(state.skyProjection==='polar'){
  c.strokeStyle='#395270';c.lineWidth=1.3;c.beginPath();c.arc(X,Y,rad,0,2*PI);c.stroke();
 if($('show-altaz-grid').checked)for(let a=0;a<360;a+=10){
  const p=(a-90-state.skyHeading)*RAD;line(c,X+Math.cos(p)*(rad-5),Y+Math.sin(p)*(rad-5),X+Math.cos(p)*rad,Y+Math.sin(p)*rad,'#59708e',a%30?0.6:1.3);
 }
 // All internal rings and azimuth spokes are drawn by drawSkyGrid after
 // the Milky Way. Do not overlay the old dark 45° spokes on the new grid.
 [['N',0],['E',90],['S',180],['W',270]].forEach(([t,a])=>{
  const p=(a-90-state.skyHeading)*RAD;label(c,t,X+Math.cos(p)*(rad+11),Y+Math.sin(p)*(rad+11)+4,'#c7d7ea',11,'center');
 });
 } else {
  const g=rectGeometry(w,h),L=g.left,R=g.right,T=g.top,B=g.bottom;
  const horizon=rectHorizonY(w,h);
  c.strokeStyle='#d6e8fa66';c.strokeRect(L,T,R-L,B-T);
  // Labels are retained from the original compass. The actual altitude
  // and azimuth lines are drawn once by drawSkyGrid, *after* the Milky Way
  // background, with one consistent 30°-at-1× spacing system.
  if($('show-altaz-grid').checked)for(let alt=-90;alt<=90;alt+=15){
   const y=projectRect(0,alt,w,h,state.skyHeading)[1];
   label(c,(alt>0?'+':'')+alt+'°',L-4,y+3,'#d0e6fa',10,'right');
  }
  if($('show-altaz-grid').checked)for(let az=0;az<=360;az+=30){
   const x=L+az/360*(R-L);
   const actual=wrap(az+state.skyHeading,360),name=actual===0?'N':actual===90?'E':actual===180?'S':actual===270?'W':Math.round(actual)+'°';
   label(c,name,x,B+14,'#d0e6fa',10,'center');
  }
 }
 const sun=sunHorizontal(state.date,state.lat,state.lon),m=moon(state.date,state.lat,state.lon);
 const place=(obj,col,name)=>{
  if(obj.alt<0&&(state.skyProjection!=='rect'||!$('show-below-horizon').checked))return;
  let x,y;
  if(state.skyProjection==='rect'){
   [x,y]=projectRect(obj.az,obj.alt,w,h,state.skyHeading);
  }else{
   const distance=rad*(1-obj.alt/90),angle=(obj.az-90-state.skyHeading)*RAD;
   x=X+distance*Math.cos(angle);y=Y+distance*Math.sin(angle);
  }
  dot(c,x,y,name==='Sun'?8:6,col,15);
  label(c,name,x+11,y-8,col,11);
 };
 if($('show-sky-paths').checked){
  for(const [body,color] of [['sun','#ffc56a'],['moon','#c7d6ef']]){
   c.save();c.beginPath();c.strokeStyle=color+'88';c.lineWidth=1.2;c.setLineDash([4,5]);let first=true,lastX=0;
   for(let hour=-12;hour<=12;hour+=.25){
    const time=new Date(state.date.getTime()+hour*3600000);
    const obj=body==='sun'?sunHorizontal(time,state.lat,state.lon):moon(time,state.lat,state.lon);
    if(obj.alt<0&&(state.skyProjection!=='rect'||!$('show-below-horizon').checked)){first=true;continue}
    let xx,yy;
    if(state.skyProjection==='rect'){
     [xx,yy]=projectRect(obj.az,obj.alt,w,h,state.skyHeading);
    }else{
     const theta=(obj.az-90-state.skyHeading)*RAD,r=rad*(1-obj.alt/90);
     xx=X+r*Math.cos(theta);yy=Y+r*Math.sin(theta);
    }
    if(!first&&state.skyProjection==='rect'&&Math.abs(xx-lastX)>w*.42)first=true;
    if(first){c.moveTo(xx,yy);first=false}else c.lineTo(xx,yy);
    lastX=xx;
   }
   c.stroke();c.restore();
  }
 }
 if($('show-ecliptic').checked)drawEcliptic(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,heading:state.skyHeading,zoom:state.skyZoom,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked
 });
 drawMilkyWay(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY,
  precession:state.usePrecession,skyLight:state.skyLight,sunAltitude:skySun.alt,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked,
  showShade:$('show-milkyway-shade').checked,
  showOutline:$('show-milkyway-outline').checked,
  showCenter:$('show-galactic-center').checked,
  debugMaskMode:'planar'
 });
 // Draw grid lines above the Milky Way background so every meridian
 // remains visible. Stars, Sun, Moon and planets are drawn above the grid.
 const gridResult=drawSkyGrid(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY,skyLight:state.skyLight,
  showAltAz:$('show-altaz-grid').checked,showRaDec:$('show-radec-grid').checked,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked
 });
 $('sky').dataset.gridInfo=JSON.stringify(gridResult);
 const milky=milkyWayStatus();
 $('milkyway-status').textContent=milky.failed?'Milky Way outlines unavailable':milky.ready?'Milky Way contours loaded':'Milky Way contours loading';
 const mwStats=milkyWayDebugStatus('planar');
 $('mw-debug-status').textContent=mwStats.status==='ready'?
  'Mask '+mwStats.mode+' · '+mwStats.filledPercent+'% equatorial pixels · '+mwStats.sourcePolygons+' polygons · '+(mwStats.seamClosures||0)+' seam closures · footprint ±'+mwStats.footprintLimitDeg+'°':
  'Mask '+mwStats.mode+': '+mwStats.status;
 const plotted=drawSkyAtlas(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY,
  magLimit:state.magLimit,showStars:$('show-stars').checked,
  showLabels:$('show-labels').checked,
  showConstellations:$('show-constellations').checked,
  precession:state.usePrecession,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked,
  stellarColors:state.stellarColors,
  brightSky:state.skyLight==='daylight' && skySun.alt>=-6
 });
 const constellationNames=drawConstellationNames(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY,precession:state.usePrecession,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked,
  enabled:$('show-constellation-names').checked
 });
 $('sky').dataset.constellationNames=JSON.stringify(constellationNames);
 const dso=drawSkyDSOs(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY,precession:state.usePrecession,
  showBelowHorizon:state.skyProjection==='rect'&&$('show-below-horizon').checked,
  showGalaxies:$('show-dso-galaxies').checked,
  showNebulae:$('show-dso-nebulae').checked,
  showClusters:$('show-dso-clusters').checked,
  showLabels:$('show-dso-labels').checked
 });
 $('sky').dataset.dsoInfo=JSON.stringify(dso);
 const status=skyAtlasStatus();
 $('sky-atlas-count').textContent=(status.ready?plotted||0:'Loading')+' stars'+(status.ready?' visible':' · catalog loading');
 $('precession-status').textContent=state.usePrecession?'Precession on · mean equinox of date':'Precession off · fixed J2000 coordinates';
 if(skyCursorPosition)updateSkyCursor(...skyCursorPosition);
 const fmtRA=degrees=>{
  const hrs=wrap(degrees,360)/15,h=Math.floor(hrs),minutes=Math.floor((hrs-h)*60);
  return String(h).padStart(2,'0')+'h '+String(minutes).padStart(2,'0')+'m';
 };
 const fmtDec=d=>(d>=0?'+':'')+d.toFixed(2)+'°';
 const coords=(name,obj)=>
  name+': Alt '+obj.alt.toFixed(2)+'° · Az '+obj.az.toFixed(2)+'° · RA '+fmtRA(obj.ra)+' · Dec '+fmtDec(obj.decl)+
  (obj.alt>=0?' · above horizon':' · below horizon');
 $('celestial-readout').textContent=coords('Sun',sun)+' | '+coords('Moon',m)+' · '+Math.round(m.distanceKm).toLocaleString('en-CA')+' km · '+Math.round(m.illuminated*100)+'% illuminated';
 place(sun,'#ffca7d','Sun');place(m,'#e1ebff','Moon');
 const bodies=$('show-planets').checked?skyPlanets(state.date,state.lat,state.lon):[];
 const plottedPlanets=[];
 for(const planet of bodies){
  if(planet.alt<0&&(state.skyProjection!=='rect'||!$('show-below-horizon').checked))continue;
  const [x,y]=state.skyProjection==='rect'
   ?projectRect(planet.az,planet.alt,w,h,state.skyHeading)
   :[X+rad*(1-planet.alt/90)*Math.cos((planet.az-90-state.skyHeading)*RAD),
     Y+rad*(1-planet.alt/90)*Math.sin((planet.az-90-state.skyHeading)*RAD)];
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  dot(c,x,y,planet.radius,planet.color,5);
  if($('show-labels').checked)label(c,planet.name,x+7,y-6,planet.color,10);
  plottedPlanets.push({...planet,x,y});
 }
 $('sky').dataset.planets=JSON.stringify(plottedPlanets);
 c.restore();
 c.restore();
 c.__skyGlyphScale=1; // rectangular viewport scaling (identity in polar mode)
}
/**
 * Read inverse coordinates from the actual rendered canvas geometry.
 * Polar mode reverses user pan/zoom/rotation; rectangular mode uses the
 * displayed azimuth seam and its full -90°..+90° altitude span.
 */
function skyCursorCoordinates(x,y,width,height,opts={}){
 const {mode='polar',zoom=1,heading=0,panX=0,panY=0}=opts;
 let az,alt;
 if(mode==='polar'){
  const radius=(Math.min(width-35,height-20)/2-14)*zoom;
  if(radius<=0)return null;
  const dx=x-width/2-panX,dy=y-height/2-panY;
  const r=Math.hypot(dx,dy);
  if(r>radius)return null;
  alt=90*(1-r/radius);
  az=wrap(Math.atan2(dy,dx)/RAD+90+heading);
 }else{
  const g=rectGeometry(width,height),span=g.right-g.left;
  // Undo the same canvas transform used for rendering every sky layer.
  const baseX=width/2+(x-width/2-panX)/zoom;
  const baseY=height/2+(y-height/2-panY)/zoom;
  if(baseX<g.left||baseX>g.right||baseY<g.top||baseY>g.bottom)return null;
  az=wrap((baseX-g.left)/span*360+heading);
  alt=90-(baseY-g.top)/(g.bottom-g.top)*180;
 }
 const eq=equatorialFromHorizontal(az,alt,state.date,state.lat,state.lon);
 const hours=eq.ra/15,h=Math.floor(hours),mins=(hours-h)*60;
 return {az,alt,ra:eq.ra,dec:eq.decl,
  raText:String(h).padStart(2,'0')+'h '+mins.toFixed(2).padStart(5,'0')+'m'};
}
function updateSkyCursor(x,y){
 const canvas=$('sky'),out=$('sky-cursor-readout');
 const coords=skyCursorCoordinates(x,y,canvas.clientWidth,canvas.clientHeight,{
  mode:state.skyProjection,zoom:state.skyZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY
 });
 if(!coords){out.textContent='Cursor: outside plotted sky';return}
 // Cursor diagnostics must sample the same corrected mask as the renderer.
 const sample=milkyWaySample(coords.ra,coords.dec,state.date,state.usePrecession,'planar');
 const diagnostic=sample.ready?
  ' · Galactic lat '+(sample.galacticLatitude>=0?'+':'')+sample.galacticLatitude.toFixed(2)+'°'+
  ' · MW mask '+sample.intensity+'/255 ('+sample.alphaPercent.toFixed(1)+'%)'+
  ' · '+sample.mode:
  ' · MW mask loading';
 out.textContent='Cursor: RA '+coords.raText+' · Dec '+(coords.dec>=0?'+':'')+
  coords.dec.toFixed(2)+'° · Az '+coords.az.toFixed(2)+'° · Alt '+coords.alt.toFixed(2)+'°'+diagnostic;
}
let skyCursorPosition=null;
$('sky').addEventListener('pointermove',e=>{
 const bounds=$('sky').getBoundingClientRect();
 skyCursorPosition=[e.clientX-bounds.left,e.clientY-bounds.top];
 updateSkyCursor(...skyCursorPosition);
});
$('sky').addEventListener('pointerleave',()=>{
 skyCursorPosition=null;$('sky-cursor-readout').textContent='Move your pointer over the sky to read RA, Dec, azimuth and altitude';
});
function drawMoon(){
 if(state.discView==='sun'){
  updateDiscViewport();
  return;
 }
 const info=renderMoon($('moon'),state.date,state.lat,state.lon,1,{showEarthshine:$('show-earthshine').checked});
 const m=moon(state.date,state.lat,state.lon);
 $('moon-zoom-value').textContent=state.moonZoom.toFixed(1)+'×';
 $('moon-progress-fill').style.width=(m.phase*100).toFixed(1)+'%';
 if(info){
  $('moon-tilt').textContent='Bright limb from zenith: '+(info.fromZenith>0?'+':'')+info.fromZenith.toFixed(1)+'°';
  $('moon-source').textContent=(info.photoLoaded?'NASA LRO near-side mosaic · horizon-aligned':'Loading lunar photography…')+
   ($('show-earthshine').checked?' · Earthshine visualization':' · natural dark side');
 }
 updateDiscViewport();
}
function orrery(){
 const o=canvas($('orrery'));if(!o)return;
 const {c,w,h}=o,X=w/2,Y=h/2,outer=state.orbitMode==='outer';
 // The background is permanently black: solar daylight cannot illuminate space.
 c.fillStyle='#000000';c.fillRect(0,0,w,h);
 const all=orbitPositions(state.date),planets=outer?all:all.slice(0,4);
 const maximum=outer?30.07:1.524;
 const scale=Math.min(w*.44,h*.43)/maximum*state.orreryZoom;
 // Faint orbital trajectories remain visible independently of AU guide rings.
 planets.forEach(p=>{
  const r=p.radius*scale;
  c.beginPath();c.arc(X,Y,r,0,2*PI);
  c.strokeStyle='#40526b70';c.lineWidth=.8;c.stroke();
 });
 if($('show-au-rings').checked){
  const values=outer?[5,10,15,20,25,30]:[.25,.5,.75,1,1.25,1.5];
  c.save();
  c.setLineDash([3,5]);c.lineWidth=.8;
  for(const au of values){
   const radius=au*scale;
   if(radius<8||radius>Math.max(w,h))continue;
   c.beginPath();c.arc(X,Y,radius,0,2*PI);
   c.strokeStyle='#72bddd77';c.stroke();
   // Labels sit at 315° instead of on the planetary orbital path at the right.
   const xx=X+Math.cos(-Math.PI/4)*radius,yy=Y+Math.sin(-Math.PI/4)*radius;
   if(xx>10&&xx<w-22&&yy>12&&yy<h-10){
    c.setLineDash([]);
    c.font='10px sans-serif';
    c.textAlign='left';
    c.fillStyle='#aeddf4';
    c.fillText((Number.isInteger(au)?au:au.toFixed(2).replace(/0$/,''))+' AU',xx+4,yy-4);
    c.setLineDash([3,5]);
   }
  }
  c.restore();
 }
 // No decorative fake stars in the orrery: an uncluttered black backdrop.
 dot(c,X,Y,outer?5:12,'#ffcd7d',18);
 planets.forEach(p=>{
  // Seen from north of the ecliptic, orbital longitude increases counterclockwise.
// Longitude zero remains at the top; 90 degrees projects left, not right.
// Screen Y points downward, so use (-sin(longitude), -cos(longitude)).
  const a=p.angle*RAD,x=X-p.radius*scale*Math.sin(a),y=Y-p.radius*scale*Math.cos(a);
  dot(c,x,y,outer?Math.max(2.6,p.r*.75):p.r,p.color,9);
  if(outer||p.radius*scale>20)label(c,p.name,x+8,y-7,p.color,10);
 });
 $('planet-legend').innerHTML=planets.map(p=>'<span style="color:'+p.color+'">● '+p.name+'</span>').join('');
 $('au-scale-description').textContent=outer?'Outer view · 5 AU intervals':'Inner view · 0.25 AU intervals';
}
function formatCoord(n,positive,negative){return Math.abs(n).toFixed(2)+'° '+(n>=0?positive:negative)}
let almanacCurrent=null;
function render(){
 const s=sunHorizontal(state.date,state.lat,state.lon),m=moon(state.date,state.lat,state.lon);
 const ev=sunEvents(state.date,state.lat,state.lon);
 const tomorrow=new Date(Date.UTC(state.date.getUTCFullYear(),state.date.getUTCMonth(),state.date.getUTCDate()+1,12));
 const next=sunEvents(tomorrow,state.lat,state.lon);
 const delta=Math.round((next.duration-ev.duration)*60);
 const paused=$('live-indicator');paused.classList.toggle('paused',!state.live);paused.innerHTML=state.live?'<i></i> LIVE SKY':'<i></i> TIME TRAVEL';
 $('utc-clock').textContent=state.date.toISOString().slice(11,19)+' UTC';
 updateLocalDisplay();
 $('date-label').textContent=state.date.toLocaleDateString('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).toUpperCase();
 $('place-summary').textContent=formatCoord(state.lat,'N','S')+'  ·  '+formatCoord(state.lon,'E','W');
 $('sunrise').textContent=ev.polar?(ev.polar==='day'?'ALL DAY':'NO SUNRISE'):utcTime(ev.sunrise);
 $('sunset').textContent=ev.polar?(ev.polar==='day'?'ALL DAY':'NO SUNSET'):utcTime(ev.sunset);
 $('solar-noon').textContent=utcTime(ev.noon);
 $('daylength').textContent='DAYLIGHT '+durationText(ev.duration);
 const start=ev.sunrise?((ev.sunrise.getUTCHours()+ev.sunrise.getUTCMinutes()/60)/24*100):0;
 const end=ev.sunset?((ev.sunset.getUTCHours()+ev.sunset.getUTCMinutes()/60)/24*100):ev.polar==='day'?100:0;
 $('dayline').style.setProperty('--start',start+'%');
 $('dayline').style.setProperty('--end',(100-end)+'%');
 $('dayline-now').style.left=((state.date.getUTCHours()+state.date.getUTCMinutes()/60)/24*100)+'%';
 $('solar-alt').textContent=s.alt.toFixed(1)+'°';
 $('azimuth').textContent=s.az.toFixed(1)+'°';
 $('eot').textContent=(s.eq>=0?'+':'')+s.eq.toFixed(2)+' min';
 $('earth-distance').textContent=s.distance.toFixed(6)+' AU';
 $('moon-illumination').textContent=(m.illuminated*100).toFixed(1)+'%';
 $('moon-age').textContent=m.age.toFixed(1)+' days';
 $('moon-phase').textContent=m.name+' · '+(m.illuminated*100).toFixed(1)+'% illuminated';
 $('declination').textContent=s.decl.toFixed(2)+'°';
 $('sun-status').textContent=s.alt>=0?'Above horizon':s.alt>=-6?'Civil twilight':s.alt>=-12?'Nautical twilight':s.alt>=-18?'Astronomical twilight':'Below horizon';
 $('moon-alt').textContent=m.alt.toFixed(1)+'°';$('moon-az').textContent=m.az.toFixed(1)+'°';
 $('daylight-delta').textContent=(delta>0?'+':'')+delta+' min';
 $('observer').textContent=formatCoord(state.lat,'N','S')+' / '+formatCoord(state.lon,'E','W');
 $('time-scrubber').value=String(state.date.getUTCHours()*60+state.date.getUTCMinutes());
 $('scrub-readout').textContent=utcTime(state.date)+' UTC';
 const hSid=sidereal(state.date,state.lon)/15;
 const sidTime=String(Math.floor(hSid)).padStart(2,'0')+':'+String(Math.floor(hSid%1*60)).padStart(2,'0')+':'+String(Math.floor(hSid*3600%60)).padStart(2,'0');
 $('sidereal-time').textContent=sidTime+' LMST';
 $('dock-sidereal').textContent=sidTime;
 if(!document.querySelector('.chart-panel').hidden)daylightChart();
 if(!document.querySelector('.earth-panel').hidden)worldMap();
 if(!document.querySelector('.sky-panel').hidden)sky();
 if(!document.querySelector('.moon-panel').hidden)drawMoon();
 if(!document.querySelector('.orrery-panel').hidden)orrery();
 if(!document.querySelector('.almanac-panel').hidden){
  almanacCurrent=renderAlmanac($('almanac-content'),state.date,state.lat,state.lon);
 }
}
function browserZone(){
 return Intl.DateTimeFormat().resolvedOptions().timeZone||'Device local time';
}
function localParts(date){
 const pad=n=>String(n).padStart(2,'0');
 return {date:date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()),
  time:pad(date.getHours())+':'+pad(date.getMinutes())};
}
function localLabel(date){
 const zone=browserZone();
 const time=new Intl.DateTimeFormat('en-CA',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone}).format(date);
 const tz=new Intl.DateTimeFormat('en-CA',{timeZone:zone,timeZoneName:'short'}).formatToParts(date).find(x=>x.type==='timeZoneName')?.value||zone;
 const offset=-date.getTimezoneOffset(),sign=offset>=0?'+':'−',pad=n=>String(n).padStart(2,'0');
 const offsetStr='UTC'+sign+pad(Math.floor(Math.abs(offset)/60))+':'+pad(Math.abs(offset)%60);
 return {time,tz,zone,offsetStr};
}
function updateLocalDisplay(){
 const v=localLabel(state.date),p=localParts(state.date);
 $('local-clock').textContent=v.time+' '+v.tz;
 $('dock-local-time').textContent=v.time;
 $('dock-time-zone').textContent=v.zone+' · '+v.offsetStr;
 $('dock-date').value=p.date;$('dock-time').value=p.time;
 $('dock-scrubber').value=state.date.getHours()*60+state.date.getMinutes();
 $('dock-play').textContent=state.playing?'Ⅱ':'▶';
 $('dock-live').classList.toggle('is-live',state.live);
}
function selectDockLocal(){
 const date=$('dock-date').value,time=$('dock-time').value;
 if(!date||!time)return;
 const next=new Date(date+'T'+time+':00');
 if(!Number.isFinite(next.getTime()))return;
 pausePlayback();state.date=next;state.live=false;setDateInputs();render();
}
function updateCoords(){
 const lat=Number($('latitude').value),lon=Number($('longitude').value);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180){notice('Enter latitude between −90° and +90°, and longitude between −180° and +180°.');return}
 state.lat=lat;state.lon=lon;state.earthLon=lon;state.earthLat=lat;notice('');render();
}
$('latitude').addEventListener('change',updateCoords);$('longitude').addEventListener('change',updateCoords);
$('observe-date').addEventListener('change',selectDate);
$('observe-time').addEventListener('change',selectDate);
$('now').addEventListener('click',()=>{pausePlayback();state.date=new Date();state.live=true;setDateInputs();render()});
$('locate').addEventListener('click',()=>{
 if(!navigator.geolocation){notice('Geolocation is unavailable in this browser. Enter coordinates manually.');return}
 notice('Requesting your location...');
 navigator.geolocation.getCurrentPosition(position=>{
  state.lat=position.coords.latitude;state.lon=position.coords.longitude;
  state.earthLon=state.lon;state.earthLat=state.lat;
  $('latitude').value=state.lat.toFixed(4);$('longitude').value=state.lon.toFixed(4);
  notice('');render();persistPrefs();
 },error=>notice('Unable to determine location: '+error.message+'. You can enter coordinates manually.'),{enableHighAccuracy:false,timeout:12000});
});
function shiftTime(minutes){
 state.date=new Date(state.date.getTime()+minutes*60000);state.live=false;setDateInputs();render();
}
function pausePlayback(){state.playing=false;$('play-time').textContent='▶ Play'}
for(const [id,minutes] of [['step-back-day',-1440],['step-back-hour',-60],['step-forward-hour',60],['step-forward-day',1440]]){
 $(id).addEventListener('click',()=>{pausePlayback();shiftTime(minutes)});
}
$('time-scrubber').addEventListener('input',e=>{
 pausePlayback();
 const minutes=Number(e.target.value);
 state.date=new Date(Date.UTC(state.date.getUTCFullYear(),state.date.getUTCMonth(),state.date.getUTCDate(),Math.floor(minutes/60),minutes%60));
 state.live=false;setDateInputs();render();
});
$('play-time').addEventListener('click',()=>{
 state.playing=!state.playing;state.live=false;setDateInputs();
 $('play-time').textContent=state.playing?'Ⅱ Pause':'▶ Play';render();
});
setInterval(()=>{if(state.playing)shiftTime(15)},180);
function viewRange(id,key){$(id).addEventListener('input',e=>{state[key]=Number(e.target.value);render()})}
viewRange('sky-heading','skyHeading');
// Slider zoom is centred; wheel zoom targets the pointer position.
$('sky-zoom').addEventListener('input',e=>setPolarSkyZoom(Number(e.target.value)));
$('sky-zoom-out').addEventListener('click',()=>setPolarSkyZoom(Math.round(clamp(state.skyZoom/1.25,1,3)*100)/100));
$('sky-zoom-in').addEventListener('click',()=>setPolarSkyZoom(Math.round(clamp(state.skyZoom*1.25,1,3)*100)/100));
viewRange('earth-zoom','earthZoom');viewRange('orrery-zoom','orreryZoom');
// Shared disc viewer handles the Moon slider and pan/zoom interaction.
$('show-au-rings').addEventListener('change',render);
for(const button of document.querySelectorAll('[data-orbit-mode]')){
 button.addEventListener('click',()=>{
  state.orbitMode=button.dataset.orbitMode;
  for(const other of document.querySelectorAll('[data-orbit-mode]')){
   const selected=other===button;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));
  }
  state.orreryZoom=1;$('orrery-zoom').value=1;render();
 });
}
// Discs share pan/zoom controls, but preserve independent zoom and pan between views.
// A cursor-anchored zoom keeps the solar surface feature under the pointer stationary.
const discStage=$('disc-stage'),solarPhoto=$('solar-photo');
const solarSource='https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_HMIIC.jpg';
let discFocus=null,dragDisc=null,solarRequest=0;
function updateDiscViewport(){
 const sunMode=state.discView==='sun';
 const zoom=sunMode?state.sunZoom:state.moonZoom;
 const panX=sunMode?state.sunPanX:state.moonPanX,panY=sunMode?state.sunPanY:state.moonPanY;
 const el=sunMode?solarPhoto:$('moon');
 el.style.transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';
 $('moon-zoom-value').textContent=zoom.toFixed(1)+'×';
}
function zoomDisc(factor,focus=discFocus){
 const sunMode=state.discView==='sun',k=sunMode?'sunZoom':'moonZoom',px=sunMode?'sunPanX':'moonPanX',py=sunMode?'sunPanY':'moonPanY';
 const old=state[k],next=clamp(Math.round(old*factor*100)/100,1,sunMode?10:7);
 if(next===old)return;
 const box=discStage.getBoundingClientRect();
 const ax=focus?focus.x-box.left-box.width/2:0,ay=focus?focus.y-box.top-box.height/2:0;
 state[px]+=(1-next/old)*(ax-state[px]);
 state[py]+=(1-next/old)*(ay-state[py]);
 state[k]=next;
 // Image transforms preserve the surface under the cursor for both bodies.
 updateDiscViewport();
}
function resetDisc(){
 if(state.discView==='sun'){state.sunZoom=1;state.sunPanX=0;state.sunPanY=0}
 else{state.moonZoom=1;state.moonPanX=0;state.moonPanY=0;render()}
 updateDiscViewport();
}
function showDisc(which){
 if(which===state.discView)return;
 state.discView=which;
 const sun=which==='sun';
 $('moon').hidden=sun;solarPhoto.hidden=!sun;
 $('moon-bottom').hidden=sun;$('solar-note').hidden=!sun;
 $('solar-refresh').hidden=!sun;
 $('disc-kind').textContent=sun?'SOLAR OBSERVATION':'LUNAR CYCLE';
 $('moon-phase').hidden=sun;
 $('earthshine-setting').hidden=sun;
 $('moon-tilt').textContent=sun?'SDO/HMI continuum image':'Bright limb from zenith: —';
 $('moon-source').textContent=sun?'NASA Solar Dynamics Observatory · HMI':'NASA lunar mosaic';
 for(const button of document.querySelectorAll('[data-disc-view]')){
  const selected=button.dataset.discView===which;
  button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
 }
 if(sun&&solarRequest===0)refreshSolarImage();
 render();
}
function refreshSolarImage(){
 const stamp=Date.now();solarRequest++;
 $('solar-status').textContent='Loading latest NASA image…';
 solarPhoto.onload=()=>{
  // The actual capture time is printed on NASA's image; do not confuse
  // when a browser request finished with the astrophysical observation time.
  $('solar-status').textContent='NASA SDO · image loaded (observation time stamped on photo)';
 };
 solarPhoto.onerror=()=>{
  // A packaged offline reference is explicitly labelled as a fallback.
  if(!solarPhoto.src.endsWith('/solar-fallback.jpg')){
   $('solar-status').textContent='NASA offline reference image · not a current observation';
   solarPhoto.onload=null;solarPhoto.onerror=null;solarPhoto.src='./solar-fallback.jpg';
  }else $('solar-status').textContent='Solar image unavailable';
 };
 solarPhoto.src=solarSource+'?v='+stamp;
}
for(const button of document.querySelectorAll('[data-disc-view]'))
 button.addEventListener('click',()=>showDisc(button.dataset.discView));
$('moon-zoom').addEventListener('input',e=>{
 const val=Number(e.target.value),key=state.discView==='sun'?'sunZoom':'moonZoom';
 zoomDisc(val/state[key],null);
});
$('solar-refresh').addEventListener('click',refreshSolarImage);
$('moon-zoom-in').addEventListener('click',()=>zoomDisc(1.25));
$('moon-zoom-out').addEventListener('click',()=>zoomDisc(.8));
$('disc-reset').addEventListener('click',resetDisc);
$('moon-reset').addEventListener('click',()=>{state.moonZoom=1;state.moonPanX=state.moonPanY=0;$('moon-zoom').value=1;if(state.discView==='moon')render()});
// Two-finger pinch on both disc images. A second pointer suspends
// single-finger panning, and a new pan begins only on a fresh touch.
const discPointers=new Map();
let discPinchDistance=0;
function discTouchDistance(){
 const [p,q]=[...discPointers.values()];
 return Math.hypot(p.x-q.x,p.y-q.y);
}
function discTouchCentre(){
 const [p,q]=[...discPointers.values()];
 return {x:(p.x+q.x)/2,y:(p.y+q.y)/2};
}
discStage.addEventListener('pointermove',e=>{
 discFocus={x:e.clientX,y:e.clientY};
 const previous=discPointers.get(e.pointerId);
 if(!previous)return;
 discPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(discPointers.size===2){
  const d=discTouchDistance(),focus=discTouchCentre();
  if(discPinchDistance>0&&d>0)zoomDisc(d/discPinchDistance,focus);
  discPinchDistance=d;
  return;
 }
 if(!dragDisc||dragDisc.pointerId!==e.pointerId)return;
 const px=state.discView==='sun'?'sunPanX':'moonPanX',py=state.discView==='sun'?'sunPanY':'moonPanY';
 state[px]+=e.clientX-previous.x;state[py]+=e.clientY-previous.y;
 updateDiscViewport();
});
discStage.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 discPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(discPointers.size===1)dragDisc={pointerId:e.pointerId};
 else {dragDisc=null;if(discPointers.size===2)discPinchDistance=discTouchDistance()}
 discStage.setPointerCapture(e.pointerId);
});
function finishDiscPointer(e){
 discPointers.delete(e.pointerId);
 discPinchDistance=0;
 dragDisc=null;
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])
 discStage.addEventListener(name,finishDiscPointer);
discStage.addEventListener('pointerleave',()=>{discFocus=null});
discStage.addEventListener('wheel',e=>{
 e.preventDefault();zoomDisc(e.deltaY<0?1.2:1/1.2,{x:e.clientX,y:e.clientY});
},{passive:false});



function selectEarthProjection(next){
 state.earthProjection=next;
 for(const button of document.querySelectorAll('[data-projection]')){
  const active=button.dataset.projection===next;
  button.classList.toggle('is-active',active);
  button.setAttribute('aria-pressed',String(active));
 }
 render();
}
for(const button of document.querySelectorAll('[data-projection]')){
 button.addEventListener('click',()=>selectEarthProjection(button.dataset.projection));
}
function adjustEarthZoom(factor){
 state.earthZoom=clamp(Math.round(state.earthZoom*factor*10)/10,1,4);
 $('earth-zoom').value=state.earthZoom;
 render();
}
$('earth-zoom-in').addEventListener('click',()=>adjustEarthZoom(1.25));
$('earth-zoom-out').addEventListener('click',()=>adjustEarthZoom(.8));
$('earth-map-home').addEventListener('click',()=>{$('earth-reset').click()});
$('earth-texture-quality').addEventListener('change',e=>{
 state.earthTextureQuality=e.target.value==='4k'?'4k':'2k';
 render();
});
for(const id of ['earth-twilight-civil','earth-twilight-nautical','earth-twilight-astronomical','earth-twilight-night'])
 $(id).addEventListener('change',render);
window.addEventListener('helioclock-earth-texture-ready',render);
$('show-earthshine').addEventListener('change',render);
window.addEventListener('helioclock-moon-texture-ready',render);

for(const button of document.querySelectorAll('[data-sky-light]')){
 button.addEventListener('click',()=>{
  state.skyLight=button.dataset.skyLight;
  for(const other of document.querySelectorAll('[data-sky-light]')){
   const selected=other===button;
   other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));
  }
  render();
 });
}
for(const button of document.querySelectorAll('[data-sky-projection]')){
 button.addEventListener('click',()=>{
  state.skyProjection=button.dataset.skyProjection;
  $('below-horizon-setting').hidden=state.skyProjection!=='rect';
  for(const other of document.querySelectorAll('[data-sky-projection]')){
   const active=other===button;other.classList.toggle('selected',active);other.setAttribute('aria-pressed',String(active));
  }render();
 });
}
$('star-magnitude').addEventListener('change',e=>{
 state.magLimit=Number(e.target.value);
 // Magnitude and label visibility are independent controls. At high zoom
 // the atlas selects uncluttered faint labels automatically.
 render();
});
$('show-constellations').addEventListener('change',render);
for(const id of ['show-milkyway-shade','show-milkyway-outline','show-galactic-center'])$(id).addEventListener('change',render);
window.addEventListener('helioclock-milkyway-ready',render);
$('mw-copy-debug').addEventListener('click',async()=>{
 const chosen='planar';
 const debug={
  version:40,utc:state.date.toISOString(),
  local:state.date.toLocaleString('en-CA',{timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}),
  timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
  observer:{lat:state.lat,lon:state.lon},
  sky:{projection:state.skyProjection,light:state.skyLight,heading:state.skyHeading,
   zoom:state.skyZoom,panX:state.skyPanX,panY:state.skyPanY,
   precession:state.usePrecession,belowHorizon:$('show-below-horizon').checked,
   milkyShade:$('show-milkyway-shade').checked,milkyOutline:$('show-milkyway-outline').checked,
   galacticCenter:$('show-galactic-center').checked,stellarColors:state.stellarColors,
   magLimit:state.magLimit,stars:$('show-stars').checked,labels:$('show-labels').checked},
  milkyWay:{maskMode:chosen,mask:milkyWayDebugStatus(chosen),catalog:milkyWayStatus()},
  canvas:{width:$('sky').width,height:$('sky').height}
 };
 const value=JSON.stringify(debug,null,2);
 try{await navigator.clipboard.writeText(value);$('mw-debug-status').textContent='Debug state copied to clipboard';}
 catch{
  const field=document.createElement('textarea');field.value=value;field.style.cssText='position:absolute;left:-9999px';
  document.body.appendChild(field);field.select();const ok=document.execCommand('copy');field.remove();
  $('mw-debug-status').textContent=ok?'Debug state copied to clipboard':'Clipboard unavailable';
 }
});

$('use-precession').addEventListener('change',e=>{state.usePrecession=e.target.checked;render()});
$('show-stellar-colors').addEventListener('change',e=>{state.stellarColors=e.target.checked;render()});
window.addEventListener('helioclock-sky-atlas-ready',render);
const SIDEREAL_DAY_MS=86164090.5;
for(const [id,sign] of [['sky-prev-sidereal',-1],['sky-next-sidereal',1]]){
 $(id).addEventListener('click',()=>{
  pausePlayback();state.date=new Date(state.date.getTime()+sign*SIDEREAL_DAY_MS);
  state.live=false;setDateInputs();render();
 });
}
for(const id of ['show-stars','show-labels','show-sky-paths','show-below-horizon','show-ecliptic','show-planets','show-altaz-grid','show-radec-grid','show-dso-galaxies','show-dso-nebulae','show-dso-clusters','show-dso-labels','show-constellation-names'])$(id).addEventListener('change',render);
function reset(id,defaults){
 $(id).addEventListener('click',()=>{for(const [key,value] of Object.entries(defaults))state[key]=value;
 const controls={skyZoom:'sky-zoom',skyHeading:'sky-heading',earthZoom:'earth-zoom',orreryZoom:'orrery-zoom'};
 for(const [key,value] of Object.entries(defaults)){if(controls[key])$(controls[key]).value=value}
 render()});
}
reset('sky-reset',{skyZoom:1,skyPanX:0,skyPanY:0,skyHeading:0});
// Reset map orientation to the observer, not Greenwich/the equator.
$('earth-reset').addEventListener('click',()=>{
 state.earthZoom=1;state.earthLon=state.lon;state.earthLat=state.lat;
 $('earth-zoom').value=1;render();
});
reset('orrery-reset',{orreryZoom:1});
function wheelZoom(canvasId,controlId,key,lo,hi){
 $(canvasId).addEventListener('wheel',e=>{e.preventDefault();state[key]=clamp(state[key]*(e.deltaY>0?.88:1.14),lo,hi);$(controlId).value=state[key];render()},{passive:false});
}
// In polar azimuthal projection, changing zoom scales every point's
// displacement from the chart centre. Correct the pan to keep the chosen
// sky position stationary, including when the pointer isn't near zenith.
function setPolarSkyZoom(next,clientX=null,clientY=null){
 const canvas=$('sky'),rect=canvas.getBoundingClientRect();
 const old=state.skyZoom;
 next=clamp(next,1,3);
 if(next===old)return;
 const px=clientX===null?rect.width/2:clientX-rect.left;
 const py=clientY===null?rect.height/2:clientY-rect.top;
 if(state.skyProjection==='polar'||state.skyProjection==='rect'){
  const ratio=next/old;
  state.skyPanX+=(1-ratio)*(px-rect.width/2-state.skyPanX);
  state.skyPanY+=(1-ratio)*(py-rect.height/2-state.skyPanY);
  // Test-only readout: record the precise inputs and resulting pan without
  // modifying user-visible sky geometry or altering any event ordering.
  if(window.__helioclockCaptureZoom){
   window.__helioclockZoomTrace={old,next,ratio,px,py,
    rectWidth:rect.width,rectHeight:rect.height,
    canvasWidth:canvas.clientWidth,canvasHeight:canvas.clientHeight,
    panX:state.skyPanX,panY:state.skyPanY,
    scrollX:window.scrollX,scrollY:window.scrollY};
  }
  if(next===1){state.skyPanX=0;state.skyPanY=0}
  else if(state.skyProjection==='rect'){
   state.skyPanX=clamp(state.skyPanX,-rect.width*(next-1)/2,rect.width*(next-1)/2);
   state.skyPanY=clamp(state.skyPanY,-rect.height*(next-1)/2,rect.height*(next-1)/2);
  }
 }
 state.skyZoom=next;$('sky-zoom').value=String(next);
 render();
}
$('sky').addEventListener('wheel',e=>{
 e.preventDefault();
 setPolarSkyZoom(Math.round(clamp(state.skyZoom*(e.deltaY>0?.88:1.14),1,3)*100)/100,e.clientX,e.clientY);
},{passive:false});
wheelZoom('earth-map','earth-zoom','earthZoom',1,4);
wheelZoom('orrery','orrery-zoom','orreryZoom',.7,3);
// The shared Sun/Moon stage handles wheel zoom with cursor anchoring.
function dragCanvas(id,onMove){
 const el=$(id);let start=null;
 const pointers=new Map();let pinchDistance=0;
 el.style.cursor='grab';el.style.touchAction='none';
 const distance=()=>{const [p,q]=[...pointers.values()];return Math.hypot(p.x-q.x,p.y-q.y)};
 const midpoint=()=>{const [p,q]=[...pointers.values()];return {x:(p.x+q.x)/2,y:(p.y+q.y)/2}};
 el.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  start={x:e.clientX,y:e.clientY};
  if(['sky','earth-map','orrery'].includes(id)&&pointers.size===2)pinchDistance=distance();
  el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';
 });
 el.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const previous=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(['sky','earth-map','orrery'].includes(id)&&pointers.size===2){
   const d=distance(),center=midpoint();
   if(pinchDistance>0&&d>0&&Math.abs(d-pinchDistance)>.1){
    const ratio=d/pinchDistance;
    if(id==='sky')setPolarSkyZoom(state.skyZoom*ratio,center.x,center.y);
    else if(id==='earth-map'){
     state.earthZoom=clamp(Math.round(state.earthZoom*ratio*100)/100,1,4);
     $('earth-zoom').value=state.earthZoom;render();
    }else{
     state.orreryZoom=clamp(Math.round(state.orreryZoom*ratio*100)/100,.7,3);
     $('orrery-zoom').value=state.orreryZoom;render();
    }
   }
   pinchDistance=d;return;
  }
  if(pointers.size>1)return;
  const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  start={x:e.clientX,y:e.clientY};
  onMove(dx,dy,el,e);render();
 });
 const end=e=>{
  pointers.delete(e.pointerId);
  pinchDistance=0;start=null;
  el.style.cursor=pointers.size?'grabbing':'grab';
 };
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 el.addEventListener('lostpointercapture',end);
}
dragCanvas('sky',(dx,dy,el,e)=>{
 if(state.skyZoom>1&&!e.shiftKey){
  state.skyPanX+=dx;state.skyPanY+=dy;
  if(state.skyProjection==='rect'){
   state.skyPanX=clamp(state.skyPanX,-el.clientWidth*(state.skyZoom-1)/2,el.clientWidth*(state.skyZoom-1)/2);
   state.skyPanY=clamp(state.skyPanY,-el.clientHeight*(state.skyZoom-1)/2,el.clientHeight*(state.skyZoom-1)/2);
  }
 }else{
  // At normal zoom drag still rotates the compass. Shift+drag rotates when
  // zoomed in, and the rotation slider always remains available.
  state.skyHeading=clamp(state.skyHeading+dx*.8,-180,180);
  $('sky-heading').value=state.skyHeading;
 }
});
dragCanvas('orrery',()=>{});
dragCanvas('earth-map',(dx,dy,el)=>{
 state.earthLon=wrap(state.earthLon-dx/el.clientWidth*360/state.earthZoom+180,360)-180;
 const delta=dy/el.clientHeight*180/state.earthZoom;
 // Flat maps tilt relative to the observer's latitude (Reset is 0° tilt).
 // The globe retains its independent absolute latitude rotation bounds.
 state.earthLat=state.earthProjection==='globe'
  ?clamp(state.earthLat+delta,-75,75)
  :clamp(state.earthLat+delta,state.lat-75,state.lat+75);
});

for(const [id,minutes] of [['dock-prev-day',-1440],['dock-prev-hour',-60],['dock-next-hour',60],['dock-next-day',1440]]){
 $(id).addEventListener('click',()=>{pausePlayback();shiftTime(minutes)});
}
$('dock-date').addEventListener('change',selectDockLocal);
$('dock-time').addEventListener('change',selectDockLocal);
$('dock-scrubber').addEventListener('input',e=>{
 pausePlayback();const minutes=Number(e.target.value);
 const d=state.date;
 state.date=new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(minutes/60),minutes%60);
 state.live=false;setDateInputs();render();
});
$('dock-play').addEventListener('click',()=>$('play-time').click());
$('dock-live').addEventListener('click',()=>$('now').click());
for(const button of document.querySelectorAll('[data-fullscreen]')){
 button.addEventListener('click',async()=>{
  const panel=button.closest('.panel');
  try{
   if(document.fullscreenElement===panel)await document.exitFullscreen();
   else if(document.fullscreenElement){await document.exitFullscreen();await panel.requestFullscreen()}
   else await panel.requestFullscreen();
  }catch(e){notice('Fullscreen could not be opened: '+e.message)}
 });
}
// The browser fullscreen top layer hides siblings of the fullscreen element.
// Move the SAME dock (not a copy) into the active panel and restore it afterward,
// retaining all input state and event listeners.
const timeDock=$('time-dock');
const dockHome=timeDock.parentNode;
const dockNext=timeDock.nextSibling;
// Mobile fullscreen: move the *existing* controls into an optional drawer.
// Moving nodes retains all event listeners and checkbox state; placeholder
// comments return them to their exact prior position on exit or resize.
const compactFullscreenQuery=window.matchMedia('(max-width: 1050px)');
const compactControlSelectors={
 'chart-panel':['.solar-chart-legend','.solar-chart-summary','.solar-time-position','.chart-footer'],
 'earth-panel':['.earth-tools','.earth-twilight-controls','.map-legend'],
 'sky-panel':['.sky-light-controls','.sky-observatory-toolbar','.sky-sidereal-toolbar','.sky-debug-tools','.sky-options','.sky-cursor-readout','.celestial-readout','.sky-legend'],
 'moon-panel':['.disc-view-select','.earthshine-toggle','.moon-view-tools','.moon-orientation','.solar-observation-note','.moon-bottom'],
 'orrery-panel':['.orrery-controls','.planet-legend']
};
let mobileFullscreenRestore=[],mobileFullscreenPanel=null,mobileDrawer=null;
function restoreMobileFullscreenControls(){
 for(const [node,marker] of mobileFullscreenRestore){
  if(marker.parentNode)marker.parentNode.insertBefore(node,marker);
  marker.remove();
 }
 mobileFullscreenRestore=[];
 if(mobileDrawer){mobileDrawer.remove();mobileDrawer=null}
 if(mobileFullscreenPanel){
  mobileFullscreenPanel.classList.remove('mobile-plot-fullscreen','mobile-controls-open');
  const button=mobileFullscreenPanel.querySelector('.mobile-plot-settings');
  if(button){
   button.textContent='⚙ Controls';
   button.setAttribute('aria-expanded','false');
  }
  mobileFullscreenPanel=null;
 }
 timeDock.classList.remove('mobile-time-expanded');
 $('dock-mobile-more').setAttribute('aria-expanded','false');
}
function syncMobileFullscreenControls(){
 const panel=document.fullscreenElement;
 if((!compactFullscreenQuery.matches&&!mobileFullscreenPanel)||!panel?.classList.contains('panel')||
    !compactControlSelectors[[...panel.classList].find(k=>compactControlSelectors[k])]){
  if(mobileFullscreenPanel)restoreMobileFullscreenControls();
  return;
 }
 if(mobileFullscreenPanel===panel)return;
 restoreMobileFullscreenControls();
 mobileFullscreenPanel=panel;
 panel.classList.add('mobile-plot-fullscreen');
 const drawer=document.createElement('div');
 drawer.className='mobile-fullscreen-drawer';
 drawer.setAttribute('aria-label','Plot settings');
 drawer.hidden=true;
 for(const selector of compactControlSelectors[[...panel.classList].find(k=>compactControlSelectors[k])]){
  const node=panel.querySelector(selector);
  if(!node)continue;
  const marker=document.createComment('Mobile plot control original position');
  node.before(marker);
  drawer.appendChild(node);
  mobileFullscreenRestore.push([node,marker]);
 }
 panel.appendChild(drawer);
 mobileDrawer=drawer;
}
document.querySelectorAll('.mobile-plot-settings').forEach(button=>{
 button.addEventListener('click',()=>{
  const panel=button.closest('.panel'),isOpen=!panel.classList.contains('mobile-controls-open');
  panel.classList.toggle('mobile-controls-open',isOpen);
  if(mobileDrawer)mobileDrawer.hidden=!isOpen;
  button.setAttribute('aria-expanded',String(isOpen));
  button.textContent=isOpen?'✕ Close':'⚙ Controls';
  requestAnimationFrame(render);
 });
});
$('dock-mobile-more').addEventListener('click',()=>{
 const opened=!timeDock.classList.contains('mobile-time-expanded');
 timeDock.classList.toggle('mobile-time-expanded',opened);
 $('dock-mobile-more').setAttribute('aria-expanded',String(opened));
});

document.addEventListener('fullscreenchange',()=>{
 restoreMobileFullscreenControls();
 const activePanel=document.fullscreenElement;
 if(activePanel?.classList.contains('panel')){
  activePanel.appendChild(timeDock);
 }else if(dockHome){
  dockHome.insertBefore(timeDock,dockNext);
 }
 for(const button of document.querySelectorAll('[data-fullscreen]')){
  const active=activePanel===button.closest('.panel');
  button.textContent=active?'⤢ Exit':'⛶ Expand';button.setAttribute('aria-pressed',String(active));
 }
 syncMobileFullscreenControls();
 requestAnimationFrame(render);
});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{syncMobileFullscreenControls();render()},140)});
setInterval(()=>{if(state.live){state.date=new Date();setDateInputs();render()}},15000);
setDateInputs();render();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}

/** Static release metadata from the same GitHub Actions ZIP, offline-readable. */
async function loadBuildMeta(){
 try{
  const response=await fetch('./build-info.json',{cache:'no-store'});
  if(!response.ok)throw Error('Build metadata unavailable');
  const info=await response.json();
  const version=info.version||20,short=info.commit?info.commit.slice(0,9):'unknown';
  for(const el of document.querySelectorAll('.app-version,.release-version,.dock-version'))el.textContent='v'+version;
  const built=info.built_utc?new Date(info.built_utc).toLocaleString('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'})+' UTC':'date not recorded';
  $('build-meta').textContent='Build '+built+' · commit '+short;
  $('app-version').title='HelioClock-ChatGPT v'+version+' · commit '+short+' · '+built;
  $('dock-version').title=$('app-version').title;
 }catch(error){
  $('build-meta').textContent='Version 20 · offline build metadata unavailable';
 }
}
loadBuildMeta();

/** Dashboard profiles store only named panel visibility flags; never hide controls. */
const panelVisibility={
 hero:'.hero,.stat-strip',chart:'.chart-panel',earth:'.earth-panel',sky:'.sky-panel',
 moon:'.moon-panel',orrery:'.orrery-panel',details:'.details-panel',almanac:'.almanac-panel'
};
const defaultLayout={hero:true,chart:true,earth:true,sky:true,moon:true,orrery:true,details:true,almanac:false};
let activeLayout={...defaultLayout};
try{
 const saved=JSON.parse(localStorage.getItem('helioclock-layout-v21')||'null');
 if(saved&&typeof saved==='object')for(const k of Object.keys(defaultLayout))if(typeof saved[k]==='boolean')activeLayout[k]=saved[k];
}catch{}
function applyLayout(next){
 activeLayout={...defaultLayout,...next};
 for(const [key,selector] of Object.entries(panelVisibility)){
  for(const el of document.querySelectorAll(selector))el.hidden=!activeLayout[key];
  const input=document.querySelector('[data-panel-visibility="'+key+'"]');
  if(input)input.checked=activeLayout[key];
 }
 document.querySelector('.dashboard').classList.toggle('single-panel',
   [...document.querySelectorAll('.dashboard > .panel')].filter(el=>!el.hidden).length===1);
 try{localStorage.setItem('helioclock-layout-v21',JSON.stringify(activeLayout))}catch{}
 requestAnimationFrame(render);
}
for(const input of document.querySelectorAll('[data-panel-visibility]')){
 input.addEventListener('change',()=>applyLayout({...activeLayout,[input.dataset.panelVisibility]:input.checked}));
}
$('layout-all').addEventListener('click',()=>applyLayout(Object.fromEntries(Object.keys(defaultLayout).map(k=>[k,true]))));
$('layout-default').addEventListener('click',()=>applyLayout(defaultLayout));
// Presets are equivalent visibility masks; every section remains independently toggleable.
const onlyPanel=key=>Object.fromEntries(Object.keys(defaultLayout).map(k=>[k,k===key]));
$('layout-sky').addEventListener('click',()=>applyLayout(onlyPanel('sky')));
$('layout-text').addEventListener('click',()=>applyLayout(onlyPanel('almanac')));
$('almanac-copy').addEventListener('click',async()=>{
 if(!almanacCurrent)return;
 try{
  await navigator.clipboard.writeText(almanacCurrent.report);
  $('almanac-copy-status').textContent='Copied!';
 }catch{
  // Allow manual copy where Clipboard API is unavailable, e.g. HTTP deployments.
  const field=document.createElement('textarea');field.value=almanacCurrent.report;
  field.style.cssText='position:absolute;left:-9999px';
  document.body.appendChild(field);field.select();
  const ok=document.execCommand('copy');field.remove();
  $('almanac-copy-status').textContent=ok?'Copied!':'Clipboard unavailable';
 }
});
$('almanac-content').addEventListener('click',e=>{
 const button=e.target.closest('[data-event-index]');
 if(!button||!almanacCurrent)return;
 const event=almanacCurrent.next[Number(button.dataset.eventIndex)];
 if(!event)return;
 pausePlayback();state.date=new Date(event.date);state.live=false;setDateInputs();render();
});
applyLayout(activeLayout);

/**
 * Versioned local, offline preferences. No account, cookies or network writes.
 * Layout remains backward-compatible with the prior v21 storage key.
 * Simulation date/time and temporary pan/zoom are excluded by default.
 */
const PREF_KEY='helioclock-preferences-v1',LEGACY_LAYOUT_KEY='helioclock-layout-v21';
const PREF_CHECKBOXES=['show-au-rings','show-earthshine','show-constellations',
 'show-milkyway-shade','show-milkyway-outline','show-galactic-center',
 'show-stars','show-labels','show-sky-paths','show-below-horizon',
 'show-dso-galaxies','show-dso-nebulae','show-dso-clusters','show-dso-labels','show-constellation-names',
 'show-ecliptic','use-precession','show-stellar-colors',
 'show-planets','show-altaz-grid','show-radec-grid',
 'earth-twilight-civil','earth-twilight-nautical',
 'earth-twilight-astronomical','earth-twilight-night'];
const PREF_CHOICES={
 earthProjection:['equal','globe','mercator'],
 earthTextureQuality:['2k','4k'],
 skyProjection:['polar','rect'],
 skyLight:['daylight','black'],
 orbitMode:['inner','outer'],
 discView:['moon','sun']
};
const FACTORY_PREF={
 version:1,observer:{lat:49.19,lon:-98.10},earthProjection:'equal',earthTextureQuality:'2k',
 skyProjection:'polar',skyLight:'daylight',orbitMode:'inner',discView:'moon',
 magLimit:3.5,stellarColors:true,usePrecession:true,
 checkboxes:null,layout:null,rememberView:false,view:null
};
let prefReady=false,lastSaved='';
function validNumber(value,min,max){return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max}
function capturePrefs(){
 const checks={};
 for(const key of PREF_CHECKBOXES)checks[key]=$(key).checked;
 return {
  version:1,observer:{lat:state.lat,lon:state.lon},
  earthProjection:state.earthProjection,earthTextureQuality:state.earthTextureQuality,
  skyProjection:state.skyProjection,
  skyLight:state.skyLight,orbitMode:state.orbitMode,discView:state.discView,
  magLimit:state.magLimit,stellarColors:state.stellarColors,usePrecession:state.usePrecession,
  checkboxes:checks,layout:{...activeLayout},
  rememberView:$('prefs-remember-view').checked,
  view:$('prefs-remember-view').checked?{
   earthZoom:state.earthZoom,earthLon:state.earthLon,earthLat:state.earthLat,
   skyZoom:state.skyZoom,skyPanX:state.skyPanX,skyPanY:state.skyPanY,skyHeading:state.skyHeading,
   orreryZoom:state.orreryZoom,moonZoom:state.moonZoom,sunZoom:state.sunZoom
  }:null
 };
}
function persistPrefs(){
 if(!prefReady)return;
 try{
  const value=JSON.stringify(capturePrefs());
  if(value!==lastSaved){localStorage.setItem(PREF_KEY,value);lastSaved=value}
 }catch{ $('prefs-status').textContent='Browser storage unavailable; export a settings file instead'; }
}
function useChoice(key,value){
 if(PREF_CHOICES[key]?.includes(value))state[key]=value;
}
function applyPrefs(saved,{restoreLayout=true}={}){
 if(!saved||typeof saved!=='object'||saved.version!==1)throw Error('Unsupported settings format');
 const obs=saved.observer;
 if(obs&&validNumber(obs.lat,-90,90)&&validNumber(obs.lon,-180,180)){
  state.lat=obs.lat;state.lon=obs.lon;
  $('latitude').value=String(state.lat);$('longitude').value=String(state.lon);
  // The map follows a changed observing location by default.
  state.earthLon=state.lon;state.earthLat=state.lat;
 }
 for(const key of Object.keys(PREF_CHOICES))useChoice(key,saved[key]);
 $('earth-texture-quality').value=state.earthTextureQuality;
 if(validNumber(saved.magLimit,0,7))state.magLimit=saved.magLimit;
 if(typeof saved.stellarColors==='boolean')state.stellarColors=saved.stellarColors;
 if(typeof saved.usePrecession==='boolean')state.usePrecession=saved.usePrecession;
 if(saved.checkboxes&&typeof saved.checkboxes==='object'){
  for(const key of PREF_CHECKBOXES)
   if(typeof saved.checkboxes[key]==='boolean')$(key).checked=saved.checkboxes[key];
 }
 // Two checkbox-backed model fields must always agree with the controls.
 $('show-stellar-colors').checked=state.stellarColors;
 $('use-precession').checked=state.usePrecession;
 $('star-magnitude').value=state.magLimit;
 $('below-horizon-setting').hidden=state.skyProjection!=='rect';
 for(const [attribute,selected] of [
  ['data-projection',state.earthProjection],
  ['data-sky-projection',state.skyProjection],
  ['data-sky-light',state.skyLight],
  ['data-orbit-mode',state.orbitMode],
  ['data-disc-view',state.discView]
 ]){
  for(const button of document.querySelectorAll('['+attribute+']')){
   const active=button.getAttribute(attribute)===selected;
   button.classList.toggle(attribute==='data-projection'?'is-active':'selected',active);
   button.setAttribute('aria-pressed',String(active));
  }
 }
 const sun=state.discView==='sun';
 $('moon').hidden=sun;$('solar-photo').hidden=!sun;
 $('moon-bottom').hidden=sun;$('solar-note').hidden=!sun;
 $('solar-refresh').hidden=!sun;$('moon-phase').hidden=sun;
 $('earthshine-setting').hidden=sun;
 $('disc-kind').textContent=sun?'SOLAR OBSERVATION':'LUNAR CYCLE';
 if(sun&&solarRequest===0)refreshSolarImage();
 $('prefs-remember-view').checked=saved.rememberView===true;
 if(saved.rememberView===true&&saved.view&&typeof saved.view==='object'){
  const bounds={earthZoom:[1,4],earthLon:[-180,180],earthLat:[-165,165],
   skyZoom:[1,3],skyPanX:[-4000,4000],skyPanY:[-4000,4000],skyHeading:[-180,180],orreryZoom:[.7,3],
   moonZoom:[.7,2.8],sunZoom:[.7,2.8]};
  for(const [key,[min,max]] of Object.entries(bounds))
   if(validNumber(saved.view[key],min,max))state[key]=saved.view[key];
 }
 for(const [id,key] of [['earth-zoom','earthZoom'],['sky-zoom','skyZoom'],
  ['sky-heading','skyHeading'],['orrery-zoom','orreryZoom'],['moon-zoom','moonZoom']])
  $(id).value=state[key];
 if(restoreLayout&&saved.layout&&typeof saved.layout==='object'){
  const merged={...defaultLayout};
  for(const key of Object.keys(defaultLayout))
   if(typeof saved.layout[key]==='boolean')merged[key]=saved.layout[key];
  applyLayout(merged);
 }
 updateDiscViewport();
 render();
}
function readPrefs(){
 try{
  const raw=localStorage.getItem(PREF_KEY);
  if(!raw)return null;
  const value=JSON.parse(raw);
  if(!value||value.version!==1)throw Error('Unsupported saved preferences');
  return value;
 }catch(error){
  $('prefs-status').textContent='Saved preferences could not be read; defaults retained';
  return null;
 }
}
function downloadPrefs(){
 const contents=JSON.stringify(capturePrefs(),null,2)+'\n';
 const blob=new Blob([contents],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement('a');a.href=url;a.download='HelioClock-settings.json';
  document.body.appendChild(a);a.click();a.remove();
  $('prefs-status').textContent='Settings exported';
 }finally{setTimeout(()=>URL.revokeObjectURL(url),2000)}
}
$('prefs-export').addEventListener('click',downloadPrefs);
$('prefs-import').addEventListener('click',()=>$('prefs-file').click());
$('prefs-file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>65536)throw Error('Settings file is too large');
  const value=JSON.parse(await file.text());
  if(!value||value.version!==1||!value.observer||!value.checkboxes||!value.layout)
   throw Error('Not a supported HelioClock settings file');
  // Validate the imported document before mutating any settings.
  if(!validNumber(value.observer.lat,-90,90)||!validNumber(value.observer.lon,-180,180))
   throw Error('Invalid observer coordinates');
  for(const [key,allowed] of Object.entries(PREF_CHOICES))
   if(key==='earthTextureQuality'&&value[key]===undefined)continue;
   else if(!allowed.includes(value[key]))throw Error('Invalid '+key);
  if(!validNumber(value.magLimit,0,7))throw Error('Invalid magnitude limit');
  for(const key of PREF_CHECKBOXES)
   if(typeof value.checkboxes[key]!=='boolean'&&
      !(value.checkboxes[key]===undefined&&['show-planets','show-altaz-grid','show-radec-grid'].includes(key)))
    throw Error('Invalid '+key);
  for(const key of Object.keys(defaultLayout))
   if(typeof value.layout[key]!=='boolean')throw Error('Invalid layout');
  applyPrefs(value);persistPrefs();
  $('prefs-status').textContent='Settings imported successfully';
 }catch(error){$('prefs-status').textContent='Import failed: '+error.message}
 finally{e.target.value=''}
});
$('prefs-reset').addEventListener('click',()=>{
 // Stop the old document from writing its settings back during navigation.
 prefReady=false;
 try{localStorage.removeItem(PREF_KEY);localStorage.removeItem(LEGACY_LAYOUT_KEY)}catch{}
 // Firefox may restore form values from session history on reload, so
 // initializePreferences explicitly resynchronizes the controls afterward.
 location.reload();
});
$('prefs-remember-view').addEventListener('change',persistPrefs);
// Capture all persistent settings after existing handlers process the input.
// Rendering/live-clock updates do not trigger change events, avoiding 15s writes.
document.addEventListener('change',e=>{
 if(e.target.closest('#time-dock')||e.target.id==='observe-date'||e.target.id==='observe-time')return;
 queueMicrotask(persistPrefs);
});
document.addEventListener('click',e=>{
 if(e.target.closest('#time-dock'))return;
 const button=e.target.closest('button');
 if(button&&!['prefs-export','prefs-import','prefs-reset'].includes(button.id))queueMicrotask(persistPrefs);
});
for(const id of ['earth-map','sky','disc-stage','orrery']){
 const el=$(id);
 if(el){el.addEventListener('pointerup',persistPrefs);el.addEventListener('wheel',()=>setTimeout(persistPrefs,0),{passive:true})}
}
function initializePreferences(){
 // Firefox can restore stale form values independently of localStorage.
 // Reset all preference-backed controls to their declared factory defaults
 // before importing settings; a clean reset must not show the previous state.
 for(const key of PREF_CHECKBOXES)$(key).checked=$(key).defaultChecked;
 $('prefs-remember-view').checked=false;
 const saved=readPrefs();
 if(saved)applyPrefs(saved);
 $('earth-texture-quality').value=state.earthTextureQuality;
 $('latitude').value=String(state.lat);
 $('longitude').value=String(state.lon);
 prefReady=true;
 persistPrefs();
 render();
}
initializePreferences();
// Firefox can restore form history after module initialization. Reassert
// preferences after page-show so coordinates and the model never disagree.
window.addEventListener('pageshow',()=>{
 $('latitude').value=String(state.lat);
 $('longitude').value=String(state.lon);
 const saved=readPrefs();
 for(const key of PREF_CHECKBOXES)
  $(key).checked=saved&&typeof saved.checkboxes?.[key]==='boolean'
   ?saved.checkboxes[key]:$(key).defaultChecked;
 $('prefs-remember-view').checked=saved?.rememberView===true;
 render();
});
