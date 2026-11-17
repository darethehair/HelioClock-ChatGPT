import {findCelestialObjects,celestialObjectPosition,celestialDailyEvents,setCometSearchObjects,cometObjectsForMap,setAsteroidSearchObjects,asteroidObjects} from './celestial-search.js';
import {drawSkyMoon,moonBrightDirection} from './sky-moon-phase.js';
import {renderAlmanac} from './almanac.js';
import {drawEcliptic} from './ecliptic.js';
import {drawMilkyWay,milkyWayStatus,milkyWayDebugStatus,milkyWaySample} from './milky-way.js';
import {rectGeometry,projectRect,rectHorizonY,paintRectAtmosphere} from './sky-projection.js';
import {drawSkyAtlas,skyAtlasStatus} from './sky-atlas.js';
import {drawSkyDSOs} from './sky-dso.js';
import {drawConstellationNames} from './sky-constellation-labels.js';
import {renderSolarJourney} from './solar-hero.js';
import {renderMoon} from './moon-renderer.js';
import {renderSolarEclipse} from './solar-eclipse-renderer.js';
import {discGeometry,screenToSurface,paintDiscGrid,formatSurface} from './disc-coordinates.js';
import {solarDiscOrientation} from './solar-disc-orientation.js';
import {drawSolarYear} from './solar-chart.js';
import {drawSkyGrid} from './sky-grid.js';
import {skyPlanets} from './sky-planets.js';
import {cometHeliocentricEcliptic,cometOrbitPath} from './comet-orbits.js';
import {asteroidPosition,asteroidPath} from './asteroid-orbits.js';
import {minorBodyGeometry} from './minor-body-geometry.js';
import {renderEarth,earthTextureStatus,earthCoordinatesAt} from './earth-renderer.js';
import {cloudStatus,refreshClouds} from './clouds.js';
import {findPlanetaryEvent,eventPlanets,eventOptions} from './planetary-events.js';
import {findEclipseAsync} from './eclipse-events.js';
import {spaceWeather,auroraFresh,startSpaceWeather,refreshSpaceWeather} from './space-weather.js';
import {starsAbove} from './sky-catalog.js';
import {RAD,PI,wrap,clamp,solar,sunHorizontal,sunEvents,moon,orbitPositions,sidereal,equatorialFromHorizontal,utcTime,durationText} from './astronomy.js';
const $=id=>document.getElementById(id);
const state={lat:49.19,lon:-98.10,date:new Date(),live:true,skyZoom:1,skyPanX:0,skyPanY:0,skyHeading:0,earthZoom:1,earthLon:-98.10,earthLat:49.19,earthProjection:'equal',earthMapStyle:'physical',earthTextureQuality:'2k',orreryZoom:1,moonZoom:1,discView:'moon',sunZoom:1,moonPanX:0,moonPanY:0,sunPanX:0,sunPanY:0,orbitMode:'inner',orrery3D:false,orreryTilt:55,orreryRotation:0,skyLight:'daylight',skyProjection:'polar',magLimit:3.5,stellarColors:true,usePrecession:true,playing:false};
const fmt=d=>d.toISOString().slice(0,10);
let highlightedOrreryEvent=null;
let fitSelectedComet=false;
function updateOrreryEventChoices(){
 const planetSelect=$('orrery-event-planet'),kindSelect=$('orrery-event-kind');
 const planets=eventPlanets(state.orbitMode),oldPlanet=planetSelect.value;
 planetSelect.replaceChildren(...planets.map(name=>new Option(name,name)));
 planetSelect.value=planets.includes(oldPlanet)?oldPlanet:(state.orbitMode==='inner'?'Venus':'Jupiter');
 const events=eventOptions(planetSelect.value),oldKind=kindSelect.value;
 kindSelect.replaceChildren(...events.map(o=>new Option(o.label,o.value)));
 kindSelect.value=events.some(o=>o.value===oldKind)?oldKind:events[0].value;
 highlightedOrreryEvent=null;
 $('orrery-event-status').textContent='Choose Previous or Next to find a planetary event.';
}
function setDateInputs(){$('observe-date').value=fmt(state.date);$('observe-time').value=utcTime(state.date)}
const valid24HourTime=value=>/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
function selectDate(){
 const d=$('observe-date').value,t=$('observe-time').value;
 if(!d||!valid24HourTime(t)){notice('Enter time in 24-hour HH:MM format (00:00–23:59).');setDateInputs();return;}
 const next=new Date(d+'T'+t+':00Z');
 if(!Number.isFinite(next.getTime()))return;
 pausePlayback();state.date=next;state.live=false;render();
}
function notice(msg){$('message').hidden=!msg;$('message').textContent=msg||''}
// Provenance must use real UTC time, not the chosen simulation date.
const provenanceMs=value=>typeof value==='number'?value:Date.parse(value||'');
function sourceTimestamp(value){
 const ms=provenanceMs(value);
 return Number.isFinite(ms)?new Date(ms).toISOString().slice(0,16).replace('T',' ')+' UTC':'unknown';
}
function sourceAge(value){
 const ms=provenanceMs(value);
 if(!Number.isFinite(ms))return 'age unknown';
 const minutes=Math.max(0,Math.floor((Date.now()-ms)/60000));
 return minutes<60?minutes+' min old':minutes<2880?Math.floor(minutes/60)+' h old':Math.floor(minutes/1440)+' days old';
}
// Load bundled MPC data into the finder, without any live runtime MPC dependency.
async function loadCometCatalogStatus(){
 const el=$('comet-catalog-status');
 if(!el)return;
 try{
  const response=await fetch('./comets.json');
  if(!response.ok)throw Error('not present');
  const data=await response.json();
  if(data.schema!==1||!Array.isArray(data.records)||data.records.length!==data.count)throw Error('invalid snapshot');
  if(data.count===0){el.textContent='MPC comet catalogue unavailable · try next build';return;}
  const searchable=setCometSearchObjects(data.records);
  el.textContent=searchable+' searchable comets · MPC CometEls.txt · downloaded '+sourceTimestamp(data.retrievedUtc)+' ('+sourceAge(data.retrievedUtc)+')'+
   (data.status==='cached'?' · cached previous download':'')+' · bundled in app · approximate orbits';
  el.title='MPC source: '+(data.sourceUrl||'CometEls.txt')+'; download date '+sourceTimestamp(data.retrievedUtc)+
   '. Each comet has its own separate orbital epoch.';
  renderCelestialFinder();
  sky();
 }catch{el.textContent='Comet catalogue not available · check latest build';}
}
loadCometCatalogStatus();
async function loadAsteroids(){
 const status=$('asteroid-catalog-status');
 try{
  const res=await fetch('./major-asteroids.json');if(!res.ok)throw Error('unavailable');
  const data=await res.json();if(data.records?.length!==4)throw Error('incomplete');
  setAsteroidSearchObjects(data.records);
  status.textContent='NASA/JPL SBDB · four major bodies · downloaded '+sourceTimestamp(data.retrievedUtc)+' · approximate orbits';
  const select=$('orrery-asteroid-select');
  select.replaceChildren(new Option('— Select —',''),...asteroidObjects().map(obj=>new Option(obj.name,obj.name)));
  renderCelestialFinder();sky();orrery();
 }catch{status.textContent='Asteroid catalogue unavailable in this build';}
}
loadAsteroids();
let selectedCelestialObject=null;
let followCelestialObject=false;
let finderEventsCache={key:null,result:null};
function selectedObjectEvents(object){
 const day=state.date.toISOString().slice(0,10);
 const key=[object.name,object.type,object.elements?.perihelion?.year||'',object.elements?.perihelion?.dayTT||'',day,state.lat,state.lon,state.usePrecession].join('|');
 if(finderEventsCache.key!==key){
  finderEventsCache={key,result:celestialDailyEvents(object,state.date,state.lat,state.lon,state.usePrecession)};
 }
 return finderEventsCache.result;
}
function renderCelestialFinder(){
 const input=$('celestial-search-input'),results=$('celestial-search-results'),detail=$('celestial-search-detail');
 $('celestial-clear-selection').hidden=!selectedCelestialObject;
 if(!input||!results||!detail)return;
 const matches=findCelestialObjects(input.value);
 results.replaceChildren();
 if(!input.value.trim()){results.textContent='Enter a name to search the offline catalogue.';}
 else if(!matches.length){results.textContent='No matching objects in the current catalogue.';}
 else for(const object of matches){
  const button=document.createElement('button');button.type='button';
  button.className='celestial-search-result';
  button.textContent=object.name+(object.alias?' — '+object.alias:'')+' · '+object.type;
  button.addEventListener('click',()=>{selectedCelestialObject=object;fitSelectedComet=false;renderCelestialFinder();sky();orrery();});
  results.append(button);
 }
 detail.replaceChildren();
 if(!selectedCelestialObject)return;
 const o=selectedCelestialObject,pos=celestialObjectPosition(o,state.date,state.lat,state.lon,state.usePrecession);
 if(!pos)return;
 const title=document.createElement('strong');title.textContent=o.name+(o.alias?' — '+o.alias:'');
 const info=document.createElement('p');
 info.textContent=o.type+(Number.isFinite(o.mag)?' · mag '+o.mag:'')+
  ' · RA '+(pos.ra/15).toFixed(3)+' h · Dec '+pos.decl.toFixed(2)+'°'+
  ' · Az '+pos.az.toFixed(2)+'° · Alt '+pos.alt.toFixed(2)+'°'+
  (pos.alt>=0?' · Above horizon':' · Below horizon')+
  (o.type==='Constellation'?' · Approximate constellation centre':'')+
   (o.type==='Comet'?' · Approximate comet orbit (no planetary perturbations)':'')+
   (o.type==='Asteroid'||o.type==='Dwarf planet'?' · Approximate two-body orbit':'');
 detail.append(title,info);
 if(['Comet','Asteroid','Dwarf planet'].includes(o.type)){
  const extra=document.createElement('p'),e=o.elements;
  extra.textContent='Earth distance '+pos.distanceAU.toFixed(3)+' AU · Sun distance '+pos.sunDistanceAU.toFixed(3)+' AU · q '+(e.qAU??e.aAU)+' AU · eccentricity '+e.eccentricity+
   (Number.isFinite(pos.epochAgeDays)?' · Element epoch '+Math.round(pos.epochAgeDays)+' days from simulated date':' · Orbit epoch unavailable');
  const warning=document.createElement('p');
  warning.textContent='⚠ Approximate unperturbed orbit. Position can be significantly wrong far from the element epoch, near planetary encounters or for outgassing comets. Not a JPL Horizons prediction.';
  detail.append(extra,warning);
 }
 const events=selectedObjectEvents(o);
 if(events){
  const formatEvent=d=>d?d.toISOString().slice(11,16)+' UTC':'—';
  const line=document.createElement('p');
  const rises=events.rises.map(formatEvent).join(', ')||'—';
  const sets=events.sets.map(formatEvent).join(', ')||'—';
  const transit=events.transit?formatEvent(events.transit.date)+' ('+events.transit.alt.toFixed(1)+'°)':'—';
  const status=events.horizonStatus==='always-above'?' · Always above horizon':events.horizonStatus==='always-below'?' · Always below horizon':'';
  line.textContent=events.date.toISOString().slice(0,10)+' UTC · Rise '+rises+' · Upper transit '+transit+' · Set '+sets+status;
  const note=document.createElement('p');
  note.textContent='Geometric 0° horizon · no refraction or terrain · UTC-day events';
  detail.append(line,note);
 }
 const center=document.createElement('button');center.type='button';
 center.className='celestial-search-result';
 center.textContent='Center in Sky Compass';
 center.addEventListener('click',centerSelectedCelestialObject);
 detail.append(center);
 const follow=document.createElement('button');follow.type='button';
 follow.className='celestial-search-result';
 follow.textContent=followCelestialObject?'Stop following object':'Follow through time';
 follow.setAttribute('aria-pressed',String(followCelestialObject));
 follow.addEventListener('click',()=>{
  followCelestialObject=!followCelestialObject;
  if(followCelestialObject)centerSelectedCelestialObject();
  else renderCelestialFinder();
 });
 detail.append(follow);
}
// Locate only when requested; simply selecting a result preserves the user's sky view.
function centerSelectedCelestialObject(){
 if(!selectedCelestialObject)return;
 if(!alignSkyToSelectedObject(true)){
  notice('Sky Compass is not visible. Enable its panel and try again.');return;
 }
 render();
 $('sky').closest('.sky-panel')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 notice('Centered '+selectedCelestialObject.name+' in Sky Compass'+(followCelestialObject?' · following through time.':'.'));
}
function alignSkyToSelectedObject(ensureZoom=false){
 if(!selectedCelestialObject)return false;
 const target=celestialObjectPosition(selectedCelestialObject,state.date,state.lat,state.lon,state.usePrecession);
 if(!Number.isFinite(target.az)||!Number.isFinite(target.alt))return false;
 const skyCanvas=$('sky'),w=skyCanvas.clientWidth,h=skyCanvas.clientHeight;
 if(!w||!h)return false;
 if(target.alt<0&&state.skyProjection==='polar'){
  state.skyProjection='rect';
  $('below-horizon-setting').hidden=false;
  for(const button of document.querySelectorAll('[data-sky-projection]')){
   const active=button.dataset.skyProjection==='rect';
   button.classList.toggle('selected',active);
   button.setAttribute('aria-pressed',String(active));
  }
 }
 if(target.alt<0)$('show-below-horizon').checked=true;
 const heading=state.skyProjection==='rect'?target.az-180:target.az;
 state.skyHeading=((heading+180)%360+360)%360-180;
 $('sky-heading').value=String(state.skyHeading);
 if(ensureZoom)state.skyZoom=Math.max(state.skyZoom,state.skyProjection==='rect'?1.6:1.5);
 if(state.skyProjection==='rect'){
  const [x,y]=projectRect(target.az,target.alt,w,h,state.skyHeading);
  const zoom=state.skyZoom;
  state.skyPanX=clamp((w/2-x)*zoom,-w*(zoom-1)/2,w*(zoom-1)/2);
  state.skyPanY=clamp((h/2-y)*zoom,-h*(zoom-1)/2,h*(zoom-1)/2);
 }else{
  const radius=(Math.min(w-35,h-20)/2-14)*state.skyZoom;
  const angle=(target.az-90-state.skyHeading)*RAD;
  const distance=radius*(1-target.alt/90);
  state.skyPanX=-distance*Math.cos(angle);
  state.skyPanY=-distance*Math.sin(angle);
 }
 $('sky-zoom').value=String(state.skyZoom);
 return true;
}
$('celestial-search-input').addEventListener('input',renderCelestialFinder);
$('celestial-clear-selection').addEventListener('click',()=>{
 selectedCelestialObject=null;
 followCelestialObject=false;
 fitSelectedComet=false;
 finderEventsCache={key:null,result:null};
 $('celestial-search-input').value='';
 notice('');
 renderCelestialFinder();
 sky();orrery();
});
function canvas(el){
 const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(!w||!h)return null;
 const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);
 // Resizing a canvas reallocates its backing store and resets its context.
 // Avoid that on every camera-drag frame, especially on mobile GPUs.
 if(el.width!==pixelW)el.width=pixelW;
 if(el.height!==pixelH)el.height=pixelH;
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
let pickingEarthObserver=false;
function setEarthObserverPickMode(enabled){
 pickingEarthObserver=enabled;
 const button=$('earth-pick-observer'),map=$('earth-map');
 button.setAttribute('aria-pressed',String(enabled));
 button.textContent=enabled?'✕ Cancel location pick':'⌖ Set observer on map';
 map.classList.toggle('earth-pick-active',enabled);
 $('earth-pick-help').hidden=!enabled;
}
function worldMap(){
 const o=canvas($('earth-map'));if(!o)return;
 const twilight={
  civil:$('earth-twilight-civil').checked,
  nautical:$('earth-twilight-nautical').checked,
  astronomical:$('earth-twilight-astronomical').checked,
  night:$('earth-twilight-night').checked
 };
 const weather=spaceWeather();
 const result=renderEarth(o.c,o.w,o.h,state.date,{...state,earthTwilight:twilight,
  cityLights:$('earth-city-lights').checked,showAurora:$('earth-aurora').checked&&auroraFresh(),
  auroraGrid:weather.grid,
  showClouds:$('earth-clouds').checked&&cloudStatus().status==='ready',
  cloudOpacity:Number($('earth-cloud-opacity').value)/100,
  showEclipseShadow:$('earth-eclipse-shadow').checked,
  earthMapStyle:state.earthMapStyle||'physical',
  earthCountryBorders:$('earth-country-borders').checked,
  earthRegionBorders:$('earth-region-borders').checked,
  earthCityLabels:$('earth-city-labels').checked});
 const cloud=cloudStatus(),cloudEnabled=$('earth-clouds').checked;
 const cloudSource=cloud.status==='ready'
  ?'NASA GIBS · '+cloud.satellite+' VIIRS true-colour WMS · image dates '+cloud.day+
   ' UTC · fetched '+sourceTimestamp(cloud.requested)+' ('+sourceAge(cloud.requested)+')'
  :'NASA GIBS · NOAA-20/21 VIIRS true-colour WMS · no verified image date';
 $('earth-cloud-status').textContent=!cloudEnabled
  ?'Clouds off · '+(cloud.status==='ready'?'cached '+cloudSource:'NASA GIBS imagery not loaded')
  :cloud.status==='ready'
   ?cloudSource+' · illustrative overlay; independent of simulated date'
   :cloud.status==='loading'?'Loading NASA GIBS NOAA-20/21 VIIRS imagery…'
   :cloud.status==='unavailable'?'NASA GIBS imagery unavailable · no current cloud image'
   :'Clouds awaiting imagery';
 $('earth-cloud-status').title=cloudSource+' · WMS mosaics; older dates may fill coverage gaps.';
 const loaded=weather.grid&&auroraFresh();
 $('earth-space-weather-status').textContent=
  'NOAA OVATION aurora · '+(loaded?'forecast '+sourceTimestamp(weather.forecast):'forecast unavailable or stale')+
  ' · observation '+sourceTimestamp(weather.observed)+
  ' · NOAA planetary Kp '+(weather.kp===null?'unavailable':weather.kp.toFixed(1)+' at '+sourceTimestamp(weather.kpTime))+
  ' · fetched '+sourceTimestamp(weather.fetchedAt)+' · independent of simulated date';
 $('earth-space-weather-status').title='Sources: NOAA OVATION aurora JSON and NOAA planetary K-index JSON. Forecast and observation timestamps are from NOAA.';
 const badge=$('kp-badge');
 badge.textContent=weather.kp===null?'Kp —':'Kp '+weather.kp.toFixed(1);
 badge.dataset.tier=weather.kp===null?'unknown':weather.kp>=7?'severe':weather.kp>=5?'storm':weather.kp>=4?'active':'quiet';
 badge.title=weather.kpTime?'NOAA planetary Kp · observed '+weather.kpTime+' · independent of simulation date':'NOAA Kp unavailable';
 const highStatus=earthTextureStatus(state.earthTextureQuality);
 $('earth-texture-status').textContent=state.earthTextureQuality==='4k'
  ?highStatus.status==='ready'?'4K image · 4096 × 2048 · offline':
    highStatus.status==='failed'?'4K unavailable · using 2K fallback':'Loading 4K · showing 2K temporarily'
  :highStatus.status==='ready'?'2K image · 2048 × 1024 · offline':
    highStatus.status==='failed'?'2K image unavailable':'Loading 2K image…';
 $('earth-map').dataset.projectionProbe=JSON.stringify(result.projectionProbe);
 $('earth-map').dataset.nearestSettlement=JSON.stringify({settlement:result.nearestSettlement,labelVisible:result.observerPlaceLabelVisible});
 $('earth-map').dataset.politicalProbe=JSON.stringify({style:result.mapStyle,labels:result.politicalLabels,cities:result.politicalCityLabels,catalogCount:result.cityCatalogCount,eligibleCount:result.cityEligibleCount,regionLines:result.adminBoundaryCount});
 $('earth-map').dataset.eclipseProbe=JSON.stringify({active:result.eclipseShadowActive,center:result.eclipseShadowCenter,angle:result.eclipseMoonSunAngle,centerSample:result.eclipseCenterSample,screen:result.eclipseCenterScreen,footprintType:result.eclipseFootprintType,footprint:result.eclipseFootprint,observer:result.eclipseObserverSample});
 const eclipseStatus=$('earth-eclipse-status');
 eclipseStatus.textContent=!$('earth-eclipse-shadow').checked?'Eclipse shadow hidden':
   result.eclipseShadowCenter
    ?(result.eclipseObserverSample?.totality?'TOTAL ECLIPSE at observer · ':result.eclipseObserverSample?.annularity?'ANNULAR ECLIPSE at observer · ':result.eclipseObserverSample?.penumbra>0?'PARTIAL ECLIPSE at observer · ':'')+
     'Eclipse central shadow: '+Math.abs(result.eclipseShadowCenter[1]).toFixed(2)+'°'+(result.eclipseShadowCenter[1]>=0?'N':'S')+' / '+Math.abs(result.eclipseShadowCenter[0]).toFixed(2)+'°'+(result.eclipseShadowCenter[0]>=0?'E':'W')+' · calculated from selected time'
    :result.eclipseShadowActive?'No central shadow on Earth at this instant':'No solar eclipse at selected time';
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
 if(followCelestialObject)alignSkyToSelectedObject();
 const o=canvas($('sky'));if(!o)return;const{c,w,h}=o;
 const X=w/2,Y=h/2;
 const polarBaseRadius=Math.min(w-35,h-20)/2-14;
 const extendedPolar=state.skyProjection==='polar'&&state.skyZoom<1;
 // Fit the full below-horizon hemisphere in both fullscreen and panel layouts.
 const reveal=extendedPolar?2-state.skyZoom*2:0;
 const visibleRadiusFactor=1+reveal;
 const fittedPolarZoom=extendedPolar?Math.min(state.skyZoom,(Math.min(w,h)/2-12)/(polarBaseRadius*visibleRadiusFactor)):state.skyZoom;
 const rad=polarBaseRadius*fittedPolarZoom;
 const skySun=sunHorizontal(state.date,state.lat,state.lon);
 const polarOffset=0; // The polar projection stays centred at every zoom.
 const belowHorizon=extendedPolar||(state.skyProjection==='rect'&&$('show-below-horizon').checked);
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
  c.translate(state.skyPanX,state.skyPanY+polarOffset);
  // Test probe reads the actual applied sky transform, not subsequent
  // translations used to draw individual text and star markers.
  if(window.__helioclockCaptureZoom){
   const transform=c.getTransform(),scale=$('sky').width/w;
   window.__skyTranslate=[transform.e/scale,transform.f/scale];
  }
 }
 if(state.skyProjection==='polar'){
  if(extendedPolar){
   // Reveal below-horizon sky gradually as zoom decreases from 1× to 0.5×.
   // Clip every layer to the same smoothly growing circle.
   c.beginPath();c.arc(X,Y,rad*visibleRadiusFactor,0,2*PI);c.clip();
   c.fillStyle='rgba(28,38,56,.50)';c.beginPath();c.arc(X,Y,rad*visibleRadiusFactor,0,2*PI);c.arc(X,Y,rad,0,2*PI,true);c.fill('evenodd');
   c.strokeStyle='#76869b';c.setLineDash([5,5]);c.beginPath();c.arc(X,Y,rad*visibleRadiusFactor,0,2*PI);c.stroke();c.setLineDash([]);
  }
  c.strokeStyle=extendedPolar?'#e6f2ff':'#395270';c.lineWidth=extendedPolar?2:1.3;c.beginPath();c.arc(X,Y,rad,0,2*PI);c.stroke();
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
  if(obj.alt<0&&(!belowHorizon))return;
  let x,y;
  if(state.skyProjection==='rect'){
   [x,y]=projectRect(obj.az,obj.alt,w,h,state.skyHeading);
  }else{
   const distance=rad*(1-obj.alt/90),angle=(obj.az-90-state.skyHeading)*RAD;
   x=X+distance*Math.cos(angle);y=Y+distance*Math.sin(angle);
  }
  if(name==='Moon'){
   const project=(az,alt)=>state.skyProjection==='rect'
    ?projectRect(az,alt,w,h,state.skyHeading)
    :[X+rad*(1-alt/90)*Math.cos((az-90-state.skyHeading)*RAD),
      Y+rad*(1-alt/90)*Math.sin((az-90-state.skyHeading)*RAD)];
   const angle=moonBrightDirection(m,sun,project);
   drawSkyMoon(c,x,y,7,m.illuminated,true,angle);
  }else dot(c,x,y,8,col,15);
  label(c,name,x+11,y-8,col,11);
 };
 if($('show-sky-paths').checked){
  for(const [body,color] of [['sun','#ffc56a'],['moon','#c7d6ef']]){
   c.save();c.beginPath();c.strokeStyle=color+'88';c.lineWidth=1.2;c.setLineDash([4,5]);let first=true,lastX=0;
   for(let hour=-12;hour<=12;hour+=.25){
    const time=new Date(state.date.getTime()+hour*3600000);
    const obj=body==='sun'?sunHorizontal(time,state.lat,state.lon):moon(time,state.lat,state.lon);
    if(obj.alt<0&&(!belowHorizon)){first=true;continue}
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
  mode:state.skyProjection,heading:state.skyHeading,zoom:fittedPolarZoom,
  showBelowHorizon:belowHorizon
 });
 drawMilkyWay(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:fittedPolarZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY+polarOffset,
  precession:state.usePrecession,skyLight:state.skyLight,sunAltitude:skySun.alt,
  showBelowHorizon:belowHorizon,
  showShade:$('show-milkyway-shade').checked,
  showOutline:$('show-milkyway-outline').checked,
  showCenter:$('show-galactic-center').checked,
  debugMaskMode:'planar'
 });
 // Draw grid lines above the Milky Way background so every meridian
 // remains visible. Stars, Sun, Moon and planets are drawn above the grid.
 const gridResult=drawSkyGrid(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:fittedPolarZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY+polarOffset,skyLight:state.skyLight,
  showAltAz:$('show-altaz-grid').checked,showRaDec:$('show-radec-grid').checked,
  showBelowHorizon:belowHorizon
 });
 $('sky').dataset.gridInfo=JSON.stringify(gridResult);
 const milky=milkyWayStatus();
 $('milkyway-status').textContent=milky.failed?'Milky Way outlines unavailable':milky.ready?'Milky Way contours loaded':'Milky Way contours loading';
 const mwStats=milkyWayDebugStatus('planar');
 $('mw-debug-status').textContent=mwStats.status==='ready'?
  'Mask '+mwStats.mode+' · '+mwStats.filledPercent+'% equatorial pixels · '+mwStats.sourcePolygons+' polygons · '+(mwStats.seamClosures||0)+' seam closures · footprint ±'+mwStats.footprintLimitDeg+'°':
  'Mask '+mwStats.mode+': '+mwStats.status;
 // Reserve space for constellation names before the star label pass.
 c.__skyLabelRects=[];
 const constellationNames=drawConstellationNames(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:fittedPolarZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY+polarOffset,precession:state.usePrecession,
  showBelowHorizon:belowHorizon,
  enabled:$('show-constellation-names').checked
 });
 $('sky').dataset.constellationNames=JSON.stringify(constellationNames);
 const plotted=drawSkyAtlas(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:fittedPolarZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY+polarOffset,
  magLimit:state.magLimit,showStars:$('show-stars').checked,
  showLabels:$('show-labels').checked,
  showConstellations:$('show-constellations').checked,
  precession:state.usePrecession,
  showBelowHorizon:belowHorizon,
  stellarColors:state.stellarColors,
  brightSky:state.skyLight==='daylight' && skySun.alt>=-6
 });
 const dso=drawSkyDSOs(c,{
  date:state.date,lat:state.lat,lon:state.lon,width:w,height:h,
  mode:state.skyProjection,zoom:fittedPolarZoom,heading:state.skyHeading,
  panX:state.skyPanX,panY:state.skyPanY+polarOffset,precession:state.usePrecession,
  showBelowHorizon:belowHorizon,
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
  if(planet.alt<0&&(!belowHorizon))continue;
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
 // A small, filtered comet layer. Symbols represent approximate orbit
 // locations, NOT predicted visibility or physical tail direction.
 const drawnAsteroids=[];
 for(const obj of asteroidObjects()){
  const selected=obj.name===selectedCelestialObject?.name&&['Asteroid','Dwarf planet'].includes(selectedCelestialObject?.type);
  if(!selected&&!$('show-asteroids').checked)continue;
  const p=celestialObjectPosition(obj,state.date,state.lat,state.lon,state.usePrecession);
  if(!p||(!belowHorizon&&p.alt<0))continue;
  const [x,y]=rectSky?projectRect(p.az,p.alt,w,h,state.skyHeading):
   [X+rad*(1-p.alt/90)*Math.cos((p.az-90-state.skyHeading)*RAD),
    Y+rad*(1-p.alt/90)*Math.sin((p.az-90-state.skyHeading)*RAD)];
  const sx=rectSky?w/2+(x-w/2)*state.skyZoom+state.skyPanX:x+state.skyPanX;
  const sy=rectSky?h/2+(y-h/2)*state.skyZoom+state.skyPanY:y+state.skyPanY;
  if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<0||sx>w||sy<0||sy>h)continue;
  c.save();c.translate(x,y);if(rectSky)c.scale(1/state.skyZoom,1/state.skyZoom);
  c.rotate(Math.PI/4);c.fillStyle='#dfb5ff';c.fillRect(-3,-3,6,6);c.restore();
  if($('show-labels').checked&&!selected)label(c,obj.name,x+8,y-6,'#dfb5ff',10);
  drawnAsteroids.push({name:obj.name,az:p.az,alt:p.alt,selected});
 }
 $('sky').dataset.asteroids=JSON.stringify(drawnAsteroids);
 const drawnComets=[];
 for(const object of cometObjectsForMap(state.date,$('show-comets').checked,selectedCelestialObject)){
   const targeted=object.type==='Comet'&&selectedCelestialObject?.type==='Comet'&&
    object.name===selectedCelestialObject.name;
   const p=celestialObjectPosition(object,state.date,state.lat,state.lon,state.usePrecession);
   if(!p||!Number.isFinite(p.alt)||!Number.isFinite(p.az)||
      (!targeted&&p.distanceAU>8)||(!belowHorizon&&p.alt<0))continue;
   const [x,y]=rectSky?projectRect(p.az,p.alt,w,h,state.skyHeading):
    [X+rad*(1-p.alt/90)*Math.cos((p.az-90-state.skyHeading)*RAD),
     Y+rad*(1-p.alt/90)*Math.sin((p.az-90-state.skyHeading)*RAD)];
   if(!Number.isFinite(x)||!Number.isFinite(y))continue;
   const sx=rectSky?w/2+(x-w/2)*state.skyZoom+state.skyPanX:x+state.skyPanX;
   const sy=rectSky?h/2+(y-h/2)*state.skyZoom+state.skyPanY:y+state.skyPanY;
   if(sx<0||sx>w||sy<0||sy>h)continue;
   c.save();c.translate(x,y);if(rectSky)c.scale(1/state.skyZoom,1/state.skyZoom);
   // Selected symbols are deliberately a little larger inside the yellow reticle.
   const sz=targeted?1.25:1;c.scale(sz,sz);
   c.lineCap='round';c.lineJoin='round';c.shadowColor='#071522';c.shadowBlur=3;
   c.fillStyle='#a2efff';c.strokeStyle='#9be8fc';c.lineWidth=1.5;
   c.beginPath();c.moveTo(-2,2);c.quadraticCurveTo(-9,5,-15,11);
   c.quadraticCurveTo(-9,-1,2,-2);c.closePath();c.fill();
   c.beginPath();c.arc(2,-1,3,0,2*Math.PI);c.fill();
   c.strokeStyle='#e2fdff';c.beginPath();c.arc(2,-1,3,0,2*Math.PI);c.stroke();
   c.restore();
   if($('show-labels').checked&&!targeted&&drawnComets.length<10&&p.distanceAU<3)
    label(c,object.name,x+11,y-10,'#a8edfb',10);
   drawnComets.push({name:object.name,az:p.az,alt:p.alt,x,y,distanceAU:p.distanceAU,selected:targeted});
 }
 $('sky').dataset.comets=JSON.stringify(drawnComets);
 // The selection ring is drawn in the same celestial coordinate system as the
 // other overlays; rectangular zoom uses a fixed-size screen-space glyph.
 if(selectedCelestialObject){
  const target=celestialObjectPosition(selectedCelestialObject,state.date,state.lat,state.lon,state.usePrecession);
  if(target&&Number.isFinite(target.az)&&Number.isFinite(target.alt)&&(target.alt>=0||belowHorizon)){
   const [tx,ty]=rectSky?projectRect(target.az,target.alt,w,h,state.skyHeading):
    [X+rad*(1-target.alt/90)*Math.cos((target.az-90-state.skyHeading)*RAD),
     Y+rad*(1-target.alt/90)*Math.sin((target.az-90-state.skyHeading)*RAD)];
   const screenX=rectSky?w/2+(tx-w/2)*state.skyZoom+state.skyPanX:tx+state.skyPanX;
   const screenY=rectSky?h/2+(ty-h/2)*state.skyZoom+state.skyPanY:ty+state.skyPanY;
   if(screenX>=0&&screenX<=w&&screenY>=0&&screenY<=h){
    c.save();c.translate(tx,ty);if(rectSky)c.scale(1/state.skyZoom,1/state.skyZoom);
    c.strokeStyle='#ffe16b';c.lineWidth=2.5;c.shadowColor='#000';c.shadowBlur=4;
    c.beginPath();c.arc(0,0,15,0,2*Math.PI);c.stroke();
    c.beginPath();c.moveTo(-23,0);c.lineTo(-12,0);c.moveTo(12,0);c.lineTo(23,0);
    c.moveTo(0,-23);c.lineTo(0,-12);c.moveTo(0,12);c.lineTo(0,23);c.stroke();
    c.fillStyle='#ffeaa2';c.font='bold 12px sans-serif';c.textAlign='center';
    c.fillText(selectedCelestialObject.name,0,-28);c.restore();
   }
  }
 }
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
  const baseRadius=Math.min(width-35,height-20)/2-14;
  const effectiveZoom=zoom<1?Math.min(zoom,(Math.min(width,height)/2-12)/(baseRadius*(3-2*zoom))):zoom;
  const radius=baseRadius*effectiveZoom;
  if(radius<=0)return null;
  const dx=x-width/2-panX,dy=y-height/2-panY;
  const r=Math.hypot(dx,dy);
  if(r>radius*(zoom<1?3-2*zoom:1))return null;
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
  // Simulated eclipse geometry must never be placed over a NASA photo
  // captured on a different date.
  // A hidden canvas has zero client dimensions, so expose it for layout
  // before drawing; inactive eclipses are hidden again immediately.
  $('solar-eclipse').hidden=false;
  const eclipse=renderSolarEclipse($('solar-eclipse'),state.date,state.lat,state.lon);
  const active=eclipse?.kind!=='none';
  $('solar-eclipse').hidden=!active;
  solarPhoto.hidden=active;
  $('solar-eclipse-status').hidden=!active;
  $('solar-note').hidden=active;
  $('solar-refresh').hidden=active;
  $('disc-kind').textContent=active?'SIMULATED SOLAR ECLIPSE':'SOLAR OBSERVATION';
  $('moon-tilt').textContent=active?'Calculated celestial-north-up geometry':'SDO/HMI continuum image';
  $('moon-source').textContent=active?'Astronomy Engine · computed for selected date and coordinates':'NASA Solar Dynamics Observatory · HMI';
  if(active){
   $('solar-eclipse-status').textContent='Simulated '+eclipse.kind+' solar eclipse · '+
    (eclipse.obscuration*100).toFixed(2)+'% obscuration · '+
    (eclipse.aboveHorizon?'Sun above horizon':'Sun below horizon')+' · '+
    state.date.toISOString().slice(0,16).replace('T',' ')+' UTC';
  }
  updateDiscViewport();
  return;
 }
 const info=renderMoon($('moon'),state.date,state.lat,state.lon,1,{showEarthshine:$('show-earthshine').checked});
 const event=info?.eclipse;
 const lunarStatus=$('lunar-eclipse-status');
 lunarStatus.hidden=!event||!event.active;
 if(event?.active){
  const fraction=(100*event.umbralFraction).toFixed(1);
  lunarStatus.textContent='Simulated '+event.kind+' lunar eclipse · '+fraction+
    '% lunar disc in umbra · penumbral shading illustrative · '+
    state.date.toISOString().slice(0,16).replace('T',' ')+' UTC';
 }
 const m=moon(state.date,state.lat,state.lon);
 $('moon-zoom-value').textContent=state.moonZoom.toFixed(1)+'×';
 $('moon-progress-fill').style.width=(m.phase*100).toFixed(1)+'%';
 if(info){
  lastMoonTilt=info.parallactic;
  $('moon-tilt').textContent='Bright limb from zenith: '+(info.fromZenith>0?'+':'')+info.fromZenith.toFixed(1)+'°';
  $('moon-source').textContent=(info.photoLoaded?'NASA LRO near-side mosaic · horizon-aligned':'Loading lunar photography…')+
   ($('show-earthshine').checked?' · Earthshine visualization':' · natural dark side');
 }
 updateDiscViewport();
}
let orreryHitTargets=[];
function orrery(){
 const o=canvas($('orrery'));if(!o)return;
 const {c,w,h}=o,X=w/2,Y=h/2,outer=state.orbitMode==='outer',threeD=state.orrery3D;
 c.fillStyle='#000';c.fillRect(0,0,w,h);
 const all=orbitPositions(state.date),planets=outer?all:all.slice(0,4);
 const hitTargets=[];
 const selectedComet=selectedCelestialObject?.type==='Comet'?selectedCelestialObject:null;
 const comet=selectedComet?cometHeliocentricEcliptic(selectedComet.elements,state.date):null;
 const cometPath=selectedComet?cometOrbitPath(selectedComet.elements,150):[];
 const selectedAsteroid=['Asteroid','Dwarf planet'].includes(selectedCelestialObject?.type)?selectedCelestialObject:null;
 const asteroidSelect=$('orrery-asteroid-select');
 if(asteroidSelect&&asteroidSelect.value!==(selectedAsteroid?.name||''))asteroidSelect.value=selectedAsteroid?.name||'';
 const visibleAsteroids=asteroidObjects().filter(obj=>$('orrery-show-asteroids').checked||obj.name===selectedAsteroid?.name);
 const asteroidCoords=visibleAsteroids.map(obj=>({obj,pos:asteroidPosition(obj.elements,state.date)})).filter(x=>x.pos);
 const selectedMinor=selectedComet||selectedAsteroid;
 const selectedMinorPosition=selectedComet?comet:
  asteroidCoords.find(item=>item.obj.name===selectedAsteroid?.name)?.pos||null;
 const orbitGeometry=selectedMinor?minorBodyGeometry(selectedMinor,selectedMinorPosition):null;
 const inspector=$('orrery-orbit-geometry');
 inspector.hidden=!orbitGeometry;
 if(orbitGeometry){
  const x=orbitGeometry;
  const sign=n=>(n>=0?'+':'')+n.toFixed(3);
  inspector.textContent=x.name+' · inclination '+x.inclinationDeg.toFixed(2)+'°'+
   ' · eccentricity '+x.eccentricity.toFixed(5)+
   ' · perihelion '+x.perihelionAU.toFixed(3)+' AU'+
   (x.aphelionAU===null?' · no finite aphelion':' · aphelion '+x.aphelionAU.toFixed(3)+' AU')+
   ' · ecliptic height '+sign(x.heightAU)+' AU'+
   ' · ascending node '+x.nodeDeg.toFixed(2)+'°'+
   ' · '+(x.heightAU>=0?'north of ecliptic':'south of ecliptic')+
   ' · approximate, unperturbed orbit';
 }else inspector.textContent='';
 $('orrery').dataset.orbitGeometry=JSON.stringify(orbitGeometry);
 const defaultMaximum=outer?30.07:1.524;
 const selectedDistance=comet?.distanceAU||asteroidCoords.find(x=>x.obj.name===selectedAsteroid?.name)?.pos.distanceAU;
 const maximum=fitSelectedComet&&selectedDistance?Math.max(defaultMaximum,selectedDistance*1.2):defaultMaximum;
 const scale=Math.min(w*.44,h*.43)/maximum*state.orreryZoom;
 const tilt=(threeD?state.orreryTilt:0)*RAD,rotation=(threeD?state.orreryRotation:0)*RAD;
 // Rotate the ecliptic around its pole, then tip it toward the observer.
 // Longitude zero is screen-up, longitude 90° screen-left in the top-down view.
 const project=(x,y,z=0)=>{
  const u=x*Math.cos(rotation)-y*Math.sin(rotation);
  const v=x*Math.sin(rotation)+y*Math.cos(rotation);
  return [X-u*scale,Y-(v*Math.cos(tilt)-z*Math.sin(tilt))*scale,
          v*Math.sin(tilt)+z*Math.cos(tilt)];
 };
 const position=p=>project(p.radius*Math.sin(p.angle*RAD),p.radius*Math.cos(p.angle*RAD),threeD?p.eclipticZ:0);
 // Project circular AU guides in the ecliptic plane.
 const ring=(radius,color,dash=[])=>{
  c.save();c.strokeStyle=color;c.lineWidth=.8;c.setLineDash(dash);c.beginPath();
  for(let i=0;i<=96;i++){
   const t=i*2*PI/96,[x,y]=project(radius*Math.sin(t),radius*Math.cos(t));
   if(!i)c.moveTo(x,y);else c.lineTo(x,y);
  }
  c.stroke();c.restore();
 };
 // Optional orientation reference: a low-contrast grid in the ecliptic
 // (z = 0) so it flips correctly as the camera crosses edge-on and underside.
 if($('orrery-ecliptic-mesh').checked){
  const extent=outer?30:3.5;
  const step=outer?5:.5;
  c.save();c.strokeStyle='#6e91a529';c.lineWidth=.65;
  for(let n=-extent;n<=extent+1e-8;n+=step){
   c.beginPath();
   let [sx,sy]=project(n,-extent);c.moveTo(sx,sy);
   [sx,sy]=project(n,extent);c.lineTo(sx,sy);c.stroke();
   c.beginPath();
   [sx,sy]=project(-extent,n);c.moveTo(sx,sy);
   [sx,sy]=project(extent,n);c.lineTo(sx,sy);c.stroke();
  }
  // Slightly stronger orthogonal principal axes, drawn without labels.
  c.strokeStyle='#84aac547';c.lineWidth=.8;
  for(const [a,b,d,e] of [[-extent,0,extent,0],[0,-extent,0,extent]]){
   const [sx,sy]=project(a,b),[ex,ey]=project(d,e);
   c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
  }
  c.restore();
 }
 $('orrery').dataset.mesh=String($('orrery-ecliptic-mesh').checked);
 // Orbit guides use each body's instantaneous heliocentric radius, as before;
 // actual planetary markers use their measured ecliptic heights.
 // Sample each planet's actual inclined heliocentric path over one sidereal period.
 // Cache samples by date bucket so camera movement only projects existing geometry.
 const periods={Mercury:87.97,Venus:224.7,Earth:365.256,Mars:686.98,Jupiter:4332.59,Saturn:10759.2,Uranus:30688.5,Neptune:60182};
 const orbitCache=orrery.orbitCache||(orrery.orbitCache=new Map());
 for(const p of planets){
  const period=periods[p.name],bucket=Math.floor(state.date.getTime()/86400000/period);
  const key=p.name+':'+bucket;
  let path=orbitCache.get(key);
  if(!path){
   const center=state.date.getTime();
   path=[];
   for(let i=0;i<=96;i++){
    const t=new Date(center+(i/96-.5)*period*86400000);
    const sample=orbitPositions(t).find(body=>body.name===p.name);
    path.push([sample.radius*Math.sin(sample.angle*RAD),sample.radius*Math.cos(sample.angle*RAD),sample.eclipticZ]);
   }
   orbitCache.set(key,path);
   if(orbitCache.size>32)orbitCache.delete(orbitCache.keys().next().value);
  }
  c.save();c.strokeStyle='#40526b90';c.lineWidth=.8;c.beginPath();
  path.forEach(([x,y,z],i)=>{const [sx,sy]=project(x,y,threeD?z:0);if(!i)c.moveTo(sx,sy);else c.lineTo(sx,sy)});
  c.stroke();c.restore();
 }
 if($('show-au-rings').checked){
  const values=outer?[5,10,15,20,25,30]:[.25,.5,.75,1,1.25,1.5];
  for(const au of values){
   if(au*scale<8||au*scale>Math.max(w,h))continue;
   ring(au,'#72bddd77',[3,5]);
   const [x,y]=project(au*Math.sin(-PI/4),au*Math.cos(-PI/4));
   if(x>10&&x<w-32&&y>12&&y<h-10){
    c.fillStyle='#aeddf4';c.font='10px sans-serif';c.textAlign='left';
    c.fillText((Number.isInteger(au)?au:au.toFixed(2).replace(/0$/,''))+' AU',x+4,y-4);
   }
  }
 }
 if(highlightedOrreryEvent&&Math.abs(state.date.getTime()-highlightedOrreryEvent.date.getTime())<43200000){
  const earth=all.find(p=>p.name==='Earth'),target=all.find(p=>p.name===highlightedOrreryEvent.planet);
  if(earth&&target){
   const [ex,ey]=position(earth),[px,py]=position(target);
   c.save();c.strokeStyle='#f0c477';c.lineWidth=1.8;c.setLineDash([6,5]);
   c.beginPath();c.moveTo(X,Y);c.lineTo(ex,ey);c.lineTo(px,py);c.stroke();c.restore();
  }
 }
 // The optional drop line joins the selected minor body's actual
 // heliocentric ecliptic Z to its projected location on the Z=0 plane.
 // It shares the same camera as every planetary orbit and the mesh.
 const heightGuideOn=Boolean($('orrery-height-guide').checked&&threeD&&selectedMinorPosition);
 $('orrery').dataset.heightGuide=String(heightGuideOn);
 if(heightGuideOn){
  const p=selectedMinorPosition;
  const [x1,y1]=project(p.y,p.x,p.z),[x0,y0]=project(p.y,p.x,0);
  c.save();c.strokeStyle='#e2cc9a9c';c.lineWidth=1.15;c.setLineDash([3,4]);
  c.beginPath();c.moveTo(x1,y1);c.lineTo(x0,y0);c.stroke();
  c.setLineDash([]);c.fillStyle='#b2bec3';c.beginPath();c.arc(x0,y0,2.2,0,2*PI);c.fill();c.restore();
 }
 const asteroidsPlotted=[];
 for(const {obj,pos} of asteroidCoords){
  const track=asteroidPath(obj.elements);
  c.save();c.strokeStyle='#a37db67f';c.lineWidth=.8;c.beginPath();
  track.forEach((p,i)=>{const [x,y]=project(p.y,p.x,threeD?p.z:0);if(!i)c.moveTo(x,y);else c.lineTo(x,y)});
  c.stroke();c.restore();
  const [x,y]=project(pos.y,pos.x,threeD?pos.z:0);
  if(x>=0&&x<=w&&y>=0&&y<=h){
   c.save();c.fillStyle='#dfb5ff';c.translate(x,y);c.rotate(Math.PI/4);c.fillRect(-3,-3,6,6);c.restore();
   label(c,obj.name,x+8,y-7,'#dfb5ff',10);
  }
  if(x>=0&&x<=w&&y>=0&&y<=h)hitTargets.push({name:obj.name,type:obj.type,x,y,distanceAU:pos.distanceAU});
  asteroidsPlotted.push({name:obj.name,radiusAU:pos.distanceAU});
 }
 $('orrery').dataset.asteroids=JSON.stringify(asteroidsPlotted);
 // Draw the selected comet in the same ecliptic coordinate system as planets.
 // This is a two-body guide, and open/extreme trajectories are clipped at 150 AU.
 const cometStatus=$('orrery-comet-status');
 if(comet&&selectedComet){
  c.save();c.strokeStyle='#85d8edb0';c.lineWidth=1.2;c.setLineDash([5,4]);
  for(const segment of ($('orrery-show-comet-orbit').checked?cometPath:[])){
   c.beginPath();
   segment.forEach((p,j)=>{
    const [sx,sy]=project(p.y,p.x,threeD?p.z:0);
    if(!j)c.moveTo(sx,sy);else c.lineTo(sx,sy);
   });
   c.stroke();
  }
  c.restore();
  const [cx,cy]=project(comet.y,comet.x,threeD?comet.z:0);
  if(cx>=-10&&cx<=w+10&&cy>=-10&&cy<=h+10){
   c.save();c.fillStyle='#a2edff';c.strokeStyle='#e7ffff';c.lineWidth=1.5;
   c.beginPath();c.arc(cx,cy,4,0,2*PI);c.fill();c.stroke();
   c.font='11px sans-serif';c.fillStyle='#c2f4ff';c.textAlign='left';
   c.fillText(selectedComet.name,cx+8,cy-8);c.restore();
  }
  if(cx>=0&&cx<=w&&cy>=0&&cy<=h)hitTargets.push({name:selectedComet.name,type:'Comet',x:cx,y:cy,distanceAU:comet.distanceAU});
  cometStatus.textContent=selectedComet.name+' · '+comet.distanceAU.toFixed(2)+
   ' AU from Sun · approximate two-body orbit'+
   (comet.distanceAU>maximum?' · outside view; choose Fit selected comet':'');
  $('orrery').dataset.comet=JSON.stringify({name:selectedComet.name,x:comet.x,y:comet.y,z:comet.z,radiusAU:comet.distanceAU,fit:fitSelectedComet});
 }else{
  const selectedBody=asteroidCoords.find(item=>item.obj.name===selectedAsteroid?.name)?.pos;
  cometStatus.textContent=selectedBody
   ?selectedAsteroid.name+' · '+selectedBody.distanceAU.toFixed(2)+
    ' AU from Sun · approximate two-body orbit · elements '+Math.round(selectedBody.epochAgeDays)+' days from simulated date'
   :'Select a comet or asteroid in the Sky Compass finder to see its orbit here.';
  $('orrery').dataset.comet='null';
 }
 $('orrery-fit-comet').disabled=!(comet||selectedAsteroid);
 $('orrery-fit-comet').textContent=selectedAsteroid?'Fit selected asteroid':'Fit selected comet';
 // Draw farther bodies first in the tilted view.
 const markers=planets.map(p=>({p,screen:position(p)})).sort((a,b)=>b.screen[2]-a.screen[2]);
 dot(c,X,Y,outer?5:12,'#ffcd7d',18);
 markers.forEach(({p,screen:[x,y]})=>{
  hitTargets.push({name:p.name,type:'Planet',x,y,distanceAU:p.radius});
  dot(c,x,y,outer?Math.max(2.6,p.r*.75):p.r,p.color,9);
  if(outer||p.radius*scale>20)label(c,p.name,x+8,y-7,p.color,10);
  if(selectedCelestialObject?.type==='Planet'&&selectedCelestialObject.name===p.name){
   c.save();c.beginPath();c.arc(x,y,12,0,2*PI);c.strokeStyle='#ffe5a0';c.lineWidth=1.4;c.stroke();c.restore();
  }
 });
 orreryHitTargets=hitTargets;
 $('orrery').dataset.hitTargets=JSON.stringify(hitTargets);
 const selected=hitTargets.find(t=>t.name===selectedCelestialObject?.name);
 $('orrery-inspection').textContent=selected
  ?selected.name+' · '+selected.type+' · '+selected.distanceAU.toFixed(3)+' AU from Sun · '+state.date.toISOString().slice(0,16).replace('T',' ')+' UTC'+
   (selected.type==='Planet'?' · Astronomy Engine ephemeris':' · approximate two-body orbit')
  :'Click or tap a plotted body to inspect its heliocentric position.';
 $('planet-legend').innerHTML=planets.map(p=>'<span style="color:'+p.color+'">● '+p.name+'</span>').join('');
 $('au-scale-description').textContent=(outer?'Outer view · 5 AU intervals':'Inner view · 0.25 AU intervals')+(threeD?' · ecliptic perspective':'')+(fitSelectedComet&&selectedDistance?' · fitted selected object':'');
}
function formatCoord(n,positive,negative){return Math.abs(n).toFixed(2)+'° '+(n>=0?positive:negative)}
let almanacCurrent=null;
function render(){
 renderCelestialFinder();
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
 renderSolarJourney(state.date,state.lat,state.lon,s.alt,sunHorizontal);
 $('hero-moon-phase').textContent=m.name+' · '+(m.illuminated*100).toFixed(0)+'%';
 $('hero-daylight').textContent=durationText(ev.duration);
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
 $('hero-local-time').textContent=v.time;
 $('hero-local-date').textContent=state.date.toLocaleDateString('en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
 $('hero-time-zone').textContent=v.zone+' · '+v.offsetStr;
 $('hero-time-status').textContent=state.live?'● LIVE · LOCAL TIME':'◷ SIMULATED · LOCAL TIME';
 $('hero-time').classList.toggle('is-simulated',!state.live);
 $('dock-local-time').textContent=v.time;
 $('dock-time-zone').textContent=v.zone+' · '+v.offsetStr;
 $('dock-date').value=p.date;$('dock-time').value=p.time;
 $('dock-scrubber').value=state.date.getHours()*60+state.date.getMinutes();
 $('dock-play').textContent=state.playing?'Ⅱ':'▶';
 $('dock-live').classList.toggle('is-live',state.live);
}
function selectDockLocal(){
 const date=$('dock-date').value,time=$('dock-time').value;
 if(!date||!valid24HourTime(time)){notice('Enter time in 24-hour HH:MM format (00:00–23:59).');updateLocalDisplay();return;}
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
$('observe-time').addEventListener('input',e=>{if(valid24HourTime(e.target.value))selectDate()});
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
for(const [id,minutes] of [['step-back-day',-1440],['step-back-hour',-60],['step-back-minute',-1],['step-forward-minute',1],['step-forward-hour',60],['step-forward-day',1440]]){
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
$('sky-heading').addEventListener('input',()=>{followCelestialObject=false;renderCelestialFinder();});
viewRange('sky-heading','skyHeading');
// Slider zoom is centred; wheel zoom targets the pointer position.
$('sky-zoom').addEventListener('input',e=>setPolarSkyZoom(Number(e.target.value)));
$('sky-zoom-out').addEventListener('click',()=>setPolarSkyZoom(Math.round(clamp(state.skyZoom/1.25,state.skyProjection==='polar'?.5:1,3)*100)/100));
$('sky-zoom-in').addEventListener('click',()=>setPolarSkyZoom(Math.round(clamp(state.skyZoom*1.25,1,3)*100)/100));
viewRange('earth-zoom','earthZoom');
// Shared numeric readouts for slider, mouse, touch, and reset input paths.
function syncOrreryAngles(){
 for(const [id,key] of [['orrery-tilt','orreryTilt'],['orrery-rotation','orreryRotation']]){
  $(id).value=String(state[key]);
  $(id+'-number').value=String(Math.round(state[key]*10)/10);
 }
}
// Camera-only changes redraw the orrery, not the Earth, sky, Moon and almanac.
function orreryRange(id,key){
 $(id).addEventListener('input',e=>{
  state[key]=Number(e.target.value);
  const number=$((id==='orrery-tilt'?'orrery-tilt-number':id==='orrery-rotation'?'orrery-rotation-number':''));
  if(number)number.value=String(state[key]);
  orrery();
 });
}
orreryRange('orrery-zoom','orreryZoom');
$('orrery-3d').addEventListener('change',e=>{
 state.orrery3D=e.target.checked;
 document.querySelectorAll('.orrery-3d-setting').forEach(el=>el.hidden=!state.orrery3D);
 orrery();
});
orreryRange('orrery-tilt','orreryTilt');
orreryRange('orrery-rotation','orreryRotation');
for(const [id,key] of [['orrery-tilt','orreryTilt'],['orrery-rotation','orreryRotation']]){
 const field=$(id+'-number');
 field.addEventListener('change',()=>{
  const value=Number(field.value);
  state[key]=Number.isFinite(value)?Math.max(-180,Math.min(180,value)):0;
  field.value=String(state[key]);
  $(id).value=String(state[key]);
  orrery();
 });
}
$('orrery-ecliptic-mesh').addEventListener('change',()=>{orrery();persistPrefs()});
// Shared disc viewer handles the Moon slider and pan/zoom interaction.
$('show-au-rings').addEventListener('change',orrery);
for(const button of document.querySelectorAll('[data-orbit-mode]')){
 button.addEventListener('click',()=>{
  state.orbitMode=button.dataset.orbitMode;
  for(const other of document.querySelectorAll('[data-orbit-mode]')){
   const selected=other===button;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));
  }
  state.orreryZoom=1;$('orrery-zoom').value=1;updateOrreryEventChoices();render();
 });
}
$('orrery-event-planet').addEventListener('change',updateOrreryEventChoices);
$('orrery-event-kind').addEventListener('change',()=>{
 highlightedOrreryEvent=null;
 $('orrery-event-status').textContent='Choose Previous or Next to find a planetary event.';
 render();
});
for(const button of document.querySelectorAll('[data-event-direction]')){
 button.addEventListener('click',()=>{
  const direction=Number(button.dataset.eventDirection);
  const planet=$('orrery-event-planet').value,kind=$('orrery-event-kind').value;
  try{
   const found=findPlanetaryEvent(planet,kind,state.date,direction);
   pausePlayback();state.live=false;state.date=found.date;setDateInputs();
   highlightedOrreryEvent=found;
   const label=eventOptions(planet).find(x=>x.value===kind).label;
   $('orrery-event-status').textContent=planet+' · '+label+' · '+found.date.toISOString().slice(0,16).replace('T',' ')+' UTC · Earth distance '+found.distanceAU.toFixed(3)+' AU';
   render();
  }catch(error){$('orrery-event-status').textContent='Could not find event: '+String(error.message||error)}
 });
}
updateOrreryEventChoices();
function chooseOrreryMinorBody(object){
 selectedCelestialObject=object;
 followCelestialObject=false;
 fitSelectedComet=false;
 finderEventsCache={key:null,result:null};
 $('orrery-minor-body-message').textContent=object?object.name+' selected; orbit is approximate.':'Selection cleared.';
 renderCelestialFinder();
 sky();orrery();
}
$('orrery-show-asteroids').addEventListener('change',()=>{orrery();persistPrefs()});
$('orrery-show-comet-orbit').addEventListener('change',()=>{orrery();persistPrefs()});
$('orrery-height-guide').addEventListener('change',()=>{orrery();persistPrefs()});
$('orrery-asteroid-select').addEventListener('change',()=>{
 const object=asteroidObjects().find(o=>o.name===$('orrery-asteroid-select').value);
 if(object)chooseOrreryMinorBody(object);
});
$('orrery-find-comet').addEventListener('click',()=>{
 const text=$('orrery-comet-search').value.trim();
 if(!text){$('orrery-minor-body-message').textContent='Enter a comet name first.';return}
 const matches=findCelestialObjects(text,12).filter(o=>o.type==='Comet');
 const exact=matches.find(o=>o.name.toLowerCase()===text.toLowerCase())||matches[0];
 if(!exact){$('orrery-minor-body-message').textContent='No matching comet in the bundled MPC catalogue.';return}
 chooseOrreryMinorBody(exact);
});
$('orrery-comet-search').addEventListener('keydown',e=>{
 if(e.key==='Enter'){e.preventDefault();$('orrery-find-comet').click()}
});
$('orrery-clear-minor-body').addEventListener('click',()=>{
 chooseOrreryMinorBody(null);
 $('orrery-comet-search').value='';
 $('celestial-search-input').value='';
 renderCelestialFinder();
});
// Pointer hit testing is screen-space and uses the same projected positions as
// rendering. Ignore actual drag gestures so a camera rotation cannot select
// an arbitrary planet when the pointer is released.
{
 const canvas=$('orrery');const starts=new Map();
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0&&e.pointerType==='mouse')return;
  starts.set(e.pointerId,{x:e.clientX,y:e.clientY,moved:false});
 });
 canvas.addEventListener('pointermove',e=>{
  const start=starts.get(e.pointerId);
  if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)start.moved=true;
 });
 canvas.addEventListener('pointercancel',e=>starts.delete(e.pointerId));
 canvas.addEventListener('pointerup',e=>{
  const start=starts.get(e.pointerId);starts.delete(e.pointerId);
  if(!start||start.moved||!state.orrery3D&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>8)return;
  const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  const candidate=orreryHitTargets.map(hit=>({...hit,dist:Math.hypot(hit.x-x,hit.y-y)}))
   .filter(hit=>hit.dist<=14).sort((a,b)=>a.dist-b.dist)[0];
  if(!candidate)return;
  const object=findCelestialObjects(candidate.name,12).find(o=>o.name===candidate.name&&o.type===candidate.type);
  if(!object)return;
  chooseOrreryMinorBody(object);
 });
}
$('orrery-fit-comet').addEventListener('click',()=>{
 if(!['Comet','Asteroid','Dwarf planet'].includes(selectedCelestialObject?.type))return;
 fitSelectedComet=true;orrery();
});
// Discs share pan/zoom controls, but preserve independent zoom and pan between views.
// A cursor-anchored zoom keeps the solar surface feature under the pointer stationary.
const discStage=$('disc-stage'),solarPhoto=$('solar-photo');
const solarSource='https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_HMIIC.jpg';
let discFocus=null,dragDisc=null,solarRequest=0;
let lastMoonTilt=0;
// NASA quicklook image capture time is not machine-readable; retrieval time
// is used only as a clearly labelled approximation, independent of simulation.
let solarObservationProxy=new Date();
let solarImageIsFallback=false;
let solarFetchedAt=null;
function updateSolarOrientationReadout(){
 const {B0,P}=solarDiscOrientation(solarObservationProxy);
 const extra=solarImageIsFallback?' · offline photo date unknown':' · computed at image retrieval time';
 $('solar-orientation').textContent='B₀ '+(B0>=0?'+':'')+B0.toFixed(2)+'° · P '+(P>=0?'+':'')+P.toFixed(2)+'°'+extra+' · photo assumed solar-north-up';
}
// A single geometry factory serves drawing and pointer readouts. The grid is
// painted at unit zoom, then shares the photograph's actual CSS transform.
function discCoordinateGeometry(baseOnly=false){
 const sun=state.discView==='sun';
 const b0=sun?solarDiscOrientation(solarObservationProxy).B0:0;
 return discGeometry(state.discView,discStage.clientWidth,discStage.clientHeight,
  baseOnly?1:sun?state.sunZoom:state.moonZoom,
  baseOnly?0:sun?state.sunPanX:state.moonPanX,
  baseOnly?0:sun?state.sunPanY:state.moonPanY,
  sun?0:lastMoonTilt,b0);
}
function redrawDiscGrid(){
 const base=discCoordinateGeometry(true);
 const overlay=$('disc-coordinate-grid');
 overlay.dataset.rotationDegrees=(base.angle*180/Math.PI).toFixed(3);
 const zoom=state.discView==='sun'?state.sunZoom:state.moonZoom;
 paintDiscGrid(overlay,state.discView,base,$('disc-grid-toggle').checked &&
  !(state.discView==='sun'&&!$('solar-eclipse').hidden),base.r*zoom);
}
function updateDiscCoordinates(clientX,clientY){
 const box=discStage.getBoundingClientRect();
 const point=screenToSurface(clientX-box.left,clientY-box.top,discCoordinateGeometry());
 $('disc-coordinate-readout').textContent=point?formatSurface(point,state.discView):'Outside visible disc';
}
function updateDiscViewport(){
 const sunMode=state.discView==='sun';
 const zoom=sunMode?state.sunZoom:state.moonZoom;
 const panX=sunMode?state.sunPanX:state.moonPanX,panY=sunMode?state.sunPanY:state.moonPanY;
 const el=sunMode?($('solar-eclipse').hidden?solarPhoto:$('solar-eclipse')):$('moon');
 const transform='translate('+panX+'px,'+panY+'px) scale('+zoom+')';
 el.style.transform=transform;
 $('disc-coordinate-grid').style.transform=transform;
 if(sunMode){
  solarPhoto.style.transform=transform;
  $('solar-eclipse').style.transform=transform;
 }
 redrawDiscGrid();
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
 $('solar-eclipse').hidden=true;$('solar-eclipse-status').hidden=true;
 $('lunar-eclipse-status').hidden=sun;
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
 if(sun)updateSolarOrientationReadout();
 render();
}
// Eclipse Explorer shares the global simulation clock, observer and existing
// disc viewer. It never uses the present-day clock for past/future searches.
let selectedEclipseEvent=null;
const eclipseUTC=d=>d.toISOString().slice(0,16).replace('T',' ')+' UTC';
function updateEclipseFilters(){
 const lunar=$('eclipse-category').value==='lunar';
 const filter=$('eclipse-filter'),old=filter.value;
 const choices=lunar?[
  ['any','Any, including penumbral'],['umbral','Partial umbral or total'],['total','Total only']
 ]:[
  ['any','Any, including grazing partials'],['partial','Partial only'],['central','Annular or total']
 ];
 filter.replaceChildren(...choices.map(([value,label])=>new Option(label,value)));
 if(choices.some(([value])=>value===old))filter.value=old;
 $('eclipse-scope').options[0].textContent=lunar?'Moon above horizon at maximum':'Visible from observer';
 selectedEclipseEvent=null;
 $('eclipse-contacts').hidden=true;
 $('eclipse-event-status').textContent='Choose Previous or Next to explore an eclipse.';
}
function setSimulationInstant(date){
 pausePlayback();state.date=new Date(date);state.live=false;
 setDateInputs();render();
}
function eclipseContactPoints(event){
 if(event.category==='solar'){
  if(!event.contacts)return [['Maximum (global)',event.peak]];
  return [
   ['First contact',event.contacts.partialBegin],
   ['Central begins',event.contacts.centralBegin],
   ['Maximum',event.peak],
   ['Central ends',event.contacts.centralEnd],
   ['Last contact',event.contacts.partialEnd]
  ].filter(([,date])=>date instanceof Date && Number.isFinite(date.getTime()));
 }
 const phases=event.phases;
 return [
  ['Penumbral begins',phases.penumbral?.begin],
  ['Umbral begins',phases.umbral?.begin],
  ['Totality begins',phases.total?.begin],
  ['Maximum',event.peak],
  ['Totality ends',phases.total?.end],
  ['Umbral ends',phases.umbral?.end],
  ['Penumbral ends',phases.penumbral?.end]
 ].filter(([,date])=>date instanceof Date && Number.isFinite(date.getTime()));
}
function showEclipseResult(event){
 selectedEclipseEvent=event;
 const scope=event.category==='solar'?(event.scope==='local'?'At observer':'Global'):(
  event.visibleAtPeak?'Moon above horizon at maximum':'Moon below horizon at maximum');
 const percent=event.obscuration==null?'':(' · '+(100*event.obscuration).toFixed(1)+'% obscuration');
 const warning=event.scope==='global'&&event.category==='solar'?
  ' · Global maximum does not imply an eclipse at the observer.':
  event.category==='solar'&&!event.visibleAtPeak?' · Sun below horizon at maximum.':'';
 $('eclipse-event-status').textContent=event.kind[0].toUpperCase()+event.kind.slice(1)+' '+event.category+
  ' eclipse · '+eclipseUTC(event.peak)+' · '+scope+percent+warning;
 const buttons=eclipseContactPoints(event).map(([title,date])=>{
  const button=document.createElement('button');
  button.type='button';button.textContent=title;
  button.title=eclipseUTC(date);
  button.addEventListener('click',()=>setSimulationInstant(date));
  return button;
 });
 $('eclipse-contacts').replaceChildren(...buttons);
 $('eclipse-contacts').hidden=false;
 // A global search selects a global instant, not a fabricated local eclipse.
 showDisc(event.category==='solar'?'sun':'moon');
 setSimulationInstant(event.peak);
}
let eclipseSearchController=null;
function cancelEclipseSearch(){
 if(eclipseSearchController){eclipseSearchController.abort();eclipseSearchController=null}
 $('eclipse-previous').disabled=false;$('eclipse-next').disabled=false;
 $('eclipse-cancel').hidden=true;
}
async function navigateEclipse(direction){
 cancelEclipseSearch();
 const controller=new AbortController();eclipseSearchController=controller;
 const category=$('eclipse-category').value,scope=$('eclipse-scope').value;
 const filter=$('eclipse-filter').value,horizon=Number($('eclipse-horizon').value);
 const reference=new Date(state.date),latitude=state.lat,longitude=state.lon;
 const status=$('eclipse-event-status');
 $('eclipse-previous').disabled=true;$('eclipse-next').disabled=true;
 $('eclipse-cancel').hidden=false;
 status.textContent='Searching '+(direction<0?'previous':'next')+' '+category+' eclipse…';
 try{
  const event=await findEclipseAsync({
   category,scope,date:reference,direction,latitude,longitude,filter,
   maxSpanYears:horizon,signal:controller.signal,
   requireAboveHorizon:scope==='local'&&category==='lunar',
   onProgress:({yearsSearched,eventsChecked})=>{
    if(eclipseSearchController===controller)
     status.textContent='Searching '+(direction<0?'backward':'forward')+
      ' · '+yearsSearched+' years explored · '+eventsChecked+' eclipse candidates checked…';
   }
  });
  if(eclipseSearchController!==controller)return;
  if(event)showEclipseResult(event);
  else{
   selectedEclipseEvent=null;$('eclipse-contacts').hidden=true;
   status.textContent='No matching eclipse found within '+horizon.toLocaleString('en-CA')+
    ' years '+(direction<0?'before':'after')+' the selected date. Try a broader filter or longer horizon.';
  }
 }catch(error){
  if(eclipseSearchController===controller&&!controller.signal.aborted)
   status.textContent='Eclipse search failed: '+String(error?.message||error);
 }finally{if(eclipseSearchController===controller)cancelEclipseSearch()}
}
$('eclipse-cancel').addEventListener('click',()=>{
 if(!eclipseSearchController)return;
 cancelEclipseSearch();$('eclipse-event-status').textContent='Eclipse search cancelled.';
});
$('eclipse-category').addEventListener('change',()=>{cancelEclipseSearch();updateEclipseFilters()});
$('eclipse-scope').addEventListener('change',()=>{
 cancelEclipseSearch();selectedEclipseEvent=null;$('eclipse-contacts').hidden=true;
 $('eclipse-event-status').textContent='Choose Previous or Next to explore an eclipse.';
});
$('eclipse-filter').addEventListener('change',()=>{
 cancelEclipseSearch();selectedEclipseEvent=null;$('eclipse-contacts').hidden=true;
 $('eclipse-event-status').textContent='Choose Previous or Next to explore an eclipse.';
});
$('eclipse-previous').addEventListener('click',()=>navigateEclipse(-1));
$('eclipse-next').addEventListener('click',()=>navigateEclipse(1));
updateEclipseFilters();

function refreshSolarImage(){
 const stamp=Date.now();solarRequest++;
 $('solar-status').textContent='NASA SDO · fetching latest_2048_HMIIC.jpg…';
 solarPhoto.onload=()=>{
  // The actual capture time is printed on NASA's image; do not confuse
  // when a browser request finished with the astrophysical observation time.
  solarObservationProxy=new Date();solarFetchedAt=solarObservationProxy.toISOString();solarImageIsFallback=false;
  updateSolarOrientationReadout();redrawDiscGrid();
  $('solar-status').textContent='NASA SDO HMI · latest_2048_HMIIC.jpg · fetched '+
   sourceTimestamp(solarFetchedAt)+' ('+sourceAge(solarFetchedAt)+') · capture time unverified (check image stamp)';
  $('solar-status').title=solarSource+' · Download time is NOT the solar observation time.';
 };
 solarPhoto.onerror=()=>{
  // A packaged offline reference is explicitly labelled as a fallback.
  if(!solarPhoto.src.endsWith('/solar-fallback.jpg')){
   solarImageIsFallback=true;
   updateSolarOrientationReadout();redrawDiscGrid();
   $('solar-status').textContent='NASA SDO · solar-fallback.jpg · packaged offline reference · capture date unknown · NOT current';
   $('solar-status').title='Packaged static image: observation date unknown.';
   solarPhoto.onload=null;solarPhoto.onerror=null;solarPhoto.src='./solar-fallback.jpg';
  }else $('solar-status').textContent='NASA SDO · solar image unavailable; no current observation loaded';
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
$('disc-grid-toggle').addEventListener('change',redrawDiscGrid);
window.addEventListener('resize',redrawDiscGrid);
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
$('earth-pick-observer').addEventListener('click',()=>setEarthObserverPickMode(!pickingEarthObserver));
$('earth-locate-me').addEventListener('click',()=>{
 setEarthObserverPickMode(false);
 $('locate').click(); // Reuse the existing browser-geolocation request and error handling.
});
$('earth-map').addEventListener('pointerup',e=>{
 if(!pickingEarthObserver||e.button!==0)return;
 const el=$('earth-map'),box=el.getBoundingClientRect();
 const x=e.clientX-box.left,y=e.clientY-box.top;
 const coords=earthCoordinatesAt(x,y,el.clientWidth,el.clientHeight,state);
 if(!coords){
  notice('Choose a point on the Earth surface, not outside the globe.');
  return;
 }
 // Preserve the current map camera: flat-map tilt is relative to
 // observer latitude, whereas globe rotation is an absolute orientation.
 if(state.earthProjection!=='globe')state.earthLat+=coords.lat-state.lat;
 state.lat=coords.lat;state.lon=coords.lon;
 $('latitude').value=coords.lat.toFixed(4);
 $('longitude').value=coords.lon.toFixed(4);
 // The picked location is the observer, not a camera command: keep the
 // current Earth view intact and update every other visualization.
 setEarthObserverPickMode(false);
 notice('Observer moved to '+coords.lat.toFixed(3)+'°, '+coords.lon.toFixed(3)+'°. Earth view unchanged.');
 render();persistPrefs();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pickingEarthObserver)setEarthObserverPickMode(false)});

$('earth-map-style').addEventListener('change',e=>{
 state.earthMapStyle=['physical','hybrid','political'].includes(e.target.value)?e.target.value:'physical';
 render();
});
for(const id of ['earth-country-borders','earth-region-borders','earth-city-labels'])$(id).addEventListener('change',render);
$('earth-texture-quality').addEventListener('change',e=>{
 state.earthTextureQuality=e.target.value==='4k'?'4k':'2k';
 render();
});
for(const id of ['earth-twilight-civil','earth-twilight-nautical','earth-twilight-astronomical','earth-twilight-night'])
 $(id).addEventListener('change',render);
for(const id of ['earth-city-lights','earth-aurora','earth-eclipse-shadow'])$(id).addEventListener('change',render);
$('earth-clouds').addEventListener('change',()=>{
 if($('earth-clouds').checked)refreshClouds().catch(()=>{});
 render();
});
$('earth-cloud-opacity').addEventListener('input',()=>{
 $('earth-cloud-opacity-value').textContent=$('earth-cloud-opacity').value+'%';
 render();
});
$('earth-cloud-refresh').addEventListener('click',()=>refreshClouds(true).catch(()=>{}));
window.addEventListener('helioclock-cloud-ready',render);
$('earth-space-weather-refresh').addEventListener('click',()=>refreshSpaceWeather().catch(()=>{}));
window.addEventListener('helioclock-space-weather',render);
window.addEventListener('helioclock-earth-texture-ready',render);
startSpaceWeather();
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
$('show-comets').addEventListener('change',render);
$('show-asteroids').addEventListener('change',render);
for(const id of ['show-milkyway-shade','show-milkyway-outline','show-galactic-center'])$(id).addEventListener('change',render);
window.addEventListener('helioclock-milkyway-ready',render);
$('mw-copy-debug').addEventListener('click',async()=>{
 const chosen='planar';
 const debug={
  version:59,utc:state.date.toISOString(),
  local:state.date.toLocaleString('en-GB',{hour12:false,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone}),
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
$('sky-reset').addEventListener('click',()=>{followCelestialObject=false;renderCelestialFinder();});
reset('sky-reset',{skyZoom:1,skyPanX:0,skyPanY:0,skyHeading:0});
// Reset map orientation to the observer, not Greenwich/the equator.
$('earth-reset').addEventListener('click',()=>{
 state.earthZoom=1;state.earthLon=state.lon;state.earthLat=state.lat;
 $('earth-zoom').value=1;render();
});
$('orrery-reset').addEventListener('click',()=>{
 state.orreryZoom=1;state.orreryTilt=55;state.orreryRotation=0;
 $('orrery-zoom').value=1;
 syncOrreryAngles();orrery();
});
function wheelZoom(canvasId,controlId,key,lo,hi){
 $(canvasId).addEventListener('wheel',e=>{e.preventDefault();state[key]=clamp(state[key]*(e.deltaY>0?.88:1.14),lo,hi);$(controlId).value=state[key];if(canvasId==='orrery')orrery();else render()},{passive:false});
}
// In polar azimuthal projection, changing zoom scales every point's
// displacement from the chart centre. Correct the pan to keep the chosen
// sky position stationary, including when the pointer isn't near zenith.
function setPolarSkyZoom(next,clientX=null,clientY=null){
 if(followCelestialObject){followCelestialObject=false;renderCelestialFinder();}
 const canvas=$('sky'),rect=canvas.getBoundingClientRect();
 const old=state.skyZoom;
 next=clamp(next,state.skyProjection==='polar'?.5:1,3);
 if(next===old)return;
 const px=clientX===null?rect.width/2:clientX-rect.left;
 const py=clientY===null?rect.height/2:clientY-rect.top;
 if(state.skyProjection==='polar'&&next<=1){
  // Below the horizon threshold, zoom about the canvas centre, not the pointer.
  // A previous cursor-anchored pan must not displace the shrinking sky disc.
  state.skyPanX=0;state.skyPanY=0;
 }else if(state.skyProjection==='polar'||state.skyProjection==='rect'){
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
 setPolarSkyZoom(Math.round(clamp(state.skyZoom*(e.deltaY>0?.88:1.14),state.skyProjection==='polar'?.5:1,3)*100)/100,e.clientX,e.clientY);
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
  if(id==='sky'&&followCelestialObject){followCelestialObject=false;renderCelestialFinder();}
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
     $('orrery-zoom').value=state.orreryZoom;orrery();
    }
   }
   pinchDistance=d;return;
  }
  if(pointers.size>1)return;
  const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  if(id==='earth-map'&&pickingEarthObserver)return;
  start={x:e.clientX,y:e.clientY};
  if(id==='orrery'&&e.pointerType==='touch')return;onMove(dx,dy,el,e);if(id==='orrery')orrery();else render();
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
dragCanvas('orrery',(dx,dy,el)=>{
 if(!state.orrery3D)return;
 // A full-width horizontal drag rotates 360 degrees; a full-height
 // vertical drag changes the camera elevation by 90 degrees.
 state.orreryRotation=((state.orreryRotation+dx/el.clientWidth*360+180)%360+360)%360-180;
 state.orreryTilt=clamp(state.orreryTilt+dy/el.clientHeight*180,-180,180);
 syncOrreryAngles();
});
// Some Android browsers cancel pointer capture during touch gestures.
// Use native single-touch movement as a fallback for the 3D camera.
{
 const el=$('orrery');let last=null;
 el.addEventListener('touchstart',e=>{
  last=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;
 },{passive:true});
 el.addEventListener('touchmove',e=>{
  if(!state.orrery3D||e.touches.length!==1||!last){last=null;return}
  e.preventDefault();
  const t=e.touches[0],dx=t.clientX-last.x,dy=t.clientY-last.y;
  last={x:t.clientX,y:t.clientY};
  // Touch events and pointer events can both fire; suppress duplicate
  // pointer movement while the native touch fallback owns this gesture.
  state.orreryRotation=((state.orreryRotation+dx/el.clientWidth*360+180)%360+360)%360-180;
  state.orreryTilt=clamp(state.orreryTilt+dy/el.clientHeight*180,-180,180);
  syncOrreryAngles();
  orrery();
 },{passive:false});
 el.addEventListener('touchend',()=>{last=null},{passive:true});
 el.addEventListener('touchcancel',()=>{last=null},{passive:true});
}
dragCanvas('earth-map',(dx,dy,el)=>{
 state.earthLon=wrap(state.earthLon-dx/el.clientWidth*360/state.earthZoom+180,360)-180;
 const delta=dy/el.clientHeight*180/state.earthZoom;
 // Flat maps tilt relative to the observer's latitude (Reset is 0° tilt).
 // The globe retains its independent absolute latitude rotation bounds.
 state.earthLat=state.earthProjection==='globe'
  ?clamp(state.earthLat+delta,-75,75)
  :clamp(state.earthLat+delta,state.lat-75,state.lat+75);
});

for(const [id,minutes] of [['dock-prev-day',-1440],['dock-prev-hour',-60],['dock-prev-minute',-1],['dock-next-minute',1],['dock-next-hour',60],['dock-next-day',1440]]){
 $(id).addEventListener('click',()=>{pausePlayback();shiftTime(minutes)});
}
$('dock-date').addEventListener('change',selectDockLocal);
$('dock-time').addEventListener('change',selectDockLocal);
$('dock-time').addEventListener('input',e=>{if(valid24HourTime(e.target.value))selectDockLocal()});
$('dock-scrubber').addEventListener('input',e=>{
 pausePlayback();const minutes=Number(e.target.value);
 const d=state.date;
 state.date=new Date(d.getFullYear(),d.getMonth(),d.getDate(),Math.floor(minutes/60),minutes%60);
 state.live=false;setDateInputs();render();
});
$('dock-play').addEventListener('click',()=>$('play-time').click());
$('dock-live').addEventListener('click',()=>$('now').click());
let compactFullscreenAtEntry=false;
for(const button of document.querySelectorAll('[data-fullscreen]')){
 button.addEventListener('click',async()=>{
  const panel=button.closest('.panel');
  // Firefox may change viewport dimensions upon entering fullscreen.
  if(!document.fullscreenElement)compactFullscreenAtEntry=window.innerWidth<=1050;
  try{
   if(document.fullscreenElement===panel)await document.exitFullscreen();
   else await panel.requestFullscreen();
  }catch(e){notice('Fullscreen could not be opened: '+e.message)}
 });
}
// Cycle actual panels without intercepting their pan and pinch gestures.
const fullscreenNavigationPanels=[...document.querySelectorAll('.panel')].filter(p=>p.querySelector(':scope > [data-fullscreen]'));
let fullscreenNavigationBar=null;
function availableFullscreenPanels(){
 return fullscreenNavigationPanels.filter(p=>!p.hidden&&!p.closest('[hidden]'));
}
async function navigateFullscreenPanel(direction){
 const active=document.fullscreenElement;
 if(!active?.classList.contains('panel'))return;
 const panels=availableFullscreenPanels(),i=panels.indexOf(active);
 if(i<0||panels.length<2)return;
 const next=panels[(i+direction+panels.length)%panels.length];
 try{
  if(document.activeElement?.closest('.panel')===active)document.activeElement.blur();
  await next.requestFullscreen();
 }catch(e){notice('Could not switch fullscreen panel: '+e.message)}
}
function syncFullscreenNavigation(){
 fullscreenNavigationBar?.remove();fullscreenNavigationBar=null;
 const active=document.fullscreenElement;
 if(!active?.classList.contains('panel'))return;
 const panels=availableFullscreenPanels(),i=panels.indexOf(active);
 if(i<0||panels.length<2)return;
 const nav=document.createElement('nav');nav.className='fullscreen-panel-navigation';
 nav.setAttribute('aria-label','Fullscreen panel navigation');
 const prev=document.createElement('button');prev.type='button';prev.textContent='‹';
 prev.setAttribute('aria-label','Previous fullscreen panel');prev.title='Previous panel (Left arrow)';
 const counter=document.createElement('span');counter.textContent=(i+1)+'/'+panels.length;
 counter.setAttribute('aria-label','Panel '+(i+1)+' of '+panels.length);
 const next=document.createElement('button');next.type='button';next.textContent='›';
 next.setAttribute('aria-label','Next fullscreen panel');next.title='Next panel (Right arrow)';
 prev.addEventListener('click',()=>navigateFullscreenPanel(-1));
 next.addEventListener('click',()=>navigateFullscreenPanel(1));
 nav.append(prev,counter,next);active.appendChild(nav);fullscreenNavigationBar=nav;
}
// In fullscreen, Left/Right are global panel-navigation shortcuts even if
// the persistent time dock has keyboard focus. Capture before range inputs,
// time controls and their native shadow-DOM handlers consume those keys.
// Modified arrows remain available for platform/browser shortcuts.
document.addEventListener('keydown',e=>{
 if(!document.fullscreenElement?.classList.contains('panel')||e.repeat||
    e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
 if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
 e.preventDefault();
 e.stopImmediatePropagation();
 navigateFullscreenPanel(e.key==='ArrowRight'?1:-1);
},true);
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
 'earth-panel':['.earth-tools','.earth-political-tools','.earth-twilight-controls','.earth-overlay-tools','.map-legend'],
 'sky-panel':['.celestial-finder','.sky-light-controls','.sky-observatory-toolbar','.sky-sidereal-toolbar','.sky-debug-tools','.sky-options','.sky-cursor-readout','.celestial-readout','.sky-legend'],
 'moon-panel':['.eclipse-explorer','.disc-view-select','.earthshine-toggle','.moon-view-tools','.moon-orientation','.solar-observation-note','.moon-bottom'],
 'orrery-panel':['.orrery-controls','.orrery-events','.planet-legend']
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
 if((!compactFullscreenQuery.matches&&!compactFullscreenAtEntry&&!mobileFullscreenPanel)||!panel?.classList.contains('panel')||
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
 syncFullscreenNavigation();
 if(!activePanel)compactFullscreenAtEntry=false;
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
  const built=info.built_utc?new Date(info.built_utc).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',hour12:false,timeZone:'UTC'})+' UTC':'date not recorded';
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
const defaultLayout={hero:true,chart:true,earth:true,sky:true,moon:true,orrery:true,details:true,almanac:true};
// Upgrade old layouts once; previous builds never displayed the almanac by default.
const migratingAlmanacLayout=localStorage.getItem('helioclock-layout-v45')===null;
let activeLayout={...defaultLayout};
try{
 const modern=localStorage.getItem('helioclock-layout-v45');
 const saved=JSON.parse(modern||(localStorage.getItem('helioclock-layout-v21')||'null'));
 if(saved&&typeof saved==='object'){
  for(const k of Object.keys(defaultLayout)){
   if(typeof saved[k]==='boolean' && (modern||k!=='almanac'))activeLayout[k]=saved[k];
  }
 }
 // Previous releases hid the almanac by default. On first upgrade, reveal it
 // once, while retaining every other saved panel choice. Later explicit
 // almanac choices (stored in v45) remain fully respected.
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
 try{localStorage.setItem('helioclock-layout-v45',JSON.stringify(activeLayout))}catch{}
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
const PREF_CHECKBOXES=['orrery-3d','orrery-ecliptic-mesh','orrery-show-asteroids','orrery-show-comet-orbit','orrery-height-guide','show-au-rings','show-earthshine','show-constellations',
 'show-milkyway-shade','show-milkyway-outline','show-galactic-center',
 'show-stars','show-comets','show-asteroids','show-labels','show-sky-paths','show-below-horizon',
 'show-dso-galaxies','show-dso-nebulae','show-dso-clusters','show-dso-labels','show-constellation-names',
 'show-ecliptic','use-precession','show-stellar-colors',
 'show-planets','show-altaz-grid','show-radec-grid',
 'earth-twilight-civil','earth-twilight-nautical',
 'earth-twilight-astronomical','earth-twilight-night','earth-city-lights','earth-aurora','earth-clouds',
 'earth-country-borders','earth-region-borders','earth-city-labels'];
const PREF_CHOICES={
 earthProjection:['equal','globe','mercator'],
 earthMapStyle:['physical','hybrid','political'],
 earthTextureQuality:['2k','4k'],
 skyProjection:['polar','rect'],
 skyLight:['daylight','black'],
 orbitMode:['inner','outer'],
 discView:['moon','sun']
};
const FACTORY_PREF={
 version:1,observer:{lat:49.19,lon:-98.10},earthProjection:'equal',earthTextureQuality:'2k',earthMapStyle:'physical',
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
  earthProjection:state.earthProjection,earthTextureQuality:state.earthTextureQuality,earthMapStyle:state.earthMapStyle||'physical',
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
 $('earth-map-style').value=state.earthMapStyle||'physical';
 if(validNumber(saved.magLimit,0,7))state.magLimit=saved.magLimit;
 if(typeof saved.stellarColors==='boolean')state.stellarColors=saved.stellarColors;
 if(typeof saved.usePrecession==='boolean')state.usePrecession=saved.usePrecession;
 if(saved.checkboxes&&typeof saved.checkboxes==='object'){
  for(const key of PREF_CHECKBOXES)
   if(typeof saved.checkboxes[key]==='boolean')$(key).checked=saved.checkboxes[key];
 }
 // Restore the camera model and dependent controls together, not merely
 // the checkbox appearance. A browser may restore checkbox history separately.
 state.orrery3D=$('orrery-3d').checked;
 document.querySelectorAll('.orrery-3d-setting').forEach(el=>el.hidden=!state.orrery3D);
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
 $('solar-eclipse').hidden=true;$('solar-eclipse-status').hidden=true;
 $('lunar-eclipse-status').hidden=sun;
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
   if(typeof saved.layout[key]==='boolean' && !(migratingAlmanacLayout&&key==='almanac'))merged[key]=saved.layout[key];
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
      !(value.checkboxes[key]===undefined&&['show-planets','show-altaz-grid','show-radec-grid','earth-city-lights','earth-aurora','earth-clouds','earth-country-borders','earth-region-borders','earth-city-labels'].includes(key)))
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
// Render every preference-backed control from the application model. Browsers
// may restore form history independently of JavaScript, especially on pageshow.
function synchronizePreferenceControls(){
 for(const [id,key] of [['earth-map-style','earthMapStyle'],
  ['earth-texture-quality','earthTextureQuality'],['star-magnitude','magLimit'],
  ['earth-zoom','earthZoom'],['sky-zoom','skyZoom'],['sky-heading','skyHeading'],
  ['orrery-zoom','orreryZoom'],['orrery-tilt','orreryTilt'],
  ['orrery-rotation','orreryRotation'],['moon-zoom','moonZoom']]){
  const el=$(id);if(el)el.value=String(state[key]);
 }
 $('latitude').value=String(state.lat);
 $('longitude').value=String(state.lon);
 $('show-stellar-colors').checked=state.stellarColors;
 $('use-precession').checked=state.usePrecession;
 $('orrery-3d').checked=state.orrery3D;
 document.querySelectorAll('.orrery-3d-setting').forEach(el=>el.hidden=!state.orrery3D);
 $('below-horizon-setting').hidden=state.skyProjection!=='rect';
 for(const [attribute,selected] of [
  ['data-projection',state.earthProjection],
  ['data-sky-projection',state.skyProjection],
  ['data-sky-light',state.skyLight],
  ['data-orbit-mode',state.orbitMode],
  ['data-disc-view',state.discView]]){
  for(const button of document.querySelectorAll('['+attribute+']')){
   const active=button.getAttribute(attribute)===selected;
   button.classList.toggle(attribute==='data-projection'?'is-active':'selected',active);
   button.setAttribute('aria-pressed',String(active));
  }
 }
 for(const key of Object.keys(defaultLayout)){
  const input=document.querySelector('[data-panel-visibility="'+key+'"]');
  if(input)input.checked=activeLayout[key];
 }
}
function initializePreferences(){
 // Firefox can restore stale form values independently of localStorage.
 // Reset all preference-backed controls to their declared factory defaults
 // before importing settings; a clean reset must not show the previous state.
 for(const key of PREF_CHECKBOXES)$(key).checked=$(key).defaultChecked;
 $('prefs-remember-view').checked=false;
 $('orrery-3d').checked=$('orrery-3d').defaultChecked;
 state.orrery3D=$('orrery-3d').checked;
 document.querySelectorAll('.orrery-3d-setting').forEach(el=>el.hidden=!state.orrery3D);
 const saved=readPrefs();
 if(saved)applyPrefs(saved);
 $('earth-texture-quality').value=state.earthTextureQuality;
 $('latitude').value=String(state.lat);
 $('longitude').value=String(state.lon);
 synchronizePreferenceControls();
 prefReady=true;
 persistPrefs();
 render();
}
initializePreferences();
// Firefox can restore form history after module initialization. Reassert
// preferences after page-show so coordinates and the model never disagree.
window.addEventListener('pageshow',()=>{
 // Reassert model-owned choices and saved checkbox preferences after Firefox
 // or mobile browser session restoration; never derive the model from stale UI.
 const saved=readPrefs();
 for(const key of PREF_CHECKBOXES){
  if(key==='orrery-3d'||key==='show-stellar-colors'||key==='use-precession')continue;
  $(key).checked=saved&&typeof saved.checkboxes?.[key]==='boolean'
   ?saved.checkboxes[key]:$(key).defaultChecked;
 }
 $('prefs-remember-view').checked=saved?.rememberView===true;
 synchronizePreferenceControls();
 render();
});
