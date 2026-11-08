'use strict';
// PARTE 2 (prueba): dentro del ordenador. Fondo de placa base, pantalla de prueba con los 6 juegos
// y valores por defecto para que nada falle mientras un juego no esté cargado.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  // ---------- fondo: la placa por dentro (negro, pistas azules, chips grises, nodos verdes) ----------
  const cache = new Map();
  G.coreWallpaper = function (seed) {
    const k = seed + '_' + G.W + 'x' + G.H;
    let c = cache.get(k);
    if (!c) { c = makeCore(G.W, G.H, seed); cache.set(k, c); if (cache.size > 8) cache.delete(cache.keys().next().value); }
    return c;
  };
  function makeCore(Wd, Hd, seed) {
    const o = G.mkCanvas(Wd, Hd), R = G.rng(7000 + seed * 31), T0 = G.ctx();
    G.target(o.x);
    try {
      G.rect(0, 0, Wd, Hd, K);
      for (let y = 4; y < Hd; y += 8) for (let x = 4; x < Wd; x += 8) G.px(x, y, B); // rejilla de puntos
      // pistas: tramos rectos con codos, que acaban en vías
      const via = (x, y, hot) => { G.rect(x - 1, y - 1, 3, 3, hot ? Gr : L); G.px(x, y, K); };
      for (let i = 0; i < 26; i++) {
        let x = 4 + Math.floor(R() * (Wd / 8)) * 8, y = 4 + Math.floor(R() * (Hd / 8)) * 8;
        const hot = R() < 0.18, col = hot ? Gr : B;
        via(x, y, hot);
        let dir = Math.floor(R() * 4);
        for (let s = 0; s < 2 + Math.floor(R() * 4); s++) {
          const len = 8 * (2 + Math.floor(R() * 7)), dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir];
          for (let j = 0; j < len; j++) { x += dx; y += dy; if (x < 0 || y < 0 || x >= Wd || y >= Hd) break; G.px(x, y, col); if (hot && (j & 1)) G.px(x + dy, y + dx, B); }
          dir = (dir + (R() < 0.5 ? 1 : 3)) % 4;
        }
        via(x, y, hot);
      }
      // chips con patas
      for (let i = 0; i < 4; i++) {
        const w = 26 + Math.floor(R() * 4) * 8, h = 18 + Math.floor(R() * 3) * 8;
        const x = Math.floor(R() * (Wd - w - 8)) + 4, y = Math.floor(R() * (Hd - h - 8)) + 4;
        for (let px = x + 3; px < x + w - 2; px += 4) { G.rect(px, y - 3, 2, 3, L); G.rect(px, y + h, 2, 3, L); }
        G.rect(x, y, w, h, L); G.box(x, y, w, h, W); G.drect(x + 2, y + 2, w - 4, h - 4, 4, K, null);
        G.text(['CPU', 'RAM', 'BUS', 'I/O', 'GPU', 'ROM'][Math.floor(R() * 6)], x + 4, y + 4, K, { b: true });
        G.circ(x + w - 5, y + h - 5, 1, K, K);
      }
    } finally { G.target(T0); }
    return o.c;
  }

  // ---------- tarjetas e iconos por defecto (cada juego pone los suyos) ----------
  const SCH = { top: K, tt: Gr, ib: K, grid: B, bot: Gr, nc: K, bt: K };
  for (let n = G.P2_FIRST; n <= G.P2_LAST; n++) {
    if (!G.CARD_SCHEMES[n]) G.CARD_SCHEMES[n] = SCH;
    if (!G.ICONS[n]) G.ICONS[n] = (t) => { G.box(2, 2, 20, 16, Gr); if (Math.floor(t * 2) % 2) G.rect(10, 8, 4, 4, Gr); };
    const g = G.LEVELS[n].game;
    if (!G.MICRO[g]) G.MICRO[g] = { mode: 'window', cmd: 'SOON', hint: 'NOT READY YET', time: 2, winOnTimeout: true, help: ['THIS GAME IS', 'NOT READY YET.'], init() { }, draw(s) { G.text('SOON', s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, W, { al: 'c', s: 2 }); } };
  }

  // ---------- pantalla de prueba: las 6 tarjetas de la parte 2 ----------
  G.scenes.core = {
    enter() { A().music('ambient'); A().intensity(0); A().loop('hum', false); G.fx.abBase = 0.8; this.sel = null; this.anim = 0; this.ic = G.mkCanvas(24, 20); this.layout(); },
    resize() { this.layout(); },
    layout() {
      const top = G.safeT + 2, bot = G.H - G.safeB - 2;
      this.hdr = { x: 2, y: top, w: G.W - 4, h: 13 };
      const gap = 6, gx = 10, headH = 40, footH = 14;
      const availW = G.W - gx * 2, availH = bot - footH - (top + headH);
      const cw = Math.floor((availW - gap) / 2);
      let ch = Math.floor((availH - gap * 2) / 3); ch = Math.min(ch, Math.floor(cw * 1.25));
      const totW = cw * 2 + gap, totH = ch * 3 + gap * 2;
      const x0 = Math.floor((G.W - totW) / 2), y0 = top + headH + Math.floor((availH - totH) / 2);
      this.cards = [];
      for (let n = G.P2_FIRST; n <= G.P2_LAST; n++) { const i = n - G.P2_FIRST; this.cards.push({ n, x: x0 + (i % 2) * (cw + gap), y: y0 + Math.floor(i / 2) * (ch + gap), w: cw, h: ch }); }
      this.footY = bot - footH + 4;
      this.cc = G.mkCanvas(cw, ch);
    },
    update(dt) {
      if (this.sel) { this.anim += dt; if (this.anim > 0.6) G.go('game', { level: this.sel.n, tier: 0 }); }
    },
    draw(g) {
      const Wd = G.W, t = this.t, h = this.hdr;
      g.drawImage(G.coreWallpaper(3), 0, 0);
      G.rect(h.x, h.y, h.w, h.h, Gr);
      G.text('PART2.EXE', h.x + 3, h.y + 3, K);
      const sx0 = h.x + 3 + G.textW('PART2.EXE') + 4, sx1 = h.x + h.w - 14;
      for (const k of [3, 5, 7, 9]) G.rect(sx0, h.y + k, sx1 - sx0, 1, K);
      G.drawX({ x: h.x + h.w - 12, y: h.y + 2, w: 9, h: 9 }, K);
      // subtítulo con brillo verde
      const T = G.ctx();
      T.save(); T.shadowColor = 'rgba(70,255,0,0.8)'; T.shadowBlur = 6;
      G.text('INSIDE THE MACHINE', Wd / 2, h.y + 19, Gr, { al: 'c', b: true });
      T.restore();
      G.text('TEST BUILD  -  6 GAMES', Wd / 2, h.y + 29, L, { al: 'c' });
      for (const c of this.cards) {
        if (this.sel && this.sel.n === c.n) continue;
        G.drawCard(c.n, c.x, c.y, c.w, c.h, t + c.n * 0.37, this.ic, G.save.lv(c.n), false);
        G.box(c.x - 1, c.y - 1, c.w + 2, c.h + 2, Math.floor(t * 2 + c.n) % 6 === 0 ? Gr : B);
      }
      if (Math.floor(t * 2) % 2 === 0) G.text('TOUCH A GAME TO TEST IT', Wd / 2, this.footY, Gr, { al: 'c' });
      if (this.sel) {
        const c = this.sel, k = Math.min(1, this.anim / 0.45), e = k * k;
        G.target(this.cc.x); G.drawCard(c.n, 0, 0, c.w, c.h, t, this.ic, G.save.lv(c.n), false); G.target(g);
        const ww = G.lerp(c.w, Wd, e), hh = G.lerp(c.h, G.H, e), xx = G.lerp(c.x, 0, e), yy = G.lerp(c.y, 0, e);
        if (this.anim < 0.5 || Math.floor(this.anim * 30) % 2) g.drawImage(this.cc.c, Math.floor(xx), Math.floor(yy), Math.floor(ww), Math.floor(hh));
        if (this.anim > 0.45) G.drect(0, 0, Wd, G.H, Math.min(16, Math.floor((this.anim - 0.45) * 110)), K, null);
      }
    },
    tap(x, y) {
      if (this.sel) return;
      const h = this.hdr;
      if (y < h.y + h.h + 3 && x > h.x + h.w - 22) { A().sfx('back'); G.go('menu', { sel: 4 }); return; }
      for (const c of this.cards) if (G.inR(x, y, c)) { this.sel = c; this.anim = 0; A().sfx('glitch'); G.pulse({ glitch: 0.7, ab: 4 }); return; }
    },
    key(k) { if (k === 'Escape') G.go('menu', { sel: 4 }); },
  };
})(window.G);
