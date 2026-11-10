import * as Astronomy from 'astronomy-engine';

/** Topocentric, apparent planet positions calculated by Astronomy Engine. */
const bodies=[
 ['Mercury',Astronomy.Body.Mercury,'#bfc6cc',3.4],
 ['Venus',Astronomy.Body.Venus,'#ffe1a4',5],
 ['Mars',Astronomy.Body.Mars,'#f09d7e',4.1],
 ['Jupiter',Astronomy.Body.Jupiter,'#eac69c',5],
 ['Saturn',Astronomy.Body.Saturn,'#dfc8aa',4.5],
 ['Uranus',Astronomy.Body.Uranus,'#98dfe6',3.4],
 ['Neptune',Astronomy.Body.Neptune,'#809df8',3.4]
];
export function skyPlanets(date,lat,lon){
 const observer=new Astronomy.Observer(lat,lon,0);
 return bodies.map(([name,body,color,radius])=>{
  const eq=Astronomy.Equator(body,date,observer,true,true);
  const hor=Astronomy.Horizon(date,observer,eq.ra,eq.dec,'');
  return {name,az:hor.azimuth,alt:hor.altitude,ra:eq.ra*15,decl:eq.dec,color,radius};
 });
}
