// REVISIONS is injected from the completed build. HTML, APIs and external origins bypass this worker.
const CACHE='ps-static-v1';
const writes=new Map();
function keyFor(request){
  const url=new URL(typeof request==='string'?request:request.url);
  if(url.origin!==self.location.origin||!REVISIONS[url.pathname])return null;
  url.searchParams.set('__ps_rev',REVISIONS[url.pathname]);return url.href;
}
async function remember(cache,key,response){
  if(!response.ok||response.status!==200||/no-store/i.test(response.headers.get('cache-control')||''))return;
  try{await cache.put(key,response);const keys=await cache.keys();for(const old of keys.slice(0,Math.max(0,keys.length-400)))await cache.delete(old);}catch{}
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.mode==='navigate'||request.headers.has('range')||request.headers.has('authorization'))return;
  const key=keyFor(request);if(!key)return;
  event.respondWith((async()=>{
    if(writes.has(key))await writes.get(key);
    let cache;try{cache=await caches.open(CACHE);const hit=await cache.match(key);if(hit)return hit;}catch{}
    const response=await fetch(request);if(cache){const work=remember(cache,key,response.clone()).finally(()=>writes.delete(key));writes.set(key,work);event.waitUntil(work);}return response;
  })());
});
// Warm only assets already in HTTP disk cache: never download the whole site or duplicate a cold request.
self.addEventListener('message',event=>{
  if(event.data?.type!=='ps-cache-used'||!Array.isArray(event.data.urls))return;
  event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);
    for(const url of event.data.urls.slice(0,160)){const key=keyFor(url);if(!key||await cache.match(key))continue;
      try{const response=await fetch(url,{cache:'only-if-cached',mode:'same-origin'});await remember(cache,key,response);}catch{}
    }
  }catch{}})());
});
