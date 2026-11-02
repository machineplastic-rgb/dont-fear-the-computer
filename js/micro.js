'use strict';
// MICROJUEGOS (niveles 2-12): rondas rápidas con orden de una palabra, 4 vidas y jefe final.
// Modos de pantalla: 'window' (ventana grande), 'float' (ventana flotante sobre el escritorio) y 'desk' (el escritorio entero).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;
  function area() { const y0 = G.safeT + 2; return { x: 2, y: y0, w: G.W - 4, h: G.taskbarY() - y0 - 4 }; }

  // ---------- utilidades ----------
  function sprFit(name, cx, cy, maxW, maxH, map, maxSc) {
    const w = G.sprW(name), h = G.sprH(name);
    const sc = Math.max(1, Math.min(maxSc || 9, Math.floor(Math.min(maxW / w, maxH / h))));
    G.drawSpr(name, Math.round(cx - (w * sc) / 2), Math.round(cy - (h * sc) / 2), map, sc);
    return sc;
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function place(list, r, w, h, gap) {
    for (let k = 0; k < 90; k++) {
      const x = Math.round(G.rand(r.x, r.x + r.w - w)), y = Math.round(G.rand(r.y, r.y + r.h - h));
      if (list.every((o) => Math.abs(o.x - x) > Math.max(w, o.w) + gap || Math.abs(o.y - y) > Math.max(h, o.h) + gap)) return { x, y };
    }
    return { x: Math.round(G.rand(r.x, r.x + r.w - w)), y: Math.round(G.rand(r.y, r.y + r.h - h)) };
  }
  function dragDown(s, list, x, y, pad) {
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i]; if (o.done) continue;
      if (G.inR(x, y, o, pad || 8)) { s.drag = { o, dx: x - o.x, dy: y - o.y }; list.splice(i, 1); list.push(o); A().sfx('pick'); return o; }
    }
    return null;
  }
  function dragMove(s, x, y) {
    if (!s.drag) return; const o = s.drag.o, r = s.r;
    o.x = G.clamp(x - s.drag.dx, r.x, r.x + r.w - o.w); o.y = G.clamp(y - s.drag.dy, r.y, r.y + r.h - o.h);
  }
  function groupBox(x, y, w, h, label, col) { // recuadro punteado con título (estilo panel de control)
    G.dash(x, y, w, col, 1, 1); G.dash(x, y + h - 1, w, col, 1, 1);
    for (let yy = y; yy < y + h; yy += 2) { G.px(x, yy, col); G.px(x + w - 1, yy, col); }
    if (label) G.text(label, x + 7, y - 3, col, { b: true });
  }
  function groupBoxBg(x, y, w, h, label, col, bg) { G.rect(x + 5, y - 4, G.textW(label) + 6, 9, bg); groupBox(x, y, w, h, null, col); G.text(label, x + 7, y - 3, col, { b: true }); }
  function handles(x, y, w, h, col, bg) { // marcos de selección (como en Paint)
    G.box(x, y, w, h, col);
    for (const [hx, hy] of [[x, y], [x + w / 2, y], [x + w - 1, y], [x, y + h / 2], [x + w - 1, y + h / 2], [x, y + h - 1], [x + w / 2, y + h - 1], [x + w - 1, y + h - 1]]) { G.rect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5, bg); G.box(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5, col); }
  }

  const M = G.MICRO = {};

  // ===== 2 TRASH: arrastra los archivos a la papelera de reciclaje (¡no tires SYSTEM ni el HD!) =====
  const POP_MSGS = [['UPDATE', 'RESTART?'], ['ERROR', 'TRY AGAIN'], ['ALERT', 'LOW MEMORY'], ['SPAM.EXE', 'YOU WON!'], ['VIRUS?', 'NOT A VIRUS']];
  const TICO = 3; // los iconos de la papelera van con la paleta completa
  M.trash = {
    mode: 'desk', cmd: 'DRAG!', hint: 'FILES TO THE RECYCLE BIN', time: 7,
    help: ['DRAG EVERY FILE TO THE', 'RECYCLE BIN. LOCKED', 'FILES (SYSTEM, HD) MUST', 'STAY. POP-UPS GET IN', 'THE WAY: CLOSE THEM.'],
    init(s) {
      const r = s.r;
      s.bin = { x: r.x + r.w - 70, y: Math.round(r.y + r.h * 0.45 - 34), w: 64, h: 68 };
      const zone = { x: r.x + 2, y: r.y + 4, w: r.w - 78, h: r.h - 18 };
      const n = 3 + Math.round(s.d * 6), names = shuffle(G.ICON20_TRASH.slice());
      s.items = [];
      // rejilla con un poco de desorden: nunca se pisan
      const cols = Math.max(1, Math.floor(zone.w / 46)), rows = Math.max(1, Math.floor(zone.h / 56));
      const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i));
      const cw = zone.w / cols, ch = zone.h / rows;
      const add = (ic, sys) => {
        const c = cells.pop(); const cx = c == null ? G.irand(0, cols - 1) : c % cols, cy = c == null ? G.irand(0, rows - 1) : Math.floor(c / cols);
        const x = Math.round(zone.x + cx * cw + (cw - 44) / 2 + G.rand(-3, 3)), y = Math.round(zone.y + cy * ch + (ch - 52) / 2 + G.rand(-3, 3));
        s.items.push({ x, y, w: 44, h: 52, hx: x, hy: y, ic, sys, ph: Math.random() * 6, lift: 0 });
      };
      for (let i = 0; i < n; i++) add(names[i % names.length], false);
      const decoys = s.d > 0.12 ? (s.d > 0.55 ? 2 : 1) : 0;
      ['system', 'harddisk'].slice(0, decoys).forEach((nm) => add(nm, true));
      shuffle(s.items);
      s.T = (3.6 + n * 0.75) * (1 - 0.15 * s.d) * (s.boss ? 1.15 : 1);
      s.full = 0; s.bump = 0; s.fly = []; s.parts = []; s.pops = []; s.msgs = [];
      s.popT = 1.0; s.maxPops = s.d >= 0.5 ? 1 + Math.floor((s.d - 0.5) * 5) : 0;
    },
    spawnPop(s) {
      const r = s.r, w = Math.min(100, r.w - 10), h = 40, m = G.pick(POP_MSGS);
      const nearBin = s.d > 0.8 && Math.random() < 0.5;
      const x = nearBin ? s.bin.x - G.rand(10, 40) : G.rand(r.x + 2, r.x + r.w - w - 2), y = nearBin ? s.bin.y + G.rand(-10, 30) : G.rand(r.y + 2, r.y + r.h - h - 2);
      const a = Math.random() * 6, sp = 10 + 25 * s.d;
      s.pops.push({ x: G.clamp(x, r.x, r.x + r.w - w), y: G.clamp(y, r.y, r.y + r.h - h), w, h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, title: m[0], msg: m[1], st: G.randStyle(TICO), born: s.t });
      A().sfx('spawn', 1); G.pulse({ glitch: 0.2 });
    },
    popAt(s, x, y) { for (let i = s.pops.length - 1; i >= 0; i--) if (G.inR(x, y, s.pops[i])) return s.pops[i]; return null; },
    down(s, x, y) {
      const p = this.popAt(s, x, y);
      if (p) { // la X cierra la ventana; el resto la bloquea
        if (G.inR(x, y, { x: p.x + p.w - 12, y: p.y, w: 12, h: 12 }, 5)) { s.pops.splice(s.pops.indexOf(p), 1); A().sfx('close', 3); G.pulse({ ab: 1.5 }); }
        else A().sfx('deny');
        return;
      }
      const o = dragDown(s, s.items, x, y, 6); if (o) o.lift = 1;
    },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const o = s.drag.o; s.drag = null; o.lift = 0;
      const cx = o.x + o.w / 2, cy = o.y + 20;
      if (this.popAt(s, cx, cy)) { o.x = o.hx; o.y = o.hy; A().sfx('deny'); s.msgs.push({ x: cx, y: cy, txt: 'BLOCKED', t: 0 }); G.pulse({ glitch: 0.3, ab: 2 }); return; }
      if (G.inR(cx, cy, s.bin, 12)) {
        if (o.sys) { s.fail(o.ic === 'harddisk' ? 'DISK DELETED' : 'SYSTEM DELETED'); G.pulse({ flash: 0.3, flashCol: W }); return; }
        s.items.splice(s.items.indexOf(o), 1);
        s.fly.push({ ic: o.ic, x: o.x, y: o.y, t: 0 });
        A().sfx('drop'); G.pulse({ ab: 2 }); G.vibrate(12);
        if (!s.items.some((i) => !i.sys)) s.win();
      } else { o.hx = o.x; o.hy = o.y; }
    },
    update(s, dt) {
      const r = s.r;
      if (s.bump) s.bump = Math.max(0, s.bump - dt * 4);
      // archivos volando hacia la papelera
      for (const f of s.fly) {
        f.t += dt;
        if (f.t >= 0.28 && !f.done) { f.done = true; s.full++; s.bump = 1; for (let k = 0; k < 8; k++) s.parts.push({ x: s.bin.x + 32, y: s.bin.y + 14, vx: G.rand(-70, 70), vy: G.rand(-120, -30), t: 0 }); }
      }
      s.fly = s.fly.filter((f) => f.t < 0.3);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.5);
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.7);
      // ventanas que molestan
      if (s.maxPops) { s.popT -= dt; if (s.popT <= 0) { s.popT = G.rand(1.4, 2.3) * (1 - 0.35 * (s.d - 0.5)); if (s.pops.length < s.maxPops) this.spawnPop(s); } }
      for (const p of s.pops) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < r.x) { p.x = r.x; p.vx = Math.abs(p.vx); } if (p.x + p.w > r.x + r.w) { p.x = r.x + r.w - p.w; p.vx = -Math.abs(p.vx); }
        if (p.y < r.y) { p.y = r.y; p.vy = Math.abs(p.vy); } if (p.y + p.h > r.y + r.h) { p.y = r.y + r.h - p.h; p.vy = -Math.abs(p.vy); }
      }
      // los archivos se mueven solos en las rondas altas
      if (s.d > 0.6) s.items.forEach((o) => { if (s.drag && s.drag.o === o) return; o.x = G.clamp(o.x + Math.sin(s.t * 1.4 + o.ph) * 0.2, r.x, s.bin.x - o.w - 2); o.y = G.clamp(o.y + Math.cos(s.t * 1.1 + o.ph) * 0.16, r.y, r.y + r.h - o.h); o.hx = o.x; o.hy = o.y; });
    },
    drawItem(s, o, dragging) {
      const bob = dragging ? -4 : Math.round(Math.sin(s.t * 3 + o.ph) * 1);
      const ix = Math.round(o.x + 2), iy = Math.round(o.y + bob);
      if (dragging) G.drect(ix + 4, iy + 8, 40, 40, 8, K, null);
      G.ctx().drawImage(G.icon20(o.ic, TICO), ix, iy, 40, 40);
      if (o.sys) { G.rect(ix, iy + 28, 11, 11, W); G.drawSpr('lock', ix + 2, iy + 30, { '#': K }); }
      const lab = G.ICON20_LABEL[o.ic], lw = G.textW(lab) + 4;
      G.rect(Math.round(o.x + o.w / 2 - lw / 2), iy + 42, lw, 9, o.sys ? W : K);
      G.text(lab, o.x + o.w / 2, iy + 43, o.sys ? K : W, { al: 'c' });
    },
    draw(s) {
      const b = s.bin;
      G.drect(s.r.x, s.r.y, s.r.w, s.r.h, 8, K, null); // atenúa el fondo para que resalten los iconos
      const hot = s.drag && G.inR(s.drag.o.x + 22, s.drag.o.y + 20, b, 12);
      const by = b.y - Math.round(s.bump * 4);
      G.drawRecycle(b.x, by, 2, TICO, s.full, hot);
      const lw = G.textW('RECYCLE BIN') + 4;
      G.rect(b.x + 32 - lw / 2, b.y + 70, lw, 9, K); G.text('RECYCLE BIN', b.x + 32, b.y + 71, W, { al: 'c' });
      for (const o of s.items) if (!s.drag || s.drag.o !== o) this.drawItem(s, o, false);
      for (const f of s.fly) { // vuela en curva y se encoge
        const k = Math.min(1, f.t / 0.28), x = G.lerp(f.x, b.x + 22, k), y = G.lerp(f.y, b.y + 4, k) - Math.sin(k * Math.PI) * 24, sz = Math.max(4, Math.round(40 * (1 - k * 0.8)));
        G.ctx().drawImage(G.icon20(f.ic, TICO), Math.round(x + (40 - sz) / 2), Math.round(y + (40 - sz) / 2), sz, sz);
      }
      for (const p of s.parts) G.rect(p.x, p.y, 3, 3, p.t < 0.25 ? W : L);
      for (const p of s.pops) {
        const w = { x: p.x, y: p.y, w: p.w, h: p.h, st: p.st, title: p.title, stripes: false, xmode: 'x' };
        const rr = G.drawFrame(w);
        G.drawSpr('warn', rr.x + 3, rr.y + 3, { '#': p.st.ac });
        G.text(p.msg, rr.x + 18, rr.y + 6, p.st.tx);
      }
      if (s.drag) this.drawItem(s, s.drag.o, true);
      for (const m of s.msgs) G.text(m.txt, m.x, m.y - 10 - m.t * 24, W, { al: 'c', b: true });
      const left = s.items.filter((i) => !i.sys).length;
      G.text(left + ' FILES LEFT', s.r.x + 4, s.r.y + s.r.h - 9, W, { b: true });
    },
  };

  // ===== 3 LOAD.100: barra de copia al 100 % · calidad en NORMAL · volumen vertical al máximo =====
  const loadKind = (s) => ['copy', 'quality', 'volume'][Math.min(2, Math.floor(((s.round || 1) - 1) * 3 / (s.rounds || 9)))];
  M.load = {
    mode: 'float', tilt: 5, cmd: 'STOP!', hint: 'TAP AT THE RIGHT MOMENT', time: 0,
    help: ['STOP EACH BAR AT THE', 'RIGHT MOMENT:', 'COPY = 100%', 'QUALITY = NORMAL', 'VOLUME = MAX'],
    float(aw, ah, round, rounds) {
      const k = loadKind({ round, rounds });
      if (k === 'copy') return { w: aw - 10, h: 128, title: 'COPYING...' };
      if (k === 'quality') return { w: aw - 10, h: 168, title: 'COMPRESSION SETTINGS' };
      return { w: aw - 10, h: Math.min(ah - 40, 230), title: 'CONTROL PANEL' };
    },
    init(s) {
      s.kind = loadKind(s);
      if (s.kind === 'copy') { s.hint = 'TAP AT 100%'; s.p = 0; s.v = 0.5 + 0.25 * s.d; s.zone = 0.11 - 0.05 * s.d; s.hold = 0.3; s.file = G.pick(['HAPPY.EXE', 'SOUL.DAT', 'DREAMS.ZIP', 'TIME.SYS']); }
      else if (s.kind === 'quality') { // más rápido, cambia de velocidad y poco tiempo
        s.hint = 'STOP AT NORMAL'; s.T = 3.6 * (1 - 0.2 * s.d) * (s.boss ? 1.2 : 1);
        s.ph = Math.random() * 6; s.u = 0; s.sp = 2.6 + 1.0 * s.d; s.mul = 1; s.mt = 0.6; s.tol = 0.06 - 0.015 * s.d;
      } else { // volumen en diente de sierra: el máximo dura un instante y a veces se queda corto
        s.hint = 'STOP AT MAX VOLUME'; s.T = 3.6 * (1 - 0.2 * s.d) * (s.boss ? 1.2 : 1);
        s.u = 0.05; s.dir = 1; s.rate = 2 / (1.9 - 0.6 * s.d); s.peak = 1; s.tol = 0.085 - 0.025 * s.d;
      }
    },
    fuse(s) { return s.kind === 'copy' ? 1 - Math.min(1, s.p) : 1 - s.t / s.T; },
    update(s, dt) {
      if (s.kind === 'copy') {
        if (s.hold > 0) s.hold -= dt;
        else { s.p += s.v * (s.p > 0.75 ? 1.15 + 0.3 * s.d : 1) * dt; if (Math.random() < dt * (1.3 + s.d)) s.hold = G.rand(0.08, 0.3) * (s.p > 0.8 ? 0.7 : 1); }
        if (s.p > 1.035) { s.p = 1.035; s.fail('OVERFLOW'); }
      } else if (s.kind === 'quality') {
        s.mt -= dt; if (s.mt <= 0) { s.mt = G.rand(0.4, 0.9); s.mul = G.rand(0.75, 1.3); }
        s.ph += s.sp * s.mul * dt;
        s.u = 0.5 + 0.5 * Math.sin(s.ph);
      } else {
        s.u += s.dir * s.rate * dt;
        if (s.dir > 0 && s.u >= s.peak) { s.u = s.peak; s.dir = -1; }
        if (s.dir < 0 && s.u <= 0.04) { s.u = 0.04; s.dir = 1; s.peak = Math.random() < 0.62 ? 1 : G.rand(0.74, 0.88); s.rate = (2 / (1.9 - 0.6 * s.d)) * G.rand(0.85, 1.2); }
      }
    },
    tap(s) {
      if (s.kind === 'copy') { if (s.p >= 1 - s.zone) s.win(); else s.fail('TOO SOON'); }
      else if (s.kind === 'quality') { if (Math.abs(s.u - 0.5) <= s.tol) s.win(); else s.fail(s.u < 0.5 ? 'TOO LOW' : 'TOO HIGH'); }
      else { if (s.u >= 1 - s.tol) s.win(); else s.fail('NOT LOUD ENOUGH'); }
    },
    draw(s) {
      const r = s.r, st = s.st, fg = st.tx, bg = st.bd;
      if (s.kind === 'copy') {
        G.text(s.file, r.x + 8, r.y + 6, fg, { s: 2, b: true });
        G.text('FROM "C:/" TO "VOID"', r.x + 8, r.y + 25, fg);
        const bw = r.w - 16, bx = r.x + 8, by = r.y + 40, bh = 16;
        const zx = bx + Math.round(bw * (1 - s.zone));
        G.drect(zx, by - 3, bx + bw - zx, bh + 6, 8, s.acc === L ? fg : s.acc, null);
        G.box(bx - 2, by - 2, bw + 4, bh + 4, fg);
        const f = Math.round(bw * Math.min(1.035, s.p));
        for (let i = 0; i < f; i += 5) G.rect(bx + i, by + 2, Math.min(3, f - i), bh - 4, fg);
        const pct = Math.min(104, Math.floor(s.p * 100));
        G.text(pct + '%', bx + bw, by + bh + 6, pct > 100 ? (s.acc === L ? fg : s.acc) : fg, { al: 'r', b: true });
        G.text(Math.max(0, Math.ceil((1 - s.p) * 24)) + ' HOURS REMAINING', bx, by + bh + 6, fg);
        G.drawSpr(Math.floor(s.t * 3) % 2 ? 'hg1' : 'hg2', r.x + r.w - 16, r.y + 6, { '#': fg, o: fg });
        G.drawBtn(r.x + r.w / 2 - 28, r.y + r.h - 18, 56, 14, 'CANCEL', fg, bg);
      } else if (s.kind === 'quality') {
        groupBoxBg(r.x + 4, r.y + 8, r.w - 8, 40, 'COMPRESSOR', fg, bg);
        G.box(r.x + 10, r.y + 14, r.w - 20, 12, fg); G.rect(r.x + 11, r.y + 25, r.w - 21, 1, fg); G.text('VOID VIDEO', r.x + 14, r.y + 17, fg, { b: true }); G.text('▼', r.x + r.w - 18, r.y + 17, fg);
        G.drect(r.x + 10, r.y + 31, r.w - 20, 11, 4, fg, null); G.box(r.x + 10, r.y + 31, r.w - 20, 11, fg); G.rect(r.x + 12, r.y + 32, 38, 9, bg); G.text('COLOR', r.x + 14, r.y + 33, fg, { b: true });
        groupBoxBg(r.x + 4, r.y + 58, r.w - 8, 50, 'QUALITY', fg, bg);
        const tx = r.x + 14, tw = r.w - 28, ty = r.y + 70;
        G.drect(tx + Math.round(tw * (0.5 - s.tol)), ty - 4, Math.round(tw * s.tol * 2), 15, 6, s.acc === L ? fg : s.acc, null);
        G.rect(tx, ty, tw, 7, bg); G.drect(tx + 1, ty + 1, tw - 2, 5, 8, fg, bg); G.box(tx, ty, tw, 7, fg);
        [0, 0.25, 0.5, 0.75, 1].forEach((v) => G.rect(tx + Math.round(tw * v), ty + 10, 1, 3, fg));
        G.text('LEAST', tx, ty + 16, fg); G.text('LOW', tx + tw * 0.25, ty + 16, fg, { al: 'c' }); G.text('NORMAL', tx + tw * 0.5, ty + 16, fg, { al: 'c', b: true }); G.text('HIGH', tx + tw * 0.75, ty + 16, fg, { al: 'c' }); G.text('MOST', tx + tw, ty + 16, fg, { al: 'r' });
        const thx = Math.round(tx + tw * s.u);
        G.rect(thx - 4, ty - 4, 9, 15, bg); G.box(thx - 4, ty - 4, 9, 15, fg); G.rect(thx - 2, ty - 2, 5, 11, fg); G.rect(thx - 1, ty - 1, 3, 9, bg);
        G.box(r.x + 10, r.y + r.h - 22, 15, 15, fg); G.line(r.x + 12, r.y + r.h - 20, r.x + 22, r.y + r.h - 10, fg); G.line(r.x + 22, r.y + r.h - 20, r.x + 12, r.y + r.h - 10, fg);
        G.text('FRAME DIFFERENCING', r.x + 30, r.y + r.h - 18, fg);
        G.drawBtn(r.x + r.w - 44, r.y + r.h - 24, 36, 16, 'OK', fg, bg, false, { double: true });
      } else {
        const cw = 46, sx = r.x + r.w - cw - 4;
        // paneles decorativos del panel de control
        G.box(r.x + 4, r.y + 4, sx - r.x - 10, 54, fg);
        G.checker(r.x + 10, r.y + 10, 26, 26, fg, bg); G.box(r.x + 10, r.y + 10, 26, 26, fg);
        G.drect(r.x + 42, r.y + 10, sx - r.x - 54, 26, 4 + Math.floor(s.t * 4) % 8, fg, bg); G.box(r.x + 42, r.y + 10, sx - r.x - 54, 26, fg);
        G.text('DESKTOP PATTERN', r.x + (sx - r.x) / 2, r.y + 42, fg, { al: 'c' });
        G.box(r.x + 4, r.y + 62, sx - r.x - 10, 46, fg);
        G.text('MOUSE TRACKING', r.x + 10, r.y + 66, fg);
        const sel = Math.floor(s.t * 1.5) % 3;
        for (let i = 0; i < 3; i++) { G.circ(r.x + 16 + i * 26, r.y + 84, 4, bg, fg); if (i === sel) G.circ(r.x + 16 + i * 26, r.y + 84, 2, fg, fg); }
        G.text('SLOW   FAST', r.x + 10, r.y + 94, fg);
        G.box(r.x + 4, r.y + 112, sx - r.x - 10, 22, fg); G.text('RAM CACHE', r.x + 10, r.y + 119, fg); G.box(sx - 40, r.y + 116, 30, 13, fg); G.text('128K', sx - 37, r.y + 119, fg);
        if (r.h > 180) {
          G.box(r.x + 4, r.y + 138, sx - r.x - 10, 30, fg); G.text('KEY REPEAT RATE', r.x + 10, r.y + 142, fg);
          const kr = Math.floor(s.t * 2.2) % 4;
          for (let i = 0; i < 4; i++) { G.circ(r.x + 14 + i * 18, r.y + 158, 3, bg, fg); if (i === kr) G.circ(r.x + 14 + i * 18, r.y + 158, 1, fg, fg); }
        }
        // volumen vertical
        G.box(sx, r.y + 4, cw, r.h - 8, fg);
        const ty = r.y + 14, th = r.h - 50, tx = sx + 30;
        G.drect(tx - 7, ty - 4, 15, Math.round(th * s.tol) + 6, 6, s.acc === L ? fg : s.acc, null);
        G.rect(tx - 2, ty, 5, th, bg); G.drect(tx - 1, ty, 3, th, 8, fg, bg); G.box(tx - 2, ty, 5, th, fg);
        for (let n = 0; n <= 7; n++) { const yy = Math.round(ty + th - (n / 7) * th); G.rect(sx + 14, yy, 4, 1, fg); G.text(String(n), sx + 6, yy - 3, fg); }
        const thy = Math.round(ty + th - s.u * th);
        G.rect(tx - 7, thy - 3, 15, 7, bg); G.box(tx - 7, thy - 3, 15, 7, fg); G.rect(tx - 5, thy - 1, 11, 3, fg);
        G.text('SPEAKER', sx + cw / 2, r.y + r.h - 30, fg, { al: 'c' }); G.text('VOLUME', sx + cw / 2, r.y + r.h - 21, fg, { al: 'c' });
        G.drawSpr('i_sound', r.x + 10, r.y + r.h - 34, { '#': fg, w: bg });
        if (s.u > 0.7) for (let k = 0; k < 3; k++) if (Math.floor(s.t * 8 + k) % 3) G.rect(r.x + 30 + k * 3, r.y + r.h - 30 + k, 1, 8 - k * 2, fg);
      }
    },
  };

  // ===== 4 DEFRAG: optimizador de disco a pantalla completa (estilo DOS). Cada cluster suelto va a un hueco de la fila de su color =====
  const DFC = [ // clusters: rectángulo con punto en medio
    { lab: 'SYSTEM', fill: W, dot: B },
    { lab: 'DATA', fill: null, dot: W }, // gris tramado
    { lab: 'TEMP', fill: K, dot: W },
  ];
  const DF_SYS = ['[SYS] THE DRIVE INSISTS IT IS FINE', '[SYS] A CLUSTER WANDERED OFF', '[SYS] DO NOT TURN OFF THE PC', '[SYS] HEAT RISK: HIGH', '[SYS] CLUSTER MOVED BY ITSELF'];
  function dfCell(t, x, y, w, h) {
    const c = DFC[t];
    if (c.fill) G.rect(x, y, w, h, c.fill); else G.drect(x, y, w, h, 8, K, L);
    if (c.fill === K) G.box(x, y, w, h, L);
    G.rect(x + (w >> 1) - 1, y + (h >> 1) - 1, 2, 2, c.dot);
  }
  function dfFree(x, y, w, h) { G.drect(x, y, w, h, 3, W, B); } // sin usar: azul tramado
  function dfPanel(x, y, w, h, title) { // marco de doble línea con título centrado
    G.box(x, y, w, h, W); G.box(x + 2, y + 2, w - 4, h - 4, W);
    if (title) { const tw = G.textW(title, 1, 1, true) + 6; G.rect(Math.round(x + w / 2 - tw / 2), y - 3, tw, 8, B); G.text(title, x + w / 2, y - 3, W, { al: 'c', b: true }); }
  }
  function dfCut(txt, w) { const n = Math.floor(w / 6); return txt.length > n ? txt.slice(0, n - 3) + '...' : txt; }
  M.defrag = {
    mode: 'desk', cmd: 'SORT!', hint: 'FILL EACH ROW WITH ITS COLOR', time: 8,
    help: ['DEFRAGMENT THE DISK:', 'DRAG EACH LOOSE CLUSTER', 'INTO A GAP IN THE ROW', 'OF ITS SAME COLOR.', 'X AND B NEVER MOVE.'],
    init(s) {
      const r = s.r, d = s.d, cols = 16;
      // --- pantalla: menú, mapa del disco, leyenda/progreso, estado, logs y barra inferior ---
      s.barH = 11; s.legH = 54; s.statH = 30; s.logH = 38; s.botH = 11;
      const gap = 7; // se coloca de abajo arriba y el mapa se queda con el resto
      s.botY = r.y + r.h - s.botH; s.logY = s.botY - 5 - s.logH; s.statY = s.logY - gap - s.statH; s.legY = s.statY - gap - s.legH;
      const mapY = r.y + s.barH + 6, mapH = s.legY - gap - mapY;
      s.cols = cols; s.pw = Math.floor((r.w - 12) / cols); s.cw = s.pw - 2; s.split = 4;
      s.ph = G.clamp(Math.floor((mapH - 13 - s.split) / 8), 14, 22); s.ch = s.ph - 3;
      s.mx = Math.round(r.x + (r.w - s.pw * cols) / 2) + 1; s.my = mapY + Math.round((mapH - (s.ph * 8 + s.split - 3)) / 2);
      s.map = { x: r.x + 2, y: mapY, w: r.w - 4, h: mapH };
      // --- filas de arriba: casi llenas, cada una de un color; algunas tienen huecos ---
      const nR = d < 0.3 ? 2 : d < 0.65 ? 3 : 4; // filas por completar
      const nT = d < 0.3 ? 2 : 3; // colores en juego
      const n = Math.max(nR, 3 + Math.round(d * 5)); // clusters sueltos
      const colors = shuffle([0, 1, 2]).slice(0, nT);
      const rowCol = shuffle([0, 1, 2, 3].map((i) => colors[i % nT]));
      const order = shuffle([0, 1, 2, 3]), tg = [], seen = {};
      for (const i of order) if (!seen[rowCol[i]]) { seen[rowCol[i]] = 1; tg.push(i); }
      for (const i of order) if (tg.indexOf(i) < 0) tg.push(i);
      s.targets = tg.slice(0, nR);
      const per = s.targets.map(() => 1); for (let i = nR; i < n; i++) per[G.irand(0, nR - 1)]++;
      s.top = []; s.gaps = [];
      for (let row = 0; row < 4; row++) {
        const line = []; for (let c = 0; c < cols; c++) line.push({ k: 'f', t: rowCol[row] });
        const free = shuffle(Array.from({ length: cols }, (_, i) => i));
        const ti = s.targets.indexOf(row);
        if (ti >= 0) for (let k = 0; k < per[ti]; k++) { const c = free.pop(), p = this.pos(s, row, c); const g = { k: 'gap', t: rowCol[row], row, col: c, x: p.x, y: p.y, filled: false, pop: 0 }; line[c] = g; s.gaps.push(g); }
        for (let k = G.irand(0, 2); k > 0; k--) line[free.pop()] = { k: Math.random() < 0.6 ? 'X' : 'B', sh: 0 };
        s.top.push(line);
      }
      // --- zona de abajo: fragmentada, con los clusters sueltos y bloqueos que no se mueven ---
      s.low = new Array(cols * 4).fill(null);
      const slots = shuffle(Array.from({ length: cols * 4 }, (_, i) => i));
      s.frags = [];
      const need = shuffle(s.gaps.map((g) => g.t));
      for (const t of need) { const i = slots.pop(), p = this.lowPos(s, i); const f = { t, slot: i, x: p.x, y: p.y, w: s.cw, h: s.ch, hx: p.x, hy: p.y, gl: 0, ret: null }; s.low[i] = f; s.frags.push(f); }
      for (let k = 1 + Math.round(d * 5); k > 0; k--) s.low[slots.pop()] = { k: Math.random() < 0.55 ? 'X' : 'B', sh: 0 };
      s.n = n; s.placed = 0; s.rowFlash = [0, 0, 0, 0];
      s.frag0 = G.irand(62, 94); s.clus = G.irand(10, 99) + '.' + G.irand(100, 999); s.disks = G.irand(12, 40);
      s.insT = 1.2; s.logs = ['[DISK] C: MOUNTED', '[SYS] ANALYZING DRIVE...', '[DISK] FRAGMENTATION ' + s.frag0 + '%'];
      s.T = (3 + n * 0.9) * (1 - 0.12 * d) * (s.boss ? 1.15 : 1);
    },
    pos(s, row, c) { return { x: s.mx + c * s.pw, y: s.my + row * s.ph + (row >= 4 ? s.split : 0) }; },
    lowPos(s, i) { return this.pos(s, 4 + Math.floor(i / s.cols), i % s.cols); },
    log(s, txt) { s.logs.push(txt); if (s.logs.length > 3) s.logs.shift(); },
    cellAt(s, x, y) {
      const c = Math.floor((x - s.mx) / s.pw); if (c < 0 || c >= s.cols) return null;
      for (let row = 0; row < 8; row++) { const p = this.pos(s, row, c); if (y >= p.y - 1 && y < p.y + s.ph - 1) return { row, c }; }
      return null;
    },
    gapNear(s, f) { // hueco libre más cercano al centro del cluster arrastrado
      const cx = f.x + f.w / 2, cy = f.y + f.h / 2; let best = null, bd = 1e9;
      for (const g of s.gaps) {
        if (g.filled) continue;
        const dx = Math.abs(cx - (g.x + s.cw / 2)), dy = Math.abs(cy - (g.y + s.ch / 2));
        if (dx < s.pw * 0.95 && dy < s.ph * 0.9 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = g; }
      }
      return best;
    },
    down(s, x, y) {
      let best = null, bd = 1e9; // el cluster más cercano al dedo
      for (const f of s.frags) {
        if (f.done) continue;
        const dx = x - (f.x + f.w / 2), dy = y - (f.y + f.h / 2);
        if (Math.abs(dx) < f.w / 2 + 6 && Math.abs(dy) < f.h / 2 + 6 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = f; }
      }
      if (best) { // se levanta un poco para que el dedo no lo tape
        best.ret = null; s.drag = { o: best, dx: x - best.x, dy: y - best.y + 12 };
        best.y -= 12; s.frags.splice(s.frags.indexOf(best), 1); s.frags.push(best);
        A().sfx('pick'); return;
      }
      const hit = this.cellAt(s, x, y); if (!hit) return;
      const cell = hit.row < 4 ? s.top[hit.row][hit.c] : s.low[(hit.row - 4) * s.cols + hit.c];
      if (cell && (cell.k === 'X' || cell.k === 'B')) { cell.sh = 0.3; A().sfx('deny'); G.pulse({ glitch: 0.15 }); this.log(s, cell.k === 'B' ? '[ERR] BAD CLUSTER' : '[ERR] UNMOVABLE CLUSTER'); }
    },
    move: dragMove,
    up(s) {
      if (!s.drag) return; const f = s.drag.o; s.drag = null;
      const g = this.gapNear(s, f);
      if (g && g.t === f.t) {
        g.filled = true; g.pop = 0.35; f.done = true; s.low[f.slot] = null; s.placed++;
        A().sfx('drop'); G.pulse({ ab: 1.5 }); G.vibrate(10);
        this.log(s, '[MOVE] CLUSTER > ROW ' + (g.row + 1));
        if (s.gaps.every((q) => q.row !== g.row || q.filled)) { s.rowFlash[g.row] = 0.45; A().sfx('close', 2); this.log(s, '[DONE] ROW ' + (g.row + 1) + ' OPTIMIZED'); }
        if (s.gaps.every((q) => q.filled)) s.win();
        return;
      }
      if (g) { A().sfx('deny'); G.pulse({ glitch: 0.3, ab: 2 }); this.log(s, '[ERR] WRONG ROW FOR THIS CLUSTER'); }
      f.ret = { x0: f.x, y0: f.y, t: 0 }; // vuelve a su sitio
    },
    update(s, dt) {
      for (const f of s.frags) {
        if (f.gl) f.gl = Math.max(0, f.gl - dt);
        if (f.ret) { f.ret.t += dt; const k = Math.min(1, f.ret.t / 0.12); f.x = G.lerp(f.ret.x0, f.hx, k); f.y = G.lerp(f.ret.y0, f.hy, k); if (k >= 1) f.ret = null; }
      }
      for (const g of s.gaps) if (g.pop) g.pop = Math.max(0, g.pop - dt);
      for (let i = 0; i < 4; i++) if (s.rowFlash[i]) s.rowFlash[i] = Math.max(0, s.rowFlash[i] - dt);
      const shk = (c) => { if (c && c.sh) c.sh = Math.max(0, c.sh - dt); };
      s.top.forEach((ln) => ln.forEach(shk)); s.low.forEach(shk);
      // rondas altas: el disco mueve clusters por su cuenta
      if (s.d > 0.6) {
        s.insT -= dt;
        if (s.insT <= 0) {
          s.insT = G.rand(1.4, 2.2) * (1.3 - 0.4 * s.d);
          const c = s.frags.filter((f) => !f.done && !f.ret && (!s.drag || s.drag.o !== f));
          const free = []; s.low.forEach((v, i) => { if (!v) free.push(i); });
          if (c.length && free.length) {
            const f = G.pick(c), j = G.pick(free), p = this.lowPos(s, j);
            s.low[f.slot] = null; f.slot = j; s.low[j] = f; f.x = f.hx = p.x; f.y = f.hy = p.y; f.gl = 0.35;
            A().sfx('spawn', 1); G.pulse({ glitch: 0.25, ab: 1.5 }); this.log(s, G.pick(DF_SYS));
          }
        }
      }
    },
    drawLock(s, cell, x, y) {
      const ox = cell.sh ? Math.round(Math.sin(cell.sh * 60) * 2) : 0;
      G.text(cell.k, x + s.cw / 2 + ox + 1, y + Math.floor((s.ch - 7) / 2), cell.k === 'X' ? W : L, { al: 'c', b: cell.k === 'B' });
    },
    draw(s) {
      const r = s.r, blink = Math.floor(s.t * 6) % 2 === 0;
      G.rect(r.x, r.y, r.w, r.h, B);
      // barra de menús
      G.rect(r.x, r.y, r.w, s.barH, L);
      let mx = r.x + 5;
      for (const m of ['DISK', 'ACTION', 'VIEW']) { G.text(m[0], mx, r.y + 2, B); G.text(m.slice(1), mx + 6, r.y + 2, K); mx += G.textW(m) + 14; }
      G.text('SOUND ON', r.x + r.w - 5, r.y + 2, B, { al: 'r' });
      // mapa del disco
      dfPanel(s.map.x, s.map.y, s.map.w, s.map.h, 'DRIVE C:');
      const head = s.targets.length < 4 ? Math.floor(s.t * 9) % (4 * s.cols) : -1;
      for (let row = 0; row < 4; row++) {
        const fl = s.rowFlash[row] > 0 && Math.floor(s.rowFlash[row] * 20) % 2 === 0;
        for (let c = 0; c < s.cols; c++) {
          const cell = s.top[row][c], p = this.pos(s, row, c);
          if (cell.k === 'f') {
            if (row * s.cols + c === head && s.targets.indexOf(row) < 0) { G.rect(p.x, p.y, s.cw, s.ch, B); G.box(p.x, p.y, s.cw, s.ch, W); G.text(Math.floor(s.t * 2) % 2 ? 'W' : 'R', p.x + s.cw / 2 + 1, p.y + Math.floor((s.ch - 7) / 2), W, { al: 'c' }); }
            else dfCell(cell.t, p.x, p.y, s.cw, s.ch);
          } else if (cell.k === 'gap') {
            if (cell.filled) { dfCell(cell.t, p.x, p.y, s.cw, s.ch); if (cell.pop) G.box(p.x - 1, p.y - 1, s.cw + 2, s.ch + 2, W); }
            else { dfFree(p.x, p.y, s.cw, s.ch); if (blink) G.box(p.x, p.y, s.cw, s.ch, L); }
          } else this.drawLock(s, cell, p.x, p.y);
          if (fl) G.rect(p.x, p.y, s.cw, s.ch, W);
        }
      }
      for (let i = 0; i < s.low.length; i++) {
        const v = s.low[i], p = this.lowPos(s, i);
        if (!v || !v.k) dfFree(p.x, p.y, s.cw, s.ch); else this.drawLock(s, v, p.x, p.y);
      }
      const drag = s.drag && s.drag.o;
      for (const f of s.frags) {
        if (f.done || f === drag) continue;
        if (f.gl && Math.floor(f.gl * 30) % 2) { G.rect(f.x - 2, f.y, f.w + 4, 2, W); continue; }
        dfCell(f.t, Math.round(f.x), Math.round(f.y), f.w, f.h);
      }
      if (drag) {
        const g = this.gapNear(s, drag);
        if (g) { G.box(g.x - 2, g.y - 2, s.cw + 4, s.ch + 4, W); G.box(g.x - 1, g.y - 1, s.cw + 2, s.ch + 2, blink ? W : B); }
        const x = Math.round(drag.x), y = Math.round(drag.y);
        G.drect(x + 3, y + 3, drag.w, drag.h, 8, K, null);
        dfCell(drag.t, x, y, drag.w, drag.h); G.box(x - 1, y - 1, drag.w + 2, drag.h + 2, W);
      }
      // leyenda y progreso
      const hw = Math.floor((r.w - 10) / 2), lx = r.x + 2, px = lx + hw + 6, ly = s.legY;
      dfPanel(lx, ly, hw, s.legH, 'LEGEND');
      DFC.forEach((c, i) => { dfCell(i, lx + 7, ly + 6 + i * 9, 6, 8); G.text('- ' + c.lab, lx + 16, ly + 7 + i * 9, W); });
      dfFree(lx + 7, ly + 33, 6, 8); G.text('- UNUSED', lx + 16, ly + 34, W);
      G.text('X', lx + 8, ly + 43, W); G.text('B', lx + 50, ly + 43, L, { b: true }); G.text('LOCK', lx + 16, ly + 43, L); G.text('BAD', lx + 58, ly + 43, L);
      dfPanel(px, ly, r.x + r.w - 2 - px, s.legH, 'PROGRESS');
      const rowsOk = s.targets.filter((row) => s.gaps.every((q) => q.row !== row || q.filled)).length;
      const fr = Math.round(s.frag0 * (1 - s.placed / s.n));
      [['ROWS:', rowsOk + '/' + s.targets.length], ['MOVED:', s.placed + '/' + s.n], ['FRAG:', fr + '%'], ['DISKS:', '' + s.disks]].forEach(([a, b], i) => { G.text(a, px + 7, ly + 7 + i * 10, L); G.text(b, r.x + r.w - 10, ly + 7 + i * 10, W, { al: 'r', b: true }); });
      // estado del disco
      const sy = s.statY, prog = s.placed / s.n;
      dfPanel(r.x + 2, sy, r.w - 4, s.statH, 'DISK STATUS');
      G.text('CLUSTER ' + s.clus, r.x + 9, sy + 6, L); G.text(Math.round(prog * 100) + '%', r.x + r.w - 9, sy + 6, W, { al: 'r', b: true });
      const segs = 18, bx = r.x + 9, bw = r.w - 18, sw = Math.floor(bw / segs);
      for (let i = 0; i < segs; i++) { const x = bx + i * sw; if (i < Math.round(prog * segs)) G.rect(x, sy + 17, sw - 2, 7, L); else dfFree(x, sy + 17, sw - 2, 7); }
      // logs
      const gy = s.logY;
      dfPanel(r.x + 2, gy, r.w - 4, s.logH, 'LOGS');
      s.logs.forEach((t, i) => G.text(dfCut(t, r.w - 18), r.x + 9, gy + 6 + i * 10, i === s.logs.length - 1 ? W : L));
      // barra inferior
      G.rect(r.x, s.botY, r.w, s.botH, L);
      G.text('F1=HELP', r.x + 5, s.botY + 2, K); G.text('EXIT', r.x + r.w - 5, s.botY + 2, K, { al: 'r' });
    },
  };

  // ===== 5 CAPTCHA: ventana flotante con fotos =====
  M.captcha = {
    mode: 'float', tilt: 5, cmd: 'VERIFY!', hint: 'SELECT ALL MATCHES', time: 7,
    help: ['PROVE YOU ARE HUMAN:', 'TAP EVERY PHOTO THAT', 'MATCHES THE WORD.', 'ONE WRONG TAP = ROBOT.'],
    float(aw, ah) { const w = aw - 12; return { w, h: Math.min(ah - 30, Math.round(w * 1.32)), title: 'CAPTCHA' }; },
    init(s) {
      const tg = G.pick(G.CAPTCHA_SET); s.tg = tg[0]; s.word = tg[1]; s.hint = 'SELECT ALL ' + tg[1];
      s.g = s.d >= 0.55 ? 4 : 3; const nc = s.g * s.g; // rejilla 4x4 en las rondas altas
      const m = s.g === 3 ? 2 + Math.round(s.d * 2) : 3 + Math.round(((s.d - 0.55) / 0.45) * 2);
      const others = shuffle(G.CAPTCHA_SET.filter((c) => c[0] !== s.tg).map((c) => c[0])); // sin repetir mientras se pueda
      const ramps = G.camRamps(s.block);
      const r = s.r, size = Math.floor(Math.min(r.w - 8, r.h - 40 - 30) / s.g);
      s.gs = size; s.gx = Math.round(r.x + r.w / 2 - (size * s.g) / 2); s.gy = r.y + 42;
      s.cells = shuffle(Array.from({ length: nc }, (_, i) => (i < m ? s.tg : others[(i - m) % others.length])))
        .map((p) => { const c = { p, v: G.irand(1, 99999), ramp: G.pick(ramps), sel: false }; c.pic = G.camPhoto(p, c.v, c.ramp, size - 2); return c; });
      s.need = m; s.got = 0;
      s.T = (3.2 + m * 0.5 + (s.g === 4 ? 0.6 : 0)) * (1 - 0.22 * s.d) * (s.boss ? 1.15 : 1);
    },
    tap(s, x, y) {
      const cx = Math.floor((x - s.gx) / s.gs), cy = Math.floor((y - s.gy) / s.gs);
      if (cx < 0 || cy < 0 || cx >= s.g || cy >= s.g) return;
      const c = s.cells[cy * s.g + cx]; if (c.sel) return;
      if (c.p === s.tg) { c.sel = true; s.got++; A().sfx('pick'); G.pulse({ ab: 1 }); if (s.got >= s.need) s.win(); }
      else { c.bad = true; s.fail('NOT HUMAN'); }
    },
    draw(s) {
      const r = s.r, st = s.st;
      G.rect(r.x + 2, r.y + 2, r.w - 4, 36, B);
      G.text('SELECT ALL IMAGES WITH', r.x + 7, r.y + 6, W);
      const big = s.word.length <= 11;
      G.text(s.word, r.x + 7, r.y + 17, W, { s: big ? 2 : 1, b: true });
      if (Math.floor(s.t * 3) % 2 && !big) G.rect(r.x + 7 + G.textW(s.word, 1, 1, true) + 2, r.y + 17, 4, 7, W);
      s.cells.forEach((c, i) => {
        const x = s.gx + (i % s.g) * s.gs, y = s.gy + Math.floor(i / s.g) * s.gs, g = s.gs;
        const ins = c.sel ? 6 : 1, pw = g - ins * 2, px = x + ins, py = y + ins;
        G.rect(x, y, g, g, st.bd);
        G.ctx().drawImage(c.pic, px, py, pw, pw);
        if (c.bad) { G.drect(px, py, pw, pw, 8, K, null); }
        G.box(x, y, g, g, st.bd);
        if (c.sel) { G.circ(x + 8, y + 8, 6, B, W); G.text('✓', x + 6, y + 5, W); }
      });
      const fy = s.gy + s.gs * s.g + 6;
      G.rect(r.x + 2, fy, r.w - 4, 1, st.tx);
      G.circ(r.x + 12, fy + 12, 5, null, st.tx); G.rect(r.x + 14, fy + 6, 3, 2, st.tx);
      G.rect(r.x + 24, fy + 8, 8, 8, st.tx); G.rect(r.x + 26, fy + 10, 4, 4, st.bd);
      const bx = r.x + r.w - 56;
      G.rect(bx, fy + 5, 50, 15, B); G.text('VERIFY', bx + 25, fy + 9, W, { al: 'c', b: true });
    },
  };

  // ===== 6 DEBUG!: el virus se esconde detrás de las ventanas =====
  M.debug = {
    mode: 'desk', cmd: 'DEBUG!', hint: 'TAP THE BUG', time: 7,
    help: ['A BUG IS HIDING BEHIND', 'THE WINDOWS. TAP IT', 'WHEN IT SHOWS UP.', 'TILT TO MOVE WINDOWS:', 'SOME GO THE OTHER WAY.'],
    init(s) {
      const r = s.r; s.wins = [];
      // las mismas ventanas del CLOSE.ALL, con los colores del nivel
      const nw = 4 + Math.round(s.d * 2), types = shuffle(['error', 'warn', 'big', 'loading', 'smiley', 'pics', 'login', 'fix', 'error', 'warn']);
      const dirs = shuffle(Array.from({ length: nw }, (_, i) => (i % 2 ? 1 : -1))); // con el giroscopio, la mitad se mueve al revés
      for (let i = 0; i < nw; i++) {
        const w = S.makeWin(types[i % types.length]);
        w.bx = G.rand(r.x + 2, r.x + r.w - w.w - 2); w.by = r.y + 2 + (r.h - w.h - 4) * ((i + Math.random()) / nw); // una por franja: tapan toda la pantalla
        w.pf = dirs[i] * G.rand(0.7, 1.4); w.ph = Math.random() * 6;
        if (w.type === 'loading') w.prog = Math.random();
        s.wins.push(w);
      }
      shuffle(s.wins);
      s.need = 1 + (s.d > 0.45 ? 1 : 0) + (s.d > 0.85 ? 1 : 0); s.got = 0; s.splats = [];
      s.T = (3.6 + s.need * 1.8) * (1 - 0.15 * s.d) * (s.boss ? 1.2 : 1);
      this.newBug(s);
    },
    wpos(s, w) {
      const dr = s.d > 0.3 ? s.d * 12 : 0;
      return { x: w.bx + G.tilt.x * 34 * w.pf + Math.sin(s.t * 0.9 + w.ph) * dr, y: w.by + G.tilt.y * 34 * w.pf + Math.cos(s.t * 0.7 + w.ph) * dr * 0.6, w: w.w, h: w.h };
    },
    covered(s, x, y) { return s.wins.some((w) => G.inR(x, y, this.wpos(s, w))); },
    spot(s, hide, from) {
      const r = s.r, near = (x, y) => !from || Math.hypot(x - from.x, y - from.y) < 150;
      if (hide) { // detrás de una de las ventanas cercanas
        const ws = s.wins.map((w) => this.wpos(s, w)).filter((p) => near(p.x + p.w / 2 - 13, p.y + p.h / 2 - 11));
        const p = ws.length ? G.pick(ws) : this.wpos(s, G.pick(s.wins)); return { x: p.x + p.w / 2 - 13, y: p.y + p.h / 2 - 11 };
      }
      for (let k = 0; k < 80; k++) { // un sitio cercano donde se vea entero
        const x = G.rand(r.x + 6, r.x + r.w - 32), y = G.rand(r.y + 6, r.y + r.h - 28);
        if ((k < 50 && !near(x, y)) || this.covered(s, x + 13, y + 11)) continue;
        if (!this.covered(s, x + 2, y + 2) && !this.covered(s, x + 24, y + 2) && !this.covered(s, x + 2, y + 20) && !this.covered(s, x + 24, y + 20)) return { x, y };
      }
      for (let k = 0; k < 30; k++) { const x = G.rand(r.x + 6, r.x + r.w - 32), y = G.rand(r.y + 6, r.y + r.h - 28); if (!this.covered(s, x + 13, y + 11)) return { x, y }; }
      return { x: G.rand(r.x + 6, r.x + r.w - 32), y: G.rand(r.y + 6, r.y + r.h - 28) };
    },
    newBug(s) { const p = this.spot(s, true); s.bug = { x: p.x, y: p.y, state: 'hide', tm: G.rand(0.4, 0.9), tx: p.x, ty: p.y }; },
    update(s, dt) {
      for (const w of s.wins) if (w.type === 'loading') w.prog = (w.prog + w.rate * dt) % 1;
      const b = s.bug; if (!b) return;
      const sp = 100 + 90 * s.d; // más rápido que antes
      b.tm -= dt;
      if (b.state === 'run') {
        const dx = b.tx - b.x, dy = b.ty - b.y, dd = Math.hypot(dx, dy);
        if (dd < 3) { b.state = b.peek ? 'peek' : 'hide'; b.tm = b.peek ? G.rand(0.5, 0.85) * (1 - 0.25 * s.d) : G.rand(0.3, 0.7) * (1 - 0.3 * s.d); }
        else { b.x += (dx / dd) * sp * dt; b.y += (dy / dd) * sp * dt; }
      } else if (b.tm <= 0) {
        b.peek = Math.random() < 0.55; const p = this.spot(s, !b.peek, b); b.tx = p.x; b.ty = p.y; b.state = 'run';
      }
    },
    tap(s, x, y) {
      const b = s.bug; if (!b) return;
      if (G.inR(x, y, { x: b.x, y: b.y, w: 26, h: 22 }, 7) && !this.covered(s, x, y)) {
        s.splats.push({ x: b.x, y: b.y }); s.got++; A().sfx('hit'); G.pulse({ ab: 3, shake: 3 }); G.vibrate(25);
        if (s.got >= s.need) { s.bug = null; s.win(); } else this.newBug(s);
      } else if (this.covered(s, x, y)) { A().sfx('deny'); }
    },
    draw(s) {
      const r = s.r;
      G.drawDesktopIcons(s.block, r.y + 2);
      for (const p of s.splats) G.drawSpr('splat', p.x, p.y, { '#': s.block >= 2 ? Gr : W }, 2);
      const b = s.bug;
      if (b) G.drawSpr(Math.floor(s.t * 12) % 2 ? 'bug' : 'bug2', Math.round(b.x), Math.round(b.y), { '#': K, g: s.block >= 2 ? Gr : W }, 2);
      for (const w of s.wins) { const p = this.wpos(s, w); w.x = p.x; w.y = p.y; S.drawWin(w); }
      G.text('BUGS ' + s.got + '/' + s.need, r.x + r.w - 4, r.y + r.h - 9, W, { al: 'r', b: true });
    },
  };

  // ===== 7 SPOT.DIFF: dos capturas de escritorio casi iguales =====
  M.spot = {
    cmd: 'SPOT!', hint: 'TAP THE DIFFERENCE', time: 8,
    help: ['TWO SCREENSHOTS, ONE', 'DIFFERENCE. TAP WHAT', 'CHANGED IN EITHER ONE.', 'TWO MISSES = ERROR.'],
    init(s) {
      const r = s.r, ph = Math.floor((r.h - 14) / 2);
      s.pA = { x: r.x + 4, y: r.y + 12, w: r.w - 8, h: ph - 14 }; s.pB = { x: r.x + 4, y: r.y + ph + 16, w: r.w - 8, h: ph - 14 };
      const pw = s.pA.w, phh = s.pA.h;
      s.pat = G.irand(2, 6); s.objs = [];
      const zone = { x: 2, y: 2, w: pw - 4, h: phh - 16 };
      const nw = 2, kinds = shuffle(G.MINI_KINDS.slice());
      for (let i = 0; i < nw; i++) { const w = G.irand(64, Math.min(92, pw - 40)), h = G.irand(42, Math.min(58, phh - 26)); const p = place(s.objs, zone, w, h, 2); s.objs.push({ t: 'win', x: p.x, y: p.y, w, h, kind: kinds[i], seed: Math.random(), st: G.randStyle(s.block) }); }
      const icons = shuffle(G.TRASH_ICONS.slice());
      for (let i = 0; i < 3; i++) { const p = place(s.objs, zone, 32, 40, 2); s.objs.push({ t: 'icon', x: p.x, y: p.y, w: 32, h: 40, ic: icons[i] }); }
      s.objs.push({ t: 'cursor', x: G.irand(20, pw - 30), y: G.irand(10, phh - 34), w: 8, h: 12 });
      s.objs.push({ t: 'clock', x: pw - 34, y: phh - 11, w: 32, h: 9, hh: G.irand(1, 12), mm: G.irand(10, 59) });
      // la diferencia
      const pool = s.objs.map((o, i) => i).filter((i) => s.d >= 0.45 || s.objs[i].t !== 'clock');
      s.diff = G.pick(pool); const o = s.objs[s.diff]; s.alt = Object.assign({}, o);
      if (o.t === 'win') {
        if (s.d < 0.4) s.alt.kind = G.pick(G.MINI_KINDS.filter((k) => k !== o.kind));
        else if (s.d < 0.75) { const opts = Object.values(G.WSTYLES).filter((x) => x.bar !== o.st.bar); s.alt.st = G.pick(opts); }
        else s.alt.seed = o.seed + 0.37;
      }
      else if (o.t === 'icon') { if (s.d < 0.3) s.alt.hidden = true; else s.alt.ic = G.pick(G.TRASH_ICONS.filter((k) => k !== o.ic)); }
      else if (o.t === 'cursor') { s.alt.x = G.clamp(o.x + G.pick([-26, 26]), 4, pw - 12); s.alt.y = G.clamp(o.y + G.pick([-18, 18]), 4, phh - 24); }
      else s.alt.mm = (o.mm + 17) % 60;
      s.mist = 0; s.tfix = Math.random() * 10;
    },
    hitObj(s, p, x, y) {
      const rx = x - p.x, ry = y - p.y, o = s.objs[s.diff], a = s.alt;
      return G.inR(rx, ry, o, 6) || G.inR(rx, ry, a, 6);
    },
    tap(s, x, y) {
      const p = G.inR(x, y, s.pA) ? s.pA : G.inR(x, y, s.pB) ? s.pB : null; if (!p) return;
      if (this.hitObj(s, p, x, y)) s.win();
      else { s.mist++; s.shk = 0.25; A().sfx('deny'); G.pulse({ glitch: 0.3, ab: 2 }); if (s.mist > 1) s.fail('WRONG SPOT'); }
    },
    update(s, dt) { if (s.shk) s.shk = Math.max(0, s.shk - dt); },
    drawObj(s, o, px, py) {
      const st = s.st;
      if (o.t === 'win') G.miniWin(px + o.x, py + o.y, o.w, o.h, o.kind, s.tfix + s.t, o.st, o.seed);
      else if (o.t === 'icon') { if (o.hidden) return; G.drawIcon16(o.ic, px + o.x, py + o.y, 2, K, W, s.acc2); const lab = G.ICON_LABEL[o.ic]; G.rect(px + o.x + 16 - (G.textW(lab) + 2) / 2, py + o.y + 32, G.textW(lab) + 2, 8, W); G.text(lab, px + o.x + 16, py + o.y + 33, K, { al: 'c' }); }
      else if (o.t === 'cursor') G.drawSpr('cursor', px + o.x, py + o.y, { '#': K, w: W });
      else { G.text(String(o.hh).padStart(2, '0') + ':' + String(o.mm).padStart(2, '0'), px + o.x + 1, py + o.y + 1, W); }
    },
    draw(s) {
      const st = s.st;
      [[s.pA, 'A.PNG', false], [s.pB, 'B.PNG', true]].forEach(([p, lab, alt]) => {
        const ox = s.shk ? G.irand(-2, 2) : 0, px = p.x + ox, py = p.y;
        G.rect(px, py - 10, 40, 10, st.tx); G.text(lab, px + 3, py - 9, st.bd);
        const T = G.ctx(); T.save(); T.beginPath(); T.rect(px, py, p.w, p.h); T.clip();
        G.drect(px, py, p.w, p.h, s.pat, s.acc === L ? K : s.acc, s.block >= 2 ? B : L);
        G.rect(px, py + p.h - 12, p.w, 12, K); G.rect(px, py + p.h - 12, p.w, 1, W);
        G.rect(px + 2, py + p.h - 10, 33, 8, W); G.text('START', px + 4, py + p.h - 10, K);
        s.objs.forEach((o, i) => this.drawObj(s, alt && i === s.diff ? s.alt : o, px, py));
        T.restore();
        G.box(px, py, p.w, p.h, st.tx);
      });
      G.text('MISS ' + s.mist + '/1', s.r.x + s.r.w - 6, s.r.y + 1, st.tx, { al: 'r' });
    },
  };

  // ===== 8 CURSOR: laberinto hecho con las ventanas del CLOSE.ALL; guía el cursor sin tocarlas =====
  const CUR_BIG = ['error', 'warn', 'big', 'pics', 'smiley', 'loading', 'login', 'fix'];
  M.cursor = {
    mode: 'desk', cmd: 'GUIDE!', hint: 'CURSOR TO THE EXIT', time: 8,
    help: ['SLIDE YOUR FINGER TO', 'GUIDE THE CURSOR TO', 'THE EXIT FOLDER.', "DON'T TOUCH ANY WINDOW."],
    init(s) {
      for (let k = 0; k < 12; k++) if (this.build(s)) break;
      s.cur = { x: s.S.x, y: s.S.y }; s.last = null;
    },
    // laberinto perfecto sobre una rejilla (backtracker: pasillos largos y retorcidos)
    maze(cols, rows) {
      const n = cols * rows, seen = new Uint8Array(n), st = [0], ed = []; seen[0] = 1;
      while (st.length) {
        const c = st[st.length - 1], x = c % cols, y = (c / cols) | 0;
        const nb = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rows && !seen[a + b * cols]);
        if (!nb.length) { st.pop(); continue; }
        const [a, b] = G.pick(nb), q = a + b * cols; seen[q] = 1; ed.push([c, q]); st.push(q);
      }
      return ed;
    },
    solve(ed, n) {
      const adj = Array.from({ length: n }, () => []); ed.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
      const prev = new Int16Array(n).fill(-1), q = [0]; prev[0] = 0;
      while (q.length) { const c = q.shift(); for (const o of adj[c]) if (prev[o] < 0) { prev[o] = c; q.push(o); } }
      const p = []; for (let c = n - 1; c !== 0; c = prev[c]) p.push(c); p.push(0); return p.reverse();
    },
    build(s) {
      const r = s.r, d = s.d;
      const cols = d < 0.35 ? 3 : 4, rows = d < 0.35 ? 5 : d < 0.7 ? 6 : 7, n = cols * rows;
      const hw = Math.round(12 - 5 * d); // medio ancho del pasillo: cada vez más estrecho
      // 1) el camino de la entrada a la salida, de la longitud buscada
      const want = Math.round((cols + rows - 2) * (1.05 + 0.3 * d));
      let best = null;
      for (let a = 0; a < 40; a++) {
        const m = this.maze(cols, rows), p = this.solve(m, n), e = Math.abs(p.length - 1 - want);
        if (!best || e < best.e) best = { m, p, e };
        if (e <= 1) break;
      }
      // 2) posiciones en pantalla (columnas y filas con un poco de desorden, a veces en espejo)
      const flip = Math.random() < 0.5, mg = 9, cw = (r.w - mg * 2) / cols, ch = (r.h - mg * 2) / rows;
      const colX = Array.from({ length: cols }, (_, i) => r.x + mg + cw * (i + 0.5) + G.rand(-0.12, 0.12) * cw);
      const rowY = Array.from({ length: rows }, (_, j) => r.y + mg + ch * (j + 0.5) + G.rand(-0.12, 0.12) * ch);
      const P = (c) => ({ x: Math.round(colX[flip ? cols - 1 - (c % cols) : c % cols]), y: Math.round(rowY[(c / cols) | 0]) });
      // 3) pasillos: el camino bueno + callejones sin salida
      const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a), on = new Set(), nodes = new Set(best.p);
      for (let i = 0; i < best.p.length - 1; i++) on.add(key(best.p[i], best.p[i + 1]));
      const keep = best.m.filter(([a, b]) => on.has(key(a, b)));
      for (let pass = 0; pass < 2; pass++) for (const [a, b] of shuffle(best.m.slice())) {
        if (on.has(key(a, b)) || (nodes.has(a) === nodes.has(b))) continue;
        if (Math.random() < 0.3 + 0.35 * d) { on.add(key(a, b)); keep.push([a, b]); nodes.add(a); nodes.add(b); }
      }
      const hall = (A, B) => ({ x: Math.min(A.x, B.x) - hw, y: Math.min(A.y, B.y) - hw, w: Math.abs(A.x - B.x) + hw * 2, h: Math.abs(A.y - B.y) + hw * 2 });
      const halls = keep.map(([a, b]) => hall(P(a), P(b)));
      s.S = P(best.p[0]); const e = P(best.p[best.p.length - 1]); s.E = { x: e.x - 15, y: e.y - 15, w: 30, h: 30 };
      const ban = halls.concat([{ x: s.S.x - 14, y: s.S.y - 12, w: 28, h: 24 }, { x: s.E.x - 4, y: s.E.y - 4, w: 38, h: 38 }]);
      const hits = (q) => ban.some((b) => q.x < b.x + b.w && q.x + q.w > b.x && q.y < b.y + b.h && q.y + q.h > b.y);
      // 4) paredes: ventanas del CLOSE.ALL en todo lo que no es pasillo
      const wins = [], inWin = (x, y) => wins.some((w) => x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h);
      const pts = []; for (let y = r.y + 3; y < r.y + r.h; y += 11) for (let x = r.x + 3; x < r.x + r.w; x += 11) pts.push([x + G.rand(-3, 3), y + G.rand(-3, 3)]);
      const sized = (type, w, h) => { // ventana de mensaje a medida (recoloca texto y botón)
        const o = S.makeWin(type); o.w = w; o.h = h;
        if (type === 'error' || type === 'warn') { o.lines = G.wrap(G.pick(S.theme().msgs), w - 26).slice(0, h >= 54 ? 2 : 1); o.btns = h >= 46 ? [{ lbl: 'OK', x: Math.floor(w / 2 - 20), y: h - 18, w: 40, h: 13, act: 'close' }] : []; }
        else if (type === 'blank' || (type === 'mini' && (w < 42 || h < 30))) { o.type = 'blank'; if (w < 40) o.title = ''; }
        return o;
      };
      const tryAt = (px, py, mk, n) => {
        for (let t = 0; t < n; t++) {
          const o = mk(); o.x = Math.round(px - G.rand(3, o.w - 3)); o.y = Math.round(py - G.rand(3, o.h - 3));
          if (o.x + o.w < r.x + 2 || o.y + o.h < r.y + 2 || o.x > r.x + r.w - 2 || o.y > r.y + r.h - 2 || hits(o)) continue;
          if (o.type === 'loading') o.prog = Math.random();
          wins.push(o); return true;
        }
        return false;
      };
      const free = (px, py) => !inWin(px, py) && !hits({ x: px - 1, y: py - 1, w: 2, h: 2 });
      // primero ventanas grandes; luego medianas y pequeñas tapando todos los huecos
      for (const [px, py] of shuffle(pts.slice())) if (wins.length < 30 && free(px, py)) tryAt(px, py, () => S.makeWin(G.pick(CUR_BIG)), 6);
      for (const [px, py] of shuffle(pts)) {
        if (wins.length >= 70 || !free(px, py)) continue;
        if (!tryAt(px, py, () => sized(G.pick(['error', 'warn', 'mini']), G.irand(62, 104), G.irand(40, 58)), 5)) tryAt(px, py, () => sized('blank', G.irand(22, 58), G.irand(19, 32)), 8);
      }
      // 5) en las rondas altas, ventanas que se deslizan y cortan el pasillo
      s.gates = [];
      const ng = d > 0.8 ? 2 : d > 0.55 ? 1 : 0, segs = shuffle(Array.from({ length: Math.max(0, best.p.length - 3) }, (_, i) => i + 1));
      for (let k = 0; k < ng && k < segs.length; k++) {
        // pistón: sale de un lado, corta el pasillo y vuelve (abierto algo más de la mitad del tiempo)
        const A = P(best.p[segs[k]]), B = P(best.p[segs[k] + 1]), g = S.makeWin('mini'), side = Math.random() < 0.5; g.type = 'blank'; g.title = '';
        if (A.y === B.y) { g.w = 26; g.h = 22; g.x = Math.round((A.x + B.x) / 2 - 13); g.a = side ? A.y - hw - g.h - 2 : A.y + hw + 2; g.b = A.y - g.h / 2; g.ax = 'y'; g.zone = { x: g.x, y: A.y - hw, w: g.w, h: hw * 2 }; }
        else { g.w = 22; g.h = 26; g.y = Math.round((A.y + B.y) / 2 - 13); g.a = side ? A.x - hw - g.w - 2 : A.x + hw + 2; g.b = A.x - g.w / 2; g.ax = 'x'; g.zone = { x: A.x - hw, y: g.y, w: hw * 2, h: g.h }; }
        g.per = G.rand(2.0, 2.6); g.ph = Math.random(); this.slide(g, 0); s.gates.push(g);
      }
      s.wins = wins;
      let L = 0; for (let i = 0; i < best.p.length - 1; i++) { const A = P(best.p[i]), B = P(best.p[i + 1]); L += Math.abs(A.x - B.x) + Math.abs(A.y - B.y); }
      s.L = L; s.pathPts = best.p.map(P); s.hw = hw;
      // tiempo según lo largo del recorrido
      s.T = (1.8 + L / 90) * (1 - 0.05 * d) * (s.boss ? 1.1 : 1) + s.gates.length * 0.7;
      return this.pathOk(s, wins, 1);
    },
    slide(g, t) {
      const u = (((t / g.per + g.ph) % 1) + 1) % 1, k = u < 0.55 ? 0 : Math.sin((Math.PI * (u - 0.55)) / 0.45);
      g.u = u; g.k = k; g[g.ax] = Math.round(g.a + (g.b - g.a) * k);
    },
    hitAt(s, x, y) { return s.wins.some((w) => G.inR(x, y, w, 1)) || s.gates.some((w) => G.inR(x, y, w, 1)); },
    update(s, dt) {
      for (const w of s.wins) if (w.type === 'loading') w.prog = (w.prog + w.rate * dt) % 1;
      for (const g of s.gates) this.slide(g, s.t);
      if (s.gates.some((g) => G.inR(s.cur.x, s.cur.y, g, 1))) { s.fail('CRASHED'); G.pulse({ glitch: 0.6 }); }
    },
    pathOk(s, wins, c) {
      const r = s.r, cs = 3, cw = Math.ceil(r.w / cs), ch = Math.ceil(r.h / cs), seen = new Uint8Array(cw * ch);
      const free = (gx, gy) => { const x = r.x + gx * cs + 1, y = r.y + gy * cs + 1; return !wins.some((w) => x > w.x - c && x < w.x + w.w + c && y > w.y - c && y < w.y + w.h + c); };
      const sx = Math.floor((s.S.x - r.x) / cs), sy = Math.floor((s.S.y - r.y) / cs);
      const ex = Math.floor((s.E.x + 15 - r.x) / cs), ey = Math.floor((s.E.y + 15 - r.y) / cs);
      const q = [sx + sy * cw]; seen[sx + sy * cw] = 1;
      while (q.length) {
        const i = q.shift(), x = i % cw, y = Math.floor(i / cw);
        if (Math.abs(x - ex) <= 2 && Math.abs(y - ey) <= 2) return true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ni = nx + ny * cw; if (nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ni] && free(nx, ny)) { seen[ni] = 1; q.push(ni); } }
      }
      return false;
    },
    down(s, x, y) { s.last = { x, y }; },
    move(s, x, y) {
      if (!s.last || s.done) return;
      const dx = x - s.last.x, dy = y - s.last.y, r = s.r; s.last = { x, y };
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
      for (let k = 0; k < n; k++) {
        s.cur.x = G.clamp(s.cur.x + dx / n, r.x + 1, r.x + r.w - 2); s.cur.y = G.clamp(s.cur.y + dy / n, r.y + 1, r.y + r.h - 2);
        if (this.hitAt(s, s.cur.x, s.cur.y)) { s.fail('CRASHED'); G.pulse({ glitch: 0.6 }); return; }
        if (G.inR(s.cur.x, s.cur.y, s.E, 4)) { s.win(); return; }
      }
    },
    up(s) { s.last = null; },
    draw(s) {
      const r = s.r, e = s.E;
      G.rect(r.x, r.y, r.w, r.h, K); G.drect(r.x, r.y, r.w, r.h, 1, s.block >= 2 ? Gr : B, null); // fondo negro: los pasillos se leen bien
      for (const w of s.wins) S.drawWin(w);
      for (const g of s.gates) S.drawWin(g);
      G.drawSpr('computer', s.S.x - 6, s.S.y - 4, { '#': K, w: W, b: s.acc2 });
      const on = Math.floor(s.t * 4) % 2;
      G.drawSpr('folder', e.x + 1, e.y + 2, { '#': K, w: on ? s.acc2 : W }, 2);
      G.rect(e.x + 2, e.y + 24, 26, 8, K); G.text('EXIT', e.x + 15, e.y + 25, W, { al: 'c' });
      G.drawSpr('cursor', Math.round(s.cur.x), Math.round(s.cur.y), { '#': K, w: W });
    },
  };

  // ===== 9 FORCEQUIT: la ventana escupe unos TERMS AND CONDITIONS; baja hasta el final y machaca AGREE =====
  const TOS = ['YOU AGREE TO AGREE.', 'NEO OS MAY READ YOUR DREAMS FOR QUALITY PURPOSES.', 'YOUR DATA IS SAFE WITH US AND OUR 9,999 PARTNERS.',
    'SLEEP IS NOT INCLUDED IN THIS LICENSE.', 'THE COMPUTER IS ALWAYS RIGHT.', 'YOU WAIVE THE RIGHT TO LOG OFF.', 'NOTIFICATIONS CANNOT BE TURNED OFF. EVER.',
    'ANY FEAR OF THE COMPUTER WILL BE LOGGED.', 'YOUR SOUL IS CACHED FOR FASTER LOADING.', 'THESE TERMS MAY CHANGE WHILE YOU READ THEM.',
    'BY SCROLLING YOU ACCEPT CLAUSE 47.', 'THE USER IS THE PRODUCT.', 'UPDATES WILL INSTALL AT THE WORST POSSIBLE MOMENT.', 'NO ONE HAS EVER READ THIS FAR.',
    'COOKIES ARE NOT REAL COOKIES.', 'YOU ARE NOT A ROBOT. PROBABLY.', 'DELETING YOUR ACCOUNT IS A MYTH.', 'THE BATTERY WILL DIE AT 14%.',
    'WHEREAS THE PARTY OF THE FIRST PART (YOU) SHALL HEREBY WAIVE ALL RIGHTS, PAST, PRESENT AND FUTURE, INCLUDING THE RIGHT TO SCROLL BACK UP.',
    'THE LICENSOR GRANTS YOU A NON-EXCLUSIVE, REVOCABLE, VERY TEMPORARY LICENSE TO EXIST WHILE THE SCREEN IS ON.'];
  const TOS_ICONS = [['picture', 'ME.JPG'], ['palette', 'ART.PNG'], ['doc', 'TOS.PDF'], ['printer', 'PRINT']];
  M.forcequit = {
    mode: 'desk', cmd: 'AGREE!', hint: 'SCROLL DOWN, THEN MASH AGREE', time: 7,
    help: ['SCROLL THE TERMS DOWN', 'AS FAST AS YOU CAN,', 'THEN MASH AGREE UNTIL', 'THE BAR IS FULL.'],
    init(s) {
      const r = s.r, d = s.d;
      s.win0 = { x: r.x + 14, y: r.y + 8, w: r.w - 28, h: 196 };
      const px = s.win0.x + 22, py = s.win0.y + 92;
      s.pap = { x: px, y: py, w: r.x + r.w - 5 - px, h: r.y + r.h - 6 - py };
      s.view = { x: px + 17, y: py + 6, w: s.pap.w - 17 - 13, h: s.pap.h - 12 };
      // el documento: cada vez más largo
      const lines = [{ t: 'TERMS AND CONDITIONS', b: true }, { t: 'NEO OS 98  -  PAGE 1/999' }, { t: '' }];
      const target = s.view.h + 380 + d * 950, pool = shuffle(TOS.slice());
      for (let n = 1; lines.length * 9 < target - 60; n++) { G.wrap(n + '. ' + pool[(n - 1) % pool.length], s.view.w).forEach((t) => lines.push({ t })); lines.push({ t: '' }); }
      lines.push({ t: 'BY TAPPING AGREE YOU', b: true }, { t: 'ACCEPT ALL OF THE ABOVE.', b: true }, { t: '' });
      s.lines = lines; s.agY = lines.length * 9 + 2; s.docH = s.agY + 48;
      s.max = Math.max(40, s.docH - s.view.h); s.scroll = 0; s.vel = 0; s.drag = null; s.locked = false;
      s.roll = d > 0.5 ? (d - 0.5) * 220 : 0; // en las rondas altas el papel se enrolla si paras
      s.fill = 0; s.tapV = 0.11 - 0.03 * d; s.decay = 0.08 + 0.14 * d; s.clicks = [];
      s.T = (1.9 + s.max / 520 + 1 / s.tapV / 7) * (s.boss ? 1.12 : 1);
    },
    off(s) { return { x: Math.round(G.tilt.x * 5 + Math.sin(s.t * 1.3) * 1.5), y: Math.round(G.tilt.y * 5 + Math.cos(s.t * 1.1) * 1.5) }; },
    agree(s) { const v = s.view, w = 92; return { x: Math.round(v.x + v.w / 2 - w / 2), y: Math.round(v.y + s.agY - s.scroll), w, h: 18 }; },
    down(s, x, y) {
      const o = this.off(s); x -= o.x; y -= o.y;
      if (!s.locked) { s.drag = { y, t: s.t }; s.vel = 0; } // se puede deslizar desde cualquier parte
    },
    move(s, x, y) {
      if (!s.drag || s.locked) return;
      y -= this.off(s).y;
      const dy = s.drag.y - y, dtt = Math.max(1 / 60, s.t - s.drag.t);
      s.scroll += dy; s.vel = s.vel * 0.4 + (dy / dtt) * 0.6; s.drag = { y, t: s.t };
      this.clampScroll(s);
    },
    up(s) { if (s.drag) { s.drag = null; s.vel = G.clamp(s.vel, -1500, 1500); } },
    clampScroll(s) {
      if (s.scroll <= 0) { s.scroll = 0; s.vel = Math.max(0, s.vel); }
      if (s.scroll >= s.max) { s.scroll = s.max; s.vel = 0; if (!s.locked) { s.locked = true; s.drag = null; A().sfx('pick'); G.pulse({ ab: 2 }); } }
    },
    update(s, dt) {
      if (!s.locked && !s.drag) {
        s.scroll += s.vel * dt; s.vel *= Math.exp(-5 * dt);
        if (Math.abs(s.vel) < 60 && s.roll) s.scroll -= s.roll * dt;
        this.clampScroll(s);
      }
      if (s.locked) s.fill = Math.max(0, s.fill - s.decay * dt);
      s.clicks.forEach((c) => (c.t += dt)); s.clicks = s.clicks.filter((c) => c.t < 0.5);
    },
    tap(s, x, y) {
      if (!s.locked) return;
      const o = this.off(s); x -= o.x; y -= o.y;
      if (!G.inR(x, y, this.agree(s), 6)) return;
      s.fill += s.tapV; s.clicks.push({ x, y, t: 0 });
      A().sfx('close', Math.floor(s.fill * 10)); G.pulse({ ab: 1.5, shake: 1.5 }); G.vibrate(6);
      if (s.fill >= 1) { s.fill = 1; A().sfx('glitch'); s.win(); }
    },
    draw(s) {
      const T = G.ctx(), o = this.off(s), st = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][s.block]] || G.WSTYLES.m1;
      const ac = s.acc === L ? K : s.acc, ac2 = s.block >= 2 ? Gr : ac;
      T.save(); T.translate(o.x, o.y);
      const w0 = s.win0;
      // ventanas de detrás (como una pila)
      for (let k = 2; k >= 1; k--) { const gx = w0.x - k * 6, gy = w0.y + k * 8; G.rect(gx, gy, w0.w, w0.h, K); G.rect(gx + 1, gy + 1, w0.w - 2, w0.h - 2, W); G.rect(gx + 1, gy + 1, w0.w - 2, 10, L); }
      const wr = G.drawFrame({ x: w0.x, y: w0.y, w: w0.w, h: w0.h, st, title: 'LIBRARY.EXE', stripes: true, xmode: 'x' });
      // barra de menús con TERMS marcado
      G.rect(wr.x, wr.y, wr.w, 11, W); G.rect(wr.x, wr.y + 11, wr.w, 1, K);
      let mx = wr.x + 5, tx = 0;
      for (const m of ['FILES', 'EDIT', 'VIEW', 'TERMS', 'HELP']) {
        const tw = G.textW(m);
        if (m === 'TERMS') { G.rect(mx - 3, wr.y + 1, tw + 6, 10, K); G.text(m, mx, wr.y + 3, W); tx = mx + tw / 2; } else G.text(m, mx, wr.y + 3, K);
        mx += tw + 10;
      }
      // iconos
      G.rect(wr.x, wr.y + 12, wr.w, wr.h - 12, W);
      const cw = wr.w / 4;
      TOS_ICONS.forEach(([ic, lab], i) => { const cx = wr.x + cw * (i + 0.5); T.drawImage(G.icon20(ic, s.block), Math.round(cx - 20), wr.y + 16, 40, 40); G.text(lab, cx, wr.y + 58, K, { al: 'c' }); });
      // bandeja punteada y rayada por donde sale el papel
      const ty = wr.y + 70; G.drect(wr.x, ty, wr.w, 8, 4, K, null); G.rect(wr.x, ty + 8, wr.w, 1, K);
      for (let yy = ty + 12; yy < wr.y + wr.h; yy += 6) G.rect(wr.x, yy, wr.w, 1, K);
      G.drawSpr('cursor', Math.round(tx), wr.y + 6, { '#': K, w: W });
      // la hoja de detrás y la hoja de los términos (con el rollo negro arriba a la izquierda)
      const p = s.pap;
      G.rect(p.x - 9, p.y - 10, p.w - 20, 30, K); G.rect(p.x - 8, p.y - 9, p.w - 22, 28, W); G.rect(p.x - 8, p.y - 9, 10, 28, K);
      G.rect(p.x, p.y, p.w, p.h, K); G.rect(p.x + 1, p.y + 1, p.w - 2, p.h - 2, W);
      G.rect(p.x, p.y, 13, 46, K); G.circ(p.x + 6, p.y + 46, 6, K, K); G.rect(p.x + 3, p.y + 4, 1, 38, L);
      // texto (recortado a la hoja)
      const v = s.view;
      T.save(); T.beginPath(); T.rect(v.x, v.y, v.w, v.h); T.clip();
      const i0 = Math.max(0, Math.floor(s.scroll / 9) - 1), i1 = Math.min(s.lines.length, i0 + Math.ceil(v.h / 9) + 2);
      for (let i = i0; i < i1; i++) { const ln = s.lines[i]; if (ln.t) G.text(ln.t, v.x, v.y + 2 + i * 9 - s.scroll, K, { b: ln.b }); }
      const ag = this.agree(s);
      G.rect(ag.x + 2, ag.y + 2, ag.w, ag.h, K); G.rect(ag.x, ag.y, ag.w, ag.h, s.locked ? ac : L); G.box(ag.x, ag.y, ag.w, ag.h, K);
      G.text('AGREE', ag.x + ag.w / 2, ag.y + 6, s.locked ? W : K, { al: 'c', b: true });
      const by = ag.y + 26, bw = v.w - 4;
      G.box(v.x + 2, by, bw, 10, K); const fw = Math.round((bw - 4) * s.fill), hot = s.fill > 0.75 && Math.floor(s.t * 10) % 2;
      for (let i = 0; i < fw; i += 4) G.rect(v.x + 4 + i, by + 2, 3, 6, hot ? ac : ac2 === W ? K : ac2);
      G.text('ACCEPTING ' + Math.floor(s.fill * 100) + '%', v.x + 2, by + 13, K);
      T.restore();
      // barra de desplazamiento
      const sx = p.x + p.w - 10, th = Math.max(14, Math.round((v.h * v.h) / s.docH)), tyy = v.y + Math.round((v.h - th) * (s.scroll / s.max));
      G.drect(sx, v.y, 7, v.h, 4, K, null); G.box(sx, v.y, 7, v.h, K); G.rect(sx, tyy, 7, th, K);
      if (!s.locked && Math.floor(s.t * 4) % 2) { G.rect(v.x + v.w / 2 - 34, p.y + p.h - 15, 68, 10, K); G.text('SCROLL ▼', v.x + v.w / 2, p.y + p.h - 14, W, { al: 'c', b: true }); }
      for (const c of s.clicks) G.text('CLICK', c.x, c.y - 8 - c.t * 30, ac === W ? K : ac, { al: 'c', b: true });
      T.restore();
    },
  };

  // ===== 10 ECHO.EXE: collage de ventanas; 4 de ellas suenan y se iluminan, repite la secuencia =====
  // cada ventana "activa": su estilo, su color al iluminarse y su sonido de sistema (sonidos propios estilo escritorio 90s)
  const ECHO_PADS = [
    { kind: 'error', title: 'ERROR', st: 'b2', lit: B },
    { kind: 'warn', title: 'WARNING', st: 'm1', lit: Gr },
    { kind: 'virus', title: 'VIRUS DETECTED', st: 'b1', lit: W },
    { kind: 'smile', title: 'HAPPY?', st: 'm2', lit: 'chk' },
  ];
  const ECHO_DECOY_ST = ['m1', 'm2', 'm3', 'm4', 'b1', 'b2', 'b3', 'b4', 'b3', 'b2'];
  M.echo = {
    mode: 'desk', cmd: 'REPEAT!', hint: 'REPEAT THE SEQUENCE', time: 0,
    help: ['WATCH WHICH WINDOWS', 'LIGHT UP AND LISTEN.', 'THEN TAP THEM IN THE', 'SAME ORDER.'],
    init(s) {
      const r = s.r;
      s.len = 3 + Math.round(s.d * 3); s.seq = Array.from({ length: s.len }, () => G.irand(0, 3));
      s.phase = 'show'; s.pt = -0.45; s.lastK = -1; s.inp = 0; s.it = 0;
      s.dur = 0.42 - 0.17 * s.d; s.gap = 0.13; s.limit = 2.3 - 0.8 * s.d; s.lit = [0, 0, 0, 0]; s.deny = 0;
      // las 4 ventanas activas, en sitios distintos cada ronda
      const pw = 106, ph = 72, slots = shuffle([[r.x + 3, r.y + 30], [r.x + r.w - 3 - pw, r.y + 56], [r.x + 9, r.y + 178], [r.x + r.w - 9 - pw, r.y + 204]]);
      s.pads = ECHO_PADS.map((p, i) => ({ ...p, x: Math.round(slots[i][0] + G.rand(-4, 4)), y: Math.round(slots[i][1] + G.rand(-6, 6)), w: pw, h: ph, ph: Math.random() * 6 }));
      // relleno: muchas ventanas que no se iluminan
      s.decoys = [];
      const types = shuffle(['error', 'warn', 'big', 'loading', 'copying', 'login', 'pics', 'fix', 'smiley', 'mini', 'error', 'big']);
      const nd = 11 + Math.round(s.d * 5);
      for (let i = 0; i < nd; i++) {
        const o = S.makeWin(types[i % types.length]); o.st = G.WSTYLES[G.pick(ECHO_DECOY_ST)];
        if (o.type === 'big') { o.word = G.pick(['STAY', 'ROTTEN', 'NO', 'ECHO', 'WAIT']); o.jp = false; o.heavy = Math.random() < 0.6; o.w = Math.max(90, G.textW(o.word, 3, 1, true) + 24); }
        if (o.type === 'copying' || o.type === 'loading') o.prog = Math.random();
        o.x = Math.round(G.rand(r.x - 20, r.x + r.w - o.w + 20)); o.y = Math.round(G.rand(r.y + 14, r.y + r.h - o.h + 10));
        s.decoys.push(o);
      }
      // ventanas especiales de relleno: buscaminas y caja de herramientas
      s.mines = { x: Math.round(G.rand(r.x, r.x + r.w - 70)), y: Math.round(G.rand(r.y + 20, r.y + r.h - 90)), w: 70, h: 84, st: G.WSTYLES.m1, title: 'MINES', stripes: false, xmode: 'x' };
      s.tools = { x: Math.round(G.rand(r.x + r.w - 60, r.x + r.w - 40)), y: Math.round(G.rand(r.y + 120, r.y + r.h - 150)), w: 48, h: 140, st: G.WSTYLES.m2, title: '', stripes: true, xmode: 'x' };
      s.deco = { hg: [G.rand(r.x + 4, r.x + r.w - 20), G.rand(r.y + 20, r.y + r.h - 30)], sm: [G.rand(r.x + 10, r.x + r.w - 50), G.rand(r.y + 40, r.y + r.h - 60)] };
    },
    fuse(s) { return s.phase === 'input' ? 1 - s.it / s.limit : 1; },
    pr(s, p) { const a = s.d > 0.5 ? 1 + s.d * 3 : 0; return { x: Math.round(p.x + Math.sin(s.t * 1.7 + p.ph) * a), y: Math.round(p.y + Math.cos(s.t * 1.3 + p.ph) * a * 0.7), w: p.w, h: p.h }; },
    update(s, dt) {
      s.lit = s.lit.map((v) => Math.max(0, v - dt)); s.deny = Math.max(0, s.deny - dt);
      for (const o of s.decoys) if (o.type === 'loading') o.prog = (o.prog + dt * 0.3) % 1;
      if (s.phase === 'show') {
        s.pt += dt;
        const k = Math.floor(s.pt / (s.dur + s.gap));
        if (s.pt >= 0 && k !== s.lastK && k < s.len) { s.lastK = k; s.lit[s.seq[k]] = s.dur; A().sfx('sys', s.seq[k]); G.pulse({ ab: 1.2 }); }
        if (s.pt >= 0 && k >= s.len) { s.phase = 'input'; s.it = 0; }
      } else { s.it += dt; if (s.it > s.limit) s.fail('TOO SLOW'); }
    },
    tap(s, x, y) {
      if (s.phase !== 'input') return;
      for (let i = 3; i >= 0; i--) {
        if (!G.inR(x, y, this.pr(s, s.pads[i]), 3)) continue;
        s.lit[i] = 0.2; A().sfx('sys', i);
        if (i === s.seq[s.inp]) { s.inp++; s.it = 0; if (s.inp >= s.len) s.win(); } else s.fail('WRONG ORDER');
        return;
      }
      if (!s.deny) { s.deny = 0.25; A().sfx('deny'); } // las de relleno no cuentan
    },
    drawPad(s, p, i) {
      const lit = s.lit[i] > 0, q = this.pr(s, p), st0 = G.WSTYLES[p.st];
      const lc = p.lit === 'chk' ? Gr : p.lit, dark = lc === B;
      const st = lit ? { fr: K, bd: lc, bar: lc, bt: dark ? W : K, tx: dark ? W : K, ac: dark ? W : K, sh: K, out: W } : st0;
      if (lit) { G.box(q.x - 4, q.y - 4, q.w + 8, q.h + 8, lc === W ? Gr : W); G.box(q.x - 3, q.y - 3, q.w + 6, q.h + 6, K); }
      const r = G.drawFrame({ x: q.x, y: q.y, w: q.w, h: q.h, st, title: p.title, stripes: true, xmode: 'x' });
      if (lit && p.lit === 'chk') G.drect(r.x, r.y, r.w, r.h, 8, B, null);
      const tx = st.tx, ac = st.ac;
      if (p.kind === 'error') {
        G.drawSpr('xcirc', r.x + 6, r.y + 8, { '#': ac }, 2); G.text('NO SMILE', r.x + 28, r.y + 12, tx);
        G.drawBtn(r.x + 6, r.y + r.h - 17, 44, 13, 'RETRY', tx, null); G.drawBtn(r.x + 54, r.y + r.h - 17, 44, 13, 'CANCEL', tx, null);
      } else if (p.kind === 'warn') {
        G.drawSpr('warn', r.x + 6, r.y + 6, { '#': ac }, 2); G.text('ACCESS', r.x + 32, r.y + 8, tx); G.text('DENIED', r.x + 32, r.y + 17, tx);
        G.drawBtn(r.x + r.w / 2 - 22, r.y + r.h - 17, 44, 13, 'OK', tx, null);
      } else if (p.kind === 'virus') {
        const sx = r.x + r.w / 2 - 22, sy = r.y + 4;
        G.drawSpr('skull', sx, sy, { '#': tx }, 2); if (!lit) G.drect(sx, sy, 44, 42, 4, st.bd, null);
        G.drawSpr('xcirc', sx + 9, sy + 15, { '#': st.bd }, 1);
      } else {
        const sx = r.x + 10, sy = r.y + 5;
        G.drawSpr('smiley', sx, sy, { '#': tx }, 3); handles(sx - 3, sy - 3, 51, 51, tx, st.bd);
        G.text('STAY', r.x + r.w - 6, r.y + r.h / 2 - 4, tx, { al: 'r', b: true, s: 1 });
      }
      if (lit) G.text('♪', q.x + q.w - 10, q.y - 9, W, { b: true });
    },
    draw(s) {
      const r = s.r, T = G.ctx();
      G.rect(r.x, r.y, r.w, r.h, K); G.drect(r.x, r.y, r.w, r.h, 1, B, null);
      // relleno (no se ilumina)
      const m = s.mines, mr = G.drawFrame(m);
      G.rect(mr.x, mr.y, mr.w, 11, L); G.text('GAME HELP', mr.x + 2, mr.y + 2, K);
      G.box(mr.x + 3, mr.y + 14, 18, 9, K); G.text('010', mr.x + 4, mr.y + 15, K); G.drawSpr('smiley', mr.x + mr.w / 2 - 7, mr.y + 12, { '#': K }, 1); G.box(mr.x + mr.w - 21, mr.y + 14, 18, 9, K);
      for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 6; xx++) { const cx = mr.x + 4 + xx * 10, cy = mr.y + 28 + yy * 10; G.rect(cx, cy, 9, 9, L); G.rect(cx, cy, 9, 1, W); G.rect(cx, cy, 1, 9, W); G.rect(cx, cy + 8, 9, 1, K); G.rect(cx + 8, cy, 1, 9, K); }
      for (const o of s.decoys) S.drawWin(o);
      const tl = s.tools, trr = G.drawFrame(tl);
      ['search', 'palette', 'keys', 'clock', 'camera', 'music', 'printer', 'book'].forEach((ic, i) => T.drawImage(G.icon20(ic, 1), trr.x + 2 + (i % 2) * 21, trr.y + 2 + Math.floor(i / 2) * 22, 20, 20));
      G.drawSpr(Math.floor(s.t * 2) % 2 ? 'hg1' : 'hg2', Math.round(s.deco.hg[0]), Math.round(s.deco.hg[1]), { '#': W, o: W }, 2);
      // las 4 activas, encima
      s.pads.forEach((p, i) => this.drawPad(s, p, i));
      G.drawSpr('cursor', Math.round(s.deco.sm[0]), Math.round(s.deco.sm[1]), { '#': K, w: W });
      // estado arriba
      const msg = s.phase === 'show' ? 'WATCH + LISTEN...' : 'YOUR TURN', bw = G.textW(msg, 1, 1, true) + 14, bx = Math.round(r.x + r.w / 2 - bw / 2);
      G.rect(bx, r.y + 2, bw, 21, K); G.box(bx, r.y + 2, bw, 21, W);
      G.text(msg, r.x + r.w / 2, r.y + 5, W, { al: 'c', b: true });
      for (let k = 0; k < s.len; k++) G.rect(r.x + r.w / 2 - s.len * 4 + k * 8, r.y + 16, 5, 3, k < s.inp ? (s.block >= 2 ? Gr : W) : L);
    },
  };

  // ===== 11 START.EXE: te piden un programa y hay que encontrarlo en el menú INICIO =====
  // árbol de menús: [nombre, hijos] es submenú; un texto suelto es un programa
  const SM_TREE = [
    ['PROGRAMS', [
      ['ACCESSORIES', ['CALC.EXE', 'CLOCK.EXE', 'NOTEPAD.EXE', 'PAINT.EXE', 'SOUND.EXE']],
      ['GAMES', ['MINES.EXE', 'CARDS.EXE', 'PINBALL.EXE', 'SNAKE.EXE', 'HEARTS.EXE']],
      ['INTERNET', ['BROWSER.EXE', 'MAIL.EXE', 'CHAT.EXE', 'FTP.EXE', 'NEWS.EXE']],
      ['MULTIMEDIA', ['PLAYER.EXE', 'RADIO.EXE', 'CDPLAY.EXE', 'MIXER.EXE', 'RECORD.EXE']],
      ['STARTUP', ['VOID.EXE', 'SPY.EXE', 'UPDATE.EXE']],
    ]],
    ['DOCUMENTS', ['README.TXT', 'DIARY.TXT', 'TODO.TXT', 'SECRETS.TXT', 'TAXES.XLS']],
    ['SETTINGS', [
      ['CONTROL PANEL', [
        ['DISPLAY', ['WALLPAPER.EXE', 'SAVER.EXE', 'COLORS.EXE', 'FONTS.EXE']],
        ['MOUSE', ['POINTER.EXE', 'SPEED.EXE', 'BUTTONS.EXE']],
        ['SOUNDS', ['BEEPS.EXE', 'ALERTS.EXE', 'VOLUME.EXE']],
        ['NETWORK', ['MODEM.EXE', 'DIALUP.EXE', 'PING.EXE']],
      ]],
      ['PRINTERS', ['PRINT.EXE', 'QUEUE.EXE', 'INK.EXE']],
      ['TASKBAR', ['AUTOHIDE.EXE', 'ICONS.EXE', 'TRAY.EXE']],
    ]],
    ['FIND', [
      ['FILES', ['LOST.TXT', 'PHOTOS.ZIP', 'OLD.DOC']],
      ['PEOPLE', ['FRIENDS.EXE', 'EX.EXE', 'MOM.EXE']],
    ]],
    'HELP', 'RUN...', 'SHUT DOWN',
  ];
  const SM_IC = { PAINT: 'palette', CALC: 'calc', CLOCK: 'sun', NOTEPAD: 'doc', SOUND: 'sound', MAIL: 'mail', BROWSER: 'globe', CHAT: 'mail', NEWS: 'doc', PLAYER: 'note', RADIO: 'note', CDPLAY: 'note', MIXER: 'sound', RECORD: 'sound', POINTER: 'mouse', SPEED: 'mouse', BUTTONS: 'mouse', WALLPAPER: 'camera', SAVER: 'sun', COLORS: 'palette', FONTS: 'doc', BEEPS: 'sound', ALERTS: 'sound', VOLUME: 'sound', MODEM: 'globe', DIALUP: 'globe', PING: 'globe', PRINT: 'doc', PHOTOS: 'camera', HELP: 'doc', 'RUN...': 'system', 'SHUT DOWN': 'sun', FTP: 'globe', SPY: 'keys', UPDATE: 'floppy', VOID: 'system', MINES: 'keys', CARDS: 'clip', PINBALL: 'mouse', SNAKE: 'keys', HEARTS: 'clip' };
  const SM_SUBS = { I: ['1', 'L'], L: ['1', 'I'], O: ['0', 'Q'], A: ['4'], E: ['3', 'F'], S: ['5'], T: ['7'], B: ['8'], G: ['6'], N: ['M'], M: ['N'], P: ['R'], R: ['P'] };
  const smName = (n) => (Array.isArray(n) ? n[0] : n);
  const smIcon = (n) => { if (Array.isArray(n)) return 'disk'; if (/\.(TXT|DOC|XLS|ZIP)$/.test(n)) return n.indexOf('PHOTO') === 0 ? 'camera' : 'doc'; return SM_IC[n.split('.')[0]] || SM_IC[n] || 'system'; };
  M.startmenu = {
    mode: 'desk', cmd: 'OPEN!', hint: 'FIND IT IN THE START MENU', time: 5,
    help: ['OPEN THE PROGRAM THEY', 'ASK FOR: TAP START AND', 'GO DOWN THE MENUS.', 'WRONG PROGRAM = FAIL.'],
    init(s) {
      const r = s.r, d = s.d;
      // objetivo según la dificultad: cuántos menús hay que bajar
      const leaves = []; const walk = (items, path) => items.forEach((it, i) => { if (Array.isArray(it)) walk(it[1], path.concat(i)); else if (path.length) leaves.push(path.concat(i)); });
      walk(SM_TREE, []);
      const want = s.boss ? [4] : d < 0.25 ? [2, 3] : d < 0.6 ? [3] : [3, 4];
      s.path = G.pick(leaves.filter((p) => want.indexOf(p.length) >= 0));
      // copia del árbol para esta ronda (programas barajados y nombres trampa en las rondas altas)
      const clone = (items) => items.map((it) => (Array.isArray(it) ? [it[0], clone(it[1])] : it));
      s.tree = clone(SM_TREE);
      let node = s.tree; for (let i = 0; i < s.path.length - 1; i++) node = node[s.path[i]][1];
      const leafMenu = node; s.target = leafMenu[s.path[s.path.length - 1]];
      if (d > 0.5) { // baraja los programas de ese menú
        const order = shuffle(leafMenu.map((_, i) => i)), copy = leafMenu.slice();
        order.forEach((o, i) => (leafMenu[i] = copy[o])); s.path[s.path.length - 1] = leafMenu.indexOf(s.target);
      }
      const traps = d > 0.4 ? (d > 0.75 ? 3 : d > 0.55 ? 2 : 1) : 0;
      const slots = shuffle(leafMenu.map((_, i) => i).filter((i) => i !== s.path[s.path.length - 1]));
      s.traps = new Set();
      for (let k = 0; k < traps && k < slots.length; k++) { const t = this.trap(s.target, leafMenu); if (t) { leafMenu[slots[k]] = t; s.traps.add(t); } }
      // pista: el camino entero, solo el primer menú o nada
      const names = []; node = s.tree; for (const i of s.path) { names.push(smName(node[i])); node = Array.isArray(node[i]) ? node[i][1] : null; }
      s.hint2 = d < 0.25 ? names.slice(0, -1).join(' > ') : d < 0.6 ? 'IN ' + names[0] : '';
      s.hint = 'OPEN ' + s.target;
      // pantalla: barra de tareas propia (la de abajo del todo es la de pausa) y menús en escalera
      s.bar = { x: r.x, y: r.y + r.h - 16, w: r.w, h: 16 };
      s.startB = { x: r.x + 3, y: s.bar.y + 2, w: 50, h: 12 };
      s.minY = r.y + 34; s.rowH = 14;
      s.open = []; s.sel = []; s.flash = null; s.shake = 0;
      s.T = (1.4 + (s.path.length + 1) * 0.8 + (s.hint2 ? 0 : 0.8)) * (1 - 0.1 * d) * (s.boss ? 1.15 : 1);
    },
    trap(name, menu) { // nombre casi igual (PA1NT.EXE, PAINT.EX3...)
      for (let k = 0; k < 20; k++) {
        const dot = name.lastIndexOf('.'), base = dot > 0 ? name.slice(0, dot) : name, ext = dot > 0 ? name.slice(dot) : '';
        let t;
        const mode = Math.random();
        if (mode < 0.65) { const idx = shuffle(Array.from({ length: base.length }, (_, i) => i)).find((i) => SM_SUBS[base[i]]); if (idx == null) continue; t = base.slice(0, idx) + G.pick(SM_SUBS[base[idx]]) + base.slice(idx + 1) + ext; }
        else if (mode < 0.85 && ext) t = base + ext.slice(0, -1) + G.pick(['3', 'F', 'X']);
        else t = base + 'S' + ext;
        if (t !== name && menu.indexOf(t) < 0 && t.length <= 13) return t;
      }
      return null;
    },
    // menús abiertos: 0 = raíz; cada submenú sale a la derecha, alineado con la opción marcada y creciendo hacia arriba
    layout(s) {
      const out = []; let items = s.tree;
      for (let lv = 0; lv < s.open.length; lv++) {
        const w = lv === 0 ? 104 : 106, h = items.length * s.rowH + 4;
        let x, bottom;
        if (lv === 0) { x = s.bar.x + 2; bottom = s.bar.y - 1; }
        else { const p = out[lv - 1]; x = Math.min(s.r.x + s.r.w - w - 1, p.x + [0, 58, 42, 34, 30][lv]); bottom = p.y + 2 + s.sel[lv - 1] * s.rowH + 1; } // justo encima de la opción elegida
        let y = bottom - h; if (y < s.minY) y = s.minY;
        out.push({ x, y, w, h, items, band: lv === 0 });
        const si = s.sel[lv]; if (si == null || !Array.isArray(items[si])) break;
        items = items[si][1];
      }
      return out;
    },
    tap(s, x, y) {
      if (G.inR(x, y, s.startB, 3)) { // START abre / cierra
        if (s.open.length) { s.open = []; s.sel = []; } else { s.open = [1]; s.sel = []; }
        A().sfx('tap'); return;
      }
      const ms = this.layout(s);
      for (let lv = ms.length - 1; lv >= 0; lv--) {
        const m = ms[lv]; if (!G.inR(x, y, m)) continue;
        const ix = m.band ? m.x + 16 : m.x + 2, i = Math.floor((y - m.y - 2) / s.rowH);
        if (x < ix - 2 || i < 0 || i >= m.items.length) return;
        const it = m.items[i];
        if (Array.isArray(it)) { // submenú
          s.sel = s.sel.slice(0, lv); s.sel[lv] = i; s.open = new Array(lv + 2).fill(1); A().sfx('pick'); return;
        }
        s.sel = s.sel.slice(0, lv); s.sel[lv] = i; s.flash = { lv, i, t: 0.4 };
        if (it === s.target) { A().sfx('ok'); G.pulse({ ab: 2 }); s.win(); }
        else { G.pulse({ glitch: 0.5, ab: 3 }); s.fail(it === 'SHUT DOWN' ? 'SHUT DOWN' : 'WRONG PROGRAM'); }
        return;
      }
    },
    update(s, dt) { if (s.flash) { s.flash.t -= dt; if (s.flash.t <= 0) s.flash = null; } },
    drawMenu(s, m, lv) {
      const rh = s.rowH;
      G.rect(m.x + 3, m.y + 3, m.w, m.h, K); G.rect(m.x, m.y, m.w, m.h, L); G.box(m.x, m.y, m.w, m.h, K); G.rect(m.x + 1, m.y + 1, m.w - 2, 1, W); G.rect(m.x + 1, m.y + 1, 1, m.h - 2, W);
      let ix = m.x + 3;
      if (m.band) { G.rect(m.x + 2, m.y + 2, 13, m.h - 4, s.acc === L ? K : s.acc); 'NEØ98'.split('').forEach((ch, k) => G.text(ch, m.x + 6, m.y + m.h - 12 - (4 - k) * 9, W, { b: true })); ix = m.x + 17; }
      const hiC = s.acc === L ? K : s.acc;
      m.items.forEach((it, i) => {
        const yy = m.y + 2 + i * rh, nm = smName(it), on = s.sel[lv] === i, fl = s.flash && s.flash.lv === lv && s.flash.i === i;
        const bg = fl ? (s.done === 'lose' ? K : Gr) : on ? hiC : null;
        if (bg) G.rect(ix - 1, yy, m.w - (ix - m.x) - 1, rh, bg);
        const tc = bg ? (bg === Gr ? K : W) : K;
        G.ctx().drawImage(G.icon16(smIcon(s.traps.has(it) ? s.target : it), tc, bg || L, Gr), ix + 1, yy + 1, 12, 12); // la trampa lleva el mismo icono
        G.text(nm, ix + 15, yy + 4, tc);
        if (Array.isArray(it)) G.text('➤', m.x + m.w - 9, yy + 4, tc);
      });
    },
    draw(s) {
      const r = s.r;
      G.drawDesktopIcons(s.block, r.y + 30);
      // lo que hay que abrir
      const tw = Math.max(G.textW(s.hint, 1, 1, true), s.hint2 ? G.textW(s.hint2) : 0) + 16, tx = Math.round(r.x + r.w / 2 - tw / 2);
      G.rect(tx, r.y + 3, tw, s.hint2 ? 25 : 15, K); G.box(tx, r.y + 3, tw, s.hint2 ? 25 : 15, W);
      G.text(s.hint, r.x + r.w / 2, r.y + 7, W, { al: 'c', b: true });
      if (s.hint2) G.text(s.hint2, r.x + r.w / 2, r.y + 17, s.block >= 2 ? Gr : L, { al: 'c' });
      // barra de tareas propia con su START
      const b = s.bar, sb = s.startB, on = s.open.length > 0;
      G.rect(b.x, b.y, b.w, b.h, K); G.rect(b.x, b.y, b.w, 1, s.block >= 2 ? Gr : W);
      G.rect(sb.x, sb.y, sb.w, sb.h, on ? W : K); G.box(sb.x, sb.y, sb.w, sb.h, W);
      G.drawSpr('eyelogo', sb.x + 3, sb.y + 2, { '#': on ? K : W }); G.text('START', sb.x + 15, sb.y + 3, on ? K : W, { b: true });
      ['VOID.EXE', 'INBOX (3)'].forEach((t, i) => { const x = sb.x + sb.w + 4 + i * 62; G.box(x, sb.y, 58, sb.h, W); G.text(t, x + 4, sb.y + 3, W); });
      if (!on && !s.done && Math.floor(s.t * 4) % 2) { G.rect(sb.x, b.y - 15, 58, 12, K); G.box(sb.x, b.y - 15, 58, 12, W); G.text('TAP START', sb.x + 4, b.y - 12, W, { b: true }); }
      // menús en escalera con una línea que une la opción marcada con su submenú
      const ms = this.layout(s);
      ms.forEach((m, lv) => {
        this.drawMenu(s, m, lv);
        const n = ms[lv + 1]; if (n) { const iy = m.y + 2 + s.sel[lv] * s.rowH + 7, lx = Math.min(m.x + m.w + 2, n.x + n.w - 6); G.rect(m.x + m.w - 1, iy, lx - (m.x + m.w) + 2, 1, W); G.rect(lx, n.y + n.h, 1, Math.max(0, iy - (n.y + n.h) + 1), W); }
      });
      // al acertar: se abre el programa
      if (s.done === 'win') {
        const w = { x: r.x + 30, y: r.y + 70, w: r.w - 60, h: 80, st: G.WSTYLES.g3, title: s.target, stripes: true, xmode: 'x' }, wr = G.drawFrame(w);
        G.ctx().drawImage(G.icon16(smIcon(s.target), K, W, Gr), wr.x + wr.w / 2 - 16, wr.y + 10, 32, 32); G.text('LOADING...', wr.x + wr.w / 2, wr.y + 48, K, { al: 'c' });
      }
    },
  };

  // ===== 12 ERASE!: ventana tipo Paint; borra el garabato hasta el 90% y aparece la ilustración =====
  const PAINT_TOOLS = ['free', 'sel', 'erase', 'fill', 'pick', 'mag', 'pencil', 'brush', 'spray', 'text', 'line', 'curve', 'rect', 'poly', 'oval', 'rrect'];
  const PAINT_SW = [[K], [K, L, 8], [B], [B, K, 8], [Gr], [Gr, K, 8], [L], [L, K, 4], [W, K, 4], [B, W, 8], [Gr, W, 8], [B, Gr, 8],
    [W], [L, W, 8], [B, L, 8], [Gr, L, 8], [K, W, 8], [B, W, 4], [Gr, W, 4], [K, W, 12], [B, Gr, 4], [Gr, B, 4], [L, B, 8], [K, B, 8]];
  M.erase = {
    mode: 'float', tilt: 5, cmd: 'ERASE!', hint: 'RUB OUT THE MESS (90%)', time: 5,
    help: ['A VIRUS SCRIBBLED ON', 'THE PICTURE. RUB WITH', 'YOUR FINGER UNTIL 90%', 'OF IT IS CLEAN.'],
    float(aw, ah) { const w = aw - 10; return { w, h: Math.min(ah - 24, Math.round(w * 1.48)), title: 'UNTITLED - PAINT.EXE' }; },
    init(s) {
      const r = s.r, d = s.d;
      s.tb = { x: r.x + 2, y: r.y + 14 };
      s.ws = { x: r.x + 40, y: r.y + 13, w: r.w - 51, h: r.h - 13 - 11 - 40 };
      const k = Math.min(1, (s.ws.w - 6) / G.DRAW_W, (s.ws.h - 6) / G.DRAW_H);
      s.cv = { x: s.ws.x + 3, y: s.ws.y + 3, w: Math.round(G.DRAW_W * k), h: Math.round(G.DRAW_H * k) };
      const pool = G.DRAW_KINDS.filter((n) => n !== M.erase.lastPic); s.pic = G.pick(pool); M.erase.lastPic = s.pic; // nunca el mismo dos veces seguidas
      G.drawPic(s.pic);
      const cw = s.cv.w, ch = s.cv.h;
      s.mask = G.mkCanvas(cw, ch);
      s.cell = 4; s.gw = Math.ceil(cw / 4); s.gh = Math.ceil(ch / 4); s.dirty = new Uint8Array(s.gw * s.gh).fill(1); s.clean = 0;
      const T = G.ctx(); G.target(s.mask.x);
      try {
        G.drect(0, 0, cw, ch, 9, L, K);
        const cols = [K, B, Gr, W];
        for (let n = 0; n < 10 + Math.round(d * 6); n++) { let x = G.rand(0, cw), y = G.rand(0, ch); const col = G.pick(cols); for (let j = 0; j < 14; j++) { const nx = G.clamp(x + G.rand(-26, 26), 0, cw), ny = G.clamp(y + G.rand(-26, 26), 0, ch); this.stroke(x, y, nx, ny, col, 3); x = nx; y = ny; } }
      } finally { G.target(T); }
      s.bs = Math.round(Math.min(cw, ch) * 0.2 - 4 * d); s.need = 0.9; s.last = null; s.cur = null;
      s.bot = d > 0.6 ? { x: G.rand(0, cw), y: G.rand(0, ch), a: Math.random() * 6, t: 0 } : null;
      s.T = 4.8 * (1 - 0.15 * d) * (s.boss ? 1.15 : 1);
    },
    stroke(x0, y0, x1, y1, col, th) {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5));
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; G.rect(x - th / 2, y - th / 2, th, th, col); }
    },
    rub(s, x, y) {
      const c = s.cv, lx = x - c.x, ly = y - c.y, b = s.bs;
      s.mask.x.clearRect(Math.round(lx - b / 2), Math.round(ly - b / 2), b, b);
      const gx0 = Math.max(0, Math.floor((lx - b / 2) / 4)), gx1 = Math.min(s.gw - 1, Math.floor((lx + b / 2) / 4));
      const gy0 = Math.max(0, Math.floor((ly - b / 2) / 4)), gy1 = Math.min(s.gh - 1, Math.floor((ly + b / 2) / 4));
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) { const i = gy * s.gw + gx; if (s.dirty[i]) { s.dirty[i] = 0; s.clean++; } }
    },
    down(s, x, y) { s.last = { x, y }; s.cur = { x, y }; this.rub(s, x, y); },
    move(s, x, y) {
      if (!s.last) return;
      const n = Math.max(1, Math.ceil(Math.hypot(x - s.last.x, y - s.last.y) / 3));
      for (let i = 1; i <= n; i++) this.rub(s, s.last.x + ((x - s.last.x) * i) / n, s.last.y + ((y - s.last.y) * i) / n);
      s.last = { x, y }; s.cur = { x, y };
      if (Math.random() < 0.08) A().sfx('type', 0.6);
      if (s.clean / s.dirty.length >= s.need) s.win();
    },
    up(s) { s.last = null; },
    update(s, dt) {
      const b = s.bot; if (!b) return;
      b.t += dt; b.a += G.rand(-2, 2) * dt * 3;
      const sp = 40 + 60 * s.d, nx = G.clamp(b.x + Math.cos(b.a) * sp * dt, 0, s.cv.w - 1), ny = G.clamp(b.y + Math.sin(b.a) * sp * dt, 0, s.cv.h - 1);
      if (nx <= 0 || nx >= s.cv.w - 1 || ny <= 0 || ny >= s.cv.h - 1) b.a += Math.PI / 2;
      const T = G.ctx(); G.target(s.mask.x); this.stroke(b.x, b.y, nx, ny, K, 3); G.target(T);
      const gx = Math.floor(nx / 4), gy = Math.floor(ny / 4), i = gy * s.gw + gx; if (i >= 0 && i < s.dirty.length && !s.dirty[i]) { s.dirty[i] = 1; s.clean--; }
      b.x = nx; b.y = ny;
    },
    bevel(x, y, w, h, inset) { const a = inset ? K : W, b = inset ? W : K; G.rect(x, y, w, 1, a); G.rect(x, y, 1, h, a); G.rect(x, y + h - 1, w, 1, b); G.rect(x + w - 1, y, 1, h, b); },
    tool(t, x, y, on) { // botón de la caja de herramientas con su icono
      if (on) { G.drect(x, y, 17, 17, 8, W, L); } else G.rect(x, y, 17, 17, L);
      this.bevel(x, y, 17, 17, on);
      const k = K, cx = x + 8, cy = y + 8;
      switch (t) {
        case 'free': [[8, 3], [10, 6], [13, 7], [11, 10], [12, 13], [8, 11], [4, 13], [5, 10], [3, 7], [6, 6]].forEach(([a, b]) => G.px(x + a, y + b, k)); break;
        case 'sel': G.dash(x + 3, y + 4, 11, k, 1, 1); G.dash(x + 3, y + 12, 11, k, 1, 1); for (let i = 4; i <= 12; i += 2) { G.px(x + 3, y + i, k); G.px(x + 13, y + i, k); } break;
        case 'erase': G.tri(x + 6, y + 6, x + 13, y + 6, x + 10, y + 12, W); G.tri(x + 6, y + 6, x + 10, y + 12, x + 3, y + 12, W); G.line(x + 6, y + 6, x + 13, y + 6, k); G.line(x + 13, y + 6, x + 10, y + 12, k); G.line(x + 10, y + 12, x + 3, y + 12, k); G.line(x + 3, y + 12, x + 6, y + 6, k); G.rect(x + 4, y + 10, 6, 2, B); break;
        case 'fill': G.line(x + 4, y + 8, x + 8, y + 4, k); G.line(x + 8, y + 4, x + 12, y + 8, k); G.line(x + 12, y + 8, x + 8, y + 12, k); G.line(x + 8, y + 12, x + 4, y + 8, k); G.rect(x + 11, y + 9, 2, 4, B); break;
        case 'pick': G.line(x + 4, y + 13, x + 11, y + 6, k); G.rect(x + 10, y + 3, 4, 4, k); G.px(x + 4, y + 13, Gr); break;
        case 'mag': G.circ(cx - 1, cy - 1, 4, null, k); G.line(cx + 2, cy + 2, cx + 5, cy + 5, k); G.line(cx + 3, cy + 2, cx + 6, cy + 5, k); break;
        case 'pencil': G.line(x + 4, y + 13, x + 12, y + 5, k); G.line(x + 5, y + 13, x + 13, y + 5, k); G.px(x + 4, y + 13, B); break;
        case 'brush': G.line(x + 8, y + 3, x + 8, y + 9, k); G.rect(x + 6, y + 9, 5, 5, k); G.drect(x + 6, y + 12, 5, 2, 8, W, null); break;
        case 'spray': G.rect(x + 6, y + 6, 5, 8, k); G.rect(x + 7, y + 4, 3, 2, k); [[3, 4], [4, 7], [2, 6], [12, 4], [13, 7], [12, 9]].forEach(([a, b]) => G.px(x + a, y + b, B)); break;
        case 'text': G.text('A', x + 6, y + 5, k, { b: true }); break;
        case 'line': G.line(x + 4, y + 12, x + 12, y + 4, k); break;
        case 'curve': G.line(x + 5, y + 4, x + 9, y + 7, k); G.line(x + 9, y + 7, x + 7, y + 10, k); G.line(x + 7, y + 10, x + 11, y + 13, k); break;
        case 'rect': G.box(x + 3, y + 5, 11, 8, k); break;
        case 'poly': G.line(x + 4, y + 12, x + 7, y + 4, k); G.line(x + 7, y + 4, x + 13, y + 6, k); G.line(x + 13, y + 6, x + 11, y + 12, k); G.line(x + 11, y + 12, x + 4, y + 12, k); break;
        case 'oval': G.ell(cx, cy, 5, 3, null, k); break;
        case 'rrect': G.box(x + 3, y + 5, 11, 8, k); G.px(x + 3, y + 5, L); G.px(x + 13, y + 5, L); G.px(x + 3, y + 12, L); G.px(x + 13, y + 12, L); break;
      }
    },
    draw(s) {
      const r = s.r, c = s.cv, ws = s.ws;
      G.rect(r.x, r.y, r.w, r.h, L);
      // menú
      let mx = r.x + 4;
      for (const m of ['FILE', 'EDIT', 'VIEW', 'IMAGE', 'OPTIONS', 'HELP']) { G.text(m, mx, r.y + 2, K); G.rect(mx, r.y + 9, 5, 1, K); mx += G.textW(m) + 7; }
      G.rect(r.x, r.y + 11, r.w, 1, K); G.rect(r.x, r.y + 12, r.w, 1, W);
      // caja de herramientas (la goma, pulsada) y tamaños de goma
      PAINT_TOOLS.forEach((t, i) => this.tool(t, s.tb.x + (i % 2) * 18, s.tb.y + Math.floor(i / 2) * 18, t === 'erase'));
      const oy = s.tb.y + 8 * 18 + 4; this.bevel(s.tb.x + 1, oy, 34, 36, true);
      [4, 6, 8, 10].forEach((z, i) => { const yy = oy + 3 + i * 8; if (i === 2) G.rect(s.tb.x + 3, yy - 1, 30, 9, s.acc === L ? K : s.acc); G.rect(s.tb.x + 18 - z / 2, yy + 3 - Math.min(3, z / 3), z, Math.min(6, z / 1.5 + 1), i === 2 ? W : K); });
      // área de trabajo con el lienzo
      G.drect(ws.x, ws.y, ws.w, ws.h, 8, K, L); this.bevel(ws.x - 1, ws.y - 1, ws.w + 2, ws.h + 2, true);
      const pic = G.drawPic(s.pic), T = G.ctx();
      if (c.w === G.DRAW_W && c.h === G.DRAW_H) T.drawImage(pic, c.x, c.y); else T.drawImage(pic, c.x, c.y, c.w, c.h);
      if (s.done !== 'win') T.drawImage(s.mask.c, c.x, c.y); // al acertar se ve el dibujo entero
      G.box(c.x - 1, c.y - 1, c.w + 2, c.h + 2, K);
      // barras de desplazamiento
      const vx = ws.x + ws.w + 1, hy = ws.y + ws.h + 1;
      G.drect(vx, ws.y, 10, ws.h, 8, W, L); G.drect(ws.x, hy, ws.w, 10, 8, W, L);
      for (const [bx, by, dir] of [[vx, ws.y, 'u'], [vx, ws.y + ws.h - 10, 'd'], [ws.x, hy, 'l'], [ws.x + ws.w - 10, hy, 'r']]) {
        G.rect(bx, by, 10, 10, L); this.bevel(bx, by, 10, 10, false);
        if (dir === 'u') G.tri(bx + 2, by + 7, bx + 8, by + 7, bx + 5, by + 3, K); else if (dir === 'd') G.tri(bx + 2, by + 3, bx + 8, by + 3, bx + 5, by + 7, K);
        else if (dir === 'l') G.tri(bx + 7, by + 2, bx + 7, by + 8, bx + 3, by + 5, K); else G.tri(bx + 3, by + 2, bx + 3, by + 8, bx + 7, by + 5, K);
      }
      G.rect(vx, ws.y + 30, 10, 60, L); this.bevel(vx, ws.y + 30, 10, 60, false);
      G.rect(ws.x + 40, hy, 70, 10, L); this.bevel(ws.x + 40, hy, 70, 10, false);
      // paleta con los colores del juego
      const py = r.y + r.h - 37;
      G.drect(r.x + 2, py, 24, 24, 8, W, L); this.bevel(r.x + 2, py, 24, 24, true);
      G.rect(r.x + 11, py + 10, 11, 11, W); G.box(r.x + 11, py + 10, 11, 11, K); G.rect(r.x + 5, py + 4, 11, 11, K); G.box(r.x + 5, py + 4, 11, 11, W);
      PAINT_SW.forEach((sw, i) => { const x = r.x + 30 + (i % 12) * 11, y = py + 1 + Math.floor(i / 12) * 11; if (sw.length === 1) G.rect(x, y, 10, 10, sw[0]); else G.drect(x, y, 10, 10, sw[2], sw[0], sw[1]); this.bevel(x, y, 10, 10, true); });
      // barra de estado: cuánto llevas borrado
      const sy = r.y + r.h - 12, pct = Math.min(100, Math.floor((100 * s.clean) / s.dirty.length)), ok = pct >= 90;
      this.bevel(r.x + 1, sy, r.w - 50, 11, true); G.text('ERASED ' + pct + '% / 90%', r.x + 4, sy + 2, ok ? B : K, { b: ok });
      this.bevel(r.x + r.w - 47, sy, 22, 11, true); G.dash(r.x + r.w - 43, sy + 3, 8, K, 1, 1); G.dash(r.x + r.w - 43, sy + 7, 8, K, 1, 1);
      this.bevel(r.x + r.w - 23, sy, 22, 11, true); for (let i = 0; i < 4; i++) G.line(r.x + r.w - 6 - i * 3, sy + 9, r.x + r.w - 3, sy + 6 - i * 3 + 3, K);
      // el lápiz del virus y el cursor de la goma
      if (s.bot && s.done !== 'win') { const bx = c.x + s.bot.x, by = c.y + s.bot.y; G.line(bx, by, bx + 6, by - 8, K); G.line(bx + 1, by, bx + 7, by - 8, K); G.rect(bx + 5, by - 11, 4, 4, Gr); }
      if (s.cur && s.last) { const b = s.bs, x0 = Math.round(s.cur.x - b / 2), y0 = Math.round(s.cur.y - b / 2); G.box(x0, y0, b, b, K); G.box(x0 + 1, y0 + 1, b - 2, b - 2, W); }
    },
  };

  // ======================= MODO MICRO dentro de la escena de juego =======================
  const ACC = [[L, K, K], [B, L, W], [B, Gr, W], [Gr, W, K]]; // [acento, acento2, texto sobre acento] por bloque
  S.initMicro = function () {
    this.mg = G.MICRO[this.cfg.game];
    this.rounds = this.cfg.rounds; this.round = 0; this.lives = 4; this.closed = 0;
    this.mphase = 'idle'; this.ms = null; this.foff = { x: 0, y: 0 };
    this.layoutMicro(1);
  };
  S.layoutMicro = function (round) {
    const ar = area(), mode = this.mg.mode || 'window';
    this.mmode = mode;
    const st = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]];
    const title = this.L.name.indexOf('.') >= 0 ? this.L.name : this.L.name + '.EXE';
    this.fuseR = { x: ar.x + 3, y: ar.y + 1, w: ar.w - 6, h: 11 };
    if (mode === 'window') {
      this.mwin = { x: 4, y: ar.y + 2, w: G.W - 8, h: ar.h - 2, st, title, stripes: true, xmode: 'x' };
      const b = { x: this.mwin.x + 2, y: this.mwin.y + G.WIN_BAR + 2, w: this.mwin.w - 4, h: this.mwin.h - G.WIN_BAR - 4 };
      this.mbody = b; this.gameR = { x: b.x, y: b.y + 10, w: b.w, h: b.h - 10 };
    } else if (mode === 'float') {
      const sz = this.mg.float(ar.w, ar.h - 16, round || 1, this.rounds);
      const w = Math.min(ar.w - 10, sz.w), h = Math.min(ar.h - 24, sz.h);
      this.mwin = { x: Math.round(G.W / 2 - w / 2), y: Math.round(ar.y + 15 + (ar.h - 15 - h) / 2), w, h, st, title: sz.title || title, stripes: true, xmode: 'x' };
      const b = { x: this.mwin.x + 2, y: this.mwin.y + G.WIN_BAR + 2, w: w - 4, h: h - G.WIN_BAR - 4 };
      this.mbody = b; this.gameR = b;
    } else {
      this.mwin = null; this.mbody = { x: ar.x, y: ar.y + 14, w: ar.w, h: ar.h - 14 }; this.gameR = this.mbody;
    }
  };
  S.startRound = function () {
    this.round++;
    const boss = this.round === this.rounds;
    const d = G.clamp(((this.round - 1) / Math.max(1, this.rounds - 1)) * 0.75 + this.tier * 0.12 + (boss ? 0.15 : 0), 0, 1);
    this.layoutMicro(this.round);
    if (this.round > 1 || !this.wall) this.wall = G.randomWallpaper(this.block);
    const acc = ACC[this.block], gr = this.gameR;
    const s = { r: { x: gr.x, y: gr.y, w: gr.w, h: gr.h }, d, t: 0, boss, block: this.block, round: this.round, rounds: this.rounds, st: this.mwin ? this.mwin.st : G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]], acc: acc[0], acc2: acc[1], accTx: acc[2], done: null, reason: '', hint: this.mg.hint };
    s.win = () => { if (!s.done) s.done = 'win'; };
    s.fail = (why) => { if (!s.done) { s.done = 'lose'; s.reason = why || 'ERROR'; } };
    s.T = (this.mg.time || 0) * (1 - 0.3 * d) * (boss ? 1.25 : 1);
    this.mg.init(s);
    this.ms = s; this.mphase = 'cmd'; this.pt = 0;
    A().sfx('cmd'); G.pulse({ glitch: 0.5, ab: 3 });
    A().intensity(d);
    G.fx.abBase = (this.block === 3 ? 1 : Math.round(d * 0.8)) + (boss ? 1 : 0);
    G.fx.glitchBase = (this.block === 3 ? 0.04 + d * 0.06 : d > 0.55 ? (d - 0.55) * 0.1 : 0) + (boss ? 0.03 : 0);
  };
  S.updateMicro = function (dt) {
    const s = this.ms; if (!s) return;
    this.pt += dt;
    if (this.mphase === 'cmd') { if (this.pt > Math.max(0.75, 1.15 - s.d * 0.35)) { this.mphase = 'play'; this.pt = 0; G.pulse({ ab: 2 }); } return; }
    if (this.mphase === 'play') {
      s.t += dt;
      if (this.mg.update) this.mg.update(s, dt);
      if (!s.done && s.T > 0 && s.t >= s.T) { if (this.mg.winOnTimeout) s.win(); else s.fail('TIME OUT'); }
      if (s.done) {
        this.mphase = 'res'; this.pt = 0;
        if (s.done === 'win') {
          this.closed++; this.score += Math.round(100 * (1 + s.d) + (s.T > 0 ? Math.max(0, s.T - s.t) * 30 : 50));
          A().sfx('ok'); G.pulse({ ab: 3, flash: 0.15, flashCol: W });
        } else {
          this.lives--; A().sfx('bad'); G.vibrate(60); G.pulse({ glitch: 1, ab: 6, shake: 7 });
        }
      }
      return;
    }
    if (this.mphase === 'res' && this.pt > 0.85) {
      if (this.lives <= 0) return this.lose('NO LIVES LEFT');
      if (this.round >= this.rounds) return this.win();
      this.startRound();
    }
  };
  S.drawFuse = function (r, st, s) {
    const fuse = s ? G.clamp(this.mphase === 'cmd' ? 1 : this.mg.fuse ? this.mg.fuse(s) : s.T > 0 ? 1 - s.t / s.T : 1, 0, 1) : 1;
    G.rect(r.x, r.y, r.w, r.h, st.bd); G.box(r.x, r.y, r.w, r.h, st.tx);
    const fw = Math.round((r.w - 6) * fuse), hot = fuse < 0.3 && Math.floor(G.time * 8) % 2;
    for (let i = 0; i < fw; i += 4) G.rect(r.x + 3 + i, r.y + 2, Math.min(3, fw - i), r.h - 4, hot && s ? (s.acc === L ? st.tx : s.acc) : st.tx);
  };
  S.drawMicro = function (g) {
    g.drawImage(this.wall, 0, 0);
    if (this.block === 3 && Math.random() < 0.08) { const y = G.irand(0, G.H - 10), h = G.irand(2, 8); g.drawImage(this.wall, 0, y, G.W, h, G.irand(-12, 12), y, G.W, h); }
    const s = this.ms, T = G.ctx();
    const stD = G.WSTYLES[['m1', 'b2', 'g3', 'g4'][this.block]];
    this.foff = this.mmode === 'float' ? { x: Math.round(G.tilt.x * (this.mg.tilt || 0)), y: Math.round(G.tilt.y * (this.mg.tilt || 0)) } : { x: 0, y: 0 };
    if (this.state !== 'intro') {
      if (this.mmode === 'desk') {
        this.drawFuse(this.fuseR, stD, s);
        if (s) { T.save(); T.beginPath(); T.rect(s.r.x, s.r.y, s.r.w, s.r.h); T.clip(); this.mg.draw(s); T.restore(); }
      } else {
        T.save(); T.translate(this.foff.x, this.foff.y);
        const w = this.mwin; w.title = (this.mmode === 'float' && s && s.title) ? s.title : w.title;
        const r0 = G.drawFrame(w);
        if (this.mmode === 'window') this.drawFuse({ x: r0.x + 2, y: r0.y + 1, w: r0.w - 4, h: 8 }, w.st, s);
        if (s) { T.save(); T.beginPath(); T.rect(s.r.x, s.r.y, s.r.w, s.r.h); T.clip(); this.mg.draw(s); T.restore(); }
        T.restore();
        if (this.mmode === 'float') this.drawFuse(this.fuseR, stD, s);
      }
      if (s && this.mphase === 'cmd') this.drawCmd(s);
      if (s && this.mphase === 'res') this.drawRes(s);
    }
    const info = { label: '♥'.repeat(Math.max(0, this.lives)) + '  ' + Math.min(this.round, this.rounds) + '/' + this.rounds, startDown: this.startDown > 0 };
    G.drawTaskbar(this.block, info);
    if (this.state === 'intro') { this.dim(); this.drawIntro(); }
    if (this.state === 'paused') { this.dim(); this.drawPause(); }
    if (this.state === 'clear') this.drawClear();
  };
  // orden grande estilo ventana de error
  S.drawCmd = function (s) {
    const b = this.mbody, k = Math.max(0, 0.18 - this.pt) * 5;
    G.drect(b.x, b.y, b.w, b.h, 6, K, null);
    const fs = Math.max(18, Math.floor(G.W / 6.5));
    const spr = G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
    const sc = 1 + k, ww = Math.round(spr.width * sc), hh = Math.round(spr.height * sc);
    const ar = area(), cy = Math.round(ar.y + ar.h * 0.42);
    const bw = Math.min(G.W - 16, Math.max(ww + 24, 150)), bh = hh + 40;
    const bx = Math.round(G.W / 2 - bw / 2), by = Math.round(cy - bh / 2);
    G.rect(bx + 3, by + 3, bw, bh, K);
    G.rect(bx, by, bw, bh, s.acc === L ? K : s.acc); G.box(bx, by, bw, bh, W);
    G.rect(bx + 1, by + 1, bw - 2, 10, W); G.text(s.boss ? 'BOSS.EXE' : 'ROUND ' + this.round, bx + 4, by + 2, K);
    const T = G.ctx();
    if (Math.floor(this.pt * 20) % 7 === 0) T.drawImage(G.fsprite(this.mg.cmd, 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, s.acc2 === K ? L : s.acc2, 120), Math.round(bx + bw / 2 - ww / 2) - 3, by + 14, ww, hh);
    T.drawImage(spr, Math.round(bx + bw / 2 - ww / 2), by + 14, ww, hh);
    G.wrap(s.hint, bw - 12).forEach((ln, i) => G.text(ln, bx + bw / 2, by + hh + 18 + i * 9, W, { al: 'c' }));
    if (s.boss && Math.floor(this.pt * 6) % 2 === 0) G.text('!! BOSS ROUND !!', G.W / 2, by - 12, W, { al: 'c', b: true });
  };
  S.drawRes = function (s) {
    const ar = area();
    if (s.done === 'win') {
      const fs = Math.max(22, Math.floor(G.W / 5));
      const spr = G.fsprite('OK!', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
      const x = Math.round(G.W / 2 - spr.width / 2), y = Math.round(ar.y + ar.h * 0.4 - spr.height / 2);
      G.rect(x - 10, y - 6, spr.width + 20, spr.height + 12, s.acc === L ? K : s.acc); G.box(x - 10, y - 6, spr.width + 20, spr.height + 12, W);
      G.ctx().drawImage(spr, x, y);
    } else {
      const w = { x: Math.round(G.W / 2 - 70), y: Math.round(ar.y + ar.h * 0.4 - 30), w: 140, h: 62, st: G.WSTYLES.m1, title: 'ERROR', stripes: true, xmode: 'x' };
      const r = G.drawFrame(w);
      G.drawSpr('xcirc', r.x + 6, r.y + 6, { '#': K });
      G.text(s.reason, r.x + 21, r.y + 6, K);
      G.text('-1 ♥  ' + Math.max(0, this.lives) + ' LEFT', r.x + 21, r.y + 17, K);
      G.drawBtn(w.x + 50, w.y + w.h - 18, 40, 13, 'OK', K, W);
    }
  };
  S.tapMicro = function (x, y) {
    if (this.mphase !== 'play' || !this.ms || this.ms.done) return;
    x -= this.foff.x; y -= this.foff.y;
    const s = this.ms;
    if (this.mg.down) this.mg.down(s, x, y);
    if (this.mg.tap) this.mg.tap(s, x, y);
  };
  S.move = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.move) this.mg.move(this.ms, x - this.foff.x, y - this.foff.y);
  };
  S.up = function (x, y) {
    if (this.cfg.mode !== 'micro' || this.state !== 'play' || this.mphase !== 'play' || !this.ms || this.ms.done) return;
    if (this.mg.up) this.mg.up(this.ms, x - this.foff.x, y - this.foff.y);
  };
})(window.G);
