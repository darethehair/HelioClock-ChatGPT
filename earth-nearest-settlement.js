import {extendedCities} from './earth-cities-data.js';

const DEG=Math.PI/180;
const RADIUS_KM=6371.0088;
// Great-circle distance, independent of map projection and zoom.
export function settlementDistanceKm(lonA,latA,lonB,latB){
 const a=latA*DEG,b=latB*DEG;
 const dLat=(latB-latA)*DEG,dLon=(lonB-lonA)*DEG;
 const h=Math.sin(dLat/2)**2+Math.cos(a)*Math.cos(b)*Math.sin(dLon/2)**2;
 return RADIUS_KM*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
// Finds the nearest entry in the bundled catalog, not necessarily the
// nearest actual settlement. No locale-specific city is hard-coded here.
export function nearestCatalogSettlement(lon,lat,entries=extendedCities){
 if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90||!entries.length)return null;
 let best=null;
 for(const entry of entries){
  const [name,cityLon,cityLat]=entry;
  if(!name||!Number.isFinite(cityLon)||!Number.isFinite(cityLat))continue;
  const distanceKm=settlementDistanceKm(lon,lat,cityLon,cityLat);
  if(!best||distanceKm<best.distanceKm){
   best={name,longitude:cityLon,latitude:cityLat,distanceKm};
  }
 }
 return best;
}
