import {horizontal} from './astronomy.js';
// J2000 approximate bright-star coordinates, right ascension and declination (degrees).
export const BRIGHT_STARS=[
 ['Sirius',101.287,-16.716,-1.46],['Canopus',95.987,-52.696,-.74],
 ['Arcturus',213.915,19.182,-.05],['Vega',279.235,38.784,.03],
 ['Capella',79.172,45.998,.08],['Rigel',78.634,-8.202,.13],
 ['Procyon',114.825,5.225,.34],['Achernar',24.429,-57.237,.46],
 ['Betelgeuse',88.793,7.407,.50],['Hadar',210.955,-60.373,.61],
 ['Acrux',186.65,-63.10,.76],['Altair',297.695,8.868,.77],
 ['Aldebaran',68.980,16.509,.85],['Spica',201.298,-11.161,.97],
 ['Antares',247.352,-26.432,1.06],['Pollux',116.329,28.026,1.14],
 ['Fomalhaut',344.413,-29.622,1.16],['Deneb',310.358,45.280,1.25],
 ['Regulus',152.093,11.967,1.35],['Castor',113.65,31.89,1.58],
 ['Bellatrix',81.283,6.350,1.64],['Elnath',81.573,28.607,1.65],
 ['Alioth',193.507,55.960,1.76],['Alkaid',206.885,49.313,1.86],
 ['Sargas',263.402,-42.997,1.86],['Kaus Australis',283.816,-34.385,1.79],
 ['Dubhe',165.932,61.751,1.79],['Merak',165.460,56.383,2.34],
 ['Phecda',178.458,53.694,2.41],['Megrez',183.856,57.033,3.31],
 ['Mizar',200.981,54.925,2.23],['Alhena',99.428,16.399,1.93],
 ['Polaris',37.954,89.264,1.98],['Denebola',177.265,14.571,2.14],
 ['Rasalhague',263.734,12.560,2.08],['Alphecca',233.671,26.715,2.23],
 ['Mirfak',51.081,49.861,1.79],['Algol',47.042,40.955,2.12],
 ['Hamal',31.793,23.462,2.00],['Markab',346.191,15.205,2.49],
 ['Alpheratz',2.097,29.091,2.06]
].map(([name,ra,dec,mag])=>({name,ra,dec,mag}));
export function starsAbove(date,lat,lon){
 return BRIGHT_STARS.map(star=>({...star,...horizontal(star.ra,star.dec,date,lat,lon)})).filter(star=>star.alt>0);
}
