'use strict';
// PARTE 2 · 19 SHRED.EXE: las ventanas de spam salen volando desde abajo y se cortan deslizando el dedo rápido.
// Tus archivos también vuelan: si cortas uno, error. Si se escapa demasiado spam, error.
// Jefe: CHAIN.MAIL, una cadena que al cortarla se reenvía en dos copias más pequeñas (como el LOOP.EXE de la parte 1).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  const SPAM = [['YOU WON!', '$999,999'], ['FREE RAM', 'GET IT!'], ['CLICK ME', 'CLICK!!!'], ['SPAM.EXE', '99 GIFTS'], ['UPDATE', 'RESTART?'],
    ['PRIZE!', 'CLAIM IT'], ['HOT DEAL', '-99% OFF'], ['$$$.EXE', 'GET RICH'], ['ALERT!!', 'NO VIRUS'], ['WINNER!', 'U R #1'], ['FREE.ZIP', 'OPEN ME!']];
  const FILES = [['picture', 'ME.JPG'], ['doc', 'MOM.TXT'], ['notepad', 'HOMEWORK.DOC'], ['music', 'SONG.MP3'], ['camera', 'PHOTO.BMP'],
    ['calendar', 'AGENDA.DOC'], ['floppy', 'BACKUP.ZIP'], ['book', 'DIARY.TXT'], ['palette', 'ART.PNG']];
  const SW = 72, SH = 40;             // ventana de spam
  const VCUT = 260;                   // velocidad mínima del dedo para cortar (px lógicos por segundo)
  const STEP = Math.PI / 8;           // el giro va a saltos, como un sprite de los 90
  const HUD = 11;                     // barra de estado de abajo
  const CHAIN = [ // la cadena del jefe: cada corte la parte en dos copias del tamaño siguiente
    { w: 132, h: 76, t: 'CHAIN.MAIL', l: ['FORWARD ME', 'TO 10 PALS', 'OR ELSE...'], v: 34 },
    { w: 96, h: 54, t: 'FWD: CHAIN', l: ['FORWARD', 'ME NOW!'], v: 52 },
    { w: 72, h: 40, t: 'FWD:FWD:', l: ['FWD ME!'], v: 70 },
    { w: 50, h: 30, t: 'FWD', l: [], v: 88 },
  ];
  const CH_TOTAL = 15;                // cortes para acabar con la cadena entera (1 + 2 + 4 + 8)
  const snapA = (a) => Math.round(a / STEP) * STEP;

  // ---------- lienzos pre-dibujados ----------
  const cache = new Map();
  function winCanvas(key, w, h, st, title, lines, icon) {
    if (cache.has(key)) return cache.get(key);
    const o = G.mkCanvas(w + 5, h + 5), T0 = G.ctx();
    G.target(o.x);
    try {
      const rr = G.drawFrame({ x: 1, y: 1, w, h, st, title, stripes: w >= 90, xmode: 'x' });
      if (!lines.length) G.drawSpr(icon, Math.round(rr.x + rr.w / 2 - 5), Math.round(rr.y + rr.h / 2 - 5), { '#': st.ac });
      else {
        G.drawSpr(icon, rr.x + 3, rr.y + 3, { '#': st.ac });
        lines.forEach((ln, i) => G.text(ln, rr.x + 17, rr.y + 3 + i * 9, st.tx));
      }
      if (rr.h >= 22) { const bx = rr.x + rr.w - 21, by = rr.y + rr.h - 11; G.rect(bx, by, 18, 9, st.bd); G.box(bx, by, 18, 9, st.tx); G.text('OK', bx + 9, by + 1, st.tx, { al: 'c' }); }
    } finally { G.target(T0); }
    const r = { c: o.c, cw: w + 5, ch: h + 5, px: 1 + w / 2, py: 1 + h / 2 };
    cache.set(key, r); if (cache.size > 120) cache.delete(cache.keys().next().value);
    return r;
  }
  function fileCanvas(ic, name, block) {
    const key = 'f_' + ic + name + block;
    if (cache.has(key)) return cache.get(key);
    const lw = G.textW(name) + 4, cw = Math.max(40, lw), o = G.mkCanvas(cw, 51), T0 = G.ctx();
    G.target(o.x);
    try {
      o.x.drawImage(G.icon20(ic, block), Math.round(cw / 2 - 20), 0, 40, 40);
      const lx = Math.round(cw / 2 - lw / 2);
      G.rect(lx, 41, lw, 9, K); G.text(name, lx + 2, 42, W);
    } finally { G.target(T0); }
    const r = { c: o.c, cw, ch: 51, px: Math.round(cw / 2), py: 20 }; // pivote = centro del icono (la etiqueta cuelga debajo)
    cache.set(key, r);
    return r;
  }

  // ¿el tramo del dedo toca la caja (girada) del objeto?  (Liang-Barsky en coordenadas del objeto)
  function segHits(x0, y0, x1, y1, it) {
    const a = -snapA(it.a), c = Math.cos(a), sn = Math.sin(a);
    const ax = x0 - it.x, ay = y0 - it.y, bx = x1 - it.x, by = y1 - it.y;
    const lx0 = ax * c - ay * sn, ly0 = ax * sn + ay * c, lx1 = bx * c - by * sn, ly1 = bx * sn + by * c;
    const dx = lx1 - lx0, dy = ly1 - ly0;
    let t0 = 0, t1 = 1;
    const clip = (p, q) => {
      if (p === 0) return q >= 0;
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
      return true;
    };
    return clip(-dx, lx0 + it.hw) && clip(dx, it.hw - lx0) && clip(-dy, ly0 + it.hh) && clip(dy, it.hh - ly0);
  }

  G.MICRO.shred = {
    mode: 'desk', cmd: 'SHRED!', hint: 'SWIPE THE SPAM, NOT YOUR FILES', time: 7, fx: 0.45,
    help: ['SWIPE FAST TO SHRED', 'THE SPAM POP-UPS.', 'NEVER CUT YOUR FILES.', "DON'T LET SPAM ESCAPE."],
    init(s) {
      const r = s.r, d = s.d;
      s.items = []; s.halves = []; s.parts = []; s.msgs = []; s.trail = []; s.queue = [];
      s.stroke = null; s.sid = 0; s.got = 0; s.miss = 0;
      s.g = 430 + 200 * d;
      s.bottom = r.y + r.h - HUD;
      if (s.boss) {
        s.hint = 'CUT THE CHAIN. IT SPLITS!';
        s.left = CH_TOTAL; s.goodT = 1.4;
        this.addChain(s, 0, r.x + r.w / 2, r.y + r.h * 0.34, (Math.random() < 0.5 ? -1 : 1) * 30, 18, 0);
        s.T = 13;
        return;
      }
      s.need = 4 + Math.round(d * 5);
      s.allow = d < 0.5 ? 2 : 1;                 // spam que se puede escapar sin perder
      s.iv = 1.35 - 0.45 * d;                    // tiempo entre tandas
      s.pg = 0.2 + 0.5 * d;                      // probabilidad de que un archivo tuyo vaya en la tanda
      // tandas planificadas: con cortar todo (menos uno) siempre da tiempo
      s.plan = []; let t = 0.25, tot = 0;
      while (tot < s.need + 1) {
        const n = 1 + (Math.random() < 0.3 + 0.5 * d ? 1 : 0) + (d > 0.4 && Math.random() < 0.5 * d ? 1 : 0);
        s.plan.push({ t, n }); tot += n; t += s.iv * G.rand(0.85, 1.1);
      }
      s.planEnd = s.plan[s.plan.length - 1].t;
      s.nextT = t;
      s.T = s.planEnd + 1.5 - 0.3 * d + 0.2 * s.allow;
    },

    // ---------- objetos ----------
    mkSpam(s) {
      const [t, l] = G.pick(SPAM), sn = G.pick(G.STYLE_SETS[Math.min(s.block, 4)]), ic = Math.random() < 0.5 ? 'warn' : 'xcirc';
      const cv = winCanvas('s_' + sn + t + l + ic, SW, SH, G.WSTYLES[sn], t, [l], ic);
      const it = { kind: 'spam', cv, hw: SW / 2 + 2, hh: SH / 2 + 2, a: 0, va: 0 };
      if (s.d >= 0.3 && Math.random() < 0.25 + 0.8 * (s.d - 0.3)) { it.va = (Math.random() < 0.5 ? -1 : 1) * G.rand(2, 3.5 + 2 * s.d); it.a = G.rand(-1, 1); } // dan vueltas
      return it;
    },
    mkGood(s) {
      const [ic, name] = G.pick(FILES);
      return { kind: 'good', cv: fileCanvas(ic, name, s.block), hw: 15, hh: 15, a: 0, va: 0, name };
    },
    // lanza desde abajo: parábola que sube hasta la mitad de arriba
    launch(s, it, avoid, near) {
      const r = s.r, half = Math.max(it.hw, 20) + 3;
      let x0 = G.rand(r.x + half, r.x + r.w - half);
      if (near != null) x0 = G.clamp(near + (Math.random() < 0.5 ? -1 : 1) * G.rand(50, 70), r.x + half, r.x + r.w - half); // pasa rozando el spam
      else for (let k = 0; k < 8 && avoid && avoid.some((x) => Math.abs(x - x0) < 50); k++) x0 = G.rand(r.x + half, r.x + r.w - half);
      const apex = r.y + 26 + it.hh + G.rand(0, (r.h - HUD) * 0.36);
      const y0 = r.y + r.h + it.hh + 8, H = y0 - apex, tu = Math.sqrt(2 * H / s.g);
      let xa = G.rand(r.x + half, r.x + r.w - half);
      if (Math.abs(xa - x0) > 120 * tu) xa = x0 + Math.sign(xa - x0) * 120 * tu;
      it.x = x0; it.y = y0; it.vx = (xa - x0) / tu; it.vy = -Math.sqrt(2 * s.g * H); it.up = true;
      s.items.push(it);
      return x0;
    },
    wave(s, n) {
      const goods = Math.random() < s.pg ? (s.d > 0.4 && Math.random() < 0.35 ? 2 : 1) : 0;
      const kinds = []; for (let i = 0; i < n; i++) kinds.push('spam'); for (let i = 0; i < goods; i++) kinds.splice(G.irand(0, kinds.length), 0, 'good');
      const gap = 0.17 - 0.08 * s.d; // con más dificultad salen casi a la vez (para hacer combos)
      kinds.forEach((k, i) => s.queue.push({ t: s.t + i * gap, k }));
    },
    addChain(s, lv, x, y, vx, vy, imm) {
      const c = CHAIN[lv], sn = ['g4', 'b3', 'm2', 'g2'][lv];
      const cv = winCanvas('c_' + lv, c.w, c.h, G.WSTYLES[sn], c.t, c.l, lv === 3 ? 'xcirc' : 'warn');
      const it = { kind: 'chain', lv, cv, hw: c.w / 2 + 2, hh: c.h / 2 + 2, a: 0, va: 0, x, y, vx, vy, imm, et: 0 };
      s.items.push(it);
      return it;
    },

    // ---------- dedo ----------
    down(s, x, y, e) {
      if (s.stroke) return; // un solo dedo
      s.stroke = { id: e && e.pointerId != null ? e.pointerId : 1, sid: ++s.sid, x, y, n: 0, msg: null };
      s.trail.push({ x, y, t: s.t, hot: false, sid: s.sid });
    },
    move(s, x, y, e) {
      if (!s.stroke) { // el dedo ya iba deslizando cuando empezó la ronda
        if (!e || !(e.pointerType === 'touch' || (e.buttons & 1))) return;
        this.down(s, x, y, e); return;
      }
      if (e && e.pointerId != null && e.pointerId !== s.stroke.id) return;
      const st = s.stroke, x0 = st.x, y0 = st.y;
      // velocidad: desde el punto más viejo de los últimos 60 ms
      let q = null; for (const p of s.trail) if (p.sid === st.sid && p.t >= s.t - 0.06) { q = p; break; }
      if (!q) q = { x: x0, y: y0, t: s.t - 1 / 60 };
      const v = Math.hypot(x - q.x, y - q.y) / Math.max(s.t - q.t, 1 / 60);
      const hot = v >= VCUT;
      st.x = x; st.y = y;
      s.trail.push({ x, y, t: s.t, hot, sid: st.sid });
      if (hot && !s.done) this.slash(s, x0, y0, x, y);
    },
    up(s, x, y, e) {
      if (!s.stroke) return;
      if (e && e.pointerId != null && e.pointerId !== s.stroke.id) return;
      s.stroke = null;
    },
    slash(s, x0, y0, x1, y1) {
      const dx = x1 - x0, dy = y1 - y0;
      // primero los archivos: tocar uno es error aunque también cortes spam
      for (const it of s.items) {
        if (it.dead || it.kind !== 'good' || !segHits(x0, y0, x1, y1, it)) continue;
        this.split(s, it, dx, dy, 60);
        s.fail('FILE SHREDDED');
        s.msgs.push({ x: it.x, y: it.y - 30, txt: it.name + '!', t: 0, col: W, b: true });
        A().sfx('hit'); G.pulse({ glitch: 1, ab: 6, flash: 0.2, flashCol: W, shake: 5 });
        return;
      }
      for (const it of s.items) {
        if (it.dead || it.kind === 'good' || (it.imm || 0) > 0 || !segHits(x0, y0, x1, y1, it)) continue;
        const st = s.stroke; st.n++;
        if (it.kind === 'chain' && it.lv < 3) this.splitChain(s, it, dx, dy); // se reenvía en dos copias
        else this.split(s, it, dx, dy, 110);                                 // triturada
        if (it.kind === 'chain') s.left--; else s.got++;
        A().sfx('close', Math.min(12, st.n * 2)); G.vibrate(10);
        G.pulse({ ab: 2 + Math.min(3, st.n) });
        if (st.n >= 2) {
          if (!st.msg) { st.msg = { x: it.x, y: it.y - 16, txt: '', t: 0, col: W, b: true }; s.msgs.push(st.msg); }
          st.msg.txt = 'COMBO x' + st.n; st.msg.t = 0; st.msg.x = G.clamp(it.x, s.r.x + 34, s.r.x + s.r.w - 34); st.msg.y = it.y - 16;
          A().sfx('combo');
        }
        const done = s.boss ? s.left <= 0 : s.got >= s.need;
        if (done) { s.win(); G.pulse({ flash: 0.12, flashCol: W }); return; }
      }
    },
    // parte la ventana en dos mitades que salen despedidas (más papelitos)
    split(s, it, dx, dy, push) {
      it.dead = true;
      const cv = it.cv, as = snapA(it.a), rel = Math.atan2(dy, dx) - as;
      const horiz = Math.abs(Math.cos(rel)) >= Math.abs(Math.sin(rel)); // corte de lado a lado → mitad de arriba y de abajo
      const mx = Math.round(cv.px), my = Math.round(cv.py);
      const parts = horiz ? [[0, 0, cv.cw, my], [0, my, cv.cw, cv.ch - my]] : [[0, 0, mx, cv.ch], [mx, 0, cv.cw - mx, cv.ch]];
      const len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, cs = Math.cos(as), sn = Math.sin(as);
      parts.forEach((p, i) => {
        const hx = p[0] + p[2] / 2 - cv.px, hy = p[1] + p[3] / 2 - cv.py;
        const ox = hx * cs - hy * sn, oy = hx * sn + hy * cs, ol = Math.hypot(ox, oy) || 1;
        s.halves.push({ c: cv.c, sx: p[0], sy: p[1], sw: p[2], sh: p[3], x: it.x + ox + (ox / ol) * 5, y: it.y + oy + (oy / ol) * 5,
          vx: (it.vx || 0) * 0.5 + (ox / ol) * push + ux * 40, vy: Math.min(0, (it.vy || 0) * 0.3) + (oy / ol) * push + uy * 40 - 40,
          a: it.a, va: (i ? 1 : -1) * G.rand(3, 6), t: 0 });
      });
      const cols = it.kind === 'good' ? [W, L] : [W, L, s.acc];
      for (let k = 0; k < 10; k++) s.parts.push({ x: it.x + G.rand(-12, 12), y: it.y + G.rand(-8, 8), vx: G.rand(-120, 120) + ux * 60, vy: G.rand(-160, -20) + uy * 60, t: 0, col: G.pick(cols), w: Math.random() < 0.5 ? 2 : 3 });
    },
    // jefe: la cadena se reenvía en dos copias más pequeñas
    splitChain(s, it, dx, dy) {
      it.dead = true;
      const len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, c = CHAIN[it.lv + 1];
      for (const sg of [-1, 1]) {
        const off = it.lv === 0 ? 22 : 14;
        const k = this.addChain(s, it.lv + 1, it.x + nx * sg * off, it.y + ny * sg * off, nx * sg * c.v * 1.6 + G.rand(-15, 15), ny * sg * c.v * 1.6 + G.rand(-15, 15), 0.3);
        k.et = 0.2; // ya abierta (sin animación de entrada)
      }
      for (let k = 0; k < 12; k++) s.parts.push({ x: it.x + G.rand(-20, 20), y: it.y + G.rand(-12, 12), vx: G.rand(-140, 140), vy: G.rand(-140, 40), t: 0, col: G.pick([W, Gr, B]), w: 2 });
      s.msgs.push({ x: G.clamp(it.x, s.r.x + 30, s.r.x + s.r.w - 30), y: it.y - it.hh - 4, txt: 'FWD x2', t: 0, col: Gr, b: true });
      A().sfx('zap'); A().sfx('spawn', 2); G.pulse({ glitch: 0.45, ab: 3 });
    },

    update(s, dt) {
      const r = s.r;
      // lanzamientos
      if (!s.boss) {
        while (s.plan.length && s.plan[0].t <= s.t) this.wave(s, s.plan.shift().n);
        if (!s.plan.length && s.t >= s.nextT) { this.wave(s, 1 + (Math.random() < 0.3 + 0.5 * s.d ? 1 : 0)); s.nextT += s.iv; }
      } else {
        s.goodT -= dt;
        if (s.goodT <= 0) { s.goodT = G.rand(1.0, 1.6); s.queue.push({ t: s.t, k: 'good' }); if (Math.random() < 0.35) s.queue.push({ t: s.t + 0.2, k: 'good' }); }
      }
      if (s.queue.length) {
        const xs = s.items.filter((o) => o.up && o.y > r.y + r.h - 20).map((o) => o.x);
        while (s.queue.length && s.queue[0].t <= s.t) {
          const q = s.queue.shift(), it = q.k === 'good' ? this.mkGood(s) : this.mkSpam(s);
          const near = q.k === 'good' && xs.length && Math.random() < 0.5 * s.d ? xs[xs.length - 1] : null;
          xs.push(this.launch(s, it, xs, near)); A().sfx('flip');
        }
      }
      // movimiento
      const mul = s.boss ? 1.2 + 0.6 * (1 - s.left / CH_TOTAL) : 1; // la cadena se acelera según la cortas
      for (const it of s.items) {
        if (it.dead) continue;
        if (it.kind === 'chain') {
          it.et += dt; if (it.imm > 0) it.imm -= dt;
          if (it.et < 0.2) continue; // se está abriendo
          it.x += it.vx * dt; it.y += it.vy * dt;
          const x0 = r.x + it.hw, x1 = r.x + r.w - it.hw, y0 = r.y + 4 + it.hh, y1 = s.bottom - 4 - it.hh;
          if (it.x < x0) { it.x = x0; it.vx = Math.abs(it.vx); } if (it.x > x1) { it.x = x1; it.vx = -Math.abs(it.vx); }
          if (it.y < y0) { it.y = y0; it.vy = Math.abs(it.vy); } if (it.y > y1) { it.y = y1; it.vy = -Math.abs(it.vy); }
          const sp = Math.hypot(it.vx, it.vy) || 1, want = CHAIN[it.lv].v * mul, k = 1 + (want / sp - 1) * Math.min(1, dt * 2);
          it.vx *= k; it.vy *= k;
          if (Math.abs(it.vy) < want * 0.25) it.vy = (it.vy < 0 ? -1 : 1) * want * 0.25; // que no se quede plana
          continue;
        }
        it.vy += s.g * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.a += it.va * dt;
        if (it.vy > 0) it.up = false;
        if (it.x - it.hw < r.x && it.vx < 0) it.vx = -it.vx;
        if (it.x + it.hw > r.x + r.w && it.vx > 0) it.vx = -it.vx;
        if (!it.up && it.y - it.hh > r.y + r.h + 4) {
          it.dead = true;
          if (it.kind === 'spam') {
            s.miss++;
            s.msgs.push({ x: G.clamp(it.x, r.x + 24, r.x + r.w - 24), y: s.bottom - 2, txt: 'ESCAPED', t: 0, col: L });
            A().sfx('deny'); G.pulse({ ab: 3, shake: 2 });
            if (s.miss > s.allow) { s.fail('SPAM ESCAPED'); return; }
          }
        }
      }
      s.items = s.items.filter((o) => !o.dead);
      for (const h of s.halves) { h.t += dt; h.vy += s.g * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.a += h.va * dt; }
      s.halves = s.halves.filter((h) => h.y < r.y + r.h + 60 && h.t < 3);
      for (const p of s.parts) { p.t += dt; p.vy += 420 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      s.parts = s.parts.filter((p) => p.t < 0.6);
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.8);
      s.trail = s.trail.filter((p) => s.t - p.t < 0.2);
    },

    // ---------- dibujo ----------
    drawIt(T, it, s) {
      const cv = it.cv;
      if (it.kind === 'chain' && it.et < 0.2) { // se abre como las ventanas de la parte 1: contorno que crece
        const k = it.et / 0.2, ww = Math.max(4, (it.hw * 2) * k), hh = Math.max(3, (it.hh * 2) * k);
        G.box(Math.round(it.x - ww / 2), Math.round(it.y - hh / 2), Math.round(ww), Math.round(hh), W); return;
      }
      const as = snapA(it.a);
      if (as === 0) T.drawImage(cv.c, Math.round(it.x - cv.px), Math.round(it.y - cv.py));
      else { T.save(); T.translate(Math.round(it.x), Math.round(it.y)); T.rotate(as); T.drawImage(cv.c, -Math.round(cv.px), -Math.round(cv.py)); T.restore(); }
      if ((it.imm || 0) > 0 && Math.floor(s.t * 24) % 2) G.drect(Math.round(it.x - it.hw + 2), Math.round(it.y - it.hh + 2), it.hw * 2 - 4, it.hh * 2 - 4, 8, W, null); // recién reenviada: parpadea
    },
    drawTrail(s) {
      for (let i = 1; i < s.trail.length; i++) {
        const a = s.trail[i - 1], b = s.trail[i];
        if (a.sid !== b.sid) continue;
        const age = s.t - b.t;
        if (!b.hot) { if (age < 0.1) G.line(a.x, a.y, b.x, b.y, L); continue; }
        if (age > 0.14) continue;
        if (age < 0.08) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) G.line(a.x + ox, a.y + oy, b.x + ox, b.y + oy, s.acc);
        G.line(a.x, a.y, b.x, b.y, W);
      }
    },
    drawHud(s) {
      const r = s.r, y = s.bottom;
      G.rect(r.x, y, r.w, HUD, K); G.rect(r.x, y, r.w, 1, s.acc);
      if (s.boss) {
        G.text('CHAIN.MAIL  SHREDS LEFT ' + Math.max(0, s.left), r.x + 3, y + 2, W);
        return;
      }
      G.text('SHREDDED ' + Math.min(s.got, s.need) + '/' + s.need, r.x + 3, y + 2, W);
      // escapados: una casilla por cada uno que se permite
      const n = s.allow, bx = r.x + r.w - 3 - n * 10;
      G.text('ESCAPED', bx - 4, y + 2, s.miss ? W : L, { al: 'r' });
      for (let i = 0; i < n; i++) {
        const x = bx + i * 10; G.box(x, y + 2, 8, 8, W);
        if (i < s.miss) { G.line(x + 1, y + 3, x + 6, y + 8, W); G.line(x + 6, y + 3, x + 1, y + 8, W); }
      }
    },
    draw(s) {
      const r = s.r, T = G.ctx();
      G.drect(r.x, r.y, r.w, r.h, 8, K, null); // atenúa el fondo (como TRASH) para que se lean las ventanas
      for (const it of s.items) if (it.kind !== 'good') this.drawIt(T, it, s);
      for (const it of s.items) if (it.kind === 'good') this.drawIt(T, it, s);   // tus archivos, siempre delante
      for (const h of s.halves) {
        const as = snapA(h.a);
        T.save(); T.translate(Math.round(h.x), Math.round(h.y)); if (as) T.rotate(as);
        T.drawImage(h.c, h.sx, h.sy, h.sw, h.sh, -Math.round(h.sw / 2), -Math.round(h.sh / 2), h.sw, h.sh);
        T.restore();
      }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), p.w, p.w, p.t < 0.3 ? p.col : L);
      this.drawTrail(s);
      for (const m of s.msgs) { // con fondo negro para que se lea encima de las ventanas
        const y = Math.round(m.y - 6 - m.t * 24), tw = G.textW(m.txt, 1, 1, !!m.b) + 4;
        G.rect(Math.round(m.x - tw / 2), y - 1, tw, 9, K);
        G.text(m.txt, m.x, y, m.col || W, { al: 'c', b: !!m.b });
      }
      this.drawHud(s);
    },
  };

  // icono: una ventana cortada en dos por un tajo
  G.ICONS[19] = function (t) {
    const c = (t * 0.8) % 1, sep = c < 0.5 ? 0 : (c - 0.5) / 0.5, fall = sep * sep * 5;
    const win = (x, y, top) => {
      x = Math.round(x); y = Math.round(y);
      if (top) { G.rect(x, y, 14, 6, W); G.box(x, y, 14, 7, K); G.rect(x, y, 14, 3, K); G.px(x + 12, y + 1, W); }
      else { G.rect(x, y, 14, 6, W); G.box(x, y - 1, 14, 7, K); G.rect(x + 3, y + 1, 5, 1, K); G.box(x + 8, y + 2, 4, 3, K); }
    };
    win(5 - sep * 4, 3 - sep * 2 + fall, true);
    win(5 + sep * 4, 10 + sep * 2 + fall, false);
    if (c > 0.32 && c < 0.62) { // el tajo
      const k = Math.min(1, (c - 0.32) / 0.14), x1 = 1 + 22 * k, y1 = 14 - 9 * k;
      G.line(1, 15, x1, y1 + 1, Gr); G.line(1, 14, x1, y1, W);
    }
    if (sep > 0) for (let i = 0; i < 4; i++) G.px(Math.round(12 + Math.cos(i * 1.7) * sep * 9), Math.round(10 + sep * 6 + i), i % 2 ? W : Gr);
  };
  G.CARD_SCHEMES[19] = { top: Gr, tt: K, ib: B, grid: W, bot: L, nc: K, bt: B };
})(window.G);
