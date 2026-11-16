import {BRIGHT_STARS} from './sky-catalog.js';
import {MESSIER_DSOS} from './dso-catalog.js';
import {CONSTELLATION_NAMES} from './sky-constellation-names.js';
import {horizontal,precessJ2000} from './astronomy.js';

export const SEARCH_OBJECTS=[
 ...BRIGHT_STARS.map(s=>({name:s.name,type:'Star',ra:s.ra,dec:s.dec,mag:s.mag})),
 ...MESSIER_DSOS.map(([id,ra,dec,family,,mag,name])=>({name:id,type:family,ra,dec,mag,alias:name||''})),
 ...CONSTELLATION_NAMES.map(([abbr,name,ra,dec])=>({name,type:'Constellation',ra,dec,alias:abbr,approximate:true}))
];
export function findCelestialObjects(query,limit=12){
 const q=String(query||'').trim().toLocaleLowerCase();
 if(!q)return [];
 return SEARCH_OBJECTS.filter(o=>[o.name,o.alias].some(n=>n&&n.toLocaleLowerCase().includes(q)))
  .sort((a,b)=>Number(a.name.toLocaleLowerCase()===q)-Number(b.name.toLocaleLowerCase()===q)||
    Number(a.name.toLocaleLowerCase().startsWith(q))-Number(b.name.toLocaleLowerCase().startsWith(q))||
    a.name.localeCompare(b.name)).reverse().slice(0,limit);
}
export function celestialObjectPosition(object,date,lat,lon,precession=true){
 const eq=precession?precessJ2000(object.ra,object.dec,date):{ra:object.ra,decl:object.dec};
 return {...eq,...horizontal(eq.ra,eq.decl,date,lat,lon)};
}
