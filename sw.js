const CACHE='helioclock-chatgpt-v50';
const ASSETS=['./','./index.html','./styles.css','./app.js','./astronomy.js','./earth-blue-marble.png','./earth-blue-marble-4k.jpg','./moon-nearside-lro.jpg','./solar-fallback.jpg','./sky-stars.json','./hero-landscape-natural.webp','./earth-black-marble-lights-2016.jpg','./sky-constellations.json','./sky-milkyway.json','./icon.svg','./manifest.webmanifest','./build-info.json'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
  return response;
 })));
});
