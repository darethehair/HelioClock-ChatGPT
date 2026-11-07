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
 // At a fixed midwinter date, daylight and night must produce different sky backgrounds.
 await page.locator('#observe-date').fill('2026-12-21');
 await page.locator('#observe-time').fill('06:00');
 await page.locator('#observe-time').dispatchEvent('change');
 await expect(page.locator('#sky-light-status')).toContainText('Night');
 const nightSky=await page.locator('#sky').evaluate(el=>Array.from(el.getContext('2d').getImageData(2,2,1,1).data));
 expect(nightSky.slice(0,3)).toEqual([0,0,0]);

 await expect(page.locator('#local-clock')).not.toHaveText('—');
 await expect(page.locator('#dock-time-zone')).toContainText('UTC');
 await expect(page.locator('#dock-local-time')).not.toHaveText('—');
 await expect(page.locator('.panel-fullscreen')).toHaveCount(6);
 await page.locator('[data-orbit-mode="outer"]').click();
 await expect(page.locator('[data-orbit-mode="outer"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#planet-legend')).toContainText('Neptune');
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
