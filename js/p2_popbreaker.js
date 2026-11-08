'use strict';
// PARTE 2 · 16 POP.BREAKER: rompeladrillos sobre el escritorio de la parte 1. Los ladrillos son ventanitas
// emergentes, la pala es el botón START de la barra de tareas y la pelota es el reloj de arena.
// Se mueve arrastrando el dedo en cualquier parte (movimiento relativo: el dedo no tapa nada).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const VW = 46, VH = 28, ROWG = 8, SLIDE_GAP = 20, BR = 6; // ventanita, hueco entre filas, pelota (medio lado)

  // estilos por bloque de color (la regla de la parte 1)
  const POOL = [
    { basic: ['m1', 'm2', 'm3', 'm5'], armor: 'm4', copy: 'm2', boss: 'm1', rage: 'm2', pad: { bg: K, fg: W } },
    { basic: ['m1', 'm2', 'm3', 'b2', 'b4'], armor: 'b3', copy: 'b1', boss: 'b3', rage: 'b1', pad: { bg: B, fg: W } },
    { basic: ['m1', 'm2', 'b2', 'g1', 'g3'], armor: 'b3', copy: 'g2', boss: 'g4', rage: 'g2', pad: { bg: K, fg: Gr } },
    { basic: ['m1', 'm2', 'b2', 'b4', 'g1', 'g3'], armor: 'g4', copy: 'g2', boss: 'b3', rage: 'g2', pad: { bg: K, fg: W } },
  ];
  const pool = (s) => POOL[Math.min(3, s.block)];
  const TITLES = ['ERROR', 'SPAM', '404', 'OOPS', 'ALERT'];

  // ---------- utilidades ----------
  const hitR = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function burst(s, x, y, n, col) { for (let i = 0; i < n; i++) s.parts.push({ x, y, vx: G.rand(-60, 60), vy: G.rand(-80, 10), t: 0, life: G.rand(0.25, 0.5), col }); }
  function ghost(s, o) { s.ghosts.push({ x: o.x, y: o.y, w: o.w, h: o.h, t: 0, col: o.st.fr === K ? (s.block === 0 ? W : K) : o.st.fr }); }
  function mkPop(s, kind, o) {
    const pl = pool(s), st = G.WSTYLES[kind === 'armor' ? pl.armor : kind === 'copy' ? pl.copy : G.pick(pl.basic)];
    const title = kind === 'armor' ? 'WARN!' : kind === 'copy' ? 'COPY' : kind === 'mini' ? 'AGAIN' : G.pick(TITLES);
    return Object.assign({ w: VW, h: VH, kind, st, title, hp: 1, max: 1, flash: 0, crack: G.rand(0, 6), st8: 'form', et: 0 }, o);
  }
  function newBall(s, x, y, vx, vy, held) { const b = { x, y, vx, vy, held: !!held, trail: [] }; s.balls.push(b); return b; }

  G.MICRO.popbreaker = {
    mode: 'desk', cmd: 'BREAK!', hint: 'DRAG TO MOVE - BREAK THE POP-UPS', time: 10, fx: 0.5,
    help: ['DRAG ANYWHERE TO MOVE', 'THE START BUTTON. BOUNCE', 'THE HOURGLASS AND BREAK', 'EVERY POP-UP. DONT DROP IT.'],
    init(s) {
      const r = s.r, d = s.d, pl = pool(s);
      s.ptr = null; s.parts = []; s.ghosts = []; s.balls = []; s.ens = []; s.xs = []; s.kills = 0; s.clearT = -1; s.dead = false; s.pops = [];
      s.spd = 340 + 80 * d; s.spd0 = s.spd;
      const pw = Math.round(58 - 8 * d);
      s.pd = { x: Math.round(r.x + r.w / 2 - pw / 2), y: r.y + r.h - 16, w: pw, h: 12, frz: 0, bump: 0, col: pl.pad };
      newBall(s, s.pd.x + pw / 2, s.pd.y - BR - 1, 0, 0, true);
      s.launchT = 0.45;
      if (s.boss) { this.initBoss(s); return; }
      // filas de ventanitas: muro de 5 columnas (casi pegadas, como un rompeladrillos) y filas que patinan
      const C = 5, m = 3;
      s.colSp = (r.w - 2 * m - VW) / (C - 1); s.m = m;
      const plan = [{ type: 'grid', n: 4 }, { type: 'grid', n: 4 }];
      if (d >= 0.1) plan[0].n = 5;
      if (d >= 0.25) plan.splice(1, 0, { type: 'slide', n: 2 });
      if (d >= 0.4) plan[1].n = 3;
      if (d >= 0.55) plan.push({ type: 'slide', n: 2 });
      const rowsN = plan.length;
      s.fy = Math.round(r.y + r.h * 0.5 - rowsN * (VH + ROWG) + ROWG); // la formación acaba a media pantalla: ciclos cortos
      s.rows = plan.map((p, i) => {
        const row = { type: p.type, i };
        if (p.type === 'slide') {
          row.span = (p.n - 1) * (VW + SLIDE_GAP) + VW;
          row.x = G.rand(r.x + 4, r.x + r.w - 4 - row.span); row.v = (35 + 60 * d) * (i % 2 ? -1 : 1) * G.rand(0.85, 1.15);
          for (let k = 0; k < p.n; k++) s.ens.push(mkPop(s, 'basic', { row: i, slot: k }));
        } else {
          const cols = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, p.n).sort((a, b) => a - b);
          for (const k of cols) s.ens.push(mkPop(s, 'basic', { row: i, slot: k }));
        }
        return row;
      });
      // blindadas (2-3 golpes) arriba; una COPY (pelota extra) desde la ronda 3
      const armors = d >= 0.1 ? 1 + Math.floor(d * 2.2) : 0;
      const grid = s.ens.filter((e) => s.rows[e.row].type === 'grid').sort((a, b) => a.row - b.row || Math.random() - 0.5);
      grid.slice(0, armors).forEach((e) => { Object.assign(e, mkPop(s, 'armor', { row: e.row, slot: e.slot })); e.hp = e.max = d >= 0.4 ? 3 : 2; });
      if (d >= 0.25) { const c = s.ens.filter((e) => e.kind === 'basic' && s.rows[e.row].type === 'grid'); if (c.length) { const e = c[c.length - 1]; Object.assign(e, mkPop(s, 'copy', { row: e.row, slot: e.slot })); } }
      s.ens.forEach((e, k) => { e.st8 = 'enter'; e.et = -k * 0.04; Object.assign(e, this.slotPos(s, e)); });
      s.total = s.ens.length;
      // cuota: hay que romper casi todas (las últimas sueltas cuestan mucho); el resto se cierra solo al ganar
      s.need = s.total - 3 - (d >= 0.55 ? 1 : 0);
      const extra = s.ens.reduce((a, e) => a + e.hp - 1, 0);
      s.T = 3.5 + s.need * (1.4 - 0.35 * d) + extra * 0.5;
    },
    initBoss(s) {
      const r = s.r, w = Math.min(124, r.w - 40), h = 72, pl = pool(s);
      s.bo = { st: G.WSTYLES[pl.boss], title: 'FATAL.ERR', x: r.x + r.w / 2 - w / 2, y: r.y - h - 10, y0: r.y + 2, w, h, hp: 5, max: 5, ph: 'enter', pt: 0, ang: 0, flash: 0, rage: false, dying: -1, spawnT: 0.6, dropT: 2.2, tele: 0, spawned: 0 };
      s.slots = [0, 1, 2].map((k) => ({ x: r.x + 10 + k * ((r.w - 20 - VW) / 2), y: s.bo.y0 + h + 6, e: null })); // escudo pegado debajo: la pelota no cabe entre los dos
      s.T = 32;
      s.launchT = 1.3; // la pelota sale cuando el jefe ya ha bajado
    },
    slotPos(s, e) {
      const r = s.r, row = s.rows[e.row], y = s.fy + e.row * (VH + ROWG);
      if (row.type === 'slide') return { x: row.x + e.slot * (VW + SLIDE_GAP), y };
      return { x: Math.round(r.x + s.m + e.slot * s.colSp), y };
    },
    // ---------- entrada: arrastre relativo con un dedo ----------
    down(s, x, y, e) { s.ptr = { id: e ? e.pointerId : 1, x, y }; },
    move(s, x, y, e) {
      const p = s.ptr; if (!p || (e && e.pointerId !== p.id)) return;
      const r = s.r, pd = s.pd;
      pd.x = G.clamp(pd.x + (x - p.x) * 1.3 * (pd.frz > 0 ? 0.35 : 1), r.x + 1, r.x + r.w - pd.w - 1); // si le da una X va a cámara lenta (NOT RESPONDING)
      p.x = x; p.y = y;
    },
    up(s, x, y, e) { if (s.ptr && (!e || e.pointerId === s.ptr.id)) s.ptr = null; },
    // ---------- lógica ----------
    update(s, dt) {
      const r = s.r, pd = s.pd;
      for (const q of s.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; }
      s.parts = s.parts.filter((q) => q.t < q.life);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.18);
      for (const p of s.pops) p.t += dt; s.pops = s.pops.filter((p) => p.t < 0.7);
      if (pd.frz > 0) pd.frz -= dt; if (pd.bump > 0) pd.bump -= dt;
      if (s.dead) return;
      if (s.clearT >= 0) { // las que quedan se cierran solas, una tras otra
        s.clearT += dt;
        for (const e of s.ens) if (!e.dead && s.clearT >= e.closeAt) { e.dead = true; ghost(s, e); burst(s, e.x + VW / 2, e.y + 6, 4, e.st.fr === K ? W : e.st.fr); A().sfx('close', Math.min(9, ++s.kills)); }
        if (s.clearT > s.clearEnd) s.win();
        return;
      }
      // filas que patinan
      if (!s.boss) for (const row of s.rows) if (row.type === 'slide') {
        row.x += row.v * dt;
        if (row.x < r.x + 4) { row.x = r.x + 4; row.v = Math.abs(row.v); } else if (row.x + row.span > r.x + r.w - 4) { row.x = r.x + r.w - 4 - row.span; row.v = -Math.abs(row.v); }
      }
      for (const e of s.ens) {
        if (e.flash > 0) e.flash -= dt;
        if (e.st8 === 'enter') { e.et += dt; if (e.et >= 0 && !e.pop) { e.pop = true; A().sfx('spawn', G.irand(0, 2)); } if (e.et >= 0.12) e.st8 = 'form'; }
        else if (e.st8 === 'fly') { e.ft += dt; const k = G.clamp(e.ft / 0.35, 0, 1); e.x = G.lerp(e.fx, e.slot.x, k); e.y = G.lerp(e.fy, e.slot.y, k); if (k >= 1) e.st8 = 'form'; }
        if (!s.boss && e.st8 !== 'fly') { const p = this.slotPos(s, e); e.x = p.x; e.y = p.y; }
      }
      if (s.boss) this.updateBoss(s, dt);
      // pelotas: la primera espera encima de la pala
      s.launchT -= dt;
      for (const b of s.balls) {
        if (b.held) {
          b.x = pd.x + pd.w / 2; b.y = pd.y - BR - 1;
          if (s.launchT <= 0) { const a = G.rand(0.2, 0.5) * (Math.random() < 0.5 ? -1 : 1); b.vx = Math.sin(a) * s.spd; b.vy = -Math.cos(a) * s.spd; b.held = false; A().sfx('bounce', 0); }
          continue;
        }
        b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 4) b.trail.pop();
        const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
        for (let i = 0; i < n && !b.gone; i++) this.stepBall(s, b, dt / n);
        if (s.dead || s.clearT >= 0) return;
      }
      s.balls = s.balls.filter((b) => !b.gone);
      if (!s.balls.length && !s.done) { s.dead = true; G.vibrate(60); G.pulse({ shake: 5, glitch: 0.6 }); s.fail('BALL LOST'); return; }
      // ventanitas cerradas
      for (let i = s.ens.length - 1; i >= 0; i--) if (s.ens[i].dead) s.ens.splice(i, 1);
      if (!s.boss && s.kills >= s.need) {
        s.clearT = 0; s.ens.forEach((e, k) => (e.closeAt = 0.08 + k * 0.07)); s.clearEnd = 0.35 + s.ens.length * 0.07;
        s.T = Math.max(s.T, s.t + s.clearEnd + 0.3);
        s.pops.push({ x: s.r.x + s.r.w / 2, y: s.pd.y - 30, txt: 'ALL CLOSED', t: 0 }); A().sfx('combo'); G.pulse({ ab: 3 });
      }
    },
    stepBall(s, b, dt) {
      const r = s.r, pd = s.pd;
      const ox = b.x, oy = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      // paredes y techo
      if (b.x - BR < r.x) { b.x = r.x + BR; b.vx = Math.abs(b.vx); A().sfx('tap'); }
      else if (b.x + BR > r.x + r.w) { b.x = r.x + r.w - BR; b.vx = -Math.abs(b.vx); A().sfx('tap'); }
      if (b.y - BR < r.y) { b.y = r.y + BR; b.vy = Math.abs(b.vy); A().sfx('tap'); }
      // la pala: el ángulo depende de dónde toca
      if (b.vy > 0 && b.y + BR >= pd.y && oy + BR <= pd.y + 3 && b.x + BR >= pd.x - 1 && b.x - BR <= pd.x + pd.w + 1) {
        const off = G.clamp((b.x - (pd.x + pd.w / 2)) / (pd.w / 2 + BR), -1, 1), a = off * 1.05;
        s.spd = Math.min(s.spd0 * 1.22, s.spd * 1.015);
        b.vx = Math.sin(a) * s.spd; b.vy = -Math.cos(a) * s.spd; b.y = pd.y - BR - 0.5;
        pd.bump = 0.1; A().sfx('bounce', Math.abs(off) * 2); G.vibrate(5);
        return;
      }
      if (b.y - BR > r.y + r.h + 4) { b.gone = true; burst(s, b.x, r.y + r.h, 6, W); return; }
      const bb = { x: b.x - BR, y: b.y - BR, w: BR * 2, h: BR * 2 };
      // ventanitas
      for (const e of s.ens) {
        if (e.dead || e.st8 === 'enter' && e.et < 0.04 || !hitR(bb, e)) continue;
        this.bounceOff(b, e, ox, oy);
        this.hitPop(s, e, b);
        return;
      }
      // el jefe
      const bo = s.bo;
      if (bo && bo.ph !== 'enter' && bo.dying < 0 && hitR(bb, bo)) { this.bounceOff(b, bo, ox, oy); this.hitBoss(s, b); }
    },
    bounceOff(b, o, ox, oy) { // sale por el lado por el que entró (sin pegarse a ventanas que se mueven)
      const wasX = ox + BR > o.x && ox - BR < o.x + o.w, wasY = oy + BR > o.y && oy - BR < o.y + o.h;
      let horiz;
      if (wasY && !wasX) horiz = true; else if (wasX && !wasY) horiz = false;
      else { const dx = Math.min(b.x + BR - o.x, o.x + o.w - (b.x - BR)), dy = Math.min(b.y + BR - o.y, o.y + o.h - (b.y - BR)); horiz = dx < dy; }
      if (horiz) { const sg = b.x < o.x + o.w / 2 ? -1 : 1; b.vx = sg * Math.abs(b.vx); b.x = sg < 0 ? o.x - BR - 0.5 : o.x + o.w + BR + 0.5; }
      else { const sg = b.y < o.y + o.h / 2 ? -1 : 1; b.vy = sg * Math.abs(b.vy); b.y = sg < 0 ? o.y - BR - 0.5 : o.y + o.h + BR + 0.5; }
    },
    hitPop(s, e, b) {
      e.hp--; e.flash = 0.08;
      if (e.hp > 0) { A().sfx('hit'); burst(s, b.x, b.y, 2, e.st.fr); return; }
      e.dead = true; s.kills++; ghost(s, e);
      burst(s, e.x + VW / 2, e.y + 6, 5, e.st.bar === K ? (s.block === 0 ? W : e.st.fr) : e.st.bar);
      A().sfx('close', Math.min(9, s.kills)); G.pulse({ ab: 1.5 }); G.vibrate(6);
      if (e.slot && e.slot.e === e) e.slot.e = null;
      if (e.kind === 'copy') { // COPY: sale otra pelota
        const a = Math.atan2(b.vy, b.vx) + (Math.random() < 0.5 ? -0.7 : 0.7);
        let vy = Math.sin(a) * s.spd; if (Math.abs(vy) < s.spd * 0.45) vy = -s.spd * 0.6;
        newBall(s, e.x + VW / 2, e.y + VH / 2, Math.cos(a) * s.spd, vy);
        s.pops.push({ x: e.x + VW / 2, y: e.y, txt: 'COPIED x2', t: 0 }); A().sfx('combo');
      }
    },
    // ---------- jefe: la ventana FATAL.ERR ----------
    updateBoss(s, dt) {
      const r = s.r, bo = s.bo, pd = s.pd;
      if (bo.flash > 0) bo.flash -= dt;
      if (bo.dying >= 0) {
        bo.dying += dt;
        if (Math.random() < dt * 14) { const gw = G.irand(20, 50), gh = G.irand(14, 34); s.ghosts.push({ x: bo.x + G.rand(0, bo.w - gw), y: bo.y + G.rand(0, bo.h - gh), w: gw, h: gh, t: 0, col: W }); burst(s, bo.x + Math.random() * bo.w, bo.y + Math.random() * bo.h, 4, G.pick([W, bo.st.bd])); A().sfx('close', G.irand(3, 9)); }
        if (bo.dying > 1.15 && !bo.gone) { bo.gone = true; ghost(s, bo); s.balls = []; s.win(); }
        return;
      }
      bo.pt += dt;
      if (bo.ph === 'enter') { bo.y = G.lerp(r.y - bo.h - 10, bo.y0, G.clamp(bo.pt / 1.1, 0, 1)); if (bo.pt > 1.1) { bo.ph = 'live'; } }
      else {
        const amp = (r.w - bo.w) / 2 - 4;
        bo.ang += dt * (bo.rage ? 1.05 : 0.7);
        bo.x = r.x + r.w / 2 - bo.w / 2 + Math.sin(bo.ang) * amp;
        bo.y = bo.y0 + (1 + Math.sin(s.t * 1.6)) * 1.5; // pegado arriba: la pelota no se cuela por encima
        // suelta ventanitas AGAIN que hacen de escudo (y de vez en cuando una COPY)
        bo.spawnT -= dt;
        const free = s.slots.filter((q) => !q.e);
        if (bo.spawnT <= 0 && free.length) {
          bo.spawnT = bo.rage ? 1.6 : 2.2;
          const q = free.sort((a, b) => Math.abs(a.x - bo.x) - Math.abs(b.x - bo.x))[0];
          bo.spawned++;
          const e = mkPop(s, bo.spawned % 4 === 0 ? 'copy' : 'mini', { st8: 'fly', ft: 0, fx: bo.x + bo.w / 2 - VW / 2, fy: bo.y + bo.h - VH, slot: q });
          e.x = e.fx; e.y = e.fy; q.e = e; s.ens.push(e); A().sfx('spawn', G.irand(0, 2));
        }
        // avisa y suelta una X sobre la pala
        if (bo.tele > 0) { bo.tele -= dt; if (bo.tele <= 0) { const n = bo.rage ? 2 : 1; for (let i = 0; i < n; i++) s.xs.push({ x: bo.x + bo.w / 2 + (n > 1 ? (i ? 14 : -14) : 0), y: bo.y + bo.h, vy: 150 + (bo.rage ? 40 : 0) }); A().sfx('zap'); } }
        else { bo.dropT -= dt; if (bo.dropT <= 0) { bo.dropT = (bo.rage ? 1.9 : 2.6) * G.rand(0.8, 1.2); bo.tele = 0.45; A().sfx('warn'); } }
      }
      // las X caen: si dan a la pala, se queda colgada un momento
      for (const q of s.xs) {
        q.y += q.vy * dt;
        if (!q.gone && hitR({ x: q.x - 5, y: q.y - 5, w: 10, h: 10 }, pd)) { q.gone = true; pd.frz = 1.0; A().sfx('deny'); G.pulse({ shake: 3, glitch: 0.4 }); G.vibrate(40); burst(s, q.x, q.y, 5, W); }
      }
      s.xs = s.xs.filter((q) => !q.gone && q.y < r.y + r.h + 10);
    },
    hitBoss(s, b) {
      const bo = s.bo;
      bo.hp--; bo.flash = 0.1; burst(s, b.x, b.y, 4, W); A().sfx('hit'); G.pulse({ glitch: 0.5, ab: 3 }); G.vibrate(20);
      if (!bo.rage && bo.hp <= bo.max / 2) { bo.rage = true; bo.st = G.WSTYLES[pool(s).rage]; bo.title = 'FATAL.ERR!!'; G.pulse({ glitch: 0.9, ab: 4 }); A().sfx('alarm'); }
      if (bo.hp <= 0) {
        bo.dying = 0; s.xs = []; s.balls.forEach((q) => { if (q !== b) q.gone = true; }); b.vx *= 0.3; b.vy = Math.abs(b.vy) * 0.3;
        for (const e of s.ens) { e.dead = true; ghost(s, e); }
        s.T = Math.max(s.T, s.t + 1.6); A().sfx('boom'); G.pulse({ flash: 0.3, flashCol: W, shake: 6, glitch: 1 }); G.vibrate(120);
      }
    },
    // ---------- dibujo ----------
    drawPop(s, e) {
      let x = Math.round(e.x), y = Math.round(e.y);
      if (e.st8 === 'enter') {
        if (e.et < 0) return;
        const k = Math.min(1, e.et / 0.12), ww = Math.max(4, VW * k), hh = Math.max(3, VH * k);
        G.box(x + (VW - ww) / 2, y + (VH - hh) / 2, ww, hh, e.st.fr === K ? K : e.st.fr); return;
      }
      if (e.flash > 0) x += G.irand(-1, 1);
      const st = e.st;
      const rr = G.drawFrame({ x, y, w: VW, h: VH, st, title: e.title, stripes: false, xmode: 'x' });
      if (e.kind === 'armor') { G.box(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2, st.tx); G.drawSpr('warn', rr.x + 3, rr.y + 2, { '#': st.ac }); }
      else if (e.kind === 'copy') { G.box(rr.x + 3, rr.y + 2, 8, 6, st.tx); G.rect(rr.x + 6, rr.y + 5, 8, 6, st.bd); G.box(rr.x + 6, rr.y + 5, 8, 6, st.tx); }
      else G.drawSpr('xcirc', rr.x + 3, rr.y + 2, { '#': st.ac });
      const bx = rr.x + rr.w - 21, byy = rr.y + 2;
      G.rect(bx, byy, 18, 9, st.bd); G.box(bx, byy, 18, 9, st.tx); G.text(e.kind === 'copy' ? 'x2' : 'OK', bx + 9, byy + 1, st.tx, { al: 'c' });
      if (e.max > 1 && e.hp < e.max) {
        const n = e.max - e.hp, c0 = e.crack;
        for (let i = 0; i < n; i++) { const cx0 = x + 8 + ((c0 * 7 + i * 17) % (VW - 16)); G.line(cx0, y + 1, cx0 + 4, y + 9, st.tx); G.line(cx0 + 4, y + 9, cx0 - 1, y + 17, st.tx); G.line(cx0 - 1, y + 17, cx0 + 5, y + VH - 2, st.tx); }
      }
      if (e.flash > 0) G.drect(x, y, VW, VH, 8, W, null);
    },
    drawBall(s, b) {
      // estela tramada y el reloj de arena con contorno blanco (se ve en cualquier fondo)
      b.trail.forEach((q, i) => { if (i % 2) return; const c = s.block >= 2 ? Gr : W; G.drect(Math.round(q.x) - 3, Math.round(q.y) - 3, 6, 6, 8 - i * 2, c, null); });
      const x = Math.round(b.x) - 7, y = Math.round(b.y) - 9, sp = (b.held || Math.floor(G.time * 6) % 2) ? 'hg1' : 'hg2';
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) G.drawSpr(sp, x + dx, y + dy, { '#': W, o: W }, 2);
      G.drawSpr(sp, x, y, { '#': K, o: s.block >= 2 ? Gr : B }, 2);
    },
    drawPaddle(s) {
      const pd = s.pd, c = pd.col, x = Math.round(pd.x), y = pd.y, frz = pd.frz > 0;
      const shx = frz ? G.irand(-1, 1) : 0;
      G.rect(x + 2 + shx, y + 2, pd.w, pd.h, K);
      const pressed = pd.bump > 0;
      G.rect(x + shx, y, pd.w, pd.h, pressed ? c.fg : c.bg); G.box(x + shx, y, pd.w, pd.h, c.fg); G.box(x - 1 + shx, y - 1, pd.w + 2, pd.h + 2, c.bg === K ? (s.block >= 2 ? K : W) : K);
      const ink = pressed ? c.bg : c.fg;
      if (frz) { // NOT RESPONDING: reloj de arena y WAIT
        G.drawSpr(Math.floor(G.time * 6) % 2 ? 'hg1' : 'hg2', x + pd.w / 2 - 17 + shx, y + 2, { '#': ink, o: ink });
        G.text('WAIT', x + pd.w / 2 - 6 + shx, y + 3, ink);
        return;
      }
      const lw = 9 + 3 + G.textW('START'), lx = Math.round(x + pd.w / 2 - lw / 2);
      G.drawSpr('eyelogo', lx, y + 3, { '#': ink });
      G.text('START', lx + 12, y + 3, ink);
    },
    draw(s) {
      const r = s.r;
      if (s.boss) this.drawBoss(s);
      for (const e of s.ens) if (!e.dead) this.drawPop(s, e);
      for (const gh of s.ghosts) { const k = 1 - gh.t / 0.18; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = gh.w * kk, hh = gh.h * kk; G.box(gh.x + (gh.w - ww) / 2, gh.y + (gh.h - hh) / 2, ww, hh, gh.col); } }
      for (const q of s.xs) { const x = Math.round(q.x), y = Math.round(q.y); G.rect(x - 5, y - 5, 11, 11, W); G.box(x - 5, y - 5, 11, 11, K); G.line(x - 3, y - 3, x + 3, y + 3, K); G.line(x + 3, y - 3, x - 3, y + 3, K); }
      this.drawPaddle(s);
      for (const b of s.balls) this.drawBall(s, b);
      for (const q of s.parts) G.rect(Math.round(q.x), Math.round(q.y), 2, 2, q.col);
      for (const p of s.pops) { const y = Math.round(p.y - 8 - p.t * 22), tw = G.textW(p.txt, 1, 1, true) + 6; G.rect(Math.round(p.x - tw / 2), y - 2, tw, 11, K); G.text(p.txt, Math.round(p.x), y, W, { al: 'c', b: true }); }
      if (!s.boss) {
        const t = 'BREAK ' + G.pad(Math.max(0, s.need - s.kills), 2), tw = G.textW(t, 1, 1, true) + 6;
        G.rect(r.x + r.w - tw - 2, r.y + 2, tw, 10, K); G.text(t, r.x + r.w - 5, r.y + 4, W, { al: 'r', b: true });
      }
    },
    drawBoss(s) {
      const bo = s.bo;
      if (bo.gone || bo.dying >= 0 && Math.floor(bo.dying * 18) % 2) return;
      const st = bo.st, x = Math.round(bo.x) + (bo.dying >= 0 || bo.flash > 0 ? G.irand(-2, 2) : 0), y = Math.round(bo.y);
      const r = G.drawFrame({ x, y, w: bo.w, h: bo.h, st, title: bo.title, stripes: true, xmode: 'x' });
      const hot = s.block >= 2 ? Gr : W;
      G.drawSpr('xcirc', r.x + 4, r.y + 4, { '#': bo.flash > 0 ? hot : st.ac }, 2);
      G.text('FATAL ERROR', r.x + 26, r.y + 5, st.tx, { b: true });
      G.text(bo.rage ? 'NOT RESPONDING' : 'POP-UPS: 9999', r.x + 26, r.y + 15, st.tx);
      // aviso antes de soltar la X
      if (bo.tele > 0 && Math.floor(bo.tele * 14) % 2) { G.rect(x + bo.w / 2 - 5, y + bo.h + 2, 10, 11, K); G.text('!', x + bo.w / 2, y + bo.h + 4, W, { al: 'c', b: true }); }
      // barra de errores que quedan
      const bw = r.w - 12, f = Math.round((bw - 2) * Math.max(0, bo.hp) / bo.max);
      G.text('ERRORS', r.x + 6, r.y + r.h - 20, st.tx); G.text(String(Math.max(0, bo.hp)), r.x + r.w - 6, r.y + r.h - 20, st.tx, { al: 'r' });
      G.box(r.x + 6, r.y + r.h - 10, bw, 7, st.tx); G.drect(r.x + 7, r.y + r.h - 9, f, 5, 10, st.tx, null);
      if (bo.rage && Math.random() < 0.3) G.drect(x, y + G.irand(0, bo.h - 6), bo.w, 4, 8, G.pick(s.block >= 2 ? [Gr, B, W] : [B, W]), null);
      if (bo.flash > 0) G.drect(x, y, bo.w, bo.h, 6, W, null);
    },
  };

  // icono: el reloj de arena rebota entre la pala y tres ventanitas, y cierra una
  G.ICONS[16] = function (t) {
    const per = 1.2, k = (t % per) / per, i0 = Math.floor(t / per) % 3;
    for (let i = 0; i < 3; i++) {
      const x = 1 + i * 8, y = 1;
      if (i === i0 && k > 0.5 && k < 0.75) { const kk = 1 - (k - 0.5) / 0.25, ww = Math.max(1, Math.round(7 * kk)), hh = Math.max(1, Math.round(5 * kk)); G.box(x + Math.round((7 - ww) / 2), y + Math.round((5 - hh) / 2), ww, hh, W); continue; }
      if (i === i0 && k >= 0.75) continue;
      G.rect(x, y, 7, 5, W); G.rect(x, y, 7, 2, Gr); G.px(x + 5, y, K);
    }
    const tx = 4 + i0 * 8, bx = 12, ph = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
    const px = Math.round(G.lerp(bx, tx, ph)), py = Math.round(G.lerp(14, 7, ph));
    G.rect(px - 1, py - 1, 3, 3, W);
    const padX = Math.round(G.lerp(8, 4 + i0 * 3, 0.5));
    G.rect(padX, 17, 10, 2, Gr);
  };
  G.CARD_SCHEMES[16] = { top: Gr, tt: K, ib: K, grid: B, bot: L, nc: B, bt: K };
})(window.G);
