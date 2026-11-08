'use strict';
// PARTE 2 (prueba): pantalla con los 7 juegos, igual que SECTORS de la parte 1,
// y valores por defecto para que nada falle mientras un juego no esté cargado.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G;
  const A = () => G.audio;

  // ---------- tarjetas e iconos por defecto (cada juego pone los suyos) ----------
  const SCH = { top: B, tt: W, ib: Gr, grid: K, bot: P.L, nc: K, bt: B };
  for (let n = G.P2_FIRST; n <= G.P2_LAST; n++) {
    if (!G.CARD_SCHEMES[n]) G.CARD_SCHEMES[n] = SCH;
    if (!G.ICONS[n]) G.ICONS[n] = (t) => { G.box(2, 2, 20, 16, K); if (Math.floor(t * 2) % 2) G.rect(10, 8, 4, 4, K); };
    const g = G.LEVELS[n].game;
    if (!G.MICRO[g]) G.MICRO[g] = { mode: 'window', cmd: 'SOON', hint: 'NOT READY YET', time: 2, winOnTimeout: true, help: ['THIS GAME IS', 'NOT READY YET.'], init() { }, draw(s) { G.text('SOON', s.r.x + s.r.w / 2, s.r.y + s.r.h / 2, W, { al: 'c', s: 2 }); } };
  }

  // ---------- pantalla de prueba: misma rejilla que SECTORS (3 columnas) ----------
  G.scenes.core = {
    enter() { A().music('ambient'); A().intensity(0); A().loop('hum', false); G.fx.abBase = 0.4; this.sel = null; this.anim = 0; this.ic = G.mkCanvas(24, 20); this.layout(); },
    resize() { this.layout(); },
    layout() {
      const top = G.safeT + 2, bot = G.H - G.safeB - 2;
      this.hdr = { x: 2, y: top, w: G.W - 4, h: 13 };
      const footH = 12, gap = 4, gx = 5;
      const availW = G.W - gx * 2, availH = bot - footH - (top + 17);
      const cw = Math.floor((availW - gap * 2) / 3);
      let ch = Math.floor((availH - gap * 3) / 4); ch = Math.min(ch, Math.floor(cw * 1.75)); // mismo tamaño de tarjeta que SECTORS
      const rows = Math.ceil((G.P2_LAST - G.P2_FIRST + 1) / 3);
      const totW = cw * 3 + gap * 2, totH = ch * rows + gap * (rows - 1);
      const x0 = Math.floor((G.W - totW) / 2), y0 = top + 17 + Math.floor((availH - totH) / 2);
      this.cards = [];
      for (let n = G.P2_FIRST; n <= G.P2_LAST; n++) { const i = n - G.P2_FIRST; this.cards.push({ n, x: x0 + (i % 3) * (cw + gap), y: y0 + Math.floor(i / 3) * (ch + gap), w: cw, h: ch }); }
      this.footY = bot - footH + 3;
      this.cc = G.mkCanvas(cw, ch);
    },
    update(dt) {
      if (this.sel) { this.anim += dt; if (this.anim > 0.6) G.go('game', { level: this.sel.n, tier: 0 }); }
    },
    draw(g) {
      const Wd = G.W, t = this.t, h = this.hdr;
      G.rect(0, 0, Wd, G.H, W);
      G.rect(h.x, h.y, h.w, h.h, K);
      G.text('PART2.EXE', h.x + 3, h.y + 3, W);
      const sx0 = h.x + 3 + G.textW('PART2.EXE') + 4, sx1 = h.x + h.w - 14;
      for (const k of [3, 5, 7, 9]) G.rect(sx0, h.y + k, sx1 - sx0, 1, W);
      G.drawX({ x: h.x + h.w - 12, y: h.y + 2, w: 9, h: 9 }, W);
      for (const c of this.cards) {
        if (this.sel && this.sel.n === c.n) continue;
        G.drawCard(c.n, c.x, c.y, c.w, c.h, t + c.n * 0.37, this.ic, G.save.lv(c.n), false);
      }
      G.text('PART 2  -  TEST BUILD', 5, this.footY, K);
      G.text((G.P2_LAST - G.P2_FIRST + 1) + ' GAMES', Wd - 5, this.footY, K, { al: 'r' });
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
