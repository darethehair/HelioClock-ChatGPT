// Rates are simulated seconds advanced per elapsed real second.
// Calendar-style labels use fixed durations so forward and reverse
// playback remain continuous and deterministic across time zones.
export const PLAYBACK_RATES=Object.freeze([
 {value:1,label:'1 second/sec'},
 {value:60,label:'1 minute/sec'},
 {value:3600,label:'1 hour/sec'},
 {value:86400,label:'1 day/sec'},
 {value:604800,label:'1 week/sec'},
 {value:2592000,label:'1 month/sec (30 days)'},
 {value:31536000,label:'1 year/sec (365 days)'}
]);
export const DEFAULT_PLAYBACK_RATE=3600;
export function advancePlayback(date,elapsedRealMs,rate,direction=1){
 if(!Number.isFinite(date.getTime())||!Number.isFinite(elapsedRealMs)||elapsedRealMs<0||
    !PLAYBACK_RATES.some(option=>option.value===rate)||![1,-1].includes(direction))return date;
 const ms=date.getTime()+elapsedRealMs*rate*direction;
 const next=new Date(ms);
 return Number.isFinite(next.getTime())?next:date;
}
