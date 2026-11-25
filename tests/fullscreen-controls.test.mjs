import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const sections=['chart-panel','earth-panel','local-sun-panel','sky-panel',
 'moon-panel','orrery-panel','almanac-panel','details-panel'];

test('every data panel has fullscreen and a reversible Controls toggle',()=>{
 for(const name of sections){
  const start=html.indexOf('<section class="panel '+name+'"');
  assert.ok(start>=0,name+' exists');
  const end=html.indexOf('</section>',start);
  const fragment=html.slice(start,end);
  assert.match(fragment,/class="panel-fullscreen"/,name+' fullscreen button');
  assert.match(fragment,/class="mobile-plot-settings"/,name+' controls button');
  assert.ok(app.includes("'"+name+"':["),name+' control mapping');
 }
});

test('desktop and compact fullscreen both have a hide/show mechanism',()=>{
 assert.match(app,/fullscreen-controls-collapsed/);
 assert.match(app,/mobile-fullscreen-drawer/);
 assert.match(css,/fullscreen-controls-collapsed \.fullscreen-optional-control/);
 assert.match(css,/:fullscreen:not\(\.mobile-plot-fullscreen\)>\.mobile-plot-settings/);
});

test('extended lunar, local map and orrery controls are included',()=>{
 for(const selector of ['.lunar-feature-controls','.disc-coordinate-warning',
  '.local-sun-map-zoom','.orrery-minor-body-controls','.orrery-comet-tools',
  '.almanac-tools','.fineprint']){
  assert.ok(app.includes("'"+selector+"'"),selector+' mapped');
 }
});
