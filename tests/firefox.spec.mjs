import {test,expect} from '@playwright/test';
test('dashboard controls work in Firefox',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#sunrise')).not.toHaveText('—');
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
 await expect(page.locator('#show-labels')).not.toBeChecked();
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
 await expect(page.locator('.panel-fullscreen')).toHaveCount(6);
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
