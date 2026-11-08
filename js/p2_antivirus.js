'use strict';
// PARTE 2 · 14 ANTIVIRUS: matamarcianos sobre el escritorio de la parte 1. Los enemigos son ventanitas
// emergentes (las de siempre, en pequeño), tú eres la flecha del ratón: disparas sola y te mueves
// arrastrando el dedo en cualquier parte (movimiento relativo: el dedo no tapa la flecha).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const VW = 46, VH = 30, COLG = 14, ROWG = 8, SLIDE_GAP = 22; // ventanita y huecos de la formación

  // estilos de ventana por bloque de color (la regla de la parte 1)
  const POOL = [
    { basic: ['m1', 'm2', 'm3', 'm5'], armor: 'm4', shoot: 'm2', boss: 'm1', rage: 'm2' },
    { basic: ['m1', 'm2', 'm3', 'b2', 'b4'], armor: 'b3', shoot: 'b1', boss: 'b3', rage: 'b1' },
    { basic: ['m1', 'm2', 'b2', 'g1', 'g3'], armor: 'b3', shoot: 'g2', boss: 'g4', rage: 'g2' },
    { basic: ['m1', 'm2', 'b2', 'b4', 'g1', 'g3'], armor: 'g4', shoot: 'g2', boss: 'b3', rage: 'g2' },
  ];
  const pool = (s) => POOL[Math.min(3, s.block)];
  const TITLES = ['ERROR', 'ALERT', 'SPAM', '404', 'OOPS']; // VIRUS queda solo para las que disparan

  // ---------- jefe: estilos fijos (azul y blanco) y el dibujo blanco sobre azul ----------
  const BOSS_ST = { fr: W, bd: B, bar: W, bt: B, tx: W, ac: W, sh: K, out: K };
  const RAGE_ST = { fr: K, bd: B, bar: K, bt: W, tx: W, ac: W, sh: K, out: W };
  const ART_TXT = [['Bye Bye', 'YOUR DATA'], ['Delete', 'EVERYTHING']]; // normal / a media vida
  const artCache = new Map();
  // máscara 1 bit del dibujo: cometa con estela, bicho saltando, palabra en cursiva perfilada y palabra rayada que se deshace en guiones
  function artMask(w, h, rage) {
    const o = G.mkCanvas(w, h), x = o.x, R = G.rng(rage ? 77 : 41);
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    // estela: banda que se estrecha (perfil blanco), de la cola a la estrella
    const sx = w - 17, sy = 14;
    const p0 = { x: 3, y: 36 }, c1 = { x: w * 0.4, y: -3 }, p2 = { x: sx - 8, y: sy + 3 };
    const bez = (t) => ({ x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c1.x + t * t * p2.x, y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c1.y + t * t * p2.y });
    for (const pass of [0, 1]) {
      x.fillStyle = pass ? '#000' : '#fff';
      for (let t = 0; t <= 1; t += 0.003) {
        const p = bez(t), hw = 0.55 + 4.4 * Math.pow(t, 1.25), rr = pass ? hw - 1.35 : hw;
        if (rr > 0.2) { x.beginPath(); x.arc(p.x, p.y, rr, 0, Math.PI * 2); x.fill(); }
      }
    }
    // estrella de 5 puntas perfilada
    const star = (R1, R2, col) => {
      x.fillStyle = col; x.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + 0.25 + i * Math.PI / 5, rr = i % 2 ? R2 : R1; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    };
    star(12.5, 5.4, '#fff'); star(10.6, 4, '#000');
    // palabra en cursiva con perfil
    const [t1, t2] = ART_TXT[rage ? 1 : 0];
    x.textBaseline = 'alphabetic';
    let fs = 27; x.font = 'italic bold ' + fs + 'px Georgia, "Times New Roman", serif';
    while (x.measureText(t1).width > w - 30 && fs > 14) { fs--; x.font = 'italic bold ' + fs + 'px Georgia, "Times New Roman", serif'; }
    const ty = 54;
    x.lineJoin = 'round'; x.lineWidth = 2.8; x.strokeStyle = '#fff'; x.strokeText(t1, 4, ty);
    x.fillStyle = '#000'; x.fillText(t1, 4, ty);
    // el bicho salta hacia la estrella, con rayas de movimiento (tapa el final de la cursiva, como en un cartel)
    const bx = w - 28, by = 23, spr = G.spr('bug', { '#': '#ffffff', g: '#000000' });
    x.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) { const lx = bx - 3 - i * 3, ly = by + 16 + i * 3; for (let k = 0; k < 7 - i * 2; k++) x.fillRect(lx - k, ly + Math.round(k * 0.5), 1, 1); }
    const sil = G.spr('bug', { '#': '#000000', g: '#000000' }); // halo azul con su silueta: el bicho queda delante de las letras
    for (let oy = -2; oy <= 2; oy += 2) for (let ox = -2; ox <= 2; ox += 2) x.drawImage(sil, bx + ox, by + oy, 26, 22);
    x.drawImage(spr, bx, by, 26, 22);
    // palabra gorda rayada (líneas horizontales) que se deshace en guiones por abajo
    const tc = G.mkCanvas(w, 30), tx = tc.x;
    let fs2 = 22; tx.font = '900 ' + fs2 + 'px ' + G.FONT_HEAVY;
    while (tx.measureText(t2).width > w - 8 && fs2 > 10) { fs2--; tx.font = '900 ' + fs2 + 'px ' + G.FONT_HEAVY; }
    const tw = Math.ceil(tx.measureText(t2).width), tx0 = Math.round((w - tw) / 2);
    tx.fillStyle = '#fff'; tx.textBaseline = 'alphabetic'; tx.fillText(t2, tx0, 24);
    const td = tx.getImageData(0, 0, w, 30).data;
    const id = x.getImageData(0, 0, w, h), d = id.data;
    const y0 = 61; let top = 99, bot = -1;
    for (let yy = 0; yy < 30; yy++) for (let xx = 0; xx < w; xx++) if (td[(yy * w + xx) * 4] > 127) { top = Math.min(top, yy); bot = Math.max(bot, yy); }
    const set = (xx, yy, v) => { if (xx < 0 || yy < 0 || xx >= w || yy >= h) return; const i = (yy * w + xx) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
    const SY = 1.6, outH = Math.round((bot - top + 1) * SY); // estirada en vertical para que se lea con las rayas
    for (let oy = 0; oy < outH; oy++) {
      if (oy % 3 === 2) continue; // hueco entre rayas
      const yy = top + Math.min(bot - top, Math.floor(oy / SY));
      for (let xx = 0; xx < w; xx++) if (td[(yy * w + xx) * 4] > 127) set(xx, y0 + oy, 255);
    }
    // guiones que se van separando debajo
    const dy0 = y0 + outH + 2;
    for (let k = 0; k < 4; k++) {
      let xx = tx0 + R() * 4;
      while (xx < tx0 + tw) {
        const len = Math.max(2, Math.round(G.lerp(9, 3, k / 3) * (0.5 + R()))), gap = Math.round(2 + k * 2.5 + R() * (3 + k * 3));
        if (R() > k * 0.12) for (let i = 0; i < len; i++) set(Math.round(xx) + i, dy0 + k * 2, 255);
        xx += len + gap;
      }
    }
    // a 1 bit
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4] > 127 ? 1 : 0;
    return m;
  }
  function bossArt(w, h, rage, inv) { // inv: invertido (aviso de ataque)
    const k = w + 'x' + h + (rage ? 'r' : '') + (inv ? 'i' : '');
    let c = artCache.get(k); if (c) return c;
    const mk = 'm' + w + 'x' + h + (rage ? 'r' : '');
    let m = artCache.get(mk); if (!m) { m = artMask(w, h, rage); artCache.set(mk, m); }
    const o = G.mkCanvas(w, h), id = o.x.createImageData(w, h), d = id.data, fg = G.hexRGB(inv ? B : W), bg = G.hexRGB(inv ? W : B);
    for (let i = 0; i < w * h; i++) { const c3 = m[i] ? fg : bg; d[i * 4] = c3[0]; d[i * 4 + 1] = c3[1]; d[i * 4 + 2] = c3[2]; d[i * 4 + 3] = 255; }
    o.x.putImageData(id, 0, 0);
    artCache.set(k, o.c);
    return o.c;
  }

  // ---------- utilidades ----------
  const hitR =(a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function burst(s, x, y, n, col) { for (let i = 0; i < n; i++) s.parts.push({ x, y, vx: G.rand(-60, 60), vy: G.rand(-80, 10), t: 0, life: G.rand(0.25, 0.5), col }); } // como al cerrar ventanas en la parte 1
  function ghost(s, o) { s.ghosts.push({ x: o.x, y: o.y, w: o.w, h: o.h, t: 0, col: o.st.fr === K ? (s.block === 0 ? W : K) : o.st.fr }); }
  function pellet(s, x, y, vx, vy, big) { s.pel.push({ x, y, vx, vy, big: !!big }); }
  function aimAt(s, x, y, spd, spread, lead) { // lead: cuánto se adelanta a tu movimiento (0-1)
    const p = s.pl, ty = p.y + 10, tx = p.x + 4 + (lead ? s.pvx * Math.hypot(p.x - x, ty - y) / spd * lead : 0), a = Math.atan2(ty - y, tx - x) + (spread || 0);
    return { vx: Math.cos(a) * spd, vy: Math.max(spd * 0.45, Math.sin(a) * spd) };
  }
  function mkEnemy(s, kind, o) {
    const pl = pool(s), st = G.WSTYLES[kind === 'armor' ? pl.armor : kind === 'shoot' ? pl.shoot : G.pick(pl.basic)];
    const title = kind === 'shoot' ? 'VIRUS' : kind === 'armor' ? 'WARN!' : kind === 'mini' ? 'AGAIN' : G.pick(TITLES);
    return Object.assign({ w: VW, h: VH, kind, st, title, hp: 1, max: 1, flash: 0, tele: 0, ft: 0, crack: G.rand(0, 6) }, o);
  }

  G.MICRO.antivirus = {
    mode: 'desk', cmd: 'PURGE!', hint: 'DRAG TO MOVE - CLOSE THE POP-UPS', time: 10, fx: 0.5,
    help: ['DRAG ANYWHERE TO MOVE', 'THE CURSOR. IT CLICKS', 'BY ITSELF: CLOSE EVERY', 'POP-UP AND DODGE THE X.'],
    init(s) {
      const r = s.r, d = s.d;
      s.ptr = null; s.pvx = 0; s.lpx = null; s.parts = []; s.ghosts = []; s.shots = []; s.pel = []; s.ens = []; s.kills = 0; s.fireT = 0; s.clearT = -1; s.dead = false;
      s.zoneTop = Math.round(r.y + r.h * 0.62);
      s.pl = { x: Math.round(r.x + r.w / 2 - 4), y: Math.round(r.y + r.h - 70) };
      if (s.boss) { this.initBoss(s); return; }
      // columnas que llenan todo el ancho: quedarse quieto solo limpia una
      const C = Math.max(3, Math.floor((r.w - 8 + COLG) / (VW + COLG)));
      s.cols = C; s.colSp = (r.w - 8 - VW) / (C - 1);
      const plan = [{ type: 'grid', n: C }];
      plan.push(d < 0.1 ? { type: 'grid', n: 2 } : { type: 'slide', n: d < 0.25 ? 2 : 3 });
      if (d >= 0.4) plan.push(d >= 0.55 ? { type: 'slide', n: 2 } : { type: 'grid', n: C - 1 });
      s.rows = plan.map((p, i) => {
        const row = { type: p.type, i };
        if (p.type === 'slide') { // fila que patina de lado a lado (hay que seguirla)
          row.span = (p.n - 1) * (VW + SLIDE_GAP) + VW;
          row.x = G.rand(r.x + 4, r.x + r.w - 4 - row.span); row.v = (40 + 75 * d) * (i % 2 ? -1 : 1) * G.rand(0.85, 1.15);
          for (let k = 0; k < p.n; k++) s.ens.push(mkEnemy(s, 'basic', { row: i, slot: k }));
        } else {
          const cols = Array.from({ length: C }, (_, k) => k).sort(() => Math.random() - 0.5).slice(0, p.n).sort((a, b) => a - b);
          for (const k of cols) s.ens.push(mkEnemy(s, 'basic', { row: i, slot: k }));
        }
        return row;
      });
      // blindadas (aguantan 2-3) arriba, tiradoras repartidas
      const armors = d >= 0.14 ? 1 + Math.floor(d * 3) : 0, shooters = d >= 0.14 ? 1 + Math.round(d * 3) : 0;
      const grid = s.ens.filter((e) => s.rows[e.row].type === 'grid').sort(() => Math.random() - 0.5);
      grid.slice(0, armors).forEach((e) => { const o = mkEnemy(s, 'armor', { row: e.row, slot: e.slot }); Object.assign(e, o); e.hp = e.max = d >= 0.4 ? 3 : 2; });
      const rest = s.ens.filter((e) => e.kind === 'basic').sort((a, b) => a.row - b.row || Math.random() - 0.5); // las que disparan, detrás (en las filas de arriba)
      rest.slice(0, shooters).forEach((e) => { Object.assign(e, mkEnemy(s, 'shoot', { row: e.row, slot: e.slot })); e.hp = e.max = d >= 0.3 ? 2 : 1; e.ft = G.rand(0.8, 1.6); });
      // aparecen una a una, como las ventanas de la parte 1
      s.ens.forEach((e, k) => { e.st8 = 'enter'; e.et = -k * 0.05; });
      s.total = s.ens.length;
      const H = s.ens.reduce((a, e) => a + e.hp, 0);
      s.T = (2.4 + 0.55 * s.total + 0.3 * (H - s.total)) * (1 + 0.04 * (s.rows.length - 1));
      s.fy0 = r.y + 6;
      const rowsH = s.rows.length * VH + (s.rows.length - 1) * ROWG;
      s.descV = Math.max(0, (s.zoneTop - 4 - rowsH - s.fy0) / s.T); // la formación llega a tu zona justo al acabar el tiempo
      s.fy = s.fy0; s.ens.forEach((e) => Object.assign(e, this.slotPos(s, e)));
      s.diveT = d >= 0.14 ? G.rand(1.2, 2.0) : 99; s.dropT = d >= 0.3 ? G.rand(0.6, 1.2) : 99;
    },
    initBoss(s) {
      const r = s.r, w = Math.min(124, r.w - 40), h = 136;
      s.bo = { st: BOSS_ST, title: 'VIRUS DETECTED', stripes: true, xmode: 'x', x: r.x + r.w / 2 - w / 2, y: r.y - h - 10, w, h, hp: 80, max: 80, ph: 'enter', pt: 0, pat: 0, flash: 0, gl: 0, rage: false, dying: -1, vol: 0, volT: 0, ang: 0, hits: 0 };
      s.T = 20;
    },
    // ---------- entrada: arrastre relativo con un dedo (el último que toca manda) ----------
    down(s, x, y, e) { s.ptr = { id: e ? e.pointerId : 1, x, y }; },
    move(s, x, y, e) {
      const p = s.ptr; if (!p || (e && e.pointerId !== p.id)) return;
      const r = s.r, k = 1.15;
      s.pl.x = G.clamp(s.pl.x + (x - p.x) * k, r.x + 1, r.x + r.w - 17);
      s.pl.y = G.clamp(s.pl.y + (y - p.y) * k, s.zoneTop, r.y + r.h - 25);
      p.x = x; p.y = y;
    },
    up(s, x, y, e) { if (s.ptr && (!e || e.pointerId === s.ptr.id)) s.ptr = null; },
    // ---------- lógica ----------
    update(s, dt) {
      const r = s.r;
      for (const q of s.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 260 * dt; }
      s.parts = s.parts.filter((q) => q.t < q.life);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.18);
      if (s.dead) return;
      if (s.clearT >= 0) { s.clearT += dt; if (s.clearT > 0.25) s.win(); return; }
      if (!s.boss && s.t >= s.T - 0.001) return this.die(s, 'SYSTEM INFECTED');
      s.pvx = G.lerp(s.pvx, (s.pl.x - (s.lpx == null ? s.pl.x : s.lpx)) / dt, 0.15); s.lpx = s.pl.x; // tu velocidad (para apuntar adelantado)
      // clic automático
      s.fireT -= dt;
      if (s.fireT <= 0) { s.fireT = 0.13 + 0.17 * G.clamp((Math.abs(s.pvx) - 140) / 180, 0, 1); s.shots.push({ x: s.pl.x, y: s.pl.y - 6, w: 2, h: 6 }); A().sfx('pew'); } // moviendo la flecha a lo loco hace menos clics: hay que pararse a apuntar
      for (const b of s.shots) b.y -= 430 * dt;
      s.shots = s.shots.filter((b) => b.y > r.y - 8 && !b.dead);
      // las X enemigas
      const ph = { x: s.pl.x + 1, y: s.pl.y + 3, w: 7, h: 14 }; // caja pequeña: perdona los roces
      for (const q of s.pel) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        const hs = q.big ? 7 : 5;
        if (!s.bo || s.bo.dying < 0) if (hitR({ x: q.x - hs / 2, y: q.y - hs / 2, w: hs, h: hs }, ph)) return this.die(s, 'INFECTED!');
      }
      s.pel = s.pel.filter((q) => q.y < r.y + r.h + 8 && q.y > r.y - 10 && q.x > r.x - 10 && q.x < r.x + r.w + 10);
      if (s.boss) this.updateBoss(s, dt, ph); else this.updateWave(s, dt, ph);
    },
    slotPos(s, e) {
      const r = s.r, row = s.rows[e.row], y = s.fy + e.row * (VH + ROWG);
      if (row.type === 'slide') return { x: row.x + e.slot * (VW + SLIDE_GAP), y };
      return { x: r.x + 4 + e.slot * s.colSp, y };
    },
    updateWave(s, dt, ph) {
      const r = s.r, d = s.d;
      s.fy = s.fy0 + s.descV * s.t;
      for (const row of s.rows) if (row.type === 'slide') { // patinan y rebotan en los bordes
        row.x += row.v * dt;
        if (row.x < r.x + 4) { row.x = r.x + 4; row.v = Math.abs(row.v); } else if (row.x + row.span > r.x + r.w - 4) { row.x = r.x + r.w - 4 - row.span; row.v = -Math.abs(row.v); }
      }
      // desde la ronda 3 las ventanas sueltan X en vertical (sobre todo si estás debajo)
      s.dropT -= dt;
      if (s.dropT <= 0) {
        s.dropT = (1.15 - 0.55 * d) * G.rand(0.7, 1.3);
        const c = s.ens.filter((e) => e.st8 === 'form'), near = c.filter((e) => Math.abs(e.x + VW / 2 - s.pl.x) < 60);
        const e = near.length && Math.random() < 0.6 ? G.pick(near) : c.length ? G.pick(c) : null;
        if (e) pellet(s, e.x + VW / 2 + G.irand(-8, 8), e.y + VH + 4, 0, 125 + 90 * d);
      }
      // de vez en cuando una ventana se lanza en picado hacia ti
      s.diveT -= dt;
      if (s.diveT <= 0) {
        s.diveT = (2.6 - 1.4 * d) * G.rand(0.7, 1.3);
        const c = s.ens.filter((e) => e.st8 === 'form' && e.kind !== 'shoot'); if (c.length) { const e = G.pick(c); e.st8 = 'tele'; e.tt = 0.42; A().sfx('beepT'); }
      }
      for (const e of s.ens) {
        const p = this.slotPos(s, e);
        if (e.flash > 0) e.flash -= dt;
        if (e.st8 === 'enter') {
          e.et += dt; e.x = p.x; e.y = p.y;
          if (e.et >= 0 && !e.pop) { e.pop = true; A().sfx('spawn', G.irand(0, 2)); }
          if (e.et >= 0.12) e.st8 = 'form';
        } else if (e.st8 === 'form') { e.x = p.x; e.y = p.y; }
        else if (e.st8 === 'tele') { // tiembla antes de lanzarse
          e.tt -= dt; e.x = p.x + (Math.random() < 0.5 ? -1 : 1); e.y = p.y;
          if (e.tt <= 0) { e.st8 = 'dive'; e.vy = 150 + 140 * d; e.vx = 0; }
        } else if (e.st8 === 'dive') {
          const want = G.clamp((s.pl.x + 4 - (e.x + VW / 2)) * 2.2, -110, 110); e.vx += (want - e.vx) * Math.min(1, dt * 3);
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.y > r.y + r.h + 4) { e.st8 = 'back'; e.bt = 0; e.y = r.y - VH - 4; }
        } else if (e.st8 === 'back') { // vuelve a su sitio desde arriba
          e.bt += dt; const k = G.clamp(e.bt / 0.7, 0, 1);
          e.x = G.lerp(e.x, p.x, Math.min(1, dt * 7)); e.y = G.lerp(r.y - VH - 4, p.y, k);
          if (k >= 1) e.st8 = 'form';
        }
        // las tiradoras avisan (parpadean) y luego disparan adonde vas a estar
        if (e.kind === 'shoot' && e.st8 === 'form') {
          if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { const sp = 105 + 100 * d, spr = d >= 0.45 ? [-0.22, 0, 0.22] : [0]; for (const o of spr) { const v = aimAt(s, e.x + VW / 2, e.y + VH, sp, o, d >= 0.3 ? 1 : 0.5); pellet(s, e.x + VW / 2, e.y + VH + 3, v.vx, v.vy); } A().sfx('zap'); } }
          else { e.ft -= dt; if (e.ft <= 0) { e.ft = (2.0 - 0.9 * d) * G.rand(0.75, 1.25); e.tele = 0.45; } }
        }
        if (hitR(e, ph)) return this.die(s, 'INFECTED!');
      }
      this.hitShots(s, s.ens);
      if (!s.ens.length) { s.clearT = 0; s.pel = []; s.T = Math.max(s.T, s.t + 0.6); A().sfx('combo'); }
    },
    hitShots(s, list) {
      for (const b of s.shots) {
        if (b.dead) continue;
        let best = null; // la bala choca con la ventana más cercana a ti
        for (const e of list) if (!e.dead && e.y + VH > s.r.y + 2 && hitR(b, e) && (!best || e.y > best.y)) best = e;
        if (!best) continue;
        const e = best; b.dead = true; e.hp--; e.flash = 0.07;
        if (e.hp <= 0) {
          e.dead = true; s.kills++; ghost(s, e);
          burst(s, e.x + VW / 2, e.y + 6, 5, e.st.bar === K ? (s.block === 0 ? W : e.st.fr) : e.st.bar);
          A().sfx('close', Math.min(9, s.kills)); G.pulse({ ab: 1.5 }); G.vibrate(6);
        } else { A().sfx('hit'); burst(s, b.x, b.y, 2, e.st.fr); }
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
    },
    die(s, why) {
      s.dead = true; burst(s, s.pl.x + 4, s.pl.y + 8, 10, W);
      G.vibrate(60); G.pulse({ shake: 5, glitch: 0.6 }); s.fail(why);
    },
    // ---------- jefe: la ventana VIRUS DETECTED de la parte 1 ----------
    updateBoss(s, dt, ph) {
      const r = s.r, bo = s.bo;
      if (bo.flash > 0) bo.flash -= dt;
      if (bo.gl > 0) bo.gl -= dt;
      if (bo.dying >= 0) { // se cierra a trozos y luego se gana
        bo.dying += dt;
        if (Math.random() < dt * 14) { const gw = G.irand(20, 50), gh = G.irand(14, 34); s.ghosts.push({ x: bo.x + G.rand(0, bo.w - gw), y: bo.y + G.rand(0, bo.h - gh), w: gw, h: gh, t: 0, col: W }); burst(s, bo.x + Math.random() * bo.w, bo.y + Math.random() * bo.h, 4, G.pick([W, bo.st.bd])); A().sfx('close', G.irand(3, 9)); }
        if (bo.dying > 1.15) { ghost(s, bo); s.win(); }
        return;
      }
      bo.pt += dt;
      if (bo.ph === 'enter') { bo.y = G.lerp(r.y - bo.h - 10, r.y + 10, G.clamp(bo.pt / 1.1, 0, 1)); if (bo.pt > 1.1) { bo.ph = 'cool'; bo.pt = 0.4; } }
      else {
        const amp = (r.w - bo.w) / 2 - 4;
        bo.ang += dt * (bo.rage ? 1.15 : 0.8);
        bo.x = r.x + r.w / 2 - bo.w / 2 + Math.sin(bo.ang) * amp;
        bo.y = r.y + 10 + Math.sin(s.t * 1.7) * 6;
      }
      const cx = bo.x + bo.w / 2, by = bo.y + bo.h, sp = bo.rage ? 1.15 : 1;
      if (bo.ph === 'cool' && bo.pt > (bo.rage ? 0.6 : 0.9)) { bo.ph = 'tele'; bo.pt = 0; A().sfx('warn'); }
      else if (bo.ph === 'tele' && bo.pt > 0.55) {
        bo.ph = 'fire'; bo.pt = 0; const pat = ['fan', 'aim', 'spawn', 'fan', 'aim'][bo.pat % 5]; bo.cur = pat; bo.pat++;
        if (pat === 'fan') { const n = bo.rage ? 9 : 7; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i / (n - 1) - 0.5) * 1.9; pellet(s, cx, by - 6, Math.cos(a) * 115 * sp, Math.sin(a) * 115 * sp, true); } A().sfx('zap'); }
        else if (pat === 'aim') { bo.vol = bo.rage ? 3 : 2; bo.volT = 0; }
        else { const n = bo.rage ? 3 : 2; for (let i = 0; i < n; i++) s.ens.push(mkEnemy(s, 'mini', { x: bo.x + 4 + i * (bo.w - VW - 8) / Math.max(1, n - 1), y: by - 12, st8: 'dive', vx: 0, vy: 95 + 30 * i })); A().sfx('spawn'); }
      }
      if (bo.ph === 'fire') {
        if (bo.cur === 'aim' && bo.vol > 0) { bo.volT -= dt; if (bo.volT <= 0) { bo.vol--; bo.volT = 0.22; for (const o of [-0.2, 0, 0.2]) { const v = aimAt(s, cx, by, 150 * sp, o, 0.9); pellet(s, cx, by - 4, v.vx, v.vy); } A().sfx('pew'); } }
        if (bo.vol <= 0 && bo.pt > 0.35) { bo.ph = 'cool'; bo.pt = 0; }
      }
      // ventanitas AGAIN que bajan hacia ti
      for (const e of s.ens) {
        if (e.flash > 0) e.flash -= dt;
        const want = G.clamp((s.pl.x + 4 - (e.x + VW / 2)) * 1.8, -90, 90); e.vx += (want - e.vx) * Math.min(1, dt * 2.5);
        e.x += e.vx * dt; e.y += e.vy * dt; if (e.y > r.y + r.h + 4) e.dead = true;
        if (hitR(e, ph)) return this.die(s, 'INFECTED!');
      }
      s.ens = s.ens.filter((e) => !e.dead);
      this.hitShots(s, s.ens);
      // impactos en el jefe
      if (bo.ph !== 'enter') for (const b of s.shots) {
        if (b.dead || !hitR(b, bo)) continue;
        b.dead = true; bo.hp--; bo.hits++; bo.flash = 0.08; burst(s, b.x, b.y, 2, W); A().sfx('hit');
        bo.gl = 0.13; bo.glSeed = Math.random(); G.pulse({ glitch: 0.3, ab: 2.5 }); // glitch en cada golpe
        if (!bo.rage && bo.hp <= bo.max / 2) { bo.rage = true; bo.st = RAGE_ST; bo.title = 'CRITICAL ERROR'; bo.gl = 0.35; G.pulse({ glitch: 0.8, ab: 4 }); A().sfx('alarm'); }
        if (bo.hp > 0 && bo.hits % 14 === 0) { // como en la parte 1: salta a otro sitio
          ghost(s, bo); bo.ang += G.rand(1.6, 3.2) * (Math.random() < 0.5 ? -1 : 1); A().sfx('glitch'); G.pulse({ glitch: 0.7 });
        }
        if (bo.hp <= 0) { bo.dying = 0; s.pel = []; s.ens = []; s.T = Math.max(s.T, s.t + 1.6); A().sfx('boom'); G.pulse({ flash: 0.3, flashCol: W, shake: 6, glitch: 1 }); G.vibrate(120); break; }
      }
    },
    // ---------- dibujo ----------
    drawEnemy(s, e) {
      let x = Math.round(e.x), y = Math.round(e.y);
      if (e.st8 === 'enter') { // se abre: contorno que crece, como al aparecer
        if (e.et < 0) return;
        const k = Math.min(1, e.et / 0.12), ww = Math.max(4, VW * k), hh = Math.max(3, VH * k);
        G.box(x + (VW - ww) / 2, y + (VH - hh) / 2, ww, hh, e.st.fr === K ? K : e.st.fr); return;
      }
      if (e.flash > 0) x += G.irand(-1, 1);
      const telegraph = (e.kind === 'shoot' && e.tele > 0) || e.st8 === 'tele';
      const blink = telegraph && Math.floor(G.time * 16) % 2 === 0;
      const st = blink ? { fr: e.st.fr, bd: e.st.tx, bar: e.st.bd, bt: e.st.tx, tx: e.st.bd, ac: e.st.bd, sh: e.st.sh, out: e.st.out } : e.st;
      if (e.st8 === 'dive' && e.kind !== 'mini') { G.dash(x + 6, y - 6, VW - 12, st.fr === K ? W : st.fr, 2, 3); G.dash(x + 10, y - 10, VW - 20, st.fr === K ? W : st.fr, 2, 4); }
      const rr = G.drawFrame({ x, y, w: VW, h: VH, st, title: e.title, stripes: false, xmode: 'x' });
      if (e.kind === 'shoot') G.drawSpr(Math.floor(G.time * 6) % 2 ? 'bug' : 'bug2', rr.x + 2, rr.y + 2, { '#': st.tx, g: st.bd }, 1);
      else if (e.kind === 'armor') { G.box(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2, st.tx); G.drawSpr('warn', rr.x + 3, rr.y + 3, { '#': st.ac }); }
      else G.drawSpr('xcirc', rr.x + 3, rr.y + 3, { '#': st.ac });
      // botoncito OK
      const bx = rr.x + rr.w - 21, byy = rr.y + 3;
      G.rect(bx, byy, 18, 9, st.bd); G.box(bx, byy, 18, 9, st.tx); G.text('OK', bx + 9, byy + 1, st.tx, { al: 'c' });
      if (e.max > 1 && e.hp < e.max) { // grietas según el daño
        const n = e.max - e.hp, c0 = e.crack;
        for (let i = 0; i < n; i++) { const cx0 = x + 8 + ((c0 * 7 + i * 17) % (VW - 16)); G.line(cx0, y + 1, cx0 + 4, y + 9, st.tx); G.line(cx0 + 4, y + 9, cx0 - 1, y + 17, st.tx); G.line(cx0 - 1, y + 17, cx0 + 5, y + VH - 2, st.tx); }
      }
      if (e.flash > 0) G.drect(x, y, VW, VH, 8, W, null);
      if (telegraph) { const tw = 9; G.rect(x + VW / 2 - tw / 2, y - 12, tw, 10, K); G.text('!', x + VW / 2, y - 10, W, { al: 'c', b: true }); }
    },
    drawBullet(q) {
      const x = Math.round(q.x), y = Math.round(q.y), n = q.big ? 11 : 9, h = Math.floor(n / 2);
      G.rect(x - h, y - h, n, n, W); G.box(x - h, y - h, n, n, K); // la X de cerrar, cayendo
      G.line(x - h + 2, y - h + 2, x + h - 2, y + h - 2, K); G.line(x + h - 2, y - h + 2, x - h + 2, y + h - 2, K);
      if (q.big) G.box(x - h + 1, y - h + 1, n - 2, n - 2, K);
    },
    draw(s) {
      const r = s.r;
      if (s.boss) this.drawBoss(s);
      for (const e of s.ens) this.drawEnemy(s, e);
      for (const gh of s.ghosts) { const k = 1 - gh.t / 0.18; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = gh.w * kk, hh = gh.h * kk; G.box(gh.x + (gh.w - ww) / 2, gh.y + (gh.h - hh) / 2, ww, hh, gh.col); } }
      // tus clics: rayitas blancas con borde negro
      for (const b of s.shots) { G.rect(b.x - 1, b.y - 1, 4, 8, K); G.rect(b.x, b.y, 2, 6, W); }
      for (const q of s.pel) this.drawBullet(q);
      // la flecha (si te pillan, se queda en reloj de arena)
      const px = Math.round(s.pl.x), py = Math.round(s.pl.y);
      if (s.done === 'lose' || s.dead) G.drawSpr(Math.floor(G.time * 3) % 2 ? 'hg1' : 'hg2', px - 3, py, { '#': K, o: W }, 2);
      else G.drawSpr('cursor', px, py, { '#': K, w: W }, 2);
      for (const q of s.parts) G.rect(Math.round(q.x), Math.round(q.y), 2, 2, q.col);
      // contador abajo, con etiqueta como los iconos
      if (!s.boss) {
        const t = 'POP-UPS ' + G.pad(s.ens.length, 2), tw = G.textW(t, 1, 1, true) + 6;
        G.rect(r.x + r.w - tw - 2, r.y + r.h - 12, tw, 10, K); G.text(t, r.x + r.w - 5, r.y + r.h - 10, W, { al: 'r', b: true });
      }
    },
    drawBoss(s) {
      const bo = s.bo;
      if (bo.dying >= 0 && Math.floor(bo.dying * 18) % 2) return; // parpadea mientras se cierra
      const st = bo.st, x = Math.round(bo.x) + (bo.dying >= 0 || bo.flash > 0 ? G.irand(-2, 2) : 0), y = Math.round(bo.y);
      const r = G.drawFrame({ x, y, w: bo.w, h: bo.h, st, title: bo.title, stripes: true, xmode: 'x' });
      // pantalla azul con el dibujo blanco (parpadea invertido justo antes de cada ataque)
      const T = G.ctx(), ah = r.h - 24, inv = bo.ph === 'tele' && Math.floor(bo.pt * 14) % 2 === 1;
      const art = bossArt(r.w, ah, bo.rage, inv), artI = bossArt(r.w, ah, bo.rage, !inv);
      T.drawImage(art, r.x, r.y);
      // glitch en cada golpe: tiras del dibujo desplazadas o invertidas (como el fondo glitch de la parte 1)
      if (bo.gl > 0 || (bo.rage && Math.random() < 0.18)) {
        const n = bo.gl > 0.2 ? 6 : bo.gl > 0 ? G.irand(2, 4) : 1;
        for (let i = 0; i < n; i++) {
          const gy = G.irand(0, ah - 3), gh = G.irand(2, 7), dx = G.irand(-12, 12) || 4, src = Math.random() < 0.35 ? artI : art;
          T.drawImage(src, 0, gy, r.w, gh, r.x + dx, r.y + gy, r.w, gh);
          if (dx > 0) G.rect(r.x, r.y + gy, dx, gh, B); // lo que queda al descolocarse
        }
        if (bo.gl > 0 && Math.random() < 0.5) { const gy = G.irand(0, bo.h - 6); G.drect(x, y + gy, bo.w, G.irand(2, 4), 8, G.pick([W, B]), null); }
      }
      // barra LOADING... que sube con cada golpe (al 100 % se borra el virus)
      const prog = G.clamp(1 - Math.max(0, bo.hp) / bo.max, 0, 1), pct = Math.floor(prog * 100);
      const ly = r.y + ah + 2, by = r.y + r.h - 11, bw = r.w - 12;
      G.rect(r.x, r.y + ah, r.w, r.h - ah, B);
      const lbl = bo.dying >= 0 ? 'DELETED' : 'LOADING' + '...'.slice(0, 1 + Math.floor(G.time * 3) % 3);
      G.text(lbl, r.x + 6, ly + 1, W, { b: true }); G.text(pct + '%', r.x + r.w - 6, ly + 1, W, { al: 'r', b: true });
      G.box(r.x + 6, by, bw, 9, W);
      const n = Math.floor((bw - 4) / 4), f = Math.round(n * prog);
      for (let i = 0; i < f; i++) G.rect(r.x + 8 + i * 4, by + 2, 3, 5, W);
      if (f < n && Math.floor(G.time * 6) % 2) G.rect(r.x + 8 + f * 4, by + 2, 3, 5, L); // el siguiente trocito, esperando
    },
  };

  // icono: la flecha cierra una a una tres ventanitas
  G.ICONS[14] = function (t) {
    const beat = 0.8, i0 = Math.floor(t / beat) % 3, k = (t % beat) / beat;
    for (let i = 0; i < 3; i++) {
      const x = 1 + i * 8, y = 1;
      if (i === i0 && k > 0.6) { const kk = 1 - (k - 0.6) / 0.4, ww = Math.max(1, Math.round(7 * kk)), hh = Math.max(1, Math.round(6 * kk)); G.box(x + Math.round((7 - ww) / 2), y + Math.round((6 - hh) / 2), ww, hh, W); continue; }
      G.rect(x, y, 7, 6, W); G.box(x, y, 7, 6, K); G.rect(x, y, 7, 2, K); G.px(x + 5, y, W);
    }
    const cx = Math.round(G.lerp(2 + ((i0 + 2) % 3) * 8, 2 + i0 * 8, Math.min(1, k * 3)));
    if (k > 0.3 && k < 0.65) { const yy = Math.round(G.lerp(10, 7, (k - 0.3) / 0.35)); G.rect(cx, yy, 1, 2, W); }
    G.drawSpr('cursor', cx, 9, { '#': K, w: W });
  };
  G.CARD_SCHEMES[14] = { top: W, tt: K, ib: B, grid: W, bot: L, nc: B, bt: K };
})(window.G);
