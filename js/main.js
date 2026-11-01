'use strict';
// Arranque
(function (G) {
  G.save.load();
  G.resize();
  G.go('power');
  G.start();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})(window.G);
