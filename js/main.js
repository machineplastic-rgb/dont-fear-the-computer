'use strict';
// Arranque
(function (G) {
  G.save.load();
  if (/[?&]core(=|&|$)/.test(location.search)) { G.save.data.coreDev = 1; G.save.write(); } // atajo de prueba: abre GAME+ sin pasarse la parte 1
  G.resize();
  G.go('power');
  G.start();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // si llega una versión nueva mientras está la pantalla de inicio, se recarga sola (en mitad de una partida no)
    const had = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had || reloaded) return;
      if (G.sceneName === 'power' || G.sceneName === 'boot') { reloaded = true; location.reload(); }
    });
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
  }
})(window.G);
