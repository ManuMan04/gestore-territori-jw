const CACHE_NAME = 'territori-cache-v22';
const ASSETS = [
    'index.html',
    'css/style.css',
    'css/fontawesome.min.css',
    'js/app.js',
    'js/alpine.min.js',
    'js/tailwind.min.js',
    'js/tailwind-config.js',
    'webfonts/fa-solid-900.woff2',
    'webfonts/fa-solid-900.ttf',
    'webfonts/fa-regular-400.woff2',
    'webfonts/fa-regular-400.ttf',
    'webfonts/fa-brands-400.woff2',
    'webfonts/fa-brands-400.ttf',
    'icons/icon-192.png',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((res) => res || fetch(event.request))
    );
});
