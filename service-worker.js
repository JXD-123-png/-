/* ============================================================
   情绪复盘平台 · Service Worker（离线缓存）
   规则：
   · 只缓存「同源静态资源」（html / 图标 / manifest）
   · 行情接口是跨域请求 → 直接放行，不缓存，保证数据实时
   · 网络优先、失败回退缓存 → 联网时总是拿最新页面，断网也能打开
   ============================================================ */
var CACHE = 'fupan-pwa-v1';
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(CORE).catch(function(){ /* 个别文件缺失不影响安装 */ });
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err){ return; }

  /* 跨域（行情接口、K线接口）→ 不拦截、不缓存，保证实时 */
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.status === 200 && (res.type === 'basic' || res.type === 'default')){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(r){
        return r || caches.match('./index.html');
      });
    })
  );
});