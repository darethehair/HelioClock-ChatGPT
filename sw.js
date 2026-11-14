const CACHE='helioclock-chatgpt-v62';
const IS_UPDATE=!!self.registration.active;
const ASSETS=['./','./index.html','./styles.css','./app.js','./astronomy.js','./earth-blue-marble.png','./earth-blue-marble-4k.jpg','./moon-nearside-lro.jpg','./solar-fallback.jpg','./sky-stars.json','./hero-landscape-natural.webp','./earth-black-marble-lights-2016.jpg','./sky-constellations.json','./sky-milkyway.json','./icon.svg','./manifest.webmanifest','./build-info.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys()
  .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  .then(()=>self.clients.claim())
  .then(async()=>{
   // Existing tabs can otherwise retain an earlier build indefinitely.
   if(!IS_UPDATE)return;
   const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true});
   await Promise.all(tabs.map(tab=>tab.navigate(tab.url).catch(()=>{})));
  }));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const url=new URL(request.url);
 // Navigation and release metadata must prefer the network; the installed
 // offline cache is used only when the user genuinely has no connection.
 const networkFirst=request.mode==='navigate'||url.pathname.endsWith('/build-info.json');
 if(networkFirst){
  event.respondWith(fetch(request,{cache:'no-store'}).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}
   return response;
  }).catch(()=>caches.match(request)));
 }else{
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)))}
   return response;
  })));
 }
});
