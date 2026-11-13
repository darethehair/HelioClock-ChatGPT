import {test,expect} from '@playwright/test';

test('Pixel Chromium: Moon and Sun grids remain aligned during touch, zoom and fullscreen',async({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#disc-grid-toggle').check();
 const stage=page.locator('#disc-stage');
 const bounds=async selector=>page.evaluate(selector=>{
  const image=document.querySelector(selector),grid=document.querySelector('#disc-coordinate-grid');
  const rect=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]};
  return {image:rect(image),grid:rect(grid),imageTransform:getComputedStyle(image).transform,gridTransform:getComputedStyle(grid).transform};
 },selector);
 const aligned=geometry=>{
  for(let i=0;i<4;i++)expect(Math.abs(geometry.image[i]-geometry.grid[i])).toBeLessThan(1);
  expect(geometry.imageTransform).toBe(geometry.gridTransform);
 };
 for(const [view,selector] of [['moon','#moon'],['sun','#solar-photo']]){
  await page.locator('[data-disc-view="'+view+'"]').click();
  await page.locator('#disc-reset').click();
  const before=await bounds(selector);aligned(before);
  const r=await stage.boundingBox();
  await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  // Chromium's real touch viewport receives pointer events. For a two-finger
  // pinch, dispatch coordinated touch-type PointerEvents to the app handler.
  await stage.evaluate(el=>{
   const setCapture=el.setPointerCapture;
   el.setPointerCapture=()=>{};
   const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
   const fire=(type,id,px,py)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerType:'touch',pointerId:id,isPrimary:id===11,clientX:px,clientY:py}));
   try {
    fire('pointerdown',11,x-30,y);
    fire('pointerdown',12,x+30,y);
    fire('pointermove',12,x+60,y);
    fire('pointermove',11,x-55,y);
    fire('pointerup',11,x-55,y);
    fire('pointerup',12,x+60,y);
   } finally {el.setPointerCapture=setCapture}
  });
  const pinch=await bounds(selector);aligned(pinch);
  expect(pinch.imageTransform).not.toBe(before.imageTransform);
  await page.locator('[data-fullscreen="moon-panel"]').click();
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
  aligned(await bounds(selector));
  await page.evaluate(()=>document.exitFullscreen());
  await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  await page.locator('#disc-reset').click();
  aligned(await bounds(selector));
 }
 expect(errors).toEqual([]);
});
