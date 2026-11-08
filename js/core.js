'use strict';
// (DON'T FEAR) THE COMPUTER — núcleo: canvas, escalado pixel-perfect, bucle, escenas, efectos de post-proceso.
window.G = window.G || {};
(function (G) {
  // Paleta oficial del juego (medida del dossier)
  G.PAL = { G: '#46ff00', B: '#0000ff', L: '#dddddd', K: '#000000', W: '#ffffff' };
  G.time = 0;
  G.VERSION = 'V11'; // versión visible en la pantalla de carga y en SYSTEM

  const scr = document.getElementById('screen');
  const sg = scr.getContext('2d', { alpha: false });
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { alpha: false });
  function mk() { const c = document.createElement('canvas'); return { c, x: c.getContext('2d') }; }
  const fxA = mk(), fxB = mk(), fxT = mk();
  G.scr = scr; G.sg = sg; G.cv = cv; G.g = g;
  G.W = 200; G.H = 400; G.P = 1; G.ox = 0; G.oy = 0; G.safeT = 0; G.safeB = 0; G.dpr = 1;

  // ---------- utilidades ----------
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.rand = (a, b) => a + Math.random() * (b - a);
  G.irand = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  G.chance = (p) => Math.random() < p;
  G.wpick = function (weights) { // {key: peso}
    let tot = 0; for (const k in weights) tot += weights[k];
    let r = Math.random() * tot;
    for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
    return Object.keys(weights)[0];
  };
  G.rng = function (seed) { // mulberry32
    let a = seed >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  G.pad = (n, l) => String(Math.max(0, Math.floor(n))).padStart(l, '0');
  G.fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  G.inR = (x, y, r, pad) => { pad = pad || 0; return x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad; };
  G.mkCanvas = function (w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c, x }; };
  G.vibrate = function (ms) { try { if (G.save && G.save.data.settings.vib && navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };

  // ---------- eventos ----------
  const listeners = {};
  G.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  G.emit = (ev, a) => (listeners[ev] || []).forEach((fn) => fn(a));

  function noSmooth(x) { x.imageSmoothingEnabled = false; x.webkitImageSmoothingEnabled = false; }

  // ---------- overlays de pantalla (scanlines + viñeta) ----------
  let scan = null, vign = null, noiseTile = null, crtPat = null, grain = null;
  function buildOverlays() {
    const P = G.P;
    scan = null;
    // trama fina de tubo (a resolución real): líneas horizontales + rejilla RGB, se pinta multiplicando (no aclara el negro)
    { const per = G.dpr >= 2 ? 3 : 2, c = document.createElement('canvas'); c.width = 3; c.height = per; const x = c.getContext('2d');
      ['rgb(255,232,232)', 'rgb(232,255,232)', 'rgb(232,232,255)'].forEach((col, i) => { x.fillStyle = col; x.fillRect(i, 0, 1, per); });
      x.fillStyle = 'rgb(165,165,180)'; x.fillRect(0, per - 1, 3, 1);
      crtPat = sg.createPattern(c, 'repeat'); }
    if (!grain) { grain = document.createElement('canvas'); grain.width = grain.height = 256; const x = grain.getContext('2d'), id = x.createImageData(256, 256); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }
    if (P >= 3) {
      const c = document.createElement('canvas'); c.width = 1; c.height = P;
      const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.20)'; x.fillRect(0, P - 1, 1, 1);
      scan = sg.createPattern(c, 'repeat');
    }
    const w = G.W * P, h = G.H * P;
    vign = document.createElement('canvas'); vign.width = w; vign.height = h;
    const vx = vign.getContext('2d');
    const gr = vx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.42)');
    vx.fillStyle = gr; vx.fillRect(0, 0, w, h);
    if (!noiseTile) {
      noiseTile = G.mkCanvas(96, 96);
      const id = noiseTile.x.createImageData(96, 96);
      for (let i = 0; i < id.data.length; i += 4) {
        if (Math.random() < 0.09) { const v = Math.random() < 0.5 ? 255 : 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      }
      noiseTile.x.putImageData(id, 0, 0);
    }
  }

  // ---------- resize: escala entera = píxeles nítidos ----------
  G.resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 4);
    const cw = window.innerWidth, ch = window.innerHeight;
    const dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);
    scr.width = dw; scr.height = dh;
    scr.style.width = cw + 'px'; scr.style.height = ch + 'px';
    const P = Math.max(1, Math.min(Math.floor(dw / 190), Math.floor(dh / 380)));
    const H = Math.floor(dh / P);
    const W = Math.min(Math.floor(dw / P), Math.floor(H * 0.62));
    G.P = P; G.W = W; G.H = H; G.dpr = dpr;
    G.ox = Math.floor((dw - W * P) / 2); G.oy = Math.floor((dh - H * P) / 2);
    for (const c of [cv, fxA.c, fxB.c, fxT.c]) { c.width = W; c.height = H; }
    [g, fxA.x, fxB.x, fxT.x, sg].forEach(noSmooth);
    const probe = document.getElementById('safe');
    const cs = getComputedStyle(probe);
    const st = parseFloat(cs.paddingTop) || 0, sb = parseFloat(cs.paddingBottom) || 0;
    G.safeT = Math.ceil(st * dpr / P); G.safeB = Math.ceil(sb * dpr / P);
    buildOverlays();
    G.emit('resize');
    if (G.scene && G.scene.resize) G.scene.resize();
  };

  // ---------- efectos ----------
  G.fx = { ab: 0, abBase: 0, glitch: 0, glitchBase: 0, shake: 0, flash: 0, flashCol: '#ffffff', noise: 0, scan: true, vign: true, crt: false };
  G.pulse = function (o) { for (const k in o) { if (k === 'flashCol') G.fx.flashCol = o[k]; else G.fx[k] = Math.max(G.fx[k] || 0, o[k]); } };
  function decay(dt) {
    const f = G.fx;
    f.ab = Math.max(0, f.ab - dt * 10);
    f.glitch = Math.max(0, f.glitch - dt * 2.2);
    f.shake = Math.max(0, f.shake - dt * 28);
    f.flash = Math.max(0, f.flash - dt * 3.5);
  }
  function fxMul() { return G.save && G.save.data ? (G.save.data.settings.fx ? 1 : 0.35) : 1; }

  function glitchPass(src, amt) {
    const W = G.W, H = G.H, d = fxB.x;
    d.globalCompositeOperation = 'source-over';
    d.drawImage(src, 0, 0);
    const n = Math.floor(1 + amt * 9);
    for (let i = 0; i < n; i++) {
      const y = Math.floor(Math.random() * H), h = 1 + Math.floor(Math.random() * (3 + amt * 22));
      const off = Math.round((Math.random() - 0.5) * amt * 36);
      d.drawImage(src, 0, y, W, h, off, y, W, h);
    }
    if (Math.random() < amt * 0.5) {
      const bw = 6 + Math.floor(Math.random() * 40), bh = 2 + Math.floor(Math.random() * 10);
      d.globalCompositeOperation = 'difference'; d.fillStyle = '#ffffff';
      d.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), bw, bh);
      d.globalCompositeOperation = 'source-over';
    }
    return fxB.c;
  }
  function aberrate(src, dx, dy) {
    const W = G.W, H = G.H, o = fxA.x, t = fxT.x;
    o.globalCompositeOperation = 'source-over'; o.fillStyle = '#000'; o.fillRect(0, 0, W, H);
    const ch = [['#ff0000', dx, dy], ['#00ff00', 0, 0], ['#0000ff', -dx, -dy]];
    for (let i = 0; i < 3; i++) {
      t.globalCompositeOperation = 'source-over'; t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'multiply'; t.fillStyle = ch[i][0]; t.fillRect(0, 0, W, H);
      o.globalCompositeOperation = 'lighter'; o.drawImage(fxT.c, ch[i][1], ch[i][2]);
    }
    o.globalCompositeOperation = 'source-over';
    t.globalCompositeOperation = 'source-over';
    return fxA.c;
  }
  // ruido dentro del buffer lógico (lo llaman las escenas)
  G.drawNoise = function (amt) {
    if (amt <= 0 || !noiseTile) return;
    g.globalAlpha = Math.min(1, amt);
    const ox = -Math.floor(Math.random() * 96), oy = -Math.floor(Math.random() * 96);
    for (let y = oy; y < G.H; y += 96) for (let x = ox; x < G.W; x += 96) g.drawImage(noiseTile.c, x, y);
    g.globalAlpha = 1;
  };

  function present() {
    const f = G.fx, P = G.P, W = G.W, H = G.H;
    let src = cv;
    const gl = Math.min(1, f.glitch + f.glitchBase);
    if (gl > 0.01 && Math.random() < 0.3 + gl * 0.7) src = glitchPass(src, gl);
    const ab = (f.ab + f.abBase) * fxMul();
    if (ab >= 0.5) {
      let d = Math.round(ab);
      let dy = 0;
      if (gl > 0.15 && Math.random() < gl * 0.6) { d += Math.floor(Math.random() * 3) - 1; dy = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0; }
      src = aberrate(src, d, dy);
    }
    sg.fillStyle = '#000'; sg.fillRect(0, 0, scr.width, scr.height);
    let sx = 0, sy = 0;
    if (f.shake > 0.5) { sx = Math.round((Math.random() - 0.5) * f.shake) * P; sy = Math.round((Math.random() - 0.5) * f.shake) * P; }
    sg.drawImage(src, 0, 0, W, H, G.ox + sx, G.oy + sy, W * P, H * P);
    if (scan && f.scan) { sg.save(); sg.translate(G.ox, G.oy); sg.fillStyle = scan; sg.fillRect(0, 0, W * P, H * P); sg.restore(); }
    if (f.crt && crtPat) { // textura de tubo: rejilla fina y grano
      sg.save(); sg.globalCompositeOperation = 'multiply'; sg.fillStyle = crtPat; sg.fillRect(G.ox, G.oy, W * P, H * P);
      if (grain) { sg.globalCompositeOperation = 'overlay'; sg.globalAlpha = 0.14; const gx = -Math.floor(Math.random() * 256), gy = -Math.floor(Math.random() * 256); for (let y = G.oy + gy; y < G.oy + H * P; y += 256) for (let x = G.ox + gx; x < G.ox + W * P; x += 256) sg.drawImage(grain, x, y); }
      sg.restore();
    }
    if (f.flash > 0) { sg.globalAlpha = Math.min(1, f.flash); sg.fillStyle = f.flashCol; sg.fillRect(G.ox, G.oy, W * P, H * P); sg.globalAlpha = 1; }
    if (vign && f.vign) sg.drawImage(vign, G.ox, G.oy);
  }

  // ---------- escenas ----------
  G.scenes = {};
  G.scene = null;
  G.go = function (name, params) {
    const prev = G.scene;
    if (prev && prev.exit) prev.exit();
    const sc = G.scenes[name];
    if (!sc) { console.error('scene?', name); return; }
    G.fx.abBase = 0; G.fx.glitchBase = 0; G.fx.noise = 0; G.fx.scan = true; G.fx.vign = true; G.fx.crt = false;
    G.scene = sc; G.sceneName = name; sc.t = 0;
    if (sc.enter) sc.enter(params || {});
  };

  // ---------- bucle ----------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    G.time += dt;
    decay(dt);
    if (G.tilt) { const k = Math.min(1, dt * 7); G.tilt.x += (G.tilt.tx - G.tilt.x) * k; G.tilt.y += (G.tilt.ty - G.tilt.y) * k; }
    try {
      const sc = G.scene;
      if (sc) { sc.t = (sc.t || 0) + dt; if (sc.update) sc.update(dt); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      G.target(g);
      if (G.scene && G.scene.draw) G.scene.draw(g, dt);
      if (G.fx.noise > 0) G.drawNoise(G.fx.noise);
    } catch (e) { console.error(e); }
    present();
  }
  G.start = function () { requestAnimationFrame((t) => { last = t; frame(t); }); };

  // ---------- entrada ----------
  function toLogical(e) {
    const r = scr.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * G.dpr - G.ox) / G.P, y: ((e.clientY - r.top) * G.dpr - G.oy) / G.P };
  }
  scr.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (G.audio) G.audio.unlock();
    const p = toLogical(e);
    const sc = G.scene; if (sc && sc.tap) sc.tap(p.x, p.y, e);
  }, { passive: false });
  scr.addEventListener('pointermove', (e) => { const sc = G.scene; if (sc && sc.move) { const p = toLogical(e); sc.move(p.x, p.y, e); } });
  ['pointerup', 'pointercancel'].forEach((ev) => scr.addEventListener(ev, (e) => { const sc = G.scene; if (sc && sc.up) { const p = toLogical(e); sc.up(p.x, p.y, e); } }));
  ['pointerup', 'touchend', 'click'].forEach((ev) => window.addEventListener(ev, () => {
    if (G.audio) G.audio.unlock();
    if (G._tiltPending) { G._tiltPending = false; G.enableTilt(); }
  }, { passive: true }));

  // ---------- giroscopio (opcional: las ventanas flotan un poco al inclinar el móvil) ----------
  G.tilt = { x: 0, y: 0, tx: 0, ty: 0, on: false, bx: null, by: null };
  function onOri(e) {
    if (e.gamma == null || e.beta == null) return;
    const t = G.tilt;
    if (t.bx == null) { t.bx = e.gamma; t.by = e.beta; }
    t.bx += (e.gamma - t.bx) * 0.004; t.by += (e.beta - t.by) * 0.004; // se recentra despacio
    t.tx = G.clamp((e.gamma - t.bx) / 22, -1, 1); t.ty = G.clamp((e.beta - t.by) / 22, -1, 1);
  }
  G.enableTilt = function () {
    if (G.tilt.on) return;
    const start = () => { if (G.tilt.on) return; G.tilt.on = true; window.addEventListener('deviceorientation', onOri); };
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then((s) => { if (s === 'granted') start(); }).catch(() => { });
      } else if (window.DeviceOrientationEvent) start();
    } catch (e) { }
  };
  // en iPhone el permiso tiene que pedirse dentro del mismo toque: se marca y se pide al soltar el dedo
  G.requestTilt = function () { G._tiltPending = true; };
  window.addEventListener('keydown', (e) => {
    if (G.audio) G.audio.unlock();
    const sc = G.scene; if (sc && sc.key) { sc.key(e.key); }
    if (['ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => G.resize());
  window.addEventListener('orientationchange', () => setTimeout(G.resize, 250));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G.scene && G.scene.blur) G.scene.blur(); if (G.audio) G.audio.suspend(); }
    else if (G.audio) G.audio.resume();
  });

  // ---------- guardado ----------
  const KEY = 'dftc.save.v1';
  G.save = {
    data: null,
    defaults() { return { unlocked: 1, lv: {}, beat13: 0, best13: 0, hof: [], initials: 'AAA', settings: { music: 1, sfx: 1, fx: 1, vib: 1 } }; },
    load() {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
      const def = this.defaults();
      if (!d || typeof d !== 'object') d = def;
      d.settings = Object.assign(def.settings, d.settings || {});
      d.lv = d.lv || {}; d.unlocked = G.clamp(d.unlocked || 1, 1, 12);
      d.hof = Array.isArray(d.hof) ? d.hof.filter((e) => e && typeof e.n === 'string').slice(0, 8) : []; // récords con iniciales
      d.initials = typeof d.initials === 'string' && /^[A-Z0-9]{3}$/.test(d.initials) ? d.initials : 'AAA';
      this.data = d;
    },
    write() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { } },
    lv(n) { const l = this.data.lv[n] || (this.data.lv[n] = { best: 0, tier: 0, clears: 0 }); return l; },
    reset() { const s = this.data.settings; this.data = this.defaults(); this.data.settings = s; this.write(); },
  };
  // puntuación total (la misma que el TOTAL de MEMORY CORE)
  G.coreTotal = function () { const sv = G.save.data; let t = sv.best13 || 0; for (let n = 1; n <= sv.unlocked; n++) t += G.save.lv(n).best; return t; };
  // GAME+ (CORE): se abre al pasarse la parte 1 (sector 13) con más de 50.000 de total
  G.CORE_SCORE = 50000;
  G.coreOpen = function () { const sv = G.save.data; return !!(sv.coreDev || (sv.beat13 && G.coreTotal() > G.CORE_SCORE)); };
})(window.G);
