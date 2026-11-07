import {test,expect} from '@playwright/test';
test('dashboard controls work in Firefox',async({page})=>{
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:8765/');
 await expect(page.locator('#sunrise')).not.toHaveText('—');
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
 expect(errors).toEqual([]);
});
