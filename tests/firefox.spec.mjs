import {test,expect} from '@playwright/test';
test('Rectangular sky zoom and two-axis pan preserve planet, grid, and cursor projection',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('#show-radec-grid').check();
 const canvas=page.locator('#sky');
 await canvas.scrollIntoViewIfNeeded();
 const geometry=()=>canvas.evaluate(el=>({w:el.clientWidth,h:el.clientHeight,grid:JSON.parse(el.dataset.gridInfo),planets:JSON.parse(el.dataset.planets)}));
 const before=await geometry();
 expect(before.grid.decStep).toBe(15);
 const mercury=before.planets.find(p=>p.name==='Mercury')||before.planets[0];
 expect(mercury).toBeDefined();
 const box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width*.60,box.y+box.height*.42);
 await page.mouse.wheel(0,-950);
 await expect.poll(async()=>Number(page.locator('#sky-zoom').inputValue())).toBeGreaterThan(1.5);
 const after=await geometry();
 expect(after.grid.decStep).toBeLessThan(before.grid.decStep);
 // The planet remains at the same base projected coordinates, now enlarged
 // by the shared canvas transform, with a cursor-anchored pan.
 const skyView=await canvas.evaluate(el=>el.toDataURL());
 await page.mouse.move(box.x+box.width*.51,box.y+box.height*.49);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.57,box.y+box.height*.57,{steps:4});
 await page.mouse.up();
 const dragged=await canvas.evaluate(el=>el.toDataURL());
 expect(dragged).not.toEqual(skyView);
 await canvas.click({position:{x:box.width*.50,y:box.height*.50}});
 await expect(page.locator('#sky-cursor-readout')).toContainText('RA');
 await page.locator('#sky-reset').click();
 await expect(page.locator('#sky-zoom')).toHaveValue('1');
 const reset=await geometry();
 expect(reset.grid.decStep).toBe(15);
 await page.locator('[data-sky-projection="polar"]').click();
 await expect(page.locator('#sky')).toBeVisible();
 expect(errors).toEqual([]);
});

test('Zoomed and panned sky keeps useful coordinate labels inside the visible canvas',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 const info=()=>page.locator('#sky').evaluate(el=>JSON.parse(el.dataset.gridInfo));
 await page.locator('#show-radec-grid').check();
 for(const projection of ['polar','rect']){
  await page.locator('[data-sky-projection="'+projection+'"]').click();
  if(projection==='polar'){
   await page.locator('#sky-zoom').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}))});
   await page.locator('#sky').scrollIntoViewIfNeeded();
   const box=await page.locator('#sky').boundingBox();
   const x=box.x+box.width*.55,y=box.y+box.height*.48;
   await page.mouse.move(x,y);await page.mouse.down();
   await page.mouse.move(x+85,y+45,{steps:3});await page.mouse.up();
  }
  const result=await info();
  expect(result.labels.filter(l=>l.kind==='az').length).toBeGreaterThan(0);
  expect(result.labels.filter(l=>l.kind==='alt').length).toBeGreaterThan(0);
  expect(result.labels.filter(l=>l.kind==='ra').length).toBeGreaterThan(0);
  expect(result.labels.filter(l=>l.kind==='dec').length).toBeGreaterThan(0);
  const bounds=await page.locator('#sky').evaluate(el=>({w:el.clientWidth,h:el.clientHeight}));
  for(const l of result.labels){
   expect(l.x).toBeGreaterThan(40);expect(l.x).toBeLessThan(bounds.w-60);
   expect(l.y).toBeGreaterThan(25);expect(l.y).toBeLessThan(bounds.h-40);
  }
 }
 expect(errors).toEqual([]);
});

test('Rectangular sky draws every 30-degree azimuth meridian visibly at 1x',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 for(const id of ['show-stars','show-planets','show-sky-paths','show-ecliptic','show-milkyway-shade','show-milkyway-outline','show-galactic-center'])
  await page.locator('#'+id).uncheck();
 await page.locator('#show-radec-grid').uncheck();
 await page.locator('#show-altaz-grid').check();
 const check=await page.locator('#sky').evaluate(el=>{
  const dpr=el.width/el.clientWidth;
  const ctx=el.getContext('2d');
  const w=el.clientWidth,h=el.clientHeight;
  const left=Math.max(35,w*.035),right=w-Math.max(16,w*.016);
  const top=12,bottom=h-28;
  const y=Math.round((top+(bottom-top)*.32)*dpr);
  const pixel=x=>{
   const p=ctx.getImageData(Math.round(x*dpr),y,1,1).data;
   return p[0]+p[1]+p[2];
  };
  return Array.from({length:11},(_,i)=>{
   const x=left+(i+1)*(right-left)/12;
   return {az:(i+1)*30,bright:pixel(x),off:pixel(x+8)};
  });
 });
 // A thin antialiased 0.85px line can land between device pixels.
 // Require a measurable contrast on each 30° meridian, rather than a
 // fixed 20-unit channel sum at a single subpixel.
 for(const p of check)expect(p.bright,JSON.stringify(p)).toBeGreaterThan(p.off+12);
 const grid=await page.locator('#sky').evaluate(el=>JSON.parse(el.dataset.gridInfo));
 expect(grid.azStep).toBe(30);
 await page.locator('#show-altaz-grid').uncheck();
 const off=await page.locator('#sky').evaluate(el=>JSON.parse(el.dataset.gridInfo));
 expect(off.altAz).toBe(false);
 expect(errors).toEqual([]);
});

test('Sky compass planet option and independently controlled adaptive coordinate grids',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 for(const id of ['show-planets','show-altaz-grid'])await expect(page.locator('#'+id)).toBeChecked();
 await expect(page.locator('#show-radec-grid')).not.toBeChecked();
 const getPlanets=()=>page.locator('#sky').evaluate(el=>JSON.parse(el.dataset.planets));
 const getGrid=()=>page.locator('#sky').evaluate(el=>JSON.parse(el.dataset.gridInfo));
 await page.locator('#observe-date').fill('2026-11-10');
 await page.locator('#observe-time').fill('18:00');
 await page.locator('#observe-time').dispatchEvent('change');
 for(const projection of ['polar','rect']){
  await page.locator('[data-sky-projection="'+projection+'"]').click();
  const planets=await getPlanets();
  expect(planets.length).toBeGreaterThan(0);
  for(const p of planets)expect(['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune']).toContain(p.name);
  await page.locator('#show-planets').uncheck();
  expect(await getPlanets()).toEqual([]);
  await page.locator('#show-planets').check();
  await page.locator('#show-altaz-grid').uncheck();
  await page.locator('#show-radec-grid').check();
  const equatorial=await getGrid();
  expect(equatorial.altAz).toBe(false);
  expect(equatorial.raDec).toBe(true);
  await page.locator('#show-altaz-grid').check();
  const both=await getGrid();
  expect(both.altAz&&both.raDec).toBe(true);
  if(projection==='polar'){
   await page.locator('#sky-zoom').evaluate(el=>{el.value='3';el.dispatchEvent(new Event('input',{bubbles:true}))});
   const finer=await getGrid();
   expect(finer.decStep).toBeLessThan(equatorial.decStep);
   expect(finer.raStep).toBeLessThan(equatorial.raStep);
   await page.locator('#sky-reset').click();
  }
 }
 await page.reload();
 await expect(page.locator('#show-radec-grid')).toBeChecked();
 await expect(page.locator('#show-planets')).toBeChecked();
 expect(errors).toEqual([]);
});

test('dashboard controls work in Firefox',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#sunrise')).not.toHaveText('—');
 // Release identity and provenance are visible even offline.
 await expect(page.locator('#app-version')).toHaveText('v37');
 await expect(page.locator('#dock-version')).toHaveText('v37');
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
 // Isolate the atmospheric background; interior grid labels are deliberately
 // visible below the horizon when the corresponding grid is enabled.
 await page.locator('#show-altaz-grid').uncheck();
 await page.locator('#show-radec-grid').uncheck();
 await page.locator('#show-planets').uncheck();
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
 await page.locator('#show-altaz-grid').check();
 await page.locator('#show-planets').check();
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
 // v32 uses fixed equatorial raster coverage, rather than projected
 // Canvas even-odd polygon fills. Inspect actual sky pixels instead.
 await page.locator('#show-milkyway-shade').check();
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
 await expect(page.locator('#app-version')).toHaveText('v37');
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


test('Version 37 Earth twilight controls and bundled 4K image work across all map projections',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#earth-texture-quality')).toHaveValue('2k');
 // Regression: the initial 2K image must actually load, rather than
 // silently falling back to the flat synthetic day/night raster.
 await expect(page.locator('#earth-texture-status')).toContainText('2K image · 2048 × 1024 · offline',{timeout:30000});
 for(const id of ['civil','nautical','astronomical'])await expect(page.locator('#earth-twilight-'+id)).toBeChecked();
 await expect(page.locator('#earth-twilight-night')).not.toBeChecked();
 const high=await page.evaluate(async()=>{
  const image=new Image();image.src='./earth-blue-marble-4k.jpg';await image.decode();
  return [image.naturalWidth,image.naturalHeight];
 });
 expect(high).toEqual([4096,2048]);
 await page.locator('#earth-texture-quality').selectOption('4k');
 await expect(page.locator('#earth-texture-status')).toContainText('4K image · 4096 × 2048',{timeout:30000});
 await page.locator('#earth-texture-quality').selectOption('2k');
 await expect(page.locator('#earth-texture-status')).toContainText('2K image · 2048 × 1024 · offline');
 await page.locator('#earth-texture-quality').selectOption('4k');
 for(const projection of ['globe','equal','mercator']){
  await page.locator('[data-projection="'+projection+'"]').click();
  const probe=await page.locator('#earth-map').evaluate(el=>JSON.parse(el.dataset.projectionProbe));
  expect(probe.observer[0]).toBeCloseTo(probe.viewCenter[0],0);
  if(projection==='globe')expect(probe.observer[1]).toBeCloseTo(probe.viewCenter[1],0);
  else{
   expect(probe.equator[1]).toBeCloseTo(probe.viewCenter[1],0);
   expect(probe.observer[1]).toBeLessThan(probe.viewCenter[1]);
   expect(probe.worldBounds[0][1]).toBeGreaterThanOrEqual(0);
   expect(probe.worldBounds[1][1]).toBeLessThanOrEqual(probe.viewCenter[1]*2+1);
  }
 }
 await page.locator('[data-projection="globe"]').click();
 await page.locator('#observe-date').fill('2026-11-09');
 await page.locator('#observe-time').fill('17:00');
 await page.locator('#observe-time').dispatchEvent('change');
 const before=await page.locator('#earth-map').evaluate(el=>el.toDataURL());
 await page.locator('#earth-twilight-civil').uncheck();
 const after=await page.locator('#earth-map').evaluate(el=>el.toDataURL());
 expect(after).not.toEqual(before);
 await page.reload();
 await expect(page.locator('#earth-texture-quality')).toHaveValue('4k');
 await expect(page.locator('#earth-twilight-civil')).not.toBeChecked();
 await expect(page.locator('#earth-twilight-nautical')).toBeChecked();
 expect(errors).toEqual([]);
});

test('Earth globe and flat maps center on the selected observer and Reset restores it',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 // Read the actual projected coordinates used by the bundled application,
 // rather than importing an unbundled source module that is not deployed.
 for(const projection of ['equal','globe','mercator']){
  await page.locator('[data-projection="'+projection+'"]').click();
  const sample=await page.locator('#earth-map').evaluate(el=>JSON.parse(el.dataset.projectionProbe));
  expect(sample.projection).toBe(projection);
  expect(sample.observer[0]).toBeCloseTo(sample.viewCenter[0],0);
  if(projection==='globe')expect(sample.observer[1]).toBeCloseTo(sample.viewCenter[1],0);
  else{
   expect(sample.equator[1]).toBeCloseTo(sample.viewCenter[1],0);
   expect(sample.observer[1]).toBeLessThan(sample.viewCenter[1]);
   expect(sample.worldBounds[0][1]).toBeGreaterThanOrEqual(0);
   expect(sample.worldBounds[1][1]).toBeLessThanOrEqual(sample.viewCenter[1]*2+1);
  }
  expect(sample.east[0]).toBeGreaterThan(sample.observer[0]);
  expect(sample.north[1]).toBeLessThan(sample.observer[1]);
 }
 await page.locator('[data-projection="globe"]').click();
 await page.locator('#earth-zoom-in').click();
 await page.locator('#earth-map-home').click();
 await expect(page.locator('#earth-zoom-value')).toHaveText('1.0×');
 const restored=await page.locator('#earth-map').evaluate(el=>JSON.parse(el.dataset.projectionProbe));
 expect(restored.observer[0]).toBeCloseTo(restored.viewCenter[0],0);
 expect(restored.observer[1]).toBeCloseTo(restored.viewCenter[1],0);
 expect(errors).toEqual([]);
});

test('Flat Earth vertical drags restore old spherical tilt while Reset restores north-up fit',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 const probe=()=>page.locator('#earth-map').evaluate(el=>JSON.parse(el.dataset.projectionProbe));
 for(const projection of ['equal','mercator']){
  await page.locator('[data-projection="'+projection+'"]').click();
  await page.locator('#earth-map-home').click();
  const before=await probe();
  expect(before.latitudeTilt).toBeCloseTo(0,5);
  expect(before.equator[1]).toBeCloseTo(before.viewCenter[1],0);
  // Raw Playwright mouse coordinates do not automatically scroll the
  // Earth panel into the viewport, unlike locator.click(). Confirm the
  // pointer really targets the map before diagnosing a missing tilt.
  await page.locator('#earth-map').scrollIntoViewIfNeeded();
  const box=await page.locator('#earth-map').boundingBox();
  expect(box).not.toBeNull();
  const x=box.x+box.width*.50,y=box.y+box.height*.50;
  const hit=await page.evaluate(([px,py])=>document.elementFromPoint(px,py)?.id,[x,y]);
  expect(hit).toBe('earth-map');
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x,y+Math.min(100,box.height*.22),{steps:5});
  await page.mouse.up();
  const dragged=await probe();
  expect(dragged.latitudeTilt).toBeGreaterThan(5);
  // The projected equator genuinely changes when the full map tilts,
  // rather than merely moving a marker or ignoring pointer input.
  expect(Math.abs(dragged.equator[1]-before.equator[1])).toBeGreaterThan(5);
  await page.locator('#earth-map-home').click();
  const reset=await probe();
  expect(reset.latitudeTilt).toBeCloseTo(0,5);
  expect(reset.equator[1]).toBeCloseTo(reset.viewCenter[1],0);
  expect(reset.worldBounds[0][1]).toBeGreaterThanOrEqual(-1);
  expect(reset.worldBounds[1][1]).toBeLessThanOrEqual(reset.viewCenter[1]*2+1);
 }
 // The globe must still reset to the observer's actual latitude.
 await page.locator('[data-projection="globe"]').click();
 await page.locator('#earth-map-home').click();
 const globe=await probe();
 expect(globe.latitudeTilt).toBeCloseTo(49.19,2);
 expect(globe.observer[1]).toBeCloseTo(globe.viewCenter[1],0);
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

test('Version 32 rectangular Milky Way mask changes the sky without a full-sky wash',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#observe-date').fill('2026-11-08');
 await page.locator('#observe-time').fill('18:47');
 await page.locator('#observe-time').dispatchEvent('change');
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await expect(page.locator('#milkyway-status')).toContainText('loaded');
 await page.locator('#show-milkyway-shade').uncheck();
 const before=await page.locator('#sky').evaluate(el=>({w:el.width,h:el.height,data:Array.from(el.getContext('2d').getImageData(0,0,el.width,el.height).data)}));
 await page.locator('#show-milkyway-shade').check();
 const result=await page.locator('#sky').evaluate((el,off)=>{
  const on=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  let clear=0,shaded=0;
  for(let y=Math.floor(off.h*.15);y<off.h*.85;y+=6)for(let x=Math.floor(off.w*.15);x<off.w*.85;x+=6){
   const i=(y*off.w+x)*4;
   if(off.data[i]>3||off.data[i+1]>3||off.data[i+2]>3)continue;
   clear++;
   if(on[i]>off.data[i]+8)shaded++;
  }
  return {clear,shaded};
 },before);
 expect(result.clear).toBeGreaterThan(100);
 expect(result.shaded).toBeGreaterThan(10);
 expect(result.shaded/result.clear).toBeLessThan(.55);
 expect(errors).toEqual([]);
});

test('Version 35 lunar Earthshine is optional and full Moon remains bright',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('.moon-panel')).toBeVisible();
 await expect(page.locator('#show-earthshine')).toBeChecked();
 await page.waitForFunction(()=>document.querySelector('#moon-source')?.textContent.includes('NASA LRO near-side'));
 const centerPixel=()=>page.locator('#moon').evaluate(el=>{
  const ctx=el.getContext('2d'),x=Math.floor(el.width/2),y=Math.floor(el.height/2);
  return Array.from(ctx.getImageData(x,y,1,1).data);
 });
 // A known near-new Moon (solar eclipse); earthshine remains unmistakably
 // optional and never changes the ephemeris's illumination percentage.
 await page.locator('#observe-date').fill('2024-04-08');
 await page.locator('#observe-time').fill('18:00');
 await page.locator('#observe-time').dispatchEvent('change');
 const newIllumination=await page.locator('#moon-illumination').innerText();
 const visibleDark=await centerPixel();
 await page.locator('#show-earthshine').uncheck();
 const naturalDark=await centerPixel();
 expect(visibleDark[0]).toBeGreaterThan(naturalDark[0]);
 expect(visibleDark[3]).toBeGreaterThan(0);
 await expect(page.locator('#moon-illumination')).toHaveText(newIllumination);
 await page.locator('#show-earthshine').check();
 await page.locator('#observe-date').fill('2024-03-25');
 await page.locator('#observe-time').fill('07:00');
 await page.locator('#observe-time').dispatchEvent('change');
 const full=await centerPixel();
 expect(full[0]).toBeGreaterThan(visibleDark[0]*2);
 await page.locator('[data-disc-view="sun"]').click();
 await expect(page.locator('#earthshine-setting')).toBeHidden();
 await page.locator('[data-disc-view="moon"]').click();
 await expect(page.locator('#earthshine-setting')).toBeVisible();
 expect(errors).toEqual([]);
});

test('Version 36 stores, restores, imports, exports and resets preferences',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#latitude').fill('51.5000');await page.locator('#latitude').dispatchEvent('change');
 await page.locator('#longitude').fill('-101.2500');await page.locator('#longitude').dispatchEvent('change');
 await page.locator('[data-projection="globe"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await page.locator('#show-earthshine').uncheck();
 await page.locator('#star-magnitude').selectOption('5');
 await page.locator('#prefs-remember-view').check();
 await page.locator('#earth-zoom-in').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('helioclock-preferences-v1')));
 expect(saved.version).toBe(1);
 expect(saved.observer).toEqual({lat:51.5,lon:-101.25});
 expect(saved.earthProjection).toBe('globe');
 expect(saved.skyLight).toBe('black');
 expect(saved.checkboxes['show-earthshine']).toBe(false);
 expect(saved.rememberView).toBe(true);
 await page.reload();
 await expect(page.locator('#latitude')).toHaveValue('51.5');
 await expect(page.locator('#longitude')).toHaveValue('-101.25');
 await expect(page.locator('[data-projection="globe"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-sky-light="black"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#show-earthshine')).not.toBeChecked();
 await expect(page.locator('#star-magnitude')).toHaveValue('5');
 await expect(page.locator('#earth-zoom-value')).not.toHaveText('1.0×');
 await expect(page.locator('#live-indicator')).toContainText('LIVE');
 // A JSON export can be read back using the same schema.
 const downloaded=page.waitForEvent('download');
 await page.locator('#prefs-export').click();
 const file=await downloaded;
 expect(file.suggestedFilename()).toBe('HelioClock-settings.json');
 const savedJson=await page.evaluate(()=>localStorage.getItem('helioclock-preferences-v1'));
 await Promise.all([
  page.waitForEvent('load'),
  page.locator('#prefs-reset').click()
 ]);
 await expect(page.locator('#latitude')).toHaveValue('49.19');
 await expect(page.locator('#longitude')).toHaveValue('-98.1');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('helioclock-preferences-v1'))?.observer?.lat)).toBe(49.19);
 await expect(page.locator('#prefs-remember-view')).not.toBeChecked();
 await expect(page.locator('#show-earthshine')).toBeChecked();
 await page.locator('#prefs-file').setInputFiles({
  name:'settings.json',mimeType:'application/json',buffer:Buffer.from(savedJson)
 });
 await expect(page.locator('#prefs-status')).toContainText('Settings imported successfully');
 await expect(page.locator('#latitude')).toHaveValue('51.5');
 await expect(page.locator('#show-earthshine')).not.toBeChecked();
 expect(errors).toEqual([]);
});

test('Version 25 Sun and Moon use the same zoomable pannable fullscreen stage',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#app-version')).toHaveText('v37');
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

test('Rectangular Milky Way closes full-RA rings at the pole',async({page})=>{
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#mw-debug-status')).toContainText('Mask planar');
 // Two large Vieira boundary loops run all the way around RA. Closing them
 // directly would draw an artificial 360-degree diagonal through the mask.
 await page.locator('[data-sky-projection="rect"]').click();
 await expect(page.locator('#mw-debug-status')).toContainText('2 seam closures');
 await page.locator('[data-sky-projection="polar"]').click();
 await expect(page.locator('#mw-debug-status')).toContainText('2 seam closures');
});

test('Milky Way fixed mask is consistent across projections and polar zoom',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-light="black"]').click();
 // Polar mode intentionally renders with the preserved planar-legacy mask.
 // Enter rectangular mode before awaiting diagnostics for the repaired
 // "planar" mask; otherwise that mask has not been generated.
 await page.locator('[data-sky-projection="rect"]').click();
 await expect(page.locator('#mw-debug-status')).toContainText(/Mask planar · [0-9.]+% equatorial pixels/);
 const stats=await page.locator('#mw-debug-status').innerText();
 expect(stats).toContain('2 seam closures');
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('#sky-zoom').fill('2');
 await page.locator('#sky-zoom').dispatchEvent('input');
 await expect(page.locator('#mw-debug-status')).toHaveText(stats);
 expect(errors).toEqual([]);
});

test('Milky Way cursor reports independently computable galactic latitude and mask intensity',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('#use-precession').uncheck();
 await expect(page.locator('#mw-debug-status')).toContainText(/Mask planar · [0-9.]+% equatorial pixels/);
 const sky=page.locator('#sky');
 await sky.scrollIntoViewIfNeeded();
 const box=await sky.boundingBox();
 await page.mouse.move(box.x+box.width*.44,box.y+box.height*.36);
 const readout=await page.locator('#sky-cursor-readout').innerText();
 expect(readout).toContain('Galactic lat');
 expect(readout).toMatch(/MW mask \d+\/255 \(\d+\.\d%\) · planar/);
 const match=readout.match(/RA (\d+)h (\d+\.\d+)m · Dec ([+-]\d+\.\d+)°.*Galactic lat ([+-]\d+\.\d+)°/);
 expect(match).not.toBeNull();
 const ra=(Number(match[1])+Number(match[2])/60)*15,dec=Number(match[3]);
 const poleRA=192.85948*Math.PI/180,poleDec=27.12825*Math.PI/180;
 const r=ra*Math.PI/180,d=dec*Math.PI/180;
 const b=Math.asin(Math.sin(d)*Math.sin(poleDec)+Math.cos(d)*Math.cos(poleDec)*Math.cos(r-poleRA))*180/Math.PI;
 expect(Number(match[4])).toBeCloseTo(b,1);
 // The working polar renderer deliberately continues sampling its legacy
 // mask, which the diagnostic must identify accurately.
 await page.locator('[data-sky-projection="polar"]').click();
 await sky.scrollIntoViewIfNeeded();
 const polar=await sky.boundingBox();
 await page.mouse.move(polar.x+polar.width/2,polar.y+polar.height/2);
 await expect(page.locator('#sky-cursor-readout')).toContainText('planar-legacy');
 expect(errors).toEqual([]);
});

test('Version 26 polar zoom anchors cursor and dragging pans the sky',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('[data-sky-projection="polar"]').click();
 await page.locator('#sky').evaluate(el=>{
  const old=CanvasRenderingContext2D.prototype.translate;
  window.__skyTranslate=[0,0];
  window.__helioclockCaptureZoom=true;
  CanvasRenderingContext2D.prototype.translate=function(x,y){
   if(this.canvas.id==='sky')window.__skyTranslate=[x,y];
   return old.call(this,x,y);
  };
 });
 const sky=page.locator('#sky');
 // Measure from the exact DOM rect used by the wheel handler. An earlier
 // boundingBox() snapshot can become stale as late-loading panels relayout.
 const geometry=await sky.evaluate(el=>{
  const rect=el.getBoundingClientRect(),u=.73,v=.32;
  const px=rect.width*u,py=rect.height*v;
  const x=rect.left+px,y=rect.top+py;
  el.dispatchEvent(new WheelEvent('wheel',{
   bubbles:true,cancelable:true,deltaY:-180,clientX:x,clientY:y
  }));
  return {px,py,cx:rect.width/2,cy:rect.height/2,x,y};
 });
 const zoomAfter=Number(await page.locator('#sky-zoom').inputValue());
 expect(zoomAfter).toBeGreaterThan(1);
 const anchored=await page.evaluate(()=>window.__skyTranslate);
 const trace=await page.evaluate(()=>window.__helioclockZoomTrace);
 expect(trace).toBeDefined();
 // Slider and renderer must agree: a range step of .1 previously coerced
 // internal 1.14 zoom to 1.1, making the cursor appear to drift.
 expect(zoomAfter).toBeCloseTo(trace.next,2);
 const ratio=trace.ratio;

 expect(trace).toBeDefined();
 // The rendered translation must be the application's actual pan state.
 expect(anchored[0]).toBeCloseTo(trace.panX,4);
 expect(anchored[1]).toBeCloseTo(trace.panY,4);
 // The chosen celestial point must remain precisely below the cursor.
 // Firefox normalizes fractional WheelEvent client coordinates. Compare
 // against what the handler actually received, not the requested fraction.
 const projected=[
  trace.rectWidth/2+ratio*(trace.px-trace.rectWidth/2)+anchored[0],
  trace.rectHeight/2+ratio*(trace.py-trace.rectHeight/2)+anchored[1]
 ];
 expect(projected[0]).toBeCloseTo(trace.px,2);
 expect(projected[1]).toBeCloseTo(trace.py,2);
 // The synthetic wheel event above does not scroll the browser into a
 // position suitable for physical mouse input. Explicitly bring the canvas
 // into view and remeasure before using Playwright's real pointer events.
 await sky.scrollIntoViewIfNeeded();
 const dragBox=await sky.boundingBox();
 expect(dragBox).not.toBeNull();
 const x=dragBox.x+dragBox.width/2,y=dragBox.y+dragBox.height/2;
 // Require a real canvas pointerdown and pointermove, not a silent drag on
 // another element. This retains the strict pixel-for-pixel requirement.
 await sky.evaluate(el=>{
  window.__skyPointerEvents=[];
  for(const type of ['pointerdown','pointermove','pointerup'])
   el.addEventListener(type,e=>{
    window.__skyPointerEvents.push({type,x:e.clientX,y:e.clientY});
   });
 });
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x+34,y+24,{steps:3});
 await page.mouse.up();
 const events=await page.evaluate(()=>window.__skyPointerEvents);
 expect(events.some(e=>e.type==='pointerdown')).toBe(true);
 expect(events.some(e=>e.type==='pointermove')).toBe(true);
 expect(events.some(e=>e.type==='pointerup')).toBe(true);
 const panned=await page.evaluate(()=>window.__skyTranslate);
 expect(panned[0]-anchored[0]).toBeCloseTo(34,0);
 expect(panned[1]-anchored[1]).toBeCloseTo(24,0);
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


test('Version 32 rectangular black sky stays black outside the fixed Milky Way mask',async({page})=>{
 test.setTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#layout-sky').click();
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 for(const id of ['show-stars','show-constellations','show-sky-paths','show-labels','show-galactic-center','show-milkyway-outline']){
  await page.locator('#'+id).uncheck();
 }
 await page.waitForFunction(()=>document.querySelector('#milkyway-status').textContent.includes('loaded'));
 await page.locator('#observe-date').fill('2026-11-09');
 for(const hour of ['09:48','10:48','11:48','12:44','15:48']){
  await page.locator('#observe-time').fill(hour);
  await page.locator('#observe-time').dispatchEvent('change');
  await page.locator('#show-milkyway-shade').uncheck();
  const off=await page.locator('#sky').evaluate(el=>{
   const c=el.getContext('2d'),w=el.width,h=el.height;
   return {w,h,data:Array.from(c.getImageData(0,0,w,h).data)};
  });
  await page.locator('#show-milkyway-shade').check();
  const on=await page.locator('#sky').evaluate(el=>{
   const c=el.getContext('2d'),w=el.width,h=el.height;
   return Array.from(c.getImageData(0,0,w,h).data);
  });
  let checked=0,black=0,shaded=0;
  // Avoid the grid, labels and panel border; compare shade on/off at
  // identical times to isolate the true Milky Way mask from annotations.
  for(let y=Math.floor(off.h*.12);y<off.h*.88;y+=5){
   for(let x=Math.floor(off.w*.12);x<off.w*.88;x+=5){
    const i=(y*off.w+x)*4;
    if(off.data[i]>3||off.data[i+1]>3||off.data[i+2]>3)continue;
    checked++;black++;
    if(on[i]>off.data[i]+8||on[i+1]>off.data[i+1]+8)shaded++;
   }
  }
  expect(checked).toBeGreaterThan(100);
  // A complement fill would shade virtually the entire blank sky.
  expect(shaded/checked).toBeLessThan(.55);
  expect(shaded).toBeGreaterThan(10);
 }
 expect(errors).toEqual([]);
});


test('Version 33 avoids false Milky Way bands far from galactic plane at 07:44 Manitoba time',async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#layout-sky').click();
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 for(const id of ['show-stars','show-constellations','show-sky-paths','show-labels','show-galactic-center','show-milkyway-outline']){
  await page.locator('#'+id).uncheck();
 }
 await page.waitForFunction(()=>document.querySelector('#milkyway-status').textContent.includes('loaded'));
 await page.locator('#latitude').fill('49.19');
 await page.locator('#longitude').fill('-98.10');
 await page.locator('#observe-date').fill('2026-11-09');
 // Screenshot: 07:44 America/Winnipeg (UTC-05:00) = 12:44 UTC.
 await page.locator('#observe-time').fill('12:44');
 await page.locator('#observe-time').dispatchEvent('change');
 const canvas=page.locator('#sky');
 await page.locator('#show-milkyway-shade').uncheck();
 const off=await canvas.evaluate(el=>({
  w:el.width,h:el.height,data:Array.from(el.getContext('2d').getImageData(0,0,el.width,el.height).data)
 }));
 await page.locator('#show-milkyway-shade').check();
 const region=await canvas.evaluate((el,off)=>{
  const on=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
  const w=off.w,h=off.h;
  const R=Math.PI/180;
  // Latitude of the galactic north pole in ICRS/J2000.
  const np=[Math.cos(27.12825*R)*Math.cos(192.85948*R),
   Math.cos(27.12825*R)*Math.sin(192.85948*R),Math.sin(27.12825*R)];
  const lat=49.19*R,phiSin=Math.sin(lat),phiCos=Math.cos(lat);
  const date=new Date('2026-11-09T12:44:00Z');
  const J=date.getTime()/86400000+2440587.5,T=(J-2451545)/36525;
  const lst=((280.46061837+360.98564736629*(J-2451545)+.000387933*T*T-T*T*T/38710000-98.10)%360+360)%360;
  let high=0,falseBand=0,mid=0;
  for(let y=Math.floor(h*.10);y<h*.90;y+=5){
   const altitude=(90-y/h*180)*R,sa=Math.sin(altitude),ca=Math.cos(altitude);
   for(let x=Math.floor(w*.09);x<w*.91;x+=5){
    const i=(y*w+x)*4;
    if(off.data[i]>3||off.data[i+1]>3||off.data[i+2]>3)continue;
    const az=(x/w*360)*R;
    const dec=Math.asin(Math.max(-1,Math.min(1,sa*phiSin+ca*phiCos*Math.cos(az))));
    const H=Math.atan2(-ca*Math.sin(az),sa*phiCos-ca*phiSin*Math.cos(az));
    const ra=lst*R-H;
    const dot=Math.cos(dec)*(Math.cos(ra)*np[0]+Math.sin(ra)*np[1])+Math.sin(dec)*np[2];
    const glat=Math.asin(Math.max(-1,Math.min(1,dot)))/R;
    const change=on[i]-off.data[i]>6||on[i+1]-off.data[i+1]>6;
    if(Math.abs(glat)>50){high++;if(change)falseBand++}
    else if(change)mid++;
   }
  }
  return {high,falseBand,mid};
 },off);
 expect(region.high).toBeGreaterThan(100);
 expect(region.mid).toBeGreaterThan(25);
 expect(region.falseBand/region.high).toBeLessThan(.03);
 expect(errors).toEqual([]);
});


test('Version 34 offers comparable Milky Way masks and copyable exact debug state',async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#layout-sky').click();
 await page.locator('[data-sky-projection="rect"]').click();
 await page.locator('[data-sky-light="black"]').click();
 await page.waitForFunction(()=>document.querySelector('#milkyway-status').textContent.includes('loaded'));
 await page.locator('#observe-date').fill('2026-11-09');
 await page.locator('#observe-time').fill('12:44');
 await page.locator('#observe-time').dispatchEvent('change');
 await expect(page.locator('#mw-debug-mask-mode')).toHaveCount(0);
 await expect(page.locator('#mw-debug-status')).toContainText(/Mask planar · [0-9.]+% equatorial pixels/);
 // Stub clipboard so we inspect the actual JSON payload without needing
 // permissions in headless Firefox.
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
   writeText:async text=>{window.__debugCopy=text;}
  }});
 });
 await page.locator('#mw-copy-debug').click();
 const data=await page.evaluate(()=>JSON.parse(window.__debugCopy));
 expect(data.version).toBe(37);
 expect(data.utc).toBe('2026-11-09T12:44:00.000Z');
 expect(data.observer).toEqual({lat:49.19,lon:-98.10});
 expect(data.sky.projection).toBe('rect');
 expect(data.sky.light).toBe('black');
 expect(data.milkyWay.maskMode).toBe('planar');
 expect(data.milkyWay.mask.status).toBe('ready');
 expect(data.milkyWay.mask.filledPixels).toBeGreaterThan(100);
 expect(data.milkyWay.mask.sourceLevels).toBe(5);
 expect(errors).toEqual([]);
});
