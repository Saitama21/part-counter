const CACHE='production-center-v9-stat-safe-20261124';
const FILES=["./","./index.html","./style.css","./app.js","./manifest.webmanifest?v=20261124b","./production-center-icon-180.png?v=20261124b","./production-center-icon-192.png?v=20261124b","./production-center-icon-512.png?v=20261124b","./production-center-icon-1024.png?v=20261124b","./01_header.png","./02_plan_panel_clean.png","./03_main_display_clean.png","./04_led_field_clean.png","./05_progress_ring_clean.png","./06_stat_panel_clean.png","./07_stat_panel_clean.png","./08_progress_bar.png","./09_minus_button_disabled.png","./09_minus_button_idle.png","./09_minus_button_pressed.png","./10_plus_button_disabled.png","./10_plus_button_idle.png","./10_plus_button_pressed.png","./11_reset_button.png","./12_new_batch_tab.png","./13_history_tab.png","./14_settings_tab.png"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('production-center-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));return;
  }
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
});
