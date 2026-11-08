'use strict';
// PHISHING (parte 2, nivel 16): pesca de archivos en un lago de datos.
// El anzuelo oscila como un péndulo; al tocar sale disparado en esa dirección. Pesca los archivos buenos
// y nunca el malware. Jefe: MEGA PHISH, que lleva la PASSWORD.TXT en la boca (enganchar + tira y afloja).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  // archivos buenos: [icono20, etiqueta, peso (más peso = se recoge más despacio)]
  const GOOD = [['doc', 'DOC', 1.0], ['picture', 'IMG', 1.0], ['music', 'MP3', 1.15], ['notepad', 'TXT', 0.9], ['folder', 'ZIP', 1.35], ['floppy', 'BAK', 1.1], ['cd', 'ISO', 1.25]];
  const BAD = ['FREE$', 'PRIZE', 'WIN!!', 'HOT.EXE', 'CLICK', 'CRACK'];
  const LURE = [['doc', 'DOC.EXE'], ['picture', 'JPG.EXE'], ['music', 'MP3.EXE'], ['notepad', 'TXT.EXE']]; // parecen buenos: llevan calavera
  const MW = 112, MH = 54; // tamaño del MEGA PHISH

  // ---------- fondo fijo de la ronda: cielo oscuro + lago de líneas azules + placa en el fondo ----------
  function makeBg(s) {
    const r = s.r, o = G.mkCanvas(r.w, r.h), T0 = G.ctx(), R = G.rng(160 + s.round * 7);
    G.target(o.x);
    try {
      const wy = s.wy - r.y, by = s.by - r.y;
      G.rect(0, 0, r.w, r.h, K);
      for (let y = 3; y < wy - 2; y += 6) for (let x = 3; x < r.w; x += 6) G.px(x, y, B);
      // lago: barrido azul, más denso arriba y más oscuro abajo
      for (let y = wy + 2; y < by; y += 2) { const k = (y - wy) / (by - wy); G.drect(0, y, r.w, 1, Math.max(2, Math.round(11 - k * 8)), B, null); }
      // cables que cuelgan del fondo (algas de la placa)
      for (let i = 0; i < 5; i++) {
        let x = Math.floor(R() * (r.w - 10)) + 5; const hh = 30 + Math.floor(R() * 60);
        for (let y = by; y > by - hh; y -= 1) { x += (R() < 0.15 ? (R() < 0.5 ? -1 : 1) : 0); G.px(x, y, (y & 3) ? B : L); }
      }
      // fondo: placa con pistas, vías y un chip hundido
      G.rect(0, by, r.w, r.h - by, K); G.rect(0, by, r.w, 1, L);
      for (let i = 0; i < 6; i++) { const x = Math.floor(R() * r.w), y = by + 4 + Math.floor(R() * Math.max(1, r.h - by - 8)); G.rect(x, y, 10 + Math.floor(R() * 30), 1, B); G.rect(x - 1, y - 1, 3, 3, Gr); }
      const cx = Math.floor(R() * (r.w - 40)) + 8; G.rect(cx, by - 6, 30, 8, L); G.box(cx, by - 6, 30, 8, W); G.text('RAM', cx + 6, by - 5, K);
      // muelle: un teclado tumbado sobre el agua
      const kx = 2, ky = wy - 9;
      G.rect(kx, ky, 64, 9, L); G.box(kx, ky, 64, 9, W);
      for (let i = 0; i < 9; i++) { G.rect(kx + 3 + i * 7, ky + 2, 5, 2, W); G.rect(kx + 3 + i * 7, ky + 5, 5, 2, (i % 3) ? W : B); }
      for (const px of [8, 30, 54]) G.rect(kx + px, ky + 9, 3, 6, L); // patas en el agua
    } finally { G.target(T0); }
    return o.c;
  }

  function hookPos(s) { return { x: s.pv.x + Math.sin(s.ang) * s.len, y: s.pv.y + Math.cos(s.ang) * s.len }; }

  // ---------- peces (archivos) ----------
  function retype(s, f) {
    const goods = s.fish.filter((o) => o !== f && o.kind === 'good').length;
    const depth = (f.y - s.lanes[0]) / Math.max(1, s.lanes[s.lanes.length - 1] - s.lanes[0]);
    const pGood = (1 - s.ratio) * (1 + s.d * 0.9 * (depth - 0.5)); // con más dificultad, los buenos están más hondos
    if (s.boss) { f.kind = 'bad'; }
    else if (goods < 2 || Math.random() < pGood) f.kind = 'good';
    else f.kind = Math.random() < s.lure ? 'lure' : 'bad';
    if (f.kind === 'good') { const g = G.pick(GOOD); f.ic = g[0]; f.lab = g[1]; f.wt = g[2]; }
    else if (f.kind === 'lure') { const g = G.pick(LURE); f.ic = g[0]; f.lab = g[1]; f.wt = 1; }
    else { f.ic = null; f.lab = G.pick(BAD); f.wt = 1; }
  }
  function addFish(s, lane, x, dir, v) {
    const f = { x, y: s.lanes[lane] - 10, lane, dir, v, ph: Math.random() * 6 };
    retype(s, f); s.fish.push(f); return f;
  }
  function hitFish(s, x, y) {
    for (const f of s.fish) if (!f.hooked && x >= f.x - 2 && x <= f.x + 22 && y >= f.y - 2 && y <= f.y + 21) return f;
    return null;
  }

  // ---------- jefe ----------
  function megaRects(s) {
    const m = s.mf, x = Math.round(m.x), y = Math.round(m.y);
    const body = { x, y, w: MW, h: MH };
    const weak = m.dir > 0 ? { x: x + MW + 4, y: y + 24, w: 20, h: 20 } : { x: x - 24, y: y + 24, w: 20, h: 20 };
    return { body, weak };
  }

  function splash(s, x, n) {
    for (let i = 0; i < n; i++) s.parts.push({ x, y: s.wy, vx: G.rand(-55, 55), vy: G.rand(-110, -40), t: 0, life: G.rand(0.35, 0.6), col: Math.random() < 0.5 ? W : L });
  }

  G.MICRO.phishing = {
    mode: 'window', cmd: 'FISH!', hint: 'TAP TO CAST - CATCH THE FILES', time: 12, fx: 0.5,
    help: ['THE HOOK SWINGS.', 'TAP TO CAST IT AND', 'CATCH GOOD FILES.', 'NEVER HOOK MALWARE.'],
    init(s) {
      const r = s.r, d = s.d;
      s.wy = r.y + 44; s.by = r.y + r.h - 16;                       // superficie y fondo del lago
      s.pv = { x: Math.round(r.x + r.w * 0.5 + 6), y: r.y + 14 };   // punta de la caña
      s.phase = G.rand(0, 6.28); s.amp = 1.02; s.om = 1.9 + 1.2 * d;
      s.ang = 0; s.idle = 15; s.len = s.idle; s.st = 'idle'; s.vOut = 290 + 70 * d; s.vBack = 440; s.vReel = 215;
      s.boost = 0; s.got = null; s.n = 0; s.wasIn = false; s.reelT = 0; s.bad = null; s.clang = null;
      s.fish = []; s.parts = []; s.fly = []; s.bub = []; s.pops = [];
      s.ratio = 0.18 + 0.3 * d; s.lure = d >= 0.4 ? 0.35 : 0; s.fv = 24 + 46 * d;
      // carriles de peces
      const top = s.wy + 30, bot = s.by - 32, nl = Math.max(4, Math.floor((bot - top) / 48) + 1);
      s.lanes = []; for (let i = 0; i < nl; i++) s.lanes.push(Math.round(top + ((bot - top) * i) / (nl - 1)));
      for (let i = 0; i < 12; i++) s.bub.push({ x: r.x + G.rand(4, r.w - 4), y: G.rand(s.wy + 10, s.by), v: G.rand(8, 22), ch: Math.random() < 0.5 ? '0' : '1' });
      if (s.boss) {
        s.need = 1; s.bst = 'swim';
        const mid = s.lanes[Math.floor(s.lanes.length / 2)];
        s.mf = { x: r.x - MW - 10, y: mid - 30, by: mid - 30, dir: 1, v: 72, ph: 0 };
        // morralla de malware lejos del carril del jefe
        s.lanes.forEach((ly, i) => { if (Math.abs(ly - mid) > 52 && i % 2 === 0) addFish(s, i, r.x + G.rand(0, r.w), i % 4 ? 1 : -1, s.fv * G.rand(0.7, 1.1)); });
        s.ten = 0; s.dep = 0; s.thT = 1.3; s.tele = 0; s.thr = 0; s.winT = 0; s.snapT = 0;
        s.hint = 'HOOK THE PASSWORD, THEN MASH!';
        s.T = 23;
      } else {
        s.need = 3 + Math.round(2 * d);
        s.lanes.forEach((ly, i) => {
          const dir = i % 2 ? -1 : 1, v = s.fv * G.rand(0.8, 1.3), n = i % 3 === 1 ? 1 : 2;
          for (let k = 0; k < n; k++) addFish(s, i, r.x + ((k + G.rand(0.1, 0.6)) * (r.w + 60)) / n - 30, dir, v * G.rand(0.9, 1.1));
        });
        s.hint = 'CATCH ' + s.need + ' FILES - NO MALWARE';
        s.T = 2.5 + s.need * 2.1;
      }
      s.bg = makeBg(s);
    },
    update(s, dt) {
      const r = s.r;
      s.boost = Math.max(0, s.boost - dt);
      // peces nadando (y dando la vuelta al salir)
      for (const f of s.fish) {
        if (f.hooked) continue;
        f.x += f.dir * f.v * dt; f.ph += dt * 6;
        if (f.dir > 0 && f.x > r.x + r.w + 8) { f.x = r.x - 30 - G.rand(0, 50); retype(s, f); }
        if (f.dir < 0 && f.x < r.x - 30) { f.x = r.x + r.w + 8 + G.rand(0, 50); retype(s, f); }
      }
      for (const b of s.bub) { b.y -= b.v * dt; b.x += Math.sin(G.time * 2 + b.v) * 0.2; if (b.y < s.wy + 4) { b.y = s.by - 2; b.x = r.x + G.rand(4, r.w - 4); } }
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < p.life);
      s.pops.forEach((p) => (p.t += dt)); s.pops = s.pops.filter((p) => p.t < 0.7);
      s.fly = s.fly.filter((f) => G.time - f.t0 < 0.5);
      if (s.boss) this.updateBoss(s, dt);
      if (s.bst === 'tug') return;
      // el anzuelo
      if (s.st === 'idle') { s.phase += s.om * dt; s.ang = s.amp * Math.sin(s.phase); s.len = s.idle; }
      else if (s.st === 'out') {
        for (let k = 0; k < 3; k++) {
          s.len += (s.vOut * dt) / 3;
          const h = hookPos(s);
          if (!s.wasIn && h.y > s.wy) { s.wasIn = true; splash(s, h.x, 7); A().sfx('splash'); }
          if (h.x < r.x + 3 || h.x > r.x + r.w - 3 || h.y > s.by) { s.st = 'back'; break; }
          if (s.boss && s.bst === 'swim') {
            const m = megaRects(s);
            if (G.inR(h.x, h.y, m.weak, 4)) { this.hookBoss(s); return; }
            if (G.inR(h.x, h.y, m.body, 2)) { s.st = 'back'; s.clang = { x: h.x, y: h.y, t: 0 }; s.pops.push({ x: h.x, y: h.y, txt: 'CLANG!', t: 0 }); A().sfx('deny'); G.pulse({ shake: 3, ab: 2 }); G.vibrate(20); break; }
          }
          const f = hitFish(s, h.x, h.y);
          if (f) {
            if (f.kind !== 'good') { // malware: se acabó
              f.hooked = true; s.got = f; s.bad = { f, t0: G.time }; s.st = 'bad';
              A().sfx('glitch'); G.pulse({ glitch: 1.2, ab: 6, shake: 5 }); G.vibrate(80); s.fail('MALWARE!');
              return;
            }
            f.hooked = true; s.got = f; s.st = 'reel'; f.ox = f.x + 10 - h.x; f.oy = f.y + 4 - h.y;
            A().sfx('pick'); G.vibrate(12); s.pops.push({ x: h.x, y: h.y - 6, txt: 'GOT IT!', t: 0 });
            break;
          }
        }
      } else if (s.st === 'back') {
        const wasIn = hookPos(s).y > s.wy;
        s.len -= s.vBack * dt;
        if (wasIn && hookPos(s).y <= s.wy) splash(s, hookPos(s).x, 3);
        if (s.len <= s.idle) { s.len = s.idle; s.st = 'idle'; }
      } else if (s.st === 'reel') {
        const f = s.got, wasIn = hookPos(s).y > s.wy;
        s.len -= (s.vReel / f.wt) * (s.boost > 0 ? 1.7 : 1) * dt;
        s.reelT -= dt; if (s.reelT <= 0) { s.reelT = 0.07; A().sfx('reel', s.boost > 0 ? 2 : 0); }
        const h = hookPos(s); f.x = h.x - 10 + f.ox * 0.3; f.y = h.y - 4 + 2;
        if (wasIn && h.y <= s.wy) { splash(s, h.x, 9); A().sfx('splash'); }
        if (s.len <= s.idle) { // al cesto: vuela a la bandeja de entrada
          s.len = s.idle; s.st = 'idle'; s.got = null;
          s.fish.splice(s.fish.indexOf(f), 1);
          s.fly.push({ ic: f.ic, x0: f.x, y0: f.y, t0: G.time });
          s.n++; s.inboxT = G.time;
          A().sfx('close', 2 + s.n); G.pulse({ ab: 2 }); G.vibrate(10);
          if (s.n >= s.need) { s.win(); return; }
          // repone uno en el mismo carril, desde fuera de la pantalla
          const dir = f.dir, x = dir > 0 ? r.x - 30 - G.rand(0, 40) : r.x + r.w + 8 + G.rand(0, 40);
          addFish(s, f.lane, x, dir, f.v);
        }
      }
    },
    // ----- jefe: nada de lado a lado; enganchado, tira y afloja -----
    hookBoss(s) {
      const m = megaRects(s);
      s.bst = 'tug'; s.st = 'tug'; s.dep = m.weak.y - s.wy; s.tk = G.clamp((s.by - s.wy) / 430, 0.6, 1); // en pantallas bajas el lago es menos hondo s.ten = 0.15; s.thT = 1.1; s.tele = 0; s.thr = 0;
      s.pops.push({ x: m.weak.x + 10, y: m.weak.y - 8, txt: 'HOOKED!', t: 0 });
      A().sfx('hit'); A().sfx('cmd'); G.pulse({ shake: 5, ab: 4, glitch: 0.4 }); G.vibrate(50);
    },
    updateBoss(s, dt) {
      const r = s.r, m = s.mf;
      m.ph += dt;
      if (s.bst === 'swim') {
        m.x += m.dir * m.v * dt; m.y = m.by + Math.sin(m.ph * 1.4) * 9;
        if (m.dir > 0 && m.x > r.x + r.w + 26) { m.dir = -1; m.by = G.pick(s.lanes.slice(1, -1)) - 30; }
        if (m.dir < 0 && m.x + MW < r.x - 26) { m.dir = 1; m.by = G.pick(s.lanes.slice(1, -1)) - 30; }
        return;
      }
      if (s.bst !== 'tug' || s.done) return;
      // calendario de sacudidas: aviso → sacudida → descanso
      if (s.tele > 0) { s.tele -= dt; if (s.tele <= 0) { s.thr = 0.8; A().sfx('alarm'); G.pulse({ shake: 4 }); } }
      else if (s.thr > 0) { s.thr -= dt; if (s.thr <= 0) s.thT = G.rand(1.6, 2.4); }
      else { s.thT -= dt; if (s.thT <= 0) { s.tele = 0.5; A().sfx('warn'); } }
      const maxDep = s.by - s.wy - 30;
      s.dep = Math.min(maxDep, s.dep + (20 + (s.thr > 0 ? 55 : 0)) * s.tk * dt);
      s.ten = Math.max(0, s.ten - 0.5 * dt + (s.thr > 0 ? 0.9 * dt : 0)); // en la sacudida el sedal se tensa solo
      // el pez se acerca poco a poco al centro y tira hacia abajo
      const wx = m.dir > 0 ? m.x + MW + 14 : m.x - 14, tx = s.pv.x + Math.sin(G.time * 1.3) * 18;
      m.x += (tx - wx) * Math.min(1, dt * 1.2);
      m.y = s.wy + s.dep - 34 + (s.thr > 0 ? Math.sin(G.time * 40) * 2 : 0);
      const wk = megaRects(s).weak, hx = wk.x + 10, hy = wk.y;
      s.ang = Math.atan2(hx - s.pv.x, hy - s.pv.y); s.len = Math.hypot(hx - s.pv.x, hy - s.pv.y);
      s.reelT -= dt;
      if (s.ten >= 1) { s.snapT = G.time; A().sfx('boom'); G.pulse({ glitch: 1.2, shake: 8, ab: 6 }); G.vibrate(120); s.fail('LINE SNAPPED'); return; }
      if (s.dep <= 0) {
        s.winT = G.time; s.n = 1; s.inboxT = G.time;
        s.fly.push({ ic: 'doc', x0: wk.x, y0: wk.y, t0: G.time });
        splash(s, hx, 16); A().sfx('boom'); A().sfx('splash');
        G.pulse({ flash: 0.35, flashCol: W, ab: 5, shake: 6 }); G.vibrate(90); s.win();
      }
    },
    tap(s) {
      if (s.done) return;
      if (s.bst === 'tug') { // tirar: sube el pez pero tensa el sedal
        s.dep -= 12 * s.tk; s.ten += 0.075; s.boost = 0.12;
        A().sfx('reel', 1 + Math.floor(s.ten * 3)); G.vibrate(5); G.pulse({ ab: 1 });
        return;
      }
      if (s.st === 'idle') { s.st = 'out'; s.wasIn = false; A().sfx('tap'); }
      else if (s.st === 'reel') { s.boost = 0.28; }
    },
    draw(s) {
      const r = s.r, T = G.ctx(), t = G.time, wy = s.wy;
      // cielo fijo + lago ondulando en bandas
      const sky = wy - r.y;
      T.drawImage(s.bg, 0, 0, r.w, sky, r.x, r.y, r.w, sky);
      G.rect(r.x, wy, r.w, r.h - sky, K);
      for (let y = sky; y < r.h; y += 4) { const off = Math.round(Math.sin(t * 1.6 + y * 0.07) * 1.6); T.drawImage(s.bg, 0, y, r.w, Math.min(4, r.h - y), r.x + off, r.y + y, r.w, Math.min(4, r.h - y)); }
      // superficie con olas
      for (let x = 0; x < r.w; x += 2) { const yy = wy + Math.round(Math.sin(t * 3 + x * 0.15) * 1.2); G.px(r.x + x, yy, (x % 6) ? L : W); }
      // burbujas de bits
      for (const b of s.bub) G.text(b.ch, Math.round(b.x), Math.round(b.y), b.v > 16 ? L : B);
      // peces
      for (const f of s.fish) if (!f.hooked || f === s.got) drawFish(f, t);
      if (s.boss) drawBoss(s, t);
      // caña: el cursor la sujeta desde el muelle
      const hx0 = r.x + 40, hy0 = wy - 20;
      G.drawSpr('cursor', r.x + 26, wy - 37, { '#': K, w: W }, 2);
      G.line(hx0, hy0, s.pv.x, s.pv.y, L); G.line(hx0, hy0 + 1, s.pv.x, s.pv.y + 1, W);
      G.circ(hx0 + 4, hy0 + 2, 3, B, W);
      // sedal y anzuelo
      const h = hookPos(s), tight = s.bst === 'tug';
      if (s.snapT) { // sedal roto: cuelga de la caña
        G.line(s.pv.x, s.pv.y, s.pv.x - 6, s.pv.y + 20, L);
      } else {
        G.line(s.pv.x, s.pv.y, Math.round(h.x), Math.round(h.y), tight && s.ten > 0.75 && Math.floor(t * 20) % 2 ? W : L);
        if (tight && s.ten > 0.5) G.line(s.pv.x + 1, s.pv.y, Math.round(h.x) + 1, Math.round(h.y), B);
        drawHook(Math.round(h.x), Math.round(h.y));
      }
      // guía de puntería (más corta con más dificultad)
      if (s.st === 'idle' && !s.done) {
        const gl = 70 - 50 * s.d;
        for (let k = 8; k < gl; k += 6) G.px(Math.round(h.x + Math.sin(s.ang) * k), Math.round(h.y + Math.cos(s.ang) * k), k < gl * 0.6 ? Gr : B);
      }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), 2, 2, p.col);
      // HUD: bandeja de entrada
      const ix = r.x + r.w - 68, iy = r.y + 3, pulse = s.inboxT && t - s.inboxT < 0.25;
      G.rect(ix, iy, 64, 17, pulse ? Gr : K); G.box(ix, iy, 64, 17, pulse ? W : Gr);
      G.rect(ix + 4, iy + 5, 12, 8, W); G.box(ix + 4, iy + 5, 12, 8, K); G.line(ix + 4, iy + 5, ix + 10, iy + 9, K); G.line(ix + 15, iy + 5, ix + 10, iy + 9, K);
      G.text('INBOX', ix + 20, iy + 2, pulse ? K : L);
      G.text(s.boss ? (s.n ? 'PASS OK' : 'PASS?') : s.n + '/' + s.need, ix + 20, iy + 9, pulse ? K : W, { b: true });
      // archivos volando a la bandeja
      for (const f of s.fly) {
        const k = Math.min(1, (t - f.t0) / 0.45), e = 1 - (1 - k) * (1 - k), x = G.lerp(f.x0, ix + 4, e), y = G.lerp(f.y0, iy + 2, e) - Math.sin(k * Math.PI) * 30, sc = 1 - 0.5 * k;
        T.drawImage(G.icon20(f.ic, 2), Math.round(x), Math.round(y), Math.round(20 * sc), Math.round(20 * sc));
      }
      for (const p of s.pops) G.text(p.txt, Math.round(G.clamp(p.x, r.x + 24, r.x + r.w - 24)), Math.round(p.y - p.t * 26), p.txt === 'CLANG!' ? W : Gr, { al: 'c', b: true });
      if (s.boss) drawBossHud(s, t);
      // malware enganchado: la pantalla se corrompe
      if (s.bad) { const k = t - s.bad.t0; for (let i = 0; i < 6; i++) { const yy = r.y + ((i * 53 + Math.floor(k * 60) * 17) % r.h); G.drect(r.x, yy, r.w, 3 + (i % 3), 8, i % 2 ? Gr : W, null); } }
      // pista al empezar
      if (!s.boss && s.t < 1.4 && s.st === 'idle' && Math.floor(t * 4) % 2 === 0) G.text('TAP TO CAST', r.x + r.w / 2, wy + 8, W, { al: 'c', b: true });
    },
  };

  // ---------- dibujo ----------
  function drawHook(x, y) {
    G.rect(x, y - 3, 1, 6, W); G.rect(x - 3, y + 2, 1, 3, W); G.rect(x - 2, y + 4, 2, 1, W); G.px(x - 3, y + 1, W); G.px(x, y - 4, Gr);
  }
  function drawFish(f, t) {
    const x = Math.round(f.x), y = Math.round(f.y + (f.hooked ? 0 : Math.sin(f.ph) * 1.5)), T = G.ctx();
    const flap = Math.round(Math.sin(f.ph * 1.7) * 3), tc = f.kind === 'bad' ? Gr : L;
    if (f.dir > 0) G.tri(x, y + 10, x - 9, y + 3 + flap, x - 9, y + 17 - flap, tc); else G.tri(x + 20, y + 10, x + 29, y + 3 + flap, x + 29, y + 17 - flap, tc);
    if (f.kind === 'bad') {
      G.rect(x, y, 20, 20, K); G.box(x, y, 20, 20, Gr); G.rect(x + 1, y + 1, 18, 4, Gr);
      G.rect(x + 5, y + 7, 10, 7, W); G.rect(x + 7, y + 9, 2, 2, K); G.rect(x + 11, y + 9, 2, 2, K); G.rect(x + 7, y + 14, 6, 3, W); G.px(x + 9, y + 15, K); G.px(x + 11, y + 15, K);
      if (Math.floor(t * 3 + f.ph) % 2 === 0) G.text('!', x + 22 - (f.dir > 0 ? 0 : 26), y - 2, Gr, { b: true });
    } else {
      T.drawImage(G.icon20(f.ic, 2), x, y);
      if (f.kind === 'lure') { // calavera pequeña en la esquina, parpadeando
        const on = Math.floor(t * 4 + f.ph) % 2 === 0;
        G.rect(x + 12, y + 11, 8, 8, on ? K : Gr); G.rect(x + 13, y + 12, 6, 4, W); G.px(x + 14, y + 13, K); G.px(x + 17, y + 13, K); G.rect(x + 14, y + 16, 4, 2, W);
      }
    }
    const lw = G.textW(f.lab);
    G.rect(x + 10 - Math.ceil(lw / 2) - 1, y + 21, lw + 2, 9, K);
    G.text(f.lab, x + 10, y + 22, f.kind === 'good' ? W : Gr, { al: 'c' });
  }
  function drawMega(x, y, dir, t, hot) {
    x = Math.round(x); y = Math.round(y);
    const fl = Math.round(Math.sin(t * 7) * 5);
    // cola y aletas
    if (dir > 0) { G.tri(x + 2, y + 28, x - 28, y + 4 + fl, x - 28, y + 52 - fl, B); G.tri(x + 2, y + 28, x - 18, y + 14 + fl, x - 18, y + 42 - fl, W); }
    else { G.tri(x + MW - 2, y + 28, x + MW + 28, y + 4 + fl, x + MW + 28, y + 52 - fl, B); G.tri(x + MW - 2, y + 28, x + MW + 18, y + 14 + fl, x + MW + 18, y + 42 - fl, W); }
    G.tri(x + 34, y + 1, x + 76, y + 1, x + 55 - dir * 14, y - 13, B); G.tri(x + 40, y + MH - 1, x + 64, y + MH - 1, x + 52 - dir * 10, y + MH + 9, B);
    // cuerpo = ventana con calavera
    G.drect(x + 3, y + 3, MW, MH, 8, K, null);
    G.rect(x, y, MW, MH, hot ? W : B); G.box(x - 1, y - 1, MW + 2, MH + 2, W);
    G.rect(x + 2, y + 12, MW - 4, MH - 14, K); G.drect(x + 2, y + 12, MW - 4, MH - 14, 3, B, null);
    G.rect(x + 1, y + 1, MW - 2, 10, hot ? W : B); G.text('MEGA_PHISH.EXE', x + 3, y + 3, hot ? B : W);
    G.box(x + MW - 11, y + 2, 9, 8, W);
    const sx = dir > 0 ? x + 26 : x + MW - 48;
    G.drawSpr('skull', sx, y + 15, { '#': W }, 1);
    // ojo verde y boca con dientes al frente
    const ex = dir > 0 ? x + MW - 20 : x + 20;
    G.circ(ex, y + 22, 5, Gr, W); G.rect(ex - 1 + dir, y + 21, 2, 3, K);
    const mx = dir > 0 ? x + MW - 2 : x + 2;
    G.rect(dir > 0 ? mx - 24 : mx, y + 32, 24, 12, K);
    for (let i = 0; i < 4; i++) { const tx = dir > 0 ? mx - 22 + i * 6 : mx + 2 + i * 6; G.tri(tx, y + 32, tx + 5, y + 32, tx + 2, y + 37, W); G.tri(tx, y + 44, tx + 5, y + 44, tx + 2, y + 39, W); }
  }
  function drawBoss(s, t) {
    const m = s.mf, rc = megaRects(s), wk = rc.weak, T = G.ctx();
    if (s.winT) { // el pez revienta en ventanitas
      const k = t - s.winT, cx = rc.body.x + MW / 2, cy = rc.body.y + MH / 2;
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4, v = 60 + (i % 5) * 25, x = cx + Math.cos(a) * v * k, y = cy + Math.sin(a) * v * k + 120 * k * k, w = 18 - (i % 3) * 4;
        G.rect(Math.round(x), Math.round(y), w, w - 4, i % 2 ? B : W); G.box(Math.round(x), Math.round(y), w, w - 4, K); G.rect(Math.round(x), Math.round(y), w, 3, i % 3 ? K : Gr);
      }
      return;
    }
    const hot = s.tele > 0 && Math.floor(t * 12) % 2 === 0;
    drawMega(m.x, m.y, m.dir, t, hot);
    // la contraseña en la boca (punto débil)
    if (!s.snapT || t - s.snapT < 0.2) {
      const mx = m.dir > 0 ? Math.round(m.x) + MW - 4 : Math.round(m.x) + 4;
      G.line(mx, Math.round(m.y) + 38, wk.x + 10, wk.y + 4, L);
      T.drawImage(G.icon20('doc', 2), wk.x, wk.y);
      G.rect(wk.x + 4, wk.y + 9, 12, 5, Gr); G.text('***', wk.x + 10, wk.y + 8, K, { al: 'c' });
      const lab = 'PASSWORD.TXT', lw = G.textW(lab), lx = G.clamp(wk.x + 10, s.r.x + lw / 2 + 2, s.r.x + s.r.w - lw / 2 - 2);
      G.rect(Math.round(lx - lw / 2) - 1, wk.y + 21, lw + 2, 9, K); G.text(lab, lx, wk.y + 22, s.bst === 'swim' && Math.floor(t * 3) % 2 ? Gr : W, { al: 'c', b: true });
      if (s.bst === 'swim') { const pr = 2 + Math.floor(t * 6) % 3; G.box(wk.x - pr, wk.y - pr, 20 + pr * 2, 20 + pr * 2, Gr); }
    }
  }
  function drawBossHud(s, t) {
    const r = s.r, x = r.x + 6, w = r.w - 12, y = s.wy + 5, cx = r.x + r.w / 2;
    if (s.bst === 'swim') {
      if (s.t < 2.5 || Math.floor(t * 2) % 2 === 0) { G.rect(cx - 58, y - 1, 116, 10, K); G.text('HOOK THE PASSWORD!', cx, y, Gr, { al: 'c', b: true }); }
      return;
    }
    if (s.winT) { G.rect(cx - 64, y - 1, 128, 10, K); G.text('PASSWORD RECOVERED!', cx, y, Gr, { al: 'c', b: true }); return; }
    // barra de tensión: la zona alta (peligro) va en trama
    G.rect(x - 2, y - 2, w + 4, 34, K); G.box(x - 2, y - 2, w + 4, 34, B);
    G.text('TENSION', x + 1, y, W); G.text('DEPTH ' + Math.max(0, Math.round(s.dep / 2)) + 'M', x + w - 1, y, L, { al: 'r' });
    const by = y + 9, red = Math.round((w - 4) * 0.75);
    G.box(x, by, w, 10, W); G.drect(x + 2 + red, by + 2, w - 4 - red, 6, 8, W, null);
    const f = Math.round((w - 4) * Math.min(1, s.ten)), danger = s.ten > 0.75;
    for (let i = 0; i < f; i += 3) G.rect(x + 2 + i, by + 2, 2, 6, danger && Math.floor(t * 12) % 2 ? W : Gr);
    // avisos
    const ty = by + 13;
    if (s.tele > 0 || s.thr > 0) { if (Math.floor(t * 8) % 2 === 0) G.text(s.thr > 0 ? 'EASE OFF!' : '!! THRASH !!', cx, ty, W, { al: 'c', b: true }); }
    else if (danger) G.text('TOO TENSE!', cx, ty, W, { al: 'c', b: true });
    else if (Math.floor(t * 4) % 2 === 0) G.text('MASH TO REEL!', cx, ty, Gr, { al: 'c', b: true });
  }

  // ---------- icono del sector: un anzuelo saca un archivo del agua ----------
  G.ICONS[16] = function (t) {
    const k = (t * 0.8) % 1.6, up = G.clamp((k - 0.3) / 0.9, 0, 1), y = Math.round(12 - up * 9);
    G.line(13, 0, 13, y - 1, W); G.rect(13, y - 2, 1, 2, Gr);
    G.rect(10, y, 8, 9, W); G.box(10, y, 8, 9, K); G.rect(15, y, 3, 2, L); G.rect(11, y + 3, 5, 1, K); G.rect(11, y + 5, 5, 1, K);
    G.rect(0, 14, 24, 6, B); for (let x = 0; x < 24; x += 3) G.px(x + (Math.floor(t * 4) % 3), 14, W);
    G.rect(0, 17, 24, 1, K); G.px(4 + Math.floor(t * 5) % 3, 18, L);
    if (up > 0.05 && up < 0.9) { G.px(8, 13 - Math.round(up * 5), W); G.px(19, 12 - Math.round(up * 4), W); G.px(6, 12 - Math.round(up * 2), L); G.px(21, 13 - Math.round(up * 2), L); }
    G.rect(3, 3, 3, 3, B); G.px(4, 4, K); G.rect(19, 6, 2, 2, B); // burbujas
  };
  G.CARD_SCHEMES[16] = { top: B, tt: W, ib: K, grid: B, bot: W, nc: B, bt: B };
})(window.G);
