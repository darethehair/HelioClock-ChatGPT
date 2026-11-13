import {solar,jd,wrap,RAD,DEG} from './astronomy.js';

/**
 * Apparent geocentric orientation of the solar rotation axis.
 * Meeus-style B0 and P angle using the apparent solar ecliptic longitude
 * and obliquity at the supplied observation epoch.
 *
 * B0: Earth-facing heliographic latitude, positive for north pole toward us.
 * P: apparent position angle of solar north, positive eastward from celestial north.
 * SDO/HMI quicklook images may already be solar-north-up; in that case P is
 * DISPLAYED but must not be applied as a second rotation to the grid.
 * L0/Carrington longitude requires image registration and is not provided.
 */
export function solarDiscOrientation(when){
 const sun=solar(when);
 const i=7.25*RAD;
 const k=wrap(73.6667+1.3958333*(jd(when)-2396758)/36525);
 const theta=(sun.lon-k)*RAD;
 const lambda=sun.lon*RAD;
 const epsilon=sun.obliq*RAD;
 const B0=Math.asin(Math.sin(theta)*Math.sin(i))*DEG;
 const P=(Math.atan(-Math.cos(lambda)*Math.tan(epsilon))+
          Math.atan(-Math.cos(theta)*Math.tan(i)))*DEG;
 return {B0,P};
}
