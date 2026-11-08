'use strict';
// PARTE 2 · 20 DIAL.UP: conexión por módem. Mantén el dedo para subir la señal y suéltalo para que baje
// (la aguja tiene inercia). Mientras la señal esté dentro de la franja, la conexión se carga; fuera, hay
// ruido en la línea y si se acumula demasiado: NO CARRIER. Jefe: tormenta (la franja salta y salen pop-ups).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  const SPD = 38; // píxeles por segundo que avanza la traza del osciloscopio
  const POPS = [
    ['CALL WAITING', ['INCOMING CALL!', 'PICK UP?']],
    ['DISCONNECT?', ['IDLE FOR 0 SEC.', 'HANG UP NOW?']],
    ['NEØTEL', ['FREE HOURS LEFT:', '0:00']],
    ['LINE NOISE', ['STATIC DETECTED', 'ON YOUR LINE']],
    ['MODEM.SYS', ['SPEAKER TOO LOUD.', 'TURN IT UP?']],
  ];
  const STATUS = [[0, 'DIALING NEØTEL...'], [0.25, 'VERIFYING USER...'], [0.5, 'HANDSHAKE...'], [0.75, 'LOGGING ON...']];

  function center(s, off) {
    const base = 0.5 + s.amp * Math.sin(s.ph) + s.amp2 * Math.sin(s.ph2);
    return G.clamp(base + (off == null ? s.off : off), s.hw + 0.04, 1 - s.hw - 0.04);
  }
  const yOf = (s, u) => Math.round(s.sc.y + s.sc.h - 4 - G.clamp(u, 0, 1) * (s.sc.h - 8));
  const pid = (e) => (e && e.pointerId != null ? e.pointerId : 1);

  G.MICRO.dialup = {
    mode: 'float', tilt: 3, cmd: 'CONNECT!', hint: 'HOLD TO RAISE THE SIGNAL', time: 6, fx: 0.4,
    help: ['HOLD: SIGNAL GOES UP.', 'LET GO: IT FALLS.', 'KEEP IT IN THE BAND', 'UNTIL YOU CONNECT.'],
    float(aw, ah) { return { w: aw - 10, h: Math.min(ah - 30, 330), title: 'CONNECT TO NEØTEL' }; },
    init(s) {
      const r = s.r, d = s.d;
      // aguja: cuanto más difícil, más pesada (menos freno = se pasa de largo)
      s.hold = new Set(); s.u = 0.06; s.v = 0;
      s.lift = 3.4 - 0.6 * d; s.fall = 2.8 - 0.4 * d; s.damp = 3.2 - 1.2 * d;
      // franja: más estrecha y más rápida; a partir de la mitad cambia de ritmo y hay ráfagas de estática
      s.hw = s.boss ? 0.13 : 0.17 - 0.06 * d;
      s.amp = s.boss ? 0.2 : 0.16 + 0.1 * d; s.amp2 = 0.03 + 0.03 * d; s.spd = s.boss ? 1.1 : 0.85 + 0.65 * d;
      s.ph = G.rand(0, 6.28); s.ph2 = G.rand(0, 6.28); s.mul = 1; s.mt = 0.8;
      s.off = 0; s.offT = 0; s.ghost = null; s.jt = 2.4;
      s.gust = d > 0.5 && !s.boss ? (d - 0.5) * 2.4 : 0; s.static = 0;
      // conexión y ruido
      s.fillT = s.boss ? 3.9 : 2.8 + 1.5 * d; s.drain = 0.06 + 0.06 * d; s.noiseMax = s.boss ? 2.2 : 1.8 - 0.4 * d;
      s.T = s.boss ? s.fillT * 2 + 2 : s.fillT * 1.6 + 1.4;
      s.p = 0; s.noise = 0; s.entered = false; s.inb = false; s.step = 0; s.wt = 0;
      s.hist = []; s.pops = []; s.popT = 1.4; s.last = 0;
      s.hint = s.boss ? 'STORM! TAP THE POP-UPS AWAY' : d > 0.5 ? 'HOLD TO RAISE THE SIGNAL. STATIC!' : 'HOLD TO RAISE THE SIGNAL';
      // pantalla
      const scH = Math.max(80, r.h - 54 - 80);
      s.sc = { x: r.x + 9, y: r.y + 54, w: r.w - 18, h: scH };
      s.c = center(s);
    },
    update(s, dt) {
      // si el juego estuvo en pausa, el dedo puede haberse levantado sin que llegara el aviso
      const now = performance.now(); if (s.last && now - s.last > 250) s.hold.clear(); s.last = now;
      const d = s.d;
      // franja
      if (d > 0.4) { s.mt -= dt; if (s.mt <= 0) { s.mt = G.rand(0.5, 1.2); s.mul = G.rand(0.7, 1.35); } }
      s.ph += dt * s.spd * s.mul; s.ph2 += dt * s.spd * 1.7 * s.mul;
      if (s.boss) { // tormenta: avisa con la franja fantasma y salta
        s.jt -= dt;
        if (s.jt <= 0.6 && s.ghost == null) {
          const c0 = center(s); let best = 0;
          for (let k = 0; k < 12; k++) { const o = G.rand(-0.32, 0.32); if (Math.abs(center(s, o) - c0) > 0.24) { best = o; break; } best = o; }
          s.ghost = best; A().sfx('warn');
        }
        if (s.jt <= 0) { s.offT = s.ghost; s.ghost = null; s.jt = G.rand(2.3, 2.9); A().sfx('zap'); G.pulse({ glitch: 0.45, ab: 3 }); s.static = 0.3; }
        s.popT -= dt;
        if (s.popT <= 0 && s.pops.length < 2 && s.t > 1) {
          s.popT = G.rand(2.4, 3.2);
          const [title, lines] = G.pick(POPS), sc = s.sc, w = 120, h = 48;
          const cy = yOf(s, s.c) + G.irand(-12, 12);
          s.pops.push({ x: Math.round(G.rand(sc.x + 2, sc.x + sc.w - w - 12)), y: Math.round(G.clamp(cy - h / 2, sc.y - 6, sc.y + sc.h - h + 6)), w, h, st: G.randStyle(3), title, lines, t: 0, stripes: true, xmode: 'x' });
          A().sfx('spawn', G.irand(0, 2));
        }
        for (const p of s.pops) p.t += dt;
        s.pops = s.pops.filter((p) => p.t < 3.4);
      }
      s.off += (s.offT - s.off) * Math.min(1, dt * 14);
      s.c = center(s);
      // aguja
      const holding = s.hold.size > 0;
      s.v += (holding ? s.lift : -s.fall) * dt; s.v *= Math.exp(-s.damp * dt);
      if (s.gust && Math.random() < dt * s.gust) { s.v += (Math.random() < 0.5 ? -1 : 1) * G.rand(0.45, 0.8); s.static = 0.35; A().sfx('type', 2.5); }
      s.u += s.v * dt;
      if (s.u < 0) { s.u = 0; s.v = Math.max(0, s.v); }
      if (s.u > 1) { s.u = 1; s.v = Math.min(0, s.v); }
      if (s.static > 0) s.static -= dt;
      // dentro o fuera de la franja
      const was = s.inb; s.inb = Math.abs(s.u - s.c) <= s.hw;
      if (s.inb) {
        if (!was) A().sfx('pick');
        s.entered = true; s.p += dt / s.fillT;
        const st = Math.floor(s.p * 8); if (st > s.step) { s.step = st; A().sfx('snake', Math.min(1, s.p)); }
      } else if (s.entered || s.t > 1.3) { // al principio hay un momento para subir la aguja sin que cuente
        s.p = Math.max(0, s.p - s.drain * dt); s.noise += dt;
        if (Math.random() < dt * 9) A().sfx('type', 1.4);
        s.wt -= dt; if (s.noise > s.noiseMax * 0.6 && s.wt <= 0) { s.wt = 0.45; A().sfx('warn'); }
      }
      s.hist.push({ t: s.t, u: s.u, inb: s.inb });
      const keep = (s.sc.w - 20) / SPD + 0.2; while (s.hist.length && s.t - s.hist[0].t > keep) s.hist.shift();
      if (s.p >= 1) { s.p = 1; s.win(); return; }
      if (s.noise >= s.noiseMax) { s.fail('NO CARRIER'); return; }
      if (s.t >= s.T) s.fail('LINE BUSY');
    },
    down(s, x, y, e) {
      for (let i = s.pops.length - 1; i >= 0; i--) {
        const p = s.pops[i];
        if (G.inR(x, y, p, 4)) { s.pops.splice(i, 1); A().sfx('close', 3); G.pulse({ ab: 1.5 }); G.vibrate(8); return; }
      }
      s.hold.add(pid(e));
    },
    up(s, x, y, e) { s.hold.delete(pid(e)); },
    draw(s) {
      const r = s.r, st = s.st, fg = st.tx, bg = st.bd, sc = s.sc, T = G.ctx();
      const ac = fg === W ? Gr : W, t = s.t, win = s.done === 'win', lose = s.done === 'lose';
      // ---- tú --- módem --- NEØTEL, con paquetes que viajan según el progreso ----
      const iy = r.y + 5, xs = [r.x + 14, Math.round(r.x + r.w / 2 - 10), r.x + r.w - 34], labs = ['YOU', 'MODEM', 'NEØTEL'];
      ['system', 'phone', 'globe'].forEach((n, i) => { T.drawImage(G.icon20(n, s.block), xs[i], iy, 20, 20); G.text(labs[i], xs[i] + 10, iy + 22, fg, { al: 'c' }); });
      for (let k = 0; k < 2; k++) {
        const x0 = xs[k] + 24, x1 = xs[k + 1] - 4, yy = iy + 10, on = win || s.p > (k === 0 ? 0.02 : 0.5);
        G.dash(x0, yy, x1 - x0, fg, 2, 2);
        if (on && !lose) for (let j = 0; j < 2; j++) { const f = ((t * 1.6 + j * 0.5) % 1); G.rect(Math.round(x0 + f * (x1 - x0 - 3)), yy - 1, 3, 3, ac); }
        if (lose) G.text('×', (x0 + x1) / 2, yy - 3, ac, { al: 'c', b: true });
      }
      // ---- estado ----
      let msg = STATUS[0][1]; for (const [k, m] of STATUS) if (s.p >= k) msg = m;
      if (win) msg = 'CONNECTED AT 56000 BPS'; else if (lose) msg = s.reason === 'LINE BUSY' ? 'THE LINE IS BUSY' : 'NO CARRIER';
      G.text('STATUS:', r.x + 8, r.y + 39, fg, { b: true });
      if (!lose || Math.floor(t * 6) % 2) G.text(msg, r.x + 58, r.y + 39, win ? ac : fg);
      // ---- osciloscopio de la portadora ----
      G.rect(sc.x - 2, sc.y - 2, sc.w + 4, sc.h + 4, fg); G.rect(sc.x, sc.y, sc.w, sc.h, K);
      for (const q of [0.25, 0.5, 0.75]) G.dash(sc.x + 1, yOf(s, q), sc.w - 18, B, 1, 3);
      const yT = yOf(s, s.c + s.hw), yB = yOf(s, s.c - s.hw);
      G.drect(sc.x + 1, yT, sc.w - 2, yB - yT, s.inb ? 8 : 6, B, null);
      G.rect(sc.x + 1, yT, sc.w - 2, 1, W); G.rect(sc.x + 1, yB, sc.w - 2, 1, W);
      G.text('CARRIER BAND', sc.x + 4, yT + 3, W);
      if (s.ghost != null && Math.floor(t * 10) % 2) { // aviso del salto
        const gc = center(s, s.ghost), gT = yOf(s, gc + s.hw), gB = yOf(s, gc - s.hw);
        G.dash(sc.x + 1, gT, sc.w - 2, Gr, 3, 2); G.dash(sc.x + 1, gB, sc.w - 2, Gr, 3, 2); G.text('JUMP!', sc.x + sc.w - 22, gT + 3, Gr, { al: 'r', b: true });
      }
      // traza: verde dentro de la franja, gris fuera
      const nowX = sc.x + sc.w - 22;
      T.save(); T.beginPath(); T.rect(sc.x, sc.y, sc.w - 16, sc.h); T.clip();
      for (let i = 1; i < s.hist.length; i++) {
        const a = s.hist[i - 1], b = s.hist[i];
        const xa = Math.round(nowX - (s.t - a.t) * SPD), xb = Math.round(nowX - (s.t - b.t) * SPD), ya = yOf(s, a.u), yb = yOf(s, b.u);
        if (b.inb) { G.line(xa, ya, xb, yb, Gr); G.line(xa, ya + 1, xb, yb + 1, Gr); }
        else if (Math.floor(xb / 2) % 2 === 0) { G.line(xa, ya, xb, yb, L); }
      }
      T.restore();
      // estática / interferencias
      if (s.static > 0 || (s.boss && Math.random() < 0.08)) for (let k = 0; k < 5; k++) G.drect(sc.x + 1, G.irand(sc.y + 1, sc.y + sc.h - 3), sc.w - 2, G.irand(1, 3), 4, W, null);
      // regla y aguja
      const rx = sc.x + sc.w - 15, yu = yOf(s, s.u), holding = s.hold.size > 0;
      G.rect(rx, sc.y, 1, sc.h, L);
      for (let q = 0; q <= 10; q++) G.rect(rx, yOf(s, q / 10), q % 5 === 0 ? 5 : 3, 1, L);
      G.tri(sc.x + sc.w - 2, yu - 5, sc.x + sc.w - 2, yu + 5, rx + 2, yu, s.inb ? Gr : W);
      G.rect(nowX - 2, yu - 2, 5, 5, s.inb ? Gr : W); G.box(nowX - 3, yu - 3, 7, 7, K);
      G.text(holding ? '▲' : '▼', nowX - 2, holding ? yu - 13 : yu + 6, holding ? W : L);
      if (s.inb && !s.done && Math.floor(t * 4) % 2) G.text('ON-LINE', sc.x + 4, sc.y + 4, Gr, { b: true });
      else G.text('SIGNAL ' + String(Math.round(s.u * 100)).padStart(3, ' ') + '%', sc.x + 4, sc.y + 4, L);
      // ---- barra de conexión (punteada, como las de la parte 1) ----
      let y = sc.y + sc.h + 8;
      G.text('CONNECTING', r.x + 8, y, fg, { b: true }); G.text(Math.floor(s.p * 100) + '%', r.x + r.w - 8, y, fg, { al: 'r', b: true });
      const bw = r.w - 16, f = Math.round((bw - 4) * s.p), hot = s.p > 0.8 && Math.floor(t * 8) % 2;
      G.box(r.x + 8, y + 10, bw, 11, fg);
      for (let i = 0; i < f; i += 4) G.rect(r.x + 10 + i, y + 12, Math.min(3, f - i), 7, hot ? ac : fg);
      // ---- ruido acumulado ----
      y += 28;
      const nk = s.noise / s.noiseMax, segs = 10, n = Math.min(segs, Math.ceil(nk * segs)), alarm = nk > 0.6 && Math.floor(t * 8) % 2;
      G.text('LINE NOISE', r.x + 8, y + 1, alarm ? ac : fg, { b: true });
      const sx = r.x + r.w - 8 - segs * 9;
      for (let i = 0; i < segs; i++) { G.box(sx + i * 9, y, 8, 9, fg); if (i < n) G.rect(sx + i * 9 + 2, y + 2, 4, 5, alarm ? ac : fg); }
      // ---- botón que muestra si estás dando señal ----
      y += 16;
      const bh = Math.max(14, r.y + r.h - 4 - y);
      G.drawBtn(r.x + 8, y, r.w - 16, Math.min(18, bh), holding ? 'BOOSTING ▲' : 'HOLD ANYWHERE TO BOOST', fg, bg, holding, { double: !holding });
      // ---- pop-ups de la tormenta (encima de todo) ----
      for (const p of s.pops) {
        const pr = G.drawFrame(p);
        G.drawSpr('warn', pr.x + 4, pr.y + 4, { '#': p.st.ac });
        p.lines.forEach((ln, i) => G.text(ln, pr.x + 19, pr.y + 4 + i * 9, p.st.tx));
        if (Math.floor(p.t * 3) % 2 === 0) G.text('TAP TO CLOSE', pr.x + pr.w / 2, pr.y + pr.h - 11, p.st.tx, { al: 'c' });
      }
    },
  };

  // icono de la tarjeta: pantalla con la franja azul, la traza verde y el módem con sus luces
  G.ICONS[20] = function (t) {
    G.rect(1, 0, 22, 13, K);
    G.drect(2, 4, 20, 5, 8, B, null); G.rect(2, 4, 20, 1, W); G.rect(2, 8, 20, 1, W);
    let py = null;
    for (let x = 2; x < 22; x++) {
      const y = Math.round(6.5 + Math.sin((x + t * 8) * 0.38) * 3.6);
      if (py != null) G.line(x - 1, py, x, y, y >= 4 && y <= 8 ? Gr : W);
      py = y;
    }
    G.rect(2, 14, 20, 6, L); G.box(2, 14, 20, 6, K);
    const k = Math.floor(t * 5);
    [Gr, B, Gr].forEach((c, i) => G.rect(5 + i * 4, 16, 2, 2, (k + i) % 3 ? c : K));
    for (let x = 16; x < 20; x += 2) G.rect(x, 16, 1, 3, K);
  };
  G.CARD_SCHEMES[20] = { top: Gr, tt: K, ib: W, grid: L, bot: B, nc: Gr, bt: W };
})(window.G);
