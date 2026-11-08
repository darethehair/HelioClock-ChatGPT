import {test,expect} from '@playwright/test';
test('dashboard controls work in Firefox',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#sunrise')).not.toHaveText('—');
 // Release identity and provenance are visible even offline.
 await expect(page.locator('#app-version')).toHaveText('v30');
 await expect(page.locator('#dock-version')).toHaveText('v30');
 await expect(page.locator('.credits-footer')).toContainText('Created by Darethehair with assistance from ChatGPT');
 await expect(page.locator('.credits-footer a')).toHaveAttribute('href','https://github.com/darethehair/HelioClock-ChatGPT');
 await expect(page.locator('#build-meta')).toContainText('commit');

 // Polar sky must support a truly black canvas background and solar-altitude colour.
 await page.locator('[data-sky-light="black"]').click();
 await expect(page.locator('[data-sky-light="black"]')).toHaveAttribute('aria-pressed','true');
 const darkSky=await page.locator('#sky').evaluate(el=>Array.from(el.getContext('2d').getImageData(2,2,1,1).data));
 expect(darkSky.slice(0,3)).toEqual([0,0,0]);
 await page.locator('[data-sky-light="daylight"]').click();
 await expect(page.locator('[data-sky-light="daylight"]')).toHaveAttribute('aria-pressed','true');
 // Force a summer local-noon observation and confirm sky blue rather than black.
 await page.locator('#observe-date').fill('2026-06-21');
 await page.locator('#observe-time').fill('18:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await expect(page.locator('#sky-light-status')).toContainText('Daylight');
 const sunnySky=await page.locator('#sky').evaluate(el=>Array.from(el.getContext('2d').getImageData(2,2,1,1).data));
 expect(sunnySky[2]).toBeGreaterThan(80);
 // Stars remain drawn in educational daylight mode with precession enabled.
 // Check actual canvas pixels, not merely the computed star count.
 await page.locator('#use-precession').check();
 const snapshot=()=>page.locator('#sky').evaluate(el=>{
  const ctx=el.getContext('2d');
  return Array.from(ctx.getImageData(0,0,el.width,el.height).data);
 });
 const dayStarsOn=await snapshot();
 await page.locator('#show-stars').uncheck();
 const dayStarsOff=await snapshot();
 const changed=dayStarsOn.reduce((n,v,i)=>n+(Math.abs(v-dayStarsOff[i])>25?1:0),0);
 expect(changed).toBeGreaterThan(100);
 await page.locator('#show-stars').check();
 // At a fixed midwinter date, daylight and night must produce different sky backgrounds.
 await page.locator('#observe-date').fill('2026-12-21');
 await page.locator('#observe-time').fill('06:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await expect(page.locator('#sky-light-status')).toContainText('Night');
 const nightSky=await page.locator('#sky').evaluate(el=>Array.from(el.getContext('2d').getImageData(2,2,1,1).data));
 expect(nightSky.slice(0,3)).toEqual([0,0,0]);

 // Fullscreen daytime chart: J2000 and precession modes must BOTH plot stars.
 // Store snapshots in browser memory; compare actual RGBA pixels after toggling
 // stars off, not an internal count or full-scene hash.
 await page.locator('#observe-date').fill('2100-11-07');
 await page.locator('#observe-time').fill('21:54');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-light="daylight"]').click();
 await page.locator('[data-fullscreen="sky-panel"]').click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 const countStarPixels=async()=>{
  await page.locator('#show-stars').check();
  await page.locator('#sky').evaluate(el=>{
   window.__starCanvasOn=new Uint8ClampedArray(el.getContext('2d').getImageData(0,0,el.width,el.height).data);
  });
  await page.locator('#show-stars').uncheck();
  const result=await page.locator('#sky').evaluate(el=>{
   const on=window.__starCanvasOn;
   const off=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
   let changed=0,whiter=0;
   for(let i=0;i<off.length;i+=4){
    if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>90)changed++;
    if(on[i]>230&&on[i+1]>230&&on[i+2]>230&&off[i]<180)whiter++;
   }
   delete window.__starCanvasOn;
   return {changed,whiter};
  });
  await page.locator('#show-stars').check();
  return result;
 };
 for(const enabled of [false,true]){
  if(enabled)await page.locator('#use-precession').check();
  else await page.locator('#use-precession').uncheck();
  const pixels=await countStarPixels();
  expect(pixels.changed).toBeGreaterThan(600);
  expect(pixels.whiter).toBeGreaterThan(150);
 }
 await page.evaluate(()=>document.exitFullscreen());
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 await page.locator('#use-precession').check();
 // Precession must affect the actual star layer and stick-figure lines.
 await expect(page.locator('#use-precession')).toBeChecked();
 await expect(page.locator('#precession-status')).toContainText('equinox of date');
 await page.locator('#observe-date').fill('2100-01-01');
 await page.locator('#observe-time').fill('08:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-light="black"]').click();
 await page.locator('#show-constellations').check();
 await page.locator('#star-magnitude').selectOption('5');
 await expect(page.locator('#sky-atlas-count')).toContainText('visible');
 const skyHash=()=>page.locator('#sky').evaluate(el=>{
  const {data}=el.getContext('2d').getImageData(0,0,el.width,el.height);
  let hash=2166136261;
  for(let i=0;i<data.length;i+=3)hash=Math.imul(hash^data[i],16777619);
  return hash>>>0;
 });
 const enabledSky=await skyHash();
 await page.locator('#use-precession').uncheck();
 await expect(page.locator('#precession-status')).toContainText('fixed J2000');
 const disabledSky=await skyHash();
 expect(disabledSky).not.toBe(enabledSky);
 await page.locator('[data-sky-projection="rect"]').click();
 const disabledRect=await skyHash();
 await page.locator('#use-precession').check();
 const enabledRect=await skyHash();
 expect(enabledRect).not.toBe(disabledRect);
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('#show-constellations').uncheck();
 await page.locator('#star-magnitude').selectOption('3.5');
 await page.locator('#observe-date').fill('2026-12-21');
 await page.locator('#observe-time').fill('06:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-light="daylight"]').click();

 // Ecliptic is an independent layer and tracks selected time and location.
 await page.locator('#show-ecliptic').uncheck();
 const eclipticOff=await skyHash();
 await page.locator('#show-ecliptic').check();
 expect(await skyHash()).not.toBe(eclipticOff);
 await page.locator('#show-ecliptic').uncheck();
 await expect(page.locator('#celestial-readout')).toContainText('Moon: Alt');
 await expect(page.locator('#celestial-readout')).toContainText('RA');
 await expect(page.locator('#celestial-readout')).toContainText('Dec');
 // SChronos-style rectangular view: actual full +90 to -90 altitude chart.
 await page.locator('#observe-date').fill('2026-06-21');
 await page.locator('#observe-time').fill('18:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-light="daylight"]').click();
 await page.locator('[data-sky-projection="rect"]').click();
 await expect(page.locator('#below-horizon-setting')).toBeVisible();
 await expect(page.locator('#show-below-horizon')).toBeChecked();
 await expect(page.locator('#sky-atlas-count')).toContainText('visible');
 const fullCount=Number((await page.locator('#sky-atlas-count').textContent()).split(' ')[0]);
 await page.locator('#show-below-horizon').uncheck();
 const aboveCount=Number((await page.locator('#sky-atlas-count').textContent()).split(' ')[0]);
 expect(fullCount).toBeGreaterThan(aboveCount);
 await page.locator('#show-below-horizon').check();
 // Background: blue above the halfway horizon and pure black below it.
 const sampleSky=()=>page.locator('#sky').evaluate(el=>{
  const c=el.getContext('2d'),w=el.width,h=el.height;
  const sample=(x,y)=>Array.from(c.getImageData(Math.round(w*x),Math.round(h*y),1,1).data).slice(0,3);
  return {above:sample(.45,.23),below:sample(.45,.77)};
 });
 await page.locator('#show-stars').uncheck();
 await page.locator('#show-sky-paths').uncheck();
 // Turn off all luminous overlays before measuring raw atmosphere pixels.
 await page.locator('#show-milkyway-shade').uncheck();
 await page.locator('#show-galactic-center').uncheck();
 await page.locator('#show-milkyway-outline').uncheck();
 const fullSky=await sampleSky();
 expect(fullSky.above[2]).toBeGreaterThan(75);
 expect(fullSky.below).toEqual([0,0,0]);
 await page.locator('[data-sky-light="black"]').click();
 const noAtmosphere=await sampleSky();
 expect(noAtmosphere.above).toEqual([0,0,0]);
 await page.locator('[data-sky-light="daylight"]').click();
 await page.locator('#show-stars').check();
 await page.locator('#show-sky-paths').check();
 await page.locator('#show-milkyway-shade').check();
 await page.locator('#show-galactic-center').check();
 await page.locator('[data-sky-projection="polar"]').click();
 await expect(page.locator('#below-horizon-setting')).toBeHidden();
 await expect(page.locator('#sidereal-time')).toContainText('LMST');
 await expect(page.locator('#dock-sidereal')).not.toHaveText('—');
 await page.locator('[data-sky-projection="rect"]').click();
 await expect(page.locator('[data-sky-projection="rect"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-sky-projection="polar"]').click();
 await expect(page.locator('[data-sky-projection="polar"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#star-magnitude').selectOption('7');
 // Magnitude no longer automatically disables star labels.
 await expect(page.locator('#show-labels')).toBeChecked();
 await expect(page.locator('#sky-atlas-count')).toContainText('stars');
 await page.locator('#show-constellations').check();
 await expect(page.locator('#show-constellations')).toBeChecked();
 await page.locator('#show-constellations').uncheck();
 await page.locator('#star-magnitude').selectOption('3.5');
 const beforeSidereal=await page.locator('#sidereal-time').textContent();
 const beforeUtc=await page.locator('#utc-clock').textContent();
 await page.locator('#sky-next-sidereal').click();
 const afterSidereal=await page.locator('#sidereal-time').textContent();
 const afterUtc=await page.locator('#utc-clock').textContent();
 expect(afterUtc).not.toEqual(beforeUtc);
 // Sidereal clock should return within a few seconds, not jump almost 4 minutes.
 const seconds=t=>{const m=t.match(/(\d\d):(\d\d):(\d\d)/);return +m[1]*3600 + +m[2]*60 + +m[3]};
 const elapsed=Math.abs(seconds(afterSidereal)-seconds(beforeSidereal));
 expect(Math.min(elapsed,86400-elapsed)).toBeLessThan(5);
 await expect(page.locator('#local-clock')).not.toHaveText('—');
 await expect(page.locator('#dock-time-zone')).toContainText('UTC');
 await expect(page.locator('#dock-local-time')).not.toHaveText('—');
 await expect(page.locator('.panel-fullscreen')).toHaveCount(7);
 // Milky Way overlay layers are independent and modify actual sky pixels.
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await page.locator('#observe-date').fill('2026-07-01');
 await page.locator('#observe-time').fill('08:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await expect(page.locator('#milkyway-status')).toContainText('loaded');
 await expect(page.locator('#show-milkyway-shade')).toBeChecked();
 await expect(page.locator('#show-galactic-center')).toBeChecked();
 await page.locator('#show-milkyway-outline').uncheck();
 await page.locator('#show-milkyway-shade').uncheck();
 await page.locator('#show-galactic-center').uncheck();
 const blankGalactic=await skyHash();
 // Record Canvas fill-rule usage: the contour renderer must shade actual
 // even-odd polygons (with dark holes), not apply a wide glowing line stroke.
 await page.locator('#sky').evaluate(el=>{
  window.__milkyContourFills=0;
  const original=CanvasRenderingContext2D.prototype.fill;
  CanvasRenderingContext2D.prototype.fill=function(...args){
   if(this.canvas.id==='sky'&&args[0]==='evenodd')window.__milkyContourFills++;
   return original.apply(this,args);
  };
 });
 await page.locator('#show-milkyway-shade').check();
 const filledRegions=await page.evaluate(()=>window.__milkyContourFills);
 expect(filledRegions).toBeGreaterThanOrEqual(5);
 const withGlow=await skyHash();
 expect(withGlow).not.toEqual(blankGalactic);
 await page.locator('#show-milkyway-shade').uncheck();
 await page.locator('#show-milkyway-outline').check();
 const withOutline=await skyHash();
 expect(withOutline).not.toEqual(blankGalactic);
 await page.locator('#show-milkyway-outline').uncheck();
 await page.locator('#show-galactic-center').check();
 const withCentre=await skyHash();
 expect(withCentre).not.toEqual(blankGalactic);
 await page.locator('#show-milkyway-shade').check();
 await page.locator('[data-sky-projection="polar"]').click();
 const polarMilky=await skyHash();
 await page.locator('#show-milkyway-shade').uncheck();
 await page.locator('#show-galactic-center').uncheck();
 expect(await skyHash()).not.toBe(polarMilky);
 await page.locator('#show-milkyway-shade').check();
 await page.locator('#show-galactic-center').check();
 await expect(page.locator('#subsolar')).toHaveAttribute('title',/Solar nadir \(antipode\):/);
 await expect(page.locator('#show-au-rings')).toBeChecked();
 const orreryBackground=await page.locator('#orrery').evaluate(el=>{
  const c=el.getContext('2d');
  return Array.from(c.getImageData(2,2,1,1).data).slice(0,3);
 });
 expect(orreryBackground).toEqual([0,0,0]);
 await page.locator('#show-au-rings').uncheck();
 await expect(page.locator('#show-au-rings')).not.toBeChecked();
 await page.locator('#show-au-rings').check();
 await page.locator('[data-orbit-mode="outer"]').click();
 await expect(page.locator('[data-orbit-mode="outer"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#planet-legend')).toContainText('Neptune');
 await expect(page.locator('#au-scale-description')).toContainText('5 AU');

 await page.locator('[data-orbit-mode="inner"]').click();
 await expect(page.locator('#planet-legend')).not.toContainText('Neptune');
 await page.locator('#moon-zoom-in').click();
 await expect(page.locator('#moon-zoom-value')).not.toHaveText('1.0×');
 await page.locator('#moon-reset').click();
 await expect(page.locator('#moon-zoom-value')).toHaveText('1.0×');
 await page.locator('#dock-next-hour').click();
 await expect(page.locator('#dock-local-time')).not.toHaveText('—');
 await page.locator('#dock-live').click();

 await expect(page.locator('#solar-chart-readout')).toContainText('DAYLIGHT');
 await expect(page.locator('#solar-chart-time')).toContainText('Selected Sun:');
 await expect(page.locator('#solar-chart-time')).toContainText('mean solar time');
 await expect(page.locator('#moon-tilt')).toContainText('Bright limb from zenith:');
 await expect(page.locator('#moon-source')).toContainText('NASA LRO near-side mosaic');
 const realMoonImage=await page.evaluate(async()=>{
  const img=new Image();img.src='./moon-nearside-lro.jpg';await img.decode();
  return [img.naturalWidth,img.naturalHeight];
 });
 expect(realMoonImage).toEqual([1400,1400]);

 await expect(page.locator('#solar-chart-date')).not.toHaveText('—');
 const moonCanvas=page.locator('#moon');
 const moonPixels=await moonCanvas.evaluate(el=>{
  const c=el.getContext('2d'),w=el.width,h=el.height;
  const pixel=(x,y)=>Array.from(c.getImageData(x,y,1,1).data);
  return {center:pixel(Math.floor(w/2),Math.floor(h/2)),farLeft:pixel(Math.floor(w*.12),Math.floor(h/2)),width:w,height:h};
 });
 expect(moonPixels.width).toBeGreaterThan(0);
 expect(moonPixels.center[3]).toBeGreaterThan(0);
 expect(moonPixels.farLeft[3]).toBe(0);
 // Moon now occupies most of its normal canvas, not a small central postage stamp.
 const moonSpan=await moonCanvas.evaluate(el=>{
  const c=el.getContext('2d'),y=Math.floor(el.height/2);
  const row=c.getImageData(0,y,el.width,1).data;
  let lo=-1,hi=-1;
  for(let x=0;x<el.width;x++){
   if(row[x*4+3]>80){if(lo<0)lo=x;hi=x;}
  }
  return {diameter:hi-lo+1,canvasHeight:el.height};
 });
 expect(moonSpan.diameter).toBeGreaterThan(moonSpan.canvasHeight*.72);


 await expect(page.locator('[data-projection="equal"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-projection="globe"]').click();
 await expect(page.locator('[data-projection="globe"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-projection="mercator"]').click();
 await expect(page.locator('[data-projection="mercator"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#earth-zoom-in').click();
 await expect(page.locator('#earth-zoom-value')).not.toHaveText('1.0×');
 await page.locator('#earth-map-home').click();
 await expect(page.locator('#earth-zoom-value')).toHaveText('1.0×');
 const texture=await page.evaluate(async()=>{
   const img=new Image();
   img.src='./earth-blue-marble.png';
   await img.decode();
   return [img.naturalWidth,img.naturalHeight];
 });
 expect(texture).toEqual([2048,1024]);
 await page.locator('#time-scrubber').evaluate(el=>{el.value='720';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#scrub-readout')).toContainText('12:00 UTC');
 await page.locator('#step-forward-hour').click();
 await expect(page.locator('#scrub-readout')).toContainText('13:00 UTC');
 await page.locator('#sky-heading').evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#sky-heading')).toHaveValue('90');
 await page.locator('#show-stars').uncheck();
 await expect(page.locator('#show-stars')).not.toBeChecked();
 for(const id of ['earth-map','sky','daylight-chart','moon','orrery']){
   const dimensions=await page.locator('#'+id).evaluate(el=>({width:el.width,height:el.height}));
   expect(dimensions.width).toBeGreaterThan(0);
   expect(dimensions.height).toBeGreaterThan(0);
 }
 const scrollCheck=await page.evaluate(()=>{
   window.scrollTo(0,document.body.scrollHeight);
   const rect=document.getElementById('time-dock').getBoundingClientRect();
   return {top:rect.top,bottom:rect.bottom,viewport:window.innerHeight};
 });
 expect(scrollCheck.bottom).toBeLessThanOrEqual(scrollCheck.viewport+2);
 expect(scrollCheck.top).toBeGreaterThanOrEqual(-2);
 await page.locator('[data-fullscreen="chart-panel"]').click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await expect.poll(()=>page.locator('#time-dock').evaluate(el=>el.parentElement.classList.contains('chart-panel'))).toBe(true);
 await expect(page.locator('#dock-date')).toBeVisible();
 await expect(page.locator('#dock-time')).toBeVisible();
 const before=await page.locator('#dock-local-time').textContent();
 await page.locator('#dock-next-hour').click();
 const after=await page.locator('#dock-local-time').textContent();
 expect(after).not.toBe(before);
 await page.evaluate(()=>document.exitFullscreen());
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
 await expect.poll(()=>page.locator('#time-dock').evaluate(el=>el.parentElement.classList.contains('app'))).toBe(true);
 await expect(page.locator('#dock-date')).toBeVisible();
 expect(errors).toEqual([]);
});


test('Version 21 layout, colour, and almanac controls survive reload',async({page})=>{
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#app-version')).toHaveText('v30');
 await expect(page.locator('.almanac-panel')).toBeHidden();
 await page.locator('#layout-sky').click();
 await expect(page.locator('.sky-panel')).toBeVisible();
 await expect(page.locator('.almanac-panel')).toBeHidden();
 await expect(page.locator('.dashboard')).toHaveClass(/single-panel/);
 await page.locator('#layout-text').click();
 await expect(page.locator('.almanac-panel')).toBeVisible();
 await expect(page.locator('.sky-panel')).toBeHidden();
 await expect(page.locator('.dashboard')).toHaveClass(/single-panel/);
 await expect(page.locator('#almanac-content')).toContainText('Astronomical');
 await expect(page.locator('#almanac-content')).toContainText('Julian Date');
 await expect(page.locator('#almanac-content')).toContainText('Nautical');
 await expect(page.locator('#almanac-content')).toContainText('Upcoming astronomical events');
 await expect(page.locator('#almanac-content')).toContainText('Moonrise');
 await expect(page.locator('#almanac-content')).toContainText('UTC');
 await page.reload();
 await expect(page.locator('.almanac-panel')).toBeVisible();
 await expect(page.locator('.sky-panel')).toBeHidden();
 await page.locator('#layout-sky').click();
 await expect(page.locator('.sky-panel')).toBeVisible();
 await expect(page.locator('.almanac-panel')).toBeHidden();
 await page.locator('#layout-all').click();
 await expect(page.locator('.sky-panel')).toBeVisible();
 await expect(page.locator('.almanac-panel')).toBeVisible();
 await page.locator('[data-sky-light="black"]').click();
 await expect(page.locator('#sky-atlas-count')).toContainText('visible');
 const colored=await page.locator('#sky').evaluate(c=>c.toDataURL());
 await page.locator('#show-stellar-colors').uncheck();
 await expect(page.locator('#show-stellar-colors')).not.toBeChecked();
 const white=await page.locator('#sky').evaluate(c=>c.toDataURL());
 expect(white).not.toEqual(colored);
 await page.locator('#show-stellar-colors').check();
 await expect(page.locator('#show-stellar-colors')).toBeChecked();
 expect(await page.locator('#sky').evaluate(c=>c.toDataURL())).toEqual(colored);
 await page.locator('#layout-default').click();
 await expect(page.locator('.sky-panel')).toBeVisible();
 await expect(page.locator('.almanac-panel')).toBeHidden();
 expect(errors).toEqual([]);
});


test('Version 23 single Earth map clips all raster imagery to the world outline',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-panel-visibility="earth"]').check();
 for(const key of ['hero','chart','sky','moon','orrery','details','almanac']){
  await page.locator('[data-panel-visibility="'+key+'"]').uncheck();
 }
 await expect(page.locator('.dashboard')).toHaveClass(/single-panel/);
 await expect(page.locator('.earth-panel')).toBeVisible();
 await expect(page.locator('#earth-map')).toBeVisible();
 await page.waitForFunction(()=>document.getElementById('earth-map').width>1000);
 const samples=await page.locator('#earth-map').evaluate(el=>{
  const c=el.getContext('2d'),w=el.width,h=el.height;
  const p=(x,y)=>Array.from(c.getImageData(x,y,1,1).data).slice(0,3);
  return {w,h,left:p(1,Math.floor(h/2)),right:p(w-2,Math.floor(h/2)),center:p(Math.floor(w/2),Math.floor(h/2))};
 });
 expect(samples.left).toEqual([7,19,36]);
 expect(samples.right).toEqual([7,19,36]);
 expect(samples.center).not.toEqual([7,19,36]);
 await page.locator('[data-projection="mercator"]').click();
 const edges=await page.locator('#earth-map').evaluate(el=>{
  const c=el.getContext('2d'),w=el.width,h=el.height;
  return [Array.from(c.getImageData(1,Math.floor(h/2),1,1).data).slice(0,3),
   Array.from(c.getImageData(w-2,Math.floor(h/2),1,1).data).slice(0,3)];
 });
 expect(edges).toEqual([[7,19,36],[7,19,36]]);
 expect(errors).toEqual([]);
});

test('Version 23 Milky Way rectangular contour paths avoid interior seam bridges',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#observe-date').fill('2026-11-08');
 await page.locator('#observe-time').fill('18:47');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await expect(page.locator('#milkyway-status')).toContainText('loaded');
 await page.locator('#show-milkyway-shade').uncheck();
 await page.evaluate(()=>{
  const p=CanvasRenderingContext2D.prototype;
  const old={begin:p.beginPath,move:p.moveTo,line:p.lineTo,close:p.closePath,fill:p.fill};
  let first=null,prior=null,bridges=0;
  window.__milkyBridges=0;window.__milkyFills=0;
  function check(x,y,ctx){
   if(!prior)return;
   const el=ctx.canvas,w=el.clientWidth,h=el.clientHeight;
   // Exclude valid spherical-polygon seam closures along the top/bottom frame.
   if(el.id==='sky'&&Math.abs(x-prior[0])>w*.6&&
      Math.min(y,prior[1])>35&&Math.max(y,prior[1])<h-55)bridges++;
  }
  p.beginPath=function(...a){if(this.canvas.id==='sky'){first=null;prior=null;bridges=0}return old.begin.apply(this,a)};
  p.moveTo=function(x,y){if(this.canvas.id==='sky'){first=[x,y];prior=[x,y]}return old.move.call(this,x,y)};
  p.lineTo=function(x,y){if(this.canvas.id==='sky'){check(x,y,this);prior=[x,y]}return old.line.call(this,x,y)};
  p.closePath=function(...a){if(this.canvas.id==='sky'&&first)check(first[0],first[1],this);return old.close.apply(this,a)};
  p.fill=function(...a){
   if(this.canvas.id==='sky'&&a[0]==='evenodd'){window.__milkyBridges+=bridges;window.__milkyFills++;}
   return old.fill.apply(this,a);
  };
 });
 await page.locator('#show-milkyway-shade').check();
 const counts=await page.evaluate(()=>({bridges:window.__milkyBridges,fills:window.__milkyFills}));
 expect(counts.fills).toBeGreaterThanOrEqual(5);
 expect(counts.bridges).toBe(0);
 expect(errors).toEqual([]);
});


test('Version 25 Sun and Moon use the same zoomable pannable fullscreen stage',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#app-version')).toHaveText('v30');
 await expect(page.locator('#moon')).toBeVisible();
 await expect(page.locator('#solar-photo')).toBeHidden();
 await page.locator('[data-disc-view="sun"]').click();
 await expect(page.locator('#solar-photo')).toBeVisible();
 await expect(page.locator('#moon')).toBeHidden();
 await expect(page.locator('#solar-note')).toBeVisible();
 await expect(page.locator('#solar-refresh')).toBeVisible();
 await expect(page.locator('#moon-bottom')).toBeHidden();
 await expect(page.locator('#solar-status')).toContainText('NASA');
 // Zoom at a non-central point and verify the image is translated.
 const stage=page.locator('#disc-stage');
 const box=await stage.boundingBox();
 const fx=box.x+box.width*.75,fy=box.y+box.height*.38;
 await page.mouse.move(fx,fy);
 await page.mouse.wheel(0,-180);
 await expect(page.locator('#moon-zoom-value')).not.toHaveText('1.0×');
 const first=await page.locator('#solar-photo').evaluate(el=>el.style.transform);
 expect(first).toMatch(/translate\(-/);
 expect(first).toMatch(/scale\(1\./);
 await page.mouse.down();
 await page.mouse.move(fx+45,fy+20,{steps:4});
 await page.mouse.up();
 const moved=await page.locator('#solar-photo').evaluate(el=>el.style.transform);
 expect(moved).not.toBe(first);
 await page.locator('#disc-reset').click();
 await expect(page.locator('#solar-photo')).toHaveJSProperty('hidden',false);
 await expect(page.locator('#moon-zoom-value')).toHaveText('1.0×');
 await expect(page.locator('#solar-photo')).toHaveAttribute('style',/translate\(0px(?:,\s*0px)?\) scale\(1\)/);
 await page.locator('[data-fullscreen="moon-panel"]').click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('moon-panel'))).toBe(true);
 await expect(page.locator('#solar-photo')).toBeVisible();
 await expect(page.locator('#dock-time')).toBeVisible();
 await page.evaluate(()=>document.exitFullscreen());
 await page.locator('[data-disc-view="moon"]').click();
 await expect(page.locator('#moon')).toBeVisible();
 await expect(page.locator('#solar-photo')).toBeHidden();
 await page.mouse.move(fx,fy);
 await page.mouse.wheel(0,-120);
 await expect(page.locator('#moon-zoom-value')).not.toHaveText('1.0×');
 await expect(page.locator('#moon')).toHaveAttribute('style',/scale\(1\./);
 await page.locator('#disc-reset').click();
 await expect(page.locator('#moon-zoom-value')).toHaveText('1.0×');
 expect(errors).toEqual([]);
});

test('Version 26 polar zoom anchors cursor and dragging pans the sky',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('#sky').evaluate(el=>{
  const old=CanvasRenderingContext2D.prototype.translate;
  window.__skyTranslate=[0,0];
  CanvasRenderingContext2D.prototype.translate=function(x,y){
   if(this.canvas.id==='sky')window.__skyTranslate=[x,y];
   return old.call(this,x,y);
  };
 });
 const sky=page.locator('#sky'),box=await sky.boundingBox();
 const x=box.x+box.width*.73,y=box.y+box.height*.32;
 await page.mouse.move(x,y);
 await page.mouse.wheel(0,-180);
 expect(Number(await page.locator('#sky-zoom').inputValue())).toBeGreaterThan(1);
 const anchored=await page.evaluate(()=>window.__skyTranslate);
 expect(anchored[0]).toBeLessThan(-1);
 expect(anchored[1]).toBeGreaterThan(1);
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x+34,y+24,{steps:3});
 await page.mouse.up();
 const panned=await page.evaluate(()=>window.__skyTranslate);
 expect(panned[0]).toBeGreaterThan(anchored[0]+25);
 expect(panned[1]).toBeGreaterThan(anchored[1]+15);
 await page.locator('#sky-reset').click();
 await expect(page.locator('#sky-zoom')).toHaveValue('1');
 const home=await page.evaluate(()=>window.__skyTranslate);
 expect(home).toEqual([0,0]);
 expect(errors).toEqual([]);
});


test('Version 27 orrery has north-ecliptic counterclockwise geometry',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#observe-date').fill('2000-01-01');
 await page.locator('#observe-time').fill('12:00');
 await page.locator('#orrery').evaluate(canvas=>{
  const context=canvas.getContext('2d');
  const oldArc=context.arc.bind(context),oldFill=context.fill.bind(context);
  let last=null;
  window.__orbitDots=[];
  context.arc=function(x,y,r,...rest){last={x,y,r};return oldArc(x,y,r,...rest)};
  context.fill=function(...args){
   if(last&&last.r>=3)window.__orbitDots.push({...last,color:this.fillStyle});
   last=null;return oldFill(...args);
  };
 });
 await page.locator('#observe-time').dispatchEvent('change');
 const dots=await page.evaluate(()=>window.__orbitDots);
 const earth=dots.filter(d=>d.color==='#76bde6').at(-1);
 const mercury=dots.filter(d=>d.color==='#b5bac1').at(-1);
 expect(earth).toBeDefined();expect(mercury).toBeDefined();
 const geometry=await page.locator('#orrery').evaluate(el=>({x:el.clientWidth/2,y:el.clientHeight/2}));
 // J2000 longitudes: Earth 100.46° must be on the left; Mercury
 // 252.25° must be on the right when viewed from ecliptic north.
 expect(earth.x).toBeLessThan(geometry.x);
 expect(mercury.x).toBeGreaterThan(geometry.x);
 expect(errors).toEqual([]);
});


test('Version 28 zoomed polar rendering stays responsive during edge panning',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#sky-zoom').fill('3');
 await page.locator('#star-magnitude').selectOption('7');
 const canvas=page.locator('#sky'),rect=await canvas.boundingBox();
 const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+210,y,{steps:6});await page.mouse.up();
 await expect(canvas).toBeVisible();
 await expect(page.locator('#sky-atlas-count')).toContainText('stars');
 expect(errors).toEqual([]);
});


test('Version 29 labels remain enabled for faint stars and sky cursor reports RA Dec',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('#star-magnitude').selectOption('7');
 await page.locator('#show-labels').check();
 await page.locator('#sky').evaluate(el=>{
  window.__starLabelTexts=[];
  const old=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){
   if(this.canvas.id==='sky')window.__starLabelTexts.push(String(text));
   return old.call(this,text,...args);
  };
 });
 await page.locator('#sky-zoom').fill('2.5');
 expect(await page.locator('#show-labels').isChecked()).toBe(true);
 const labels=await page.evaluate(()=>window.__starLabelTexts);
 expect(labels.length).toBeGreaterThan(0);
 const canvas=page.locator('#sky');
 const hover=async(x,y)=>canvas.evaluate((el,[u,v])=>{
  const r=el.getBoundingClientRect();
  el.dispatchEvent(new PointerEvent('pointermove',{
   bubbles:true,clientX:r.left+r.width*u,clientY:r.top+r.height*v
  }));
 },[x,y]);
 await hover(.5,.5);
 await expect(page.locator('#sky-cursor-readout')).toContainText('Cursor: RA');
 await expect(page.locator('#sky-cursor-readout')).toContainText('Dec');
 await expect(page.locator('#sky-cursor-readout')).toContainText('Alt');
 const before=await page.locator('#sky-cursor-readout').textContent();
 await hover(.57,.48);
 const after=await page.locator('#sky-cursor-readout').textContent();
 expect(before).not.toEqual(after);
 await page.locator('[data-sky-projection="rect"]').click();
 await hover(.5,.45);
 await expect(page.locator('#sky-cursor-readout')).toContainText('Dec');
 await canvas.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerleave')));
 await expect(page.locator('#sky-cursor-readout')).toContainText('Move your pointer');
 expect(errors).toEqual([]);
});


test('Version 30 polar Milky Way shading never fills most of the night sky',async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await page.locator('#show-stars').uncheck();
 await page.locator('#show-constellations').uncheck();
 await page.locator('#show-sky-paths').uncheck();
 await page.locator('#show-labels').uncheck();
 await page.locator('#show-galactic-center').uncheck();
 await page.locator('#show-milkyway-outline').uncheck();
 await page.waitForFunction(()=>document.querySelector('#milkyway-status').textContent.includes('loaded'));
 await page.locator('#observe-date').fill('2026-11-08');
 for(const hour of ['01:00','07:00','13:00','19:00']){
  await page.locator('#observe-time').fill(hour);
  await page.locator('#observe-time').dispatchEvent('change');
  const snapshot=()=>page.locator('#sky').evaluate(el=>({
   w:el.width,h:el.height,
   data:Array.from(el.getContext('2d').getImageData(0,0,el.width,el.height).data)
  }));
  await page.locator('#show-milkyway-shade').uncheck();
  const off=await snapshot();
  await page.locator('#show-milkyway-shade').check();
  const on=await snapshot();
  let inside=0,shaded=0;
  const x0=off.w/2,y0=off.h/2,r=Math.min(off.w,off.h)*.44;
  for(let y=0;y<off.h;y+=5)for(let x=0;x<off.w;x+=5){
   if(Math.hypot(x-x0,y-y0)>r)continue;
   const i=(y*off.w+x)*4;
   inside++;
   if(on.data[i]-off.data[i]>8||on.data[i+1]-off.data[i+1]>8)shaded++;
  }
  expect(shaded/inside).toBeLessThan(.55);
  expect(shaded).toBeGreaterThan(10);
 }
 expect(errors).toEqual([]);
});
