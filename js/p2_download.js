'use strict';
// PARTE 2 · 15 DOWNLOAD: la ventana DOWNLOAD.EXE escupe archivos y la carpeta MY FILES los recoge.
// La carpeta sigue al dedo (solo el eje X, toques donde toques). Los virus (ventanitas con bicho) no se cogen.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  const FILES = [['doc', 'README.TXT'], ['picture', 'ME.JPG'], ['music', 'SONG.MP3'], ['camera', 'PHOTO.BMP'], ['notepad', 'NOTES.TXT'], ['cd', 'GAME.ISO'],
    ['floppy', 'BACKUP.ZIP'], ['calendar', 'AGENDA.DOC'], ['book', 'MANUAL.PDF'], ['palette', 'ART.PNG'], ['globe', 'MAP.HTM'], ['clock', 'ALARM.WAV']];
  const BADS = ['VIRUS', 'TROJAN', 'WORM', 'FREE.EXE', 'SPY.DLL', 'WIN$$$'];
  const IH = 40;            // alto de lo que cae (icono 2x o ventanita)
  const VWD = 46;           // ancho de la ventanita de virus
  const CATCH = 30;         // distancia al centro de la carpeta para coger un archivo
  const CATCH_BAD = 23;     // ...y para tragarse un virus (más pequeña: se perdona rozarlo)

  G.MICRO.download = {
    mode: 'desk', cmd: 'CATCH!', hint: 'CATCH THE FILES, NOT THE VIRUSES', time: 8, fx: 0.7,
    help: ['SLIDE THE FOLDER TO', 'CATCH EVERY DOWNLOAD.', 'NEVER CATCH A VIRUS:', 'ONE INSIDE = ERROR.'],
    init(s) {
      const r = s.r, d = s.d;
      const dw = Math.min(150, r.w - 8), dh = 62;
      s.dl = { x: Math.round(r.x + (r.w - dw) / 2), y: r.y + 4, w: dw, h: dh, st: s.boss ? G.WSTYLES.b3 : s.st, title: s.boss ? '999 FILES' : 'DOWNLOAD.EXE', stripes: true, xmode: 'x' };
      s.dlx0 = s.dl.x; s.dlAmp = Math.max(0, (r.w - dw) / 2 - 2);
      s.fy = r.y + r.h - 52;                       // arriba de la carpeta
      s.fmin = r.x + 22; s.fmax = r.x + r.w - 22;
      s.fx = r.x + r.w / 2; s.tx = null; s.touch = false;
      s.need = s.boss ? 10 : 3 + Math.round(d * 5);
      s.got = 0;
      s.g = 300 + 260 * d; s.vmax = 220 + 200 * d; s.spread = 48 + 50 * d;
      s.iv = s.boss ? 0.36 : 0.95 - 0.45 * d;
      s.pv = s.boss ? 0.36 : 0.12 + 0.33 * d;
      s.items = []; s.msgs = []; s.parts = [];
      s.spT = 0.05; s.nSpit = 0; s.badRun = 0; s.burstT = 2.4; s.spitK = 0; s.bump = 0;
      s.cur = 'CONNECTING...'; s.curBad = false;
      // tiempo: lo que tarda en caer + los archivos que hacen falta (contando virus y fallos) + margen
      let y = s.dl.y + s.dl.h - IH, vy = 25, F = 0;
      while (y + IH < s.fy + 6 && F < 5) { vy = Math.min(s.vmax, vy + s.g / 60); y += vy / 60; F += 1 / 60; }
      s.fall = F;
      s.T = F + (s.need * s.iv) / ((1 - s.pv) * (s.boss ? 0.62 : 0.72)) + (s.boss ? 1.6 : 1.1);
    },
    // la ventana escupe un archivo (o un virus) por debajo
    spit(s, bad, vx) {
      const w = s.dl, d = s.d;
      if (bad == null) {
        bad = s.nSpit > 0 && s.badRun < (s.boss ? 3 : 2) && Math.random() < s.pv;
      }
      s.nSpit++; s.badRun = bad ? s.badRun + 1 : 0;
      const ow = bad ? VWD : 40;
      const x = G.rand(w.x + 12, w.x + w.w - 12 - ow);
      const o = { bad, x, y: w.y + w.h - IH - 2, w: ow, h: IH, vx: vx != null ? vx : (Math.random() < 0.5 ? -1 : 1) * G.rand(0.3, 1) * s.spread, vy: G.rand(10, 40), off: 0, ph: Math.random() * 6, past: false };
      if (bad) { o.title = G.pick(BADS); o.st = G.randStyle(s.block); o.skull = Math.random() < 0.35; s.cur = o.title; s.curBad = true; }
      else { const f = G.pick(FILES); o.ic = f[0]; o.name = f[1]; s.cur = f[1]; s.curBad = false; }
      if (d >= 0.3 && Math.random() < 0.2 + 0.4 * d) o.sway = (7 + 10 * d) * (bad ? 0.6 : 1);     // se mece al caer
      if (d >= 0.45 && Math.random() < (bad ? 0.06 + 0.12 * d : 0.22 + 0.3 * d)) {                 // da un quiebro a media caída (los virus antes, para que dé tiempo a verlo)
        o.jink = true; o.jinkY = G.lerp(w.y + w.h, s.fy, bad ? G.rand(0.22, 0.42) : G.rand(0.3, 0.55));
      }
      s.items.push(o); s.spitK = 0.14;
      A().sfx('pew');
    },
    down(s, x, y) { s.tx = x; s.touch = true; },
    move(s, x, y) { if (s.touch) s.tx = x; },
    up(s) { s.touch = false; },
    update(s, dt) {
      const r = s.r;
      if (s.tx != null) s.fx += (G.clamp(s.tx, s.fmin, s.fmax) - s.fx) * Math.min(1, dt * 22);
      s.bump = Math.max(0, s.bump - dt * 5); s.spitK = Math.max(0, s.spitK - dt);
      if (s.boss) s.dl.x = Math.round(s.dlx0 + Math.sin(s.t * 1.5) * s.dlAmp);
      // escupir
      s.spT -= dt;
      if (s.spT <= 0) { this.spit(s); s.spT += s.iv * G.rand(0.8, 1.2); }
      if (s.boss) { // ráfaga en abanico: tres de golpe
        s.burstT -= dt;
        if (s.burstT <= 0) {
          s.burstT = G.rand(2.4, 3.0);
          const goods = Math.random() < 0.3 ? 1 : 2, bads = [false, false, false].map((_, i) => i >= goods);
          for (let i = bads.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bads[i], bads[j]] = [bads[j], bads[i]]; }
          bads.forEach((b, i) => this.spit(s, b, (i - 1) * 75 + G.rand(-8, 8)));
          G.pulse({ glitch: 0.35, ab: 2 }); A().sfx('spawn', 2);
        }
      }
      // caída
      for (const o of s.items) {
        o.vy = Math.min(s.vmax, o.vy + s.g * dt);
        o.y += o.vy * dt; o.x += o.vx * dt;
        if (o.jink && o.y > o.jinkY) { o.jink = false; o.vx = -Math.sign(o.vx || (Math.random() - 0.5)) * G.rand(60, 90); }
        if (o.x < r.x) { o.x = r.x; o.vx = Math.abs(o.vx); }
        if (o.x + o.w > r.x + r.w) { o.x = r.x + r.w - o.w; o.vx = -Math.abs(o.vx); }
        o.off = o.sway ? Math.sin(s.t * 5 + o.ph) * o.sway : 0;
        const dx = G.clamp(o.x + o.off, r.x, r.x + r.w - o.w) - o.x; o.off = dx;
        if (!o.past && o.y + IH >= s.fy + 6) {
          o.past = true;
          const cx = o.x + o.off + o.w / 2, dist = Math.abs(cx - s.fx);
          if (o.bad && dist < CATCH_BAD) {
            o.inside = true; s.infected = o;
            s.fail('VIRUS!'); G.pulse({ glitch: 1, ab: 6, flash: 0.2, flashCol: W });
            return;
          }
          if (!o.bad && dist < CATCH) {
            o.gone = true; s.got++; s.bump = 1;
            s.msgs.push({ x: s.fx, y: s.fy, txt: '+1', t: 0 });
            for (let k = 0; k < 6; k++) s.parts.push({ x: s.fx + G.rand(-10, 10), y: s.fy + 6, vx: G.rand(-60, 60), vy: G.rand(-110, -40), t: 0 });
            A().sfx('drop'); G.pulse({ ab: 2 }); G.vibrate(12);
            if (s.got % 3 === 0 && s.got < s.need) A().sfx('combo');
            if (s.got >= s.need) { s.win(); G.pulse({ flash: 0.12, flashCol: W }); }
          }
        }
        if (!o.gone && o.y > r.y + r.h + 4) { o.gone = true; if (!o.bad) s.msgs.push({ x: G.clamp(o.x + o.w / 2, r.x + 14, r.x + r.w - 14), y: r.y + r.h - 4, txt: 'LOST', t: 0, dim: true }); }
      }
      s.items = s.items.filter((o) => !o.gone);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.45);
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.7);
    },
    drawItem(s, o) {
      const x = Math.round(o.x + o.off), y = Math.round(o.y);
      if (o.bad) {
        const st = o.st, rr = G.drawFrame({ x, y, w: o.w, h: o.h, st, title: o.title, stripes: false, xmode: 'x' });
        if (o.skull) G.drawSpr('skull', rr.x + Math.round(rr.w / 2 - 11), rr.y + 1, { '#': st.tx }, 1);
        else G.drawSpr(Math.floor(s.t * 10 + o.ph) % 2 ? 'bug' : 'bug2', rr.x + Math.round(rr.w / 2 - 13), rr.y + 1, { '#': st.tx, g: s.block >= 2 ? Gr : st.bd }, 2);
        return;
      }
      G.ctx().drawImage(G.icon20(o.ic, s.block), x, y, 40, 40);
      const lw = G.textW(o.name) + 4, lx = Math.round(G.clamp(x + 20 - lw / 2, s.r.x, s.r.x + s.r.w - lw)); // la etiqueta no se sale de la pantalla
      G.rect(lx, y + 41, lw, 9, K);
      G.text(o.name, lx + 2, y + 42, W);
    },
    drawDl(s) {
      const w = s.dl, st = w.st, k = s.spitK > 0 ? 1 : 0;
      const sh = s.boss && Math.random() < 0.3 ? G.irand(-2, 2) : 0;
      const x0 = w.x; w.x += sh; w.y += k;
      const rr = G.drawFrame(w);
      w.x = x0; w.y -= k;
      const left = Math.max(0, s.need - s.got);
      if (s.boss) {
        G.text('DOWNLOADING 999 FILES', rr.x + 5, rr.y + 3, st.tx, { b: true });
        G.text('NOW: ' + s.cur, rr.x + 5, rr.y + 13, s.curBad && Math.floor(s.t * 12) % 2 ? st.bd : st.tx);
      } else {
        G.text(s.cur, rr.x + 5, rr.y + 3, s.curBad && Math.floor(s.t * 12) % 2 ? st.bd : st.tx, { b: true });
        G.text('FROM "NET" TO "MY FILES"', rr.x + 5, rr.y + 13, st.tx);
      }
      const bw = rr.w - 10, f = Math.floor((bw - 4) * Math.min(1, s.got / s.need));
      G.box(rr.x + 5, rr.y + 23, bw, 9, st.tx);
      for (let i = 0; i < f; i += 4) G.rect(rr.x + 7 + i, rr.y + 25, 3, 5, st.tx);
      const hrs = s.boss ? (Math.floor(s.t * 7) % 2 ? '999' : '998') + ' HOURS' : Math.max(1, Math.ceil(left * 0.5)) + ' MIN';
      G.text(left + (left === 1 ? ' FILE LEFT' : ' FILES LEFT'), rr.x + 5, rr.y + 35, st.tx);
      G.text(hrs, rr.x + rr.w - 5, rr.y + 35, st.tx, { al: 'r' });
      // la boca por la que salen
      G.rect(rr.x + 8, w.y + w.h - 2, rr.w - 12, 1, k ? st.bt : st.fr);
    },
    draw(s) {
      const r = s.r;
      G.drect(r.x, r.y, r.w, r.h, 8, K, null); // atenúa el fondo para que resalten los archivos
      for (const o of s.items) if (!o.inside) this.drawItem(s, o); // salen de debajo de la ventana
      this.drawDl(s);
      // carpeta MY FILES
      const fx = Math.round(s.fx), lift = s.touch ? 3 : 0, fy = s.fy + Math.round(s.bump * 3) - lift;
      if (s.touch) G.drect(fx - 16, fy + 8, 40, 40, 8, K, null);
      if (s.infected) { const o = s.infected; o.x = fx - o.w / 2; o.off = 0; o.y = fy - 26; this.drawItem(s, o); }
      G.ctx().drawImage(G.icon20('folder', s.block), fx - 20, fy, 40, 40);
      if (s.bump > 0.5) G.box(fx - 21, fy + 9, 42, 26, s.block >= 2 ? Gr : W);
      const lab = 'MY FILES', lw = G.textW(lab) + 4, sel = s.block === 0 ? K : B;
      G.rect(fx - Math.round(lw / 2), fy + 41, lw, 9, sel); G.text(lab, fx, fy + 42, W, { al: 'c' });
      if (s.touch) { const lx = fx - Math.round(lw / 2) - 2, lww = lw + 4; G.dash(lx, fy + 39, lww, W, 1, 1); G.dash(lx, fy + 51, lww, W, 1, 1); for (let yy = fy + 39; yy <= fy + 51; yy += 2) { G.px(lx, yy, W); G.px(lx + lww - 1, yy, W); } } // marco de selección punteado
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), 3, 3, p.t < 0.2 ? W : L);
      for (const m of s.msgs) G.text(m.txt, m.x, m.y - 6 - m.t * 24, m.dim ? L : W, { al: 'c', b: !m.dim });
    },
  };

  // icono: la ventana suelta un archivo que cae en la carpeta
  G.ICONS[15] = function (t) {
    const c = (t * 1.25) % 1, p = Math.floor(((t * 1.25) % 4) * 3) % 12;
    G.rect(2, 0, 20, 5, K); G.rect(3, 2, 18, 2, W); for (let i = 0; i < p; i += 2) G.rect(4 + i, 2, 1, 2, K);
    const y = 5 + Math.floor(c * 9), x = 9 + Math.round(Math.sin(t * 4) * 1);
    if (y < 12) { G.rect(x, y, 6, 6, W); G.box(x, y, 6, 6, K); G.px(x + 4, y + 1, K); }
    G.drawSpr('folder', 5, 9, { '#': K, w: y >= 11 && y <= 13 ? B : W });
  };
  G.CARD_SCHEMES[15] = { top: B, tt: W, ib: W, grid: B, bot: L, nc: B, bt: K };
})(window.G);
