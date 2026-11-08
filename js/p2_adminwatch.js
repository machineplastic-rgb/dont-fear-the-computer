'use strict';
// ADMIN.WATCH (parte 2): sigilo. Mantén pulsado para avanzar por el pasillo de memoria y suelta
// cuando el ojo del administrador se abre. Jefe: ROOT, que además barre el pasillo con un escáner.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const lerp = (a, b, t) => a + (b - a) * t;
  const FILES = ['SOURCE.ZIP', 'PASSWD.TXT', 'KERNEL.SYS', 'BACKUP.DAT', 'SECRET.DOC'];
  const GRACE = 0.06; // margen al abrirse el ojo (latencia del dedo)

  // ojo de píxel: párpados en parábola, blanco con líneas de tubo, iris verde, pupila negra
  function drawEye(cx, cy, rx, ry, o, pdx, pdy, pup) {
    cx = Math.round(cx); cy = Math.round(cy);
    if (o < 0.06) { // cerrado: curva con pestañas hacia abajo
      for (let x = -rx; x <= rx; x++) {
        const u = x / rx, y = Math.round(ry * 0.22 * (1 - u * u));
        G.rect(cx + x, cy + y, 1, 2, W);
        if (rx >= 14 && x % 6 === 0 && Math.abs(u) < 0.85) G.rect(cx + x, cy + y + 2, 1, 3, L);
      }
      return;
    }
    const ir = Math.max(2, Math.round(ry * 0.8)), ix = Math.round(cx + pdx), iy = Math.round(cy + pdy), pr = Math.max(1, Math.round(ir * 0.42 * (pup || 1)));
    const top = ry * o, bot = ry * o * 0.8;
    for (let y = -Math.ceil(top); y <= Math.ceil(bot); y++) {
      const k = y < 0 ? 1 + y / top : 1 - y / bot;
      if (k <= 0) continue;
      const hw = Math.floor(rx * Math.sqrt(k)), x0 = cx - hw, x1 = cx + hw, yy = cy + y;
      G.rect(x0, yy, x1 - x0 + 1, 1, (y & 1) ? L : W);
      const dy = yy - iy;
      if (Math.abs(dy) <= ir) {
        const ih = Math.floor(Math.sqrt(ir * ir - dy * dy)), a = Math.max(x0, ix - ih), b = Math.min(x1, ix + ih);
        if (b >= a) G.rect(a, yy, b - a + 1, 1, yy % 3 === 0 ? B : Gr);
        if (Math.abs(dy) <= pr) { const ph = Math.floor(Math.sqrt(pr * pr - dy * dy)), c = Math.max(x0, ix - ph), e = Math.min(x1, ix + ph); if (e >= c) G.rect(c, yy, e - c + 1, 1, K); }
      }
    }
    const hx = ix - Math.round(ir * 0.4), hy = iy - Math.round(ir * 0.45); // brillo
    if (hy > cy - top + 1 && hy < cy + bot - 2) G.rect(hx, hy, 3, 2, W);
    for (let x = -rx; x <= rx; x++) { // contorno y pestañas
      const u = x / rx, f = 1 - u * u, yt = Math.round(cy - top * f), yb = Math.round(cy + bot * f);
      G.rect(cx + x, yt - 1, 1, 2, W); G.px(cx + x, yb + 1, L);
      if (rx >= 14 && x % 6 === 0 && Math.abs(u) < 0.8) G.rect(cx + x, yt - 4, 1, 3, W); // pestañas (no en el icono)
    }
  }
  function dline(x0, y0, x1, y1, col, step) { // línea de puntos
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (step || 4)));
    for (let i = 0; i <= n; i++) G.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
  }

  G.MICRO.adminwatch = {
    mode: 'window', cmd: 'SNEAK!', hint: 'HOLD TO MOVE, FREEZE WHEN IT LOOKS', time: 10, fx: 0.5,
    help: ['HOLD TO SNEAK UP.', 'RELEASE WHEN THE', 'EYE OPENS. REACH', 'THE FILE IN TIME.'],
    init(s) {
      const r = s.r, d = s.d, boss = s.boss;
      s.hint = boss ? 'ROOT: ALSO FREEZE UNDER THE SCAN' : this.hint;
      s.ptrs = new Set(); s.over = null; s.overAt = 0; s.o = 0; s.pdx = 0; s.pdy = 0;
      s.dist = 0; s.stepAcc = 0; s.trail = []; s.lastTr = null; s.moving = false;
      // panel del ojo arriba, el archivo debajo y el pasillo bajando hasta el principio
      const eyeH = Math.round(G.clamp(r.h * 0.25, 84, 118));
      s.pan = { x: r.x + 5, y: r.y + 4, w: r.w - 10, h: eyeH };
      s.eye = { x: Math.round(r.x + r.w / 2), y: Math.round(s.pan.y + 11 + (eyeH - 11) / 2), rx: Math.round(Math.min(r.w * 0.34, boss ? 84 : 76)), ry: Math.round((eyeH - 16) * (boss ? 0.4 : 0.36)) };
      const cx = s.eye.x;
      s.file = { x: cx - 8, y: s.pan.y + eyeH + 8, w: 16, h: 20, name: boss ? 'ROOT.KEY' : G.pick(FILES) };
      s.hudY = r.y + r.h - 13;
      const sy = r.y + r.h - 46, endY = s.file.y + s.file.h + 4;
      // camino: tramos verticales y codos a izquierda/derecha (más codos = más largo)
      const nb = boss ? 3 : d < 0.4 ? 1 : 2;
      const xL = r.x + 26, xR = r.x + r.w - 26;
      let side = Math.random() < 0.5;
      const xs = []; for (let i = 0; i < nb; i++) { xs.push(side ? xL : xR); side = !side; } xs.push(cx);
      const pts = [{ x: xs[0], y: sy }];
      for (let i = 1; i <= nb; i++) { const yy = Math.round(sy - ((sy - endY) * i) / (nb + 1)); pts.push({ x: xs[i - 1], y: yy }, { x: xs[i], y: yy }); }
      pts.push({ x: cx, y: endY });
      s.pts = pts; s.segL = []; s.len = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y); s.segL.push(l); s.len += l; }
      s.v = lerp(88, 118, d);
      // ritmo del ojo: dormido → aviso → mirando (con amagos y segundas miradas cuanto más difícil)
      const cMin = lerp(1.4, 0.9, d), cMax = lerp(2.3, 1.5, d), wd = lerp(0.62, 0.32, d);
      const oMin = lerp(0.8, 1.0, d), oMax = lerp(1.3, 1.6, d);
      const pf = boss ? 0.35 : d < 0.15 ? 0 : lerp(0.1, 0.35, d), pdb = boss ? 0.3 : d * 0.3;
      const ph = [{ k: 'closed', d: G.rand(cMin + 0.5, cMax + 0.4) }];
      let tot = ph[0].d;
      const add = (k, du) => { ph.push({ k, d: du }); tot += du; };
      while (tot < 120) {
        if (ph.length > 1 && Math.random() < pf) { add('fake', G.rand(0.35, 0.5)); add('closed', G.rand(0.5, 1.0)); }
        add('warn', wd * G.rand(0.95, 1.08));
        add('open', G.rand(oMin, oMax));
        if (Math.random() < pdb) { add('closed', G.rand(0.35, 0.55)); add('warn', Math.max(0.3, wd * 0.85)); add('open', G.rand(0.5, 0.8)); }
        add('closed', G.rand(cMin, cMax));
      }
      s.phases = ph; s.ph = 0; s.pt = 0;
      // escáner del jefe: barre el pasillo arriba y abajo con pausas en los extremos
      s.beam = boss ? { y0: endY + 6, y1: sy + 8, sp: 80, pause: 0.8, start: 1.8 } : null;
      // tiempo: lo que tarda un jugador normal (tarda 0,22 s en arrancar y 0,12 s en frenar al aviso) + un poco
      const need = this.sim(s, 0.22, 0.12);
      s.need = need;
      s.T = need * 1.06 + (boss ? 1.4 : 1.0);
      this.makeBg(s);
    },
    posAt(s, dist) {
      let rest = dist;
      for (let i = 0; i < s.segL.length; i++) {
        const a = s.pts[i], b = s.pts[i + 1], l = s.segL[i];
        if (rest <= l || i === s.segL.length - 1) { const k = l ? Math.min(1, rest / l) : 1; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
        rest -= l;
      }
      return s.pts[s.pts.length - 1];
    },
    beamAt(s, t) {
      const b = s.beam; if (!b) return null;
      const span = b.y1 - b.y0, tr = span / b.sp, per = 2 * (tr + b.pause);
      let u = t - b.start; if (u < 0) return b.y0;
      u %= per; if (u < tr) return b.y0 + span * (u / tr); u -= tr;
      if (u < b.pause) return b.y1; u -= b.pause;
      if (u < tr) return b.y1 - span * (u / tr); return b.y0;
    },
    // jugador simulado: solo avanza con el ojo dormido (tras 'react' s) y se aparta del escáner
    sim(s, react, brake, greedy) {
      let dist = 0, t = 0, ph = 0, pt = 0, held = false; const dt = 1 / 60;
      while (t < 90) {
        while (pt >= s.phases[ph].d) { pt -= s.phases[ph].d; ph++; }
        const k = s.phases[ph].k, cy = this.posAt(s, dist).y + 10, by = this.beamAt(s, t);
        const near = by != null && Math.abs(by - cy) < 22;
        const hold = greedy ? true : ((k === 'closed' && pt >= react) || (held && (k === 'warn' || k === 'fake') && pt < brake)) && !near;
        held = hold;
        if (hold) {
          if ((k === 'open' && pt > GRACE) || (by != null && Math.abs(by - cy) < 12)) return greedy ? -1 : t + 99; // pillado
          dist += s.v * dt; if (dist >= s.len) return t;
        }
        t += dt; pt += dt;
      }
      return 90;
    },
    makeBg(s) {
      const r = s.r, bg = G.mkCanvas(G.W, G.H), T0 = G.ctx();
      G.target(bg.x);
      try {
        G.rect(r.x, r.y, r.w, r.h, K);
        for (let y = r.y + 3; y < r.y + r.h; y += 6) for (let x = r.x + 3; x < r.x + r.w; x += 6) G.px(x, y, B);
        // pistas sueltas de fondo
        for (let i = 0; i < 7; i++) {
          let x = r.x + 6 + Math.floor(Math.random() * (r.w - 12) / 6) * 6, y = s.pan.y + s.pan.h + 10 + Math.floor(Math.random() * (r.h - s.pan.h - 30) / 6) * 6;
          const len = G.irand(3, 8) * 6, hz = Math.random() < 0.5;
          for (let j = 0; j < len; j++) G.px(hz ? x + j : x, hz ? y : y + j, B);
          G.rect((hz ? x + len : x) - 1, (hz ? y : y + len) - 1, 3, 3, L);
        }
        // pasillo de memoria: borde claro, fondo negro con trama azul y celdas
        const seg = (pad, fn) => { for (let i = 1; i < s.pts.length; i++) { const a = s.pts[i - 1], b = s.pts[i]; fn(Math.min(a.x, b.x) - pad, Math.min(a.y, b.y) - pad, Math.abs(a.x - b.x) + pad * 2, Math.abs(a.y - b.y) + pad * 2); } };
        seg(12, (x, y, w, h) => G.rect(x, y, w, h, L));
        seg(11, (x, y, w, h) => G.rect(x, y, w, h, K));
        seg(10, (x, y, w, h) => G.drect(x, y, w, h, 3, B, null));
        for (let dd = 6; dd < s.len - 4; dd += 12) { const p = this.posAt(s, dd); G.rect(Math.round(p.x) - 2, Math.round(p.y) - 2, 4, 4, B); G.px(Math.round(p.x), Math.round(p.y), L); }
        const p0 = s.pts[0]; G.box(p0.x - 12, p0.y - 4, 24, 30, Gr); G.text('IN', p0.x + 14, p0.y + 18, Gr);
        // panel del ojo
        const pn = s.pan;
        G.rect(pn.x, pn.y, pn.w, pn.h, K); G.box(pn.x, pn.y, pn.w, pn.h, B); G.box(pn.x - 1, pn.y - 1, pn.w + 2, pn.h + 2, K);
        for (let y = pn.y + 13; y < pn.y + pn.h - 1; y += 4) for (let x = pn.x + 3; x < pn.x + pn.w - 1; x += 4) G.px(x, y, B);
        G.rect(pn.x + 1, pn.y + 1, pn.w - 2, 10, s.boss ? Gr : B);
        G.text(s.boss ? 'ROOT.EYE' : 'ADMIN.EYE', pn.x + 4, pn.y + 3, s.boss ? K : W);
        if (s.boss) for (const k of [3, 5, 7]) G.rect(pn.x + 56, pn.y + 1 + k, pn.w - 120, 1, K);
      } finally { G.target(T0); }
      s.bg = bg;
    },
    enterPhase(s) {
      const k = s.phases[s.ph].k;
      if (k === 'warn' || k === 'fake') A().sfx('warn');
      else if (k === 'open') { A().sfx('beepT'); G.pulse({ ab: 2 }); }
    },
    caught(s, why) {
      s.over = 'caught'; s.overAt = G.time; s.why = why;
      A().sfx('alarm'); G.vibrate(90);
      G.pulse({ flash: 0.35, flashCol: W, glitch: 0.9, shake: 5, ab: 6 });
      s.fail(why);
    },
    update(s, dt) {
      if (s.over) return;
      s.pt += dt;
      while (s.pt >= s.phases[s.ph].d) { s.pt -= s.phases[s.ph].d; s.ph++; this.enterPhase(s); }
      const ph = s.phases[s.ph], k = ph.k;
      // apertura del ojo (solo dibujo)
      let to = 0;
      if (k === 'warn') to = 0.1 + 0.28 * (s.pt / ph.d) + 0.07 * Math.sin(s.t * 55);
      else if (k === 'fake') { const q = s.pt / ph.d; to = (q < 0.6 ? 0.1 + 0.35 * q : 0.31 * (1 - q) / 0.4) + 0.07 * Math.sin(s.t * 55); }
      else if (k === 'open') to = 1 + 0.03 * Math.sin(s.t * 9);
      s.o += (to - s.o) * Math.min(1, dt * (k === 'open' ? 22 : 14));
      const pos = this.posAt(s, s.dist);
      s.pdx += (G.clamp((pos.x - s.eye.x) * 0.14, -s.eye.rx * 0.42, s.eye.rx * 0.42) - s.pdx) * Math.min(1, dt * 6);
      s.pdy += ((k === 'open' ? s.eye.ry * 0.28 : 0) - s.pdy) * Math.min(1, dt * 6);
      // mover
      s.moving = s.ptrs.size > 0;
      if (!s.moving) return;
      const before = s.dist;
      s.dist = Math.min(s.len, s.dist + s.v * dt);
      s.stepAcc += s.dist - before; if (s.stepAcc > 15) { s.stepAcc = 0; A().sfx('step'); }
      const np = this.posAt(s, s.dist);
      if (!s.lastTr || Math.abs(np.x - s.lastTr.x) + Math.abs(np.y - s.lastTr.y) >= 7) { s.lastTr = { x: np.x, y: np.y }; s.trail.push({ x: Math.round(np.x), y: Math.round(np.y), t: s.t }); if (s.trail.length > 40) s.trail.shift(); }
      // peligro: mirar o escáner encima
      if (k === 'open' && s.pt > GRACE) return this.caught(s, 'CAUGHT!');
      const by = this.beamAt(s, s.t);
      if (by != null && Math.abs(by - (np.y + 10)) < 12) return this.caught(s, 'SCANNED!');
      if (s.dist >= s.len) {
        s.over = 'win'; s.overAt = G.time;
        A().sfx('pick'); G.pulse({ flash: 0.2, flashCol: Gr, ab: 3 });
        if (s.boss) { A().sfx('crtOff'); A().sfx('glitch'); G.pulse({ glitch: 1.2, shake: 4 }); }
        s.win();
      }
    },
    down(s, x, y, e) { if (s.over) return; s.ptrs.add(e && e.pointerId != null ? e.pointerId : 1); },
    up(s, x, y, e) { if (e && e.pointerId != null) s.ptrs.delete(e.pointerId); else s.ptrs.clear(); },
    draw(s) {
      const r = s.r, T = G.ctx(), t = G.time, ph = s.phases[s.ph], k = ph.k, e = s.eye, pn = s.pan;
      T.drawImage(s.bg.c, 0, 0);
      const pos = this.posAt(s, s.dist), px = Math.round(pos.x), py = Math.round(pos.y);
      const ok = s.over === 'win', bad = s.over === 'caught', ot = t - s.overAt;
      // rastro de pasos
      for (const p of s.trail) { const a = s.t - p.t; if (a < 1.6) G.rect(p.x - 1, p.y - 1, 2, 2, a < 0.7 ? Gr : B); }
      // archivo objetivo
      const f = s.file, glow = !ok && Math.floor(t * 3) % 2 === 0;
      if (glow) { T.save(); T.shadowColor = 'rgba(70,255,0,0.8)'; T.shadowBlur = 8; G.rect(f.x, f.y, f.w, f.h, Gr); T.restore(); }
      if (!ok || Math.floor(ot * 12) % 2) {
        G.rect(f.x, f.y, f.w, f.h, W); G.box(f.x, f.y, f.w, f.h, K); G.tri(f.x + f.w - 6, f.y, f.x + f.w, f.y, f.x + f.w, f.y + 6, K); G.rect(f.x + f.w - 6, f.y, 1, 6, K); G.rect(f.x + f.w - 6, f.y + 5, 6, 1, K);
        for (let i = 0; i < 4; i++) G.rect(f.x + 3, f.y + 7 + i * 3, i === 3 ? 6 : 10, 1, K);
        if (s.boss) { G.rect(f.x + 4, f.y + 8, 8, 6, Gr); G.box(f.x + 4, f.y + 8, 8, 6, K); }
      }
      G.text(f.name, f.x + f.w + 5, f.y + 7, ok ? Gr : L);
      // escáner del jefe
      if (s.beam && !ok) {
        const by = Math.round(this.beamAt(s, s.t)), hot = Math.abs(by - (py + 10)) < 22;
        G.rect(r.x + 2, by - 1, r.w - 4, 2, Gr); G.dash(r.x + 2, by - 4, r.w - 4, B, 2, 2); G.dash(r.x + 2, by + 3, r.w - 4, B, 2, 2);
        G.rect(r.x + 2, by - 5, 27, 9, Gr); G.text('SCAN', r.x + 4, by - 4, K);
        if (hot && Math.floor(t * 10) % 2) G.text('FREEZE!', r.x + r.w - 4, by - 12, W, { al: 'r', b: true });
      }
      // el cursor (la punta es la posición en el camino)
      const blink = bad && Math.floor(ot * 10) % 2;
      const bob = s.moving && !s.over ? Math.floor(s.t * 12) % 2 : 0;
      G.drawSpr('cursor', px, py + bob, blink ? { '#': W, w: K } : { '#': K, w: W }, 2);
      if (s.moving && !s.over) G.text('MOVING', px + 18, py + 8, Gr);
      if (ok) G.text('GOT IT!', px + 18, py + 4 - Math.min(10, ot * 20), Gr, { b: true });
      if (bad) G.text(s.why, px + 18, py + 4, W, { b: true });
      // ojo y estado
      let o = s.o, pdx = s.pdx, pdy = s.pdy, pup = 1;
      if (bad) { o = 1.12 + 0.06 * Math.sin(t * 30); pdx = G.clamp((px - e.x) * 0.2, -e.rx * 0.45, e.rx * 0.45); pdy = e.ry * 0.3; pup = 0.6 + 0.2 * Math.sin(t * 25); }
      if (ok) o = s.boss ? Math.max(0, 1 - ot * 2.4) : 0;
      if (k === 'open' && !s.over) { T.save(); G.ell(e.x, e.y, e.rx + 6, Math.round(e.ry * o) + 6, G.dpat(4, Gr, null)); T.restore(); }
      if (bad) G.ell(e.x, e.y, e.rx + 8, Math.round(e.ry * o) + 8, G.dpat(Math.floor(t * 20) % 2 ? 8 : 4, W, null));
      drawEye(e.x, e.y, e.rx, e.ry, Math.min(1.25, o), pdx, pdy, pup);
      // estado en la barra del panel
      let st = 'SLEEP', sc = L;
      if (bad) { st = 'INTRUDER!'; sc = W; }
      else if (ok) { st = s.boss ? 'OFFLINE' : 'SLEEP'; sc = Gr; }
      else if (k === 'warn' || k === 'fake') { st = '!! WAKING'; sc = W; }
      else if (k === 'open') { st = 'WATCHING'; sc = Gr; }
      if (s.boss) sc = K; // barra verde del jefe
      if (!(k === 'open' || k === 'warn' || k === 'fake') || bad || Math.floor(t * 8) % 2) G.text(st, pn.x + pn.w - 4, pn.y + 3, sc, { al: 'r', b: st !== 'SLEEP' });
      if ((k === 'warn' || k === 'fake') && !s.over && Math.floor(t * 10) % 2) { G.text('!', e.x - e.rx - 14, e.y - 10, W, { s: 3, b: true }); G.text('!', e.x + e.rx + 6, e.y - 10, W, { s: 3, b: true }); }
      if ((k === 'closed' && !s.over) || (ok && !s.boss)) for (let i = 0; i < 3; i++) { const q = (t * 0.6 + i / 3) % 1; G.text('Z', Math.round(e.x + e.rx * 0.5 + q * 22), Math.round(e.y - 4 - q * 22), q < 0.8 ? L : B, { s: i === 1 ? 2 : 1 }); }
      // mirando: haces de búsqueda punteados y marco que parpadea
      if (k === 'open' && !s.over) {
        const sw = e.x + Math.sin(s.t * 2.2) * r.w * 0.36, by = r.y + r.h - 20;
        dline(e.x - 8, e.y + 8, sw - 30, by, Gr, 4); dline(e.x + 8, e.y + 8, sw + 30, by, Gr, 4);
        if (Math.floor(t * 6) % 2) { G.box(r.x, r.y, r.w, r.h, W); G.box(r.x + 1, r.y + 1, r.w - 2, r.h - 2, Gr); }
      }
      // pillado: destello que se apaga y ojo enorme
      if (bad && ot < 0.35) G.drect(r.x, r.y, r.w, r.h, Math.max(1, Math.round(10 - ot * 28)), W, null);
      // jefe vencido: el ojo se rompe en tiras y se apaga
      if (ok && s.boss) {
        const R = G.rng(Math.floor(t * 20));
        if (ot < 0.7) for (let i = 0; i < 7; i++) { const yy = pn.y + 12 + Math.floor(R() * (pn.h - 14)); G.rect(pn.x + 2 + Math.floor(R() * 30), yy, pn.w - 4 - Math.floor(R() * 60), 1 + Math.floor(R() * 3), [Gr, W, B, K][Math.floor(R() * 4)]); }
        if (ot > 0.45) { G.text('X', e.x - 22, e.y - 7, W, { s: 2, b: true }); G.text('X', e.x + 12, e.y - 7, W, { s: 2, b: true }); if (Math.floor(t * 4) % 2) G.text('ROOT OFFLINE', e.x, pn.y + pn.h - 12, Gr, { al: 'c', b: true }); }
      }
      // barra inferior: progreso y estado
      const hy = s.hudY;
      G.rect(r.x, hy, r.w, 13, K); G.rect(r.x, hy, r.w, 1, B);
      G.text('PATH', r.x + 4, hy + 4, L);
      const bx = r.x + 30, bw = r.w - 96, fw = Math.round((bw - 4) * Math.min(1, s.dist / s.len));
      G.box(bx, hy + 3, bw, 8, L); for (let i = 0; i < fw; i += 3) G.rect(bx + 2 + i, hy + 5, 2, 4, Gr);
      const hs = bad ? 'CAUGHT' : ok ? 'DONE' : s.moving ? 'MOVING' : 'FROZEN';
      G.text(hs, r.x + r.w - 4, hy + 4, bad ? W : s.moving || ok ? Gr : L, { al: 'r', b: bad || s.moving });
    },
  };

  // icono: ojo que parpadea y un cursor que se cuela por debajo
  G.ICONS[19] = function (t) {
    const c = t % 2.4, open = c > 1.6 && c < 2.25, x = 3 + Math.round(((t * 7) % 18));
    if (open) drawEye(12, 6, 9, 4, 1, 0, 1, 1); else drawEye(12, 6, 9, 4, 0, 0, 0, 1);
    G.rect(1, 13, 22, 6, B); G.dash(1, 16, 22, K, 2, 2);
    G.tri(x, 12, x, 19, x + 4, 16, open ? W : Gr);
    if (open && Math.floor(t * 8) % 2) G.text('!', 20, 0, W);
  };
  G.CARD_SCHEMES[19] = { top: Gr, tt: K, ib: K, grid: B, bot: Gr, nc: K, bt: K };
})(window.G);
