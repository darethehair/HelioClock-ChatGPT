/**
 * Minor Planet Center CometEls.txt parser (Ephemerides and Orbital Elements
 * fixed-width format). MPC fields are heliocentric; perihelion day and
 * osculating epoch are TT, angles J2000 ecliptic. No propagation here.
 * https://docs.minorplanetcenter.net/mpc-ops-docs/orbits/comet-orbit-format/
 */
export const MPC_COMET_URL='https://www.minorplanetcenter.net/iau/MPCORB/CometEls.txt';
const field=(line,a,b)=>line.slice(a-1,b).trim(); // inclusive 1-based MPC columns
const number=s=>s&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):null;
export function parseMpcCometLine(line){
 if(typeof line!=='string'||line.length<103)return null;
 const year=number(field(line,15,18));
 const month=number(field(line,20,21));
 const dayTT=number(field(line,23,29));
 const qAU=number(field(line,31,39));
 const eccentricity=number(field(line,42,49));
 const argPeriDeg=number(field(line,52,59));
 const nodeDeg=number(field(line,62,69));
 const inclinationDeg=number(field(line,72,79));
 if(!Number.isInteger(year)||year<1||year>9999||
    !Number.isInteger(month)||month<1||month>12||
    !Number.isFinite(dayTT)||dayTT<1||dayTT>=32||
    !Number.isFinite(qAU)||qAU<=0||
    !Number.isFinite(eccentricity)||eccentricity<0||
    !Number.isFinite(argPeriDeg)||argPeriDeg<0||argPeriDeg>=360||
    !Number.isFinite(nodeDeg)||nodeDeg<0||nodeDeg>=360||
    !Number.isFinite(inclinationDeg)||inclinationDeg<0||inclinationDeg>180)return null;
 const epochYear=number(field(line,82,85)),epochMonth=number(field(line,86,87)),epochDay=number(field(line,88,89));
 const hasEpoch=Number.isInteger(epochYear)&&Number.isInteger(epochMonth)&&Number.isInteger(epochDay)&&
   epochYear>=1&&epochMonth>=1&&epochMonth<=12&&epochDay>=1&&epochDay<=31;
 const designation=field(line,6,12);
 const periodicNumber=number(field(line,1,4));
 const orbitType=field(line,5,5)||null;
 const name=field(line,103,158)||[periodicNumber??'',orbitType??'',designation].join('').trim();
 return {name,designation,periodicNumber,orbitType,
  perihelion:{year,month,dayTT},qAU,eccentricity,argPeriDeg,nodeDeg,inclinationDeg,
  epochTT:hasEpoch?{year:epochYear,month:epochMonth,day:epochDay}:null,
  absoluteMagnitude:number(field(line,92,95)),
  slopeParameter:number(field(line,97,100)),
  reference:field(line,160,168)};
}
export function parseMpcCometCatalog(raw,{retrievedUtc=null,sourceUrl=MPC_COMET_URL}={}){
 const records=[];
 let rejected=0,ignored=0;
 for(const line of String(raw).split(/\r?\n/)){
  if(!line.trim()){ignored++;continue;}
  const row=parseMpcCometLine(line);
  if(row)records.push(row);
  else if(/^\s*(?:Num|Number|Designation|---|\*)/i.test(line)||line.length<60)ignored++;
  else rejected++;
 }
 return {schema:1,source:'Minor Planet Center',sourceUrl,retrievedUtc,
  frame:'heliocentric J2000 ecliptic',timeScale:'TT',format:'CometEls.txt fixed-width E&OE',
  count:records.length,rejected,ignored,records};
}
