import {surfaceToScreen} from './disc-coordinates.js';
import {EXTRA_LUNAR_CRATERS} from './moon-extra-craters.js';
// East-positive lunar coordinates, based on the IAU/USGS nomenclature
// conventions. Curated point anchors are APPROXIMATE and the existing
// fixed orthographic LRO photograph does not model libration.
// Reference: https://planetarynames.wr.usgs.gov/Page/MOON/target
export const LUNAR_FEATURES=[
 {
  "name": "Mare Imbrium",
  "type": "mare",
  "lat": 32.8,
  "lon": -15.6,
  "minZoom": 1
 },
 {
  "name": "Mare Serenitatis",
  "type": "mare",
  "lat": 28,
  "lon": 17.5,
  "minZoom": 1
 },
 {
  "name": "Mare Tranquillitatis",
  "type": "mare",
  "lat": 8.5,
  "lon": 31.4,
  "minZoom": 1
 },
 {
  "name": "Mare Crisium",
  "type": "mare",
  "lat": 17,
  "lon": 59.1,
  "minZoom": 1
 },
 {
  "name": "Oceanus Procellarum",
  "type": "mare",
  "lat": 18.4,
  "lon": -57.4,
  "minZoom": 1
 },
 {
  "name": "Mare Fecunditatis",
  "type": "mare",
  "lat": -7.8,
  "lon": 51.3,
  "minZoom": 1
 },
 {
  "name": "Mare Nubium",
  "type": "mare",
  "lat": -21.3,
  "lon": -16.6,
  "minZoom": 1
 },
 {
  "name": "Mare Nectaris",
  "type": "mare",
  "lat": -15.2,
  "lon": 35.5,
  "minZoom": 1.5
 },
 {
  "name": "Mare Frigoris",
  "type": "mare",
  "lat": 56,
  "lon": 1.4,
  "minZoom": 1.5
 },
 {
  "name": "Mare Humorum",
  "type": "mare",
  "lat": -24.4,
  "lon": -38.6,
  "minZoom": 1.5
 },
 {
  "name": "Mare Vaporum",
  "type": "mare",
  "lat": 13.3,
  "lon": 3.6,
  "minZoom": 1.5
 },
 {
  "name": "Mare Insularum",
  "type": "mare",
  "lat": 7.5,
  "lon": -30.9,
  "minZoom": 2.1
 },
 {
  "name": "Mare Cognitum",
  "type": "mare",
  "lat": -10,
  "lon": -23.1,
  "minZoom": 2.2
 },
 {
  "name": "Mare Australe",
  "type": "mare",
  "lat": -38.9,
  "lon": 93,
  "minZoom": 3.2
 },
 {
  "name": "Mare Smythii",
  "type": "mare",
  "lat": 1.3,
  "lon": 87.5,
  "minZoom": 3.3
 },
 {
  "name": "Mare Marginis",
  "type": "mare",
  "lat": 13.3,
  "lon": 86.1,
  "minZoom": 3.3
 },
 {
  "name": "Mare Humboldtianum",
  "type": "mare",
  "lat": 56.8,
  "lon": 81.5,
  "minZoom": 3.3
 },
 {
  "name": "Mare Spumans",
  "type": "mare",
  "lat": 1.1,
  "lon": 65.1,
  "minZoom": 3
 },
 {
  "name": "Mare Undarum",
  "type": "mare",
  "lat": 6.8,
  "lon": 68.4,
  "minZoom": 3
 },
 {
  "name": "Mare Anguis",
  "type": "mare",
  "lat": 22.6,
  "lon": 67.7,
  "minZoom": 3
 },
 {
  "name": "Mare Ingenii",
  "type": "mare",
  "lat": -33.7,
  "lon": 163.5,
  "minZoom": 6
 },
 {
  "name": "Mare Moscoviense",
  "type": "mare",
  "lat": 27.3,
  "lon": 147.9,
  "minZoom": 6
 },
 {
  "name": "Sinus Iridum",
  "type": "other",
  "lat": 44.1,
  "lon": -31.5,
  "minZoom": 1.7
 },
 {
  "name": "Sinus Medii",
  "type": "other",
  "lat": 2.4,
  "lon": 1.7,
  "minZoom": 2.3
 },
 {
  "name": "Sinus Asperitatis",
  "type": "other",
  "lat": -3.8,
  "lon": 27.4,
  "minZoom": 2.3
 },
 {
  "name": "Sinus Aestuum",
  "type": "other",
  "lat": 12.1,
  "lon": -8.3,
  "minZoom": 2.5
 },
 {
  "name": "Palus Somni",
  "type": "other",
  "lat": 14.1,
  "lon": 45,
  "minZoom": 3.2
 },
 {
  "name": "Palus Putredinis",
  "type": "other",
  "lat": 27.4,
  "lon": 0,
  "minZoom": 3
 },
 {
  "name": "Lacus Mortis",
  "type": "other",
  "lat": 45,
  "lon": 27.2,
  "minZoom": 2.5
 },
 {
  "name": "Lacus Somniorum",
  "type": "other",
  "lat": 38,
  "lon": 29.2,
  "minZoom": 2.7
 },
 {
  "name": "Lacus Spei",
  "type": "other",
  "lat": 43,
  "lon": 65,
  "minZoom": 3.3
 },
 {
  "name": "Tycho",
  "type": "crater",
  "lat": -43.3,
  "lon": -11.2,
  "minZoom": 1
 },
 {
  "name": "Copernicus",
  "type": "crater",
  "lat": 9.7,
  "lon": -20.1,
  "minZoom": 1
 },
 {
  "name": "Kepler",
  "type": "crater",
  "lat": 8.1,
  "lon": -38,
  "minZoom": 1.8
 },
 {
  "name": "Aristarchus",
  "type": "crater",
  "lat": 23.7,
  "lon": -47.4,
  "minZoom": 1.8
 },
 {
  "name": "Plato",
  "type": "crater",
  "lat": 51.6,
  "lon": -9.4,
  "minZoom": 1.8
 },
 {
  "name": "Clavius",
  "type": "crater",
  "lat": -58.6,
  "lon": -14.3,
  "minZoom": 1.8
 },
 {
  "name": "Aristoteles",
  "type": "crater",
  "lat": 50.2,
  "lon": 17.4,
  "minZoom": 2.2
 },
 {
  "name": "Eudoxus",
  "type": "crater",
  "lat": 44.3,
  "lon": 16.3,
  "minZoom": 2.6
 },
 {
  "name": "Eratosthenes",
  "type": "crater",
  "lat": 14.5,
  "lon": -11.3,
  "minZoom": 2.2
 },
 {
  "name": "Archimedes",
  "type": "crater",
  "lat": 29.7,
  "lon": -4,
  "minZoom": 2.2
 },
 {
  "name": "Aristillus",
  "type": "crater",
  "lat": 33.9,
  "lon": 1.2,
  "minZoom": 2.7
 },
 {
  "name": "Autolycus",
  "type": "crater",
  "lat": 30.7,
  "lon": 1.5,
  "minZoom": 3.5
 },
 {
  "name": "Cassini",
  "type": "crater",
  "lat": 40.2,
  "lon": 4.6,
  "minZoom": 3
 },
 {
  "name": "Alphonsus",
  "type": "crater",
  "lat": -13.4,
  "lon": -2.8,
  "minZoom": 2.3
 },
 {
  "name": "Ptolemaeus",
  "type": "crater",
  "lat": -9.2,
  "lon": -1.8,
  "minZoom": 2.1
 },
 {
  "name": "Arzachel",
  "type": "crater",
  "lat": -18.2,
  "lon": -1.9,
  "minZoom": 2.5
 },
 {
  "name": "Albategnius",
  "type": "crater",
  "lat": -11.2,
  "lon": 4.1,
  "minZoom": 2.8
 },
 {
  "name": "Hipparchus",
  "type": "crater",
  "lat": -5.5,
  "lon": 4.8,
  "minZoom": 2.6
 },
 {
  "name": "Theophilus",
  "type": "crater",
  "lat": -11.4,
  "lon": 26.4,
  "minZoom": 2
 },
 {
  "name": "Cyrillus",
  "type": "crater",
  "lat": -13.2,
  "lon": 24,
  "minZoom": 2.7
 },
 {
  "name": "Catharina",
  "type": "crater",
  "lat": -18,
  "lon": 23.5,
  "minZoom": 2.7
 },
 {
  "name": "Picard",
  "type": "crater",
  "lat": 14.6,
  "lon": 54.7,
  "minZoom": 3
 },
 {
  "name": "Langrenus",
  "type": "crater",
  "lat": -8.9,
  "lon": 61,
  "minZoom": 2
 },
 {
  "name": "Petavius",
  "type": "crater",
  "lat": -25.1,
  "lon": 60.4,
  "minZoom": 2.2
 },
 {
  "name": "Vendelinus",
  "type": "crater",
  "lat": -16.4,
  "lon": 61.5,
  "minZoom": 3.5
 },
 {
  "name": "Cleomedes",
  "type": "crater",
  "lat": 27.7,
  "lon": 55.5,
  "minZoom": 2.5
 },
 {
  "name": "Proclus",
  "type": "crater",
  "lat": 16.1,
  "lon": 46.8,
  "minZoom": 2.7
 },
 {
  "name": "Messier",
  "type": "crater",
  "lat": -1.9,
  "lon": 47.6,
  "minZoom": 3.2
 },
 {
  "name": "Taruntius",
  "type": "crater",
  "lat": 5.6,
  "lon": 46.5,
  "minZoom": 3.3
 },
 {
  "name": "Gassendi",
  "type": "crater",
  "lat": -17.5,
  "lon": -40.1,
  "minZoom": 2
 },
 {
  "name": "Grimaldi",
  "type": "crater",
  "lat": -5.5,
  "lon": -68.3,
  "minZoom": 2.7
 },
 {
  "name": "Riccioli",
  "type": "crater",
  "lat": -3.3,
  "lon": -74.6,
  "minZoom": 3.5
 },
 {
  "name": "Schickard",
  "type": "crater",
  "lat": -44.4,
  "lon": -55.1,
  "minZoom": 2.6
 },
 {
  "name": "Wargentin",
  "type": "crater",
  "lat": -49.6,
  "lon": -60.2,
  "minZoom": 3.5
 },
 {
  "name": "Schiller",
  "type": "crater",
  "lat": -51.8,
  "lon": -40,
  "minZoom": 3.2
 },
 {
  "name": "Longomontanus",
  "type": "crater",
  "lat": -49.5,
  "lon": -21.7,
  "minZoom": 3.5
 },
 {
  "name": "Maginus",
  "type": "crater",
  "lat": -50.5,
  "lon": 6.2,
  "minZoom": 3.2
 },
 {
  "name": "Deslandres",
  "type": "crater",
  "lat": -32.5,
  "lon": -5.2,
  "minZoom": 3
 },
 {
  "name": "Walter",
  "type": "crater",
  "lat": -33,
  "lon": 1,
  "minZoom": 3.5
 },
 {
  "name": "Stöfler",
  "type": "crater",
  "lat": -41.1,
  "lon": 6,
  "minZoom": 3.7
 },
 {
  "name": "Maurolycus",
  "type": "crater",
  "lat": -41.8,
  "lon": 14,
  "minZoom": 3.5
 },
 {
  "name": "Aliacensis",
  "type": "crater",
  "lat": -30.6,
  "lon": 5.2,
  "minZoom": 3.8
 },
 {
  "name": "Bailly",
  "type": "crater",
  "lat": -66.8,
  "lon": -68.8,
  "minZoom": 4
 },
 {
  "name": "Pythagoras",
  "type": "crater",
  "lat": 63.5,
  "lon": -63,
  "minZoom": 3
 },
 {
  "name": "Philolaus",
  "type": "crater",
  "lat": 72.2,
  "lon": -32.4,
  "minZoom": 4
 },
 {
  "name": "Anaxagoras",
  "type": "crater",
  "lat": 73.4,
  "lon": -10.1,
  "minZoom": 3.8
 },
 {
  "name": "Hercules",
  "type": "crater",
  "lat": 46.7,
  "lon": 39.1,
  "minZoom": 2.7
 },
 {
  "name": "Atlas",
  "type": "crater",
  "lat": 46.7,
  "lon": 44.4,
  "minZoom": 2.7
 },
 {
  "name": "Endymion",
  "type": "crater",
  "lat": 53.6,
  "lon": 56.5,
  "minZoom": 2.7
 },
 {
  "name": "Posidonius",
  "type": "crater",
  "lat": 31.8,
  "lon": 29.9,
  "minZoom": 2.7
 },
 {
  "name": "Dawes",
  "type": "crater",
  "lat": 17.2,
  "lon": 26.4,
  "minZoom": 3.7
 },
 {
  "name": "Plinius",
  "type": "crater",
  "lat": 15.4,
  "lon": 23.7,
  "minZoom": 3
 },
 {
  "name": "Dionysius",
  "type": "crater",
  "lat": 2.8,
  "lon": 17.3,
  "minZoom": 4
 },
 {
  "name": "Menelaus",
  "type": "crater",
  "lat": 16.3,
  "lon": 15.9,
  "minZoom": 3.2
 },
 {
  "name": "Manilius",
  "type": "crater",
  "lat": 14.4,
  "lon": 9.1,
  "minZoom": 3.3
 },
 {
  "name": "Bessel",
  "type": "crater",
  "lat": 21.8,
  "lon": 17.9,
  "minZoom": 3.4
 },
 {
  "name": "Julius Caesar",
  "type": "crater",
  "lat": 9,
  "lon": 15.4,
  "minZoom": 3.3
 },
 {
  "name": "Agrippa",
  "type": "crater",
  "lat": 4.1,
  "lon": 10.5,
  "minZoom": 3.2
 },
 {
  "name": "Godin",
  "type": "crater",
  "lat": 1.8,
  "lon": 10.2,
  "minZoom": 3.8
 },
 {
  "name": "Maclear",
  "type": "crater",
  "lat": 10.5,
  "lon": 20.2,
  "minZoom": 4
 },
 {
  "name": "Vitruvius",
  "type": "crater",
  "lat": 17.6,
  "lon": 31.3,
  "minZoom": 3.5
 },
 {
  "name": "Ritter",
  "type": "crater",
  "lat": 1.9,
  "lon": 19.2,
  "minZoom": 4
 },
 {
  "name": "Sabine",
  "type": "crater",
  "lat": 1.4,
  "lon": 20.1,
  "minZoom": 4
 },
 {
  "name": "Montes Apenninus",
  "type": "other",
  "lat": 19.9,
  "lon": -3.7,
  "minZoom": 1.9
 },
 {
  "name": "Montes Alpes",
  "type": "other",
  "lat": 48.4,
  "lon": -0.6,
  "minZoom": 2.3
 },
 {
  "name": "Montes Caucasus",
  "type": "other",
  "lat": 38,
  "lon": 10,
  "minZoom": 2.3
 },
 {
  "name": "Montes Jura",
  "type": "other",
  "lat": 47.5,
  "lon": -35.4,
  "minZoom": 2.6
 },
 {
  "name": "Montes Taurus",
  "type": "other",
  "lat": 27.5,
  "lon": 40,
  "minZoom": 3.3
 },
 {
  "name": "Montes Haemus",
  "type": "other",
  "lat": 17,
  "lon": 12,
  "minZoom": 3.3
 },
 {
  "name": "Montes Riphaeus",
  "type": "other",
  "lat": -7.3,
  "lon": -28,
  "minZoom": 3.6
 },
 {
  "name": "Montes Recti",
  "type": "other",
  "lat": 48,
  "lon": -20,
  "minZoom": 3.5
 },
 {
  "name": "Vallis Alpes",
  "type": "other",
  "lat": 48.5,
  "lon": 3.2,
  "minZoom": 2.7
 },
 {
  "name": "Vallis Schröteri",
  "type": "other",
  "lat": 26.2,
  "lon": -50.8,
  "minZoom": 3
 },
 {
  "name": "Rima Ariadaeus",
  "type": "other",
  "lat": 6.4,
  "lon": 14,
  "minZoom": 3.7
 },
 {
  "name": "Rupes Recta",
  "type": "other",
  "lat": -22.6,
  "lon": -7.7,
  "minZoom": 3.5
 },
 {
  "name": "Rima Hyginus",
  "type": "other",
  "lat": 7.8,
  "lon": 6.4,
  "minZoom": 3.7
 },
 {
  "name": "Rima Hadley",
  "type": "other",
  "lat": 25.7,
  "lon": 3.3,
  "minZoom": 4
 },
 {
  "name": "Rupes Altai",
  "type": "other",
  "lat": -25,
  "lon": 23,
  "minZoom": 4
 },
 {
  "name": "Promontorium Laplace",
  "type": "other",
  "lat": 46,
  "lon": -25.5,
  "minZoom": 3.8
 },
 {
  "name": "Promontorium Heraclides",
  "type": "other",
  "lat": 40.3,
  "lon": -33.2,
  "minZoom": 3.8
 },
 {
  "name": "Mons Piton",
  "type": "other",
  "lat": 40.6,
  "lon": -1.1,
  "minZoom": 3.7
 },
 {
  "name": "Mons Pico",
  "type": "other",
  "lat": 45.7,
  "lon": -8.9,
  "minZoom": 3.7
 },
 {
  "name": "Mons Huygens",
  "type": "other",
  "lat": 19.9,
  "lon": -2.9,
  "minZoom": 4
 },
 {
  "name": "Mons Hadley",
  "type": "other",
  "lat": 26.5,
  "lon": 4.7,
  "minZoom": 4
 }
].concat(EXTRA_LUNAR_CRATERS);
export const LUNAR_TYPES={mare:'Maria',crater:'Craters',other:'Other'};
export function findLunarFeature(query){
 const q=String(query||'').trim().toLocaleLowerCase();
 if(!q)return null;
 return LUNAR_FEATURES.find(f=>f.name.toLocaleLowerCase()===q)||
  LUNAR_FEATURES.find(f=>f.name.toLocaleLowerCase().includes(q))||null;
}
// North-up near-side lunar photograph: east-positive lunar longitudes
// project to image right, west-negative longitudes to image left.
export function lunarFeatureScreen(feature,geometry){
 return surfaceToScreen(feature.lat,feature.lon,geometry);
}
export function visibleLunarLabels(geometry,{zoom=1,enabled=true,maria=true,craters=true,other=true,selected=''}={},width=geometry.cx*2,height=geometry.cy*2){
 if(!enabled)return [];
 const allowed={mare:maria,crater:craters,other};
 // The catalogue's minZoom values originally hid most features until
 // significant magnification. On a full-size disc, many of these fit at 1x.
 // Keep relative prominence ordering but make the threshold less restrictive.
 const eligibleZoom=2.9+Math.max(0,zoom-1)*1.4;
 const ranked=LUNAR_FEATURES.filter(f=>allowed[f.type]&&(eligibleZoom>=f.minZoom||f.name===selected))
  .map(f=>({...f,point:lunarFeatureScreen(f,geometry)}))
  .filter(f=>f.point&&f.point.x>=8&&f.point.x<=width-8&&f.point.y>=8&&f.point.y<=height-8)
  .sort((a,b)=>Number(b.name===selected)-Number(a.name===selected)||a.minZoom-b.minZoom||a.name.localeCompare(b.name));
 const occupied=[],out=[];
 // Scale the ceiling to the stage size: roomy desktop views gain labels,
 // while small phones remain readable. Collision checks still decide which
 // candidates can actually be drawn without overlapping.
 const fullSizeTarget=zoom<1.4?48:zoom<2?58:zoom<3?72:zoom<4?86:110;
 const maxCount=Math.max(12,Math.min(110,Math.round(fullSizeTarget*Math.min(1.3,Math.min(width,height)/660))));
 for(const f of ranked){
  if(out.length>=maxCount&&f.name!==selected)continue;
  const labelWidth=Math.min(168,f.name.length*6.1+8),px=f.point.x,py=f.point.y;
  // Keep labels visible when nearing the stage edge; avoid collisions with
  // other labels, so only genuinely readable labels are returned.
  const left=Math.max(5,Math.min(width-labelWidth-5,px+7));
  const top=Math.max(5,Math.min(height-14,py-16));
  const rect={left,right:left+labelWidth,top,bottom:top+14};
  if(f.name!==selected&&occupied.some(r=>rect.left<r.right+4&&rect.right+4>r.left&&rect.top<r.bottom+3&&rect.bottom+3>r.top))continue;
  occupied.push(rect);out.push({...f,labelX:left,labelY:top});
 }
 return out;
}
export function paintLunarLabels(canvas,geometry,options){
 const width=canvas.clientWidth,height=canvas.clientHeight;
 if(!width||!height)return [];
 const dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,width,height);
 const features=visibleLunarLabels(geometry,options,width,height);
 c.save();c.font='10.5px sans-serif';c.textBaseline='top';
 for(const f of features){
  const active=f.name===options.selected;
  c.beginPath();c.arc(f.point.x,f.point.y,active?3.2:1.9,0,Math.PI*2);
  c.fillStyle=active?'#ffd586':'#d9eafd';c.fill();
  c.lineWidth=2.6;c.strokeStyle='#06121ce8';c.lineJoin='round';
  c.strokeText(f.name,f.labelX,f.labelY);
  c.fillStyle=active?'#ffe2a8':'#e2f0fb';c.fillText(f.name,f.labelX,f.labelY);
 }
 c.restore();
 return features;
}
