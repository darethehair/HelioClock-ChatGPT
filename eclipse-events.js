import * as Astronomy from 'astronomy-engine';

/**
 * Eclipse search foundation for HelioClock.
 *
 * Important: "global" solar eclipses are not necessarily visible at the
 * observer's site. A local eclipse can also occur below the horizon.
 * This module reports those cases explicitly rather than claiming visibility.
 * Searches operate relative to the simulation clock, never real-world "now".
 */
const DAY=86400000;
const asDate=value=>value instanceof Date?value:new Date(value);
const dateOf=event=>new Date(event?.time?.date??event?.date??event);
const eclipseKind=kind=>String(kind).toLowerCase();
const accepts=(kind,filter)=>{
 if(filter==='any')return true;
 const k=eclipseKind(kind);
 if(filter==='partial')return k==='partial';
 if(filter==='central')return k==='total'||k==='annular';
 if(filter==='umbral')return k==='partial'||k==='total';
 if(filter==='total')return k==='total';
 return false;
};
function localSolar(raw){
 const peak=dateOf(raw.peak);
 return {
  category:'solar',scope:'local',kind:eclipseKind(raw.kind),peak,
  obscuration:raw.obscuration,
  visibleAtPeak:raw.peak.altitude>0,
  // The altitude at maximum may be below the horizon even when part of
  // the eclipse is visible. This sample-based field is conservative.
  visibleDuringEvent:[raw.partial_begin,raw.peak,raw.partial_end].some(p=>p?.altitude>0),
  contacts:{
   partialBegin:dateOf(raw.partial_begin),
   centralBegin:raw.total_begin?dateOf(raw.total_begin):null,
   maximum:peak,
   centralEnd:raw.total_end?dateOf(raw.total_end):null,
   partialEnd:dateOf(raw.partial_end)
  },
  peakSunAltitude:raw.peak.altitude
 };
}
function globalSolar(raw){
 return {
  category:'solar',scope:'global',kind:eclipseKind(raw.kind),peak:dateOf(raw.peak),
  obscuration:raw.obscuration??null,
  contacts:null,visibleAtPeak:null,visibleDuringEvent:null,
  center:raw.latitude===undefined?null:{latitude:raw.latitude,longitude:raw.longitude}
 };
}
function lunar(raw,observer){
 const peak=dateOf(raw.peak);
 const eventTime=sd=>sd>0?{
  begin:new Date(peak.getTime()-sd*60000),
  end:new Date(peak.getTime()+sd*60000)
 }:null;
 const eq=observer?Astronomy.Equator(Astronomy.Body.Moon,peak,observer,true,true):null;
 const alt=eq?Astronomy.Horizon(peak,observer,eq.ra,eq.dec,'').altitude:null;
 return {
  category:'lunar',scope:'global',kind:eclipseKind(raw.kind),peak,
  obscuration:raw.obscuration,
  visibleAtPeak:alt===null?null:alt>0,
  peakMoonAltitude:alt,
  phases:{penumbral:eventTime(raw.sd_penum),umbral:eventTime(raw.sd_partial),total:eventTime(raw.sd_total)}
 };
}
function findFollowing({category,scope,from,observer,filter='any',requireAboveHorizon=false,maxEvents=120}){
 // Astronomy Engine searches forward starting at this instant. Do not
 // rewind by one minute: a backward scan advances past the previous peak,
 // and rewinding can rediscover the SAME eclipse indefinitely.
 let cursor=new Date(from.getTime()+1000);
 for(let i=0;i<maxEvents;i++){
  let result,next;
  if(category==='lunar'){
   result=Astronomy.SearchLunarEclipse(cursor);
   next=lunar(result,observer);
  }else if(scope==='local'){
   result=Astronomy.SearchLocalSolarEclipse(cursor,observer);
   next=localSolar(result);
  }else{
   result=Astronomy.SearchGlobalSolarEclipse(cursor);
   next=globalSolar(result);
  }
  if(next.peak>from && accepts(next.kind,filter) &&
     (!requireAboveHorizon || next.visibleAtPeak===true))return next;
  if(!Number.isFinite(next.peak.getTime())||next.peak<=cursor)throw Error('Eclipse search did not advance');
  cursor=new Date(next.peak.getTime()+60000);
 }
 return null;
}
/**
 * Search forward or backward from an arbitrary simulated instant.
 * Backward searches enumerate forward from a fixed lookback to avoid using a
 * nonexistent reverse-search API. The bounded window prevents runaway scans.
 * A not-found result is not evidence that no eclipse ever exists.
 */
export function findEclipse({
 category='solar',scope='local',date=new Date(),direction=1,
 latitude=0,longitude=0,filter='any',requireAboveHorizon=false,
 lookbackYears=30
}={}){
 if(!['solar','lunar'].includes(category))throw Error('Invalid eclipse category');
 if(!['local','global'].includes(scope))throw Error('Invalid eclipse scope');
 if(![-1,1].includes(direction))throw Error('Invalid eclipse direction');
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90 ||
    !Number.isFinite(longitude)||Math.abs(longitude)>180)throw Error('Invalid observer coordinates');
 if(!['any','partial','central','umbral','total'].includes(filter))throw Error('Invalid eclipse filter');
 const from=asDate(date);
 if(!Number.isFinite(from.getTime()))throw Error('Invalid reference date');
 const observer=new Astronomy.Observer(latitude,longitude,0);
 if(direction===1)return findFollowing({
  category,scope,from,observer,filter,requireAboveHorizon,
  maxEvents:category==='solar'&&scope==='local'?180:150
 });
 const start=new Date(from.getTime()-lookbackYears*365.25*DAY);
 let cursor=start,last=null;
 const limit=category==='solar'&&scope==='local'?200:250;
 for(let i=0;i<limit;i++){
  const found=findFollowing({
   category,scope,from:cursor,observer,filter:'any',
   requireAboveHorizon:false,maxEvents:1
  });
  if(!found || found.peak>=from)break;
  if(accepts(found.kind,filter)&&(!requireAboveHorizon||found.visibleAtPeak===true))last=found;
  cursor=new Date(found.peak.getTime()+60000);
 }
 return last;
}
