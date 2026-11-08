'use strict';
// PARTE 2 · 14 ANTIVIRUS: matamarcianos vertical. Eres la flecha del ratón, disparas sola,
// y te mueves arrastrando el dedo en cualquier parte (movimiento relativo: el dedo no tapa la flecha).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  // bicho de los virus (7x6)
  G.ART.p2bug = ['.#...#.', '..###..', '#######', '.#####.', '#######', '.#.#.#.'];

  // ---------- ventanitas de virus pre-dibujadas (30x22) ----------
  const VW = 30, VH = 22;
  const VLOOK = {
    basic: { fr: W, bar: B, bd: K, gl: W },
    armor: { fr: W, bar: L, bd: B, gl: W, dbl: true },
    shoot: { fr: W, bar: Gr, bd: K, gl: Gr },
    shootT: { fr: W, bar: W, bd: Gr, gl: K },
    dive: { fr: Gr, bar: Gr, bd: K, gl: W },
    flash: { fr: W, bar: W, bd: W, gl: W },
  };
  const VC = {};
  function virusCv(kind) {
    if (VC[kind]) return VC[kind];
    const o = G.mkCanvas(VW, VH), lk = VLOOK[kind], T0 = G.ctx();
    G.target(o.x);
    try {
      G.rect(0, 0, VW, VH, lk.fr);
      G.rect(1, 1, VW - 2, 5, lk.bar);
      G.rect(VW - 7, 1, 6, 5, lk.fr); G.px(VW - 6, 2, lk.bar); G.px(VW - 3, 2, lk.bar); G.px(VW - 5, 3, lk.bar); G.px(VW - 4, 3, lk.bar); G.px(VW - 6, 4, lk.bar); G.px(VW - 3, 4, lk.bar); // la X
      G.rect(1, 7, VW - 2, VH - 8, lk.bd);
      if (lk.dbl) G.box(2, 8, VW - 4, VH - 10, lk.gl);
      G.drawSpr('p2bug', 8, 8, { '#': lk.gl }, 2);
    } finally { G.target(T0); }
    return (VC[kind] = o.c);
  }

  // ---------- fondo del espacio de datos (se guarda por tamaño) ----------
  let bgCache = null;
  function background(w, h) {
    if (bgCache && bgCache.w === w && bgCache.h === h) return bgCache.c;
    const o = G.mkCanvas(w, h), T0 = G.ctx(), R = G.rng(1414);
    G.target(o.x);
    try {
      G.rect(0, 0, w, h, K);
      for (let y = 3; y < h; y += 8) for (let x = 3; x < w; x += 8) G.px(x, y, B);
      // pistas tenues a los lados
      for (let i = 0; i < 7; i++) {
        const left = i % 2 === 0, x0 = left ? 0 : w - 1, y0 = 20 + Math.floor(R() * (h - 40));
        const len = 10 + Math.floor(R() * 26), dir = left ? 1 : -1;
        for (let j = 0; j < len; j += 2) G.px(x0 + dir * j, y0, B);
        for (let j = 0; j < 14; j += 2) G.px(x0 + dir * len, y0 + j, B);
        G.rect(x0 + dir * len - 1, y0 + 14, 3, 3, B);
      }
    } finally { G.target(T0); }
    bgCache = { w, h, c: o.c };
    return o.c;
  }

  // ---------- utilidades ----------
  const hitR = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function burst(s, x, y, n, cols, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * (spd || 90);
      s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.3 + Math.random() * 0.35, col: cols[i % cols.length] });
    }
  }
  function pellet(s, x, y, vx, vy, big) { s.pel.push({ x, y, vx, vy, big: !!big }); }
  function aimAt(s, x, y, spd, spread, lead) { // lead: cuánto se adelanta a tu movimiento (0-1)
    const p = s.pl, ty = p.y + 10, tx = p.x + 6 + (lead ? s.pvx * Math.hypot(p.x - x, ty - y) / spd * lead : 0), a = Math.atan2(ty - y, tx - x) + (spread || 0);
    return { vx: Math.cos(a) * spd, vy: Math.max(spd * 0.45, Math.sin(a) * spd) };
  }

  G.MICRO.antivirus = {
    mode: 'window', cmd: 'PURGE!', hint: 'DRAG TO MOVE - SHOOT THE VIRUSES', time: 10, fx: 0.5,
    help: ['DRAG ANYWHERE TO MOVE', 'THE CURSOR. IT FIRES', 'BY ITSELF. PURGE ALL', 'VIRUSES, DODGE SHOTS.'],
    init(s) {
      const r = s.r, d = s.d;
      s.ptr = null; s.pvx = 0; s.parts = []; s.shots = []; s.pel = []; s.ens = []; s.kills = 0; s.fireT = 0; s.clearT = -1; s.hurt = 0;
      s.pl = { x: Math.round(r.x + r.w / 2 - 6), y: Math.round(r.y + r.h - 40) };
      s.zoneTop = Math.round(r.y + r.h * 0.5);
      s.bits = [];
      for (let i = 0; i < 24; i++) s.bits.push({ x: r.x + 4 + Math.random() * (r.w - 10), y: r.y + Math.random() * r.h, ch: Math.random() < 0.5 ? '0' : '1', v: 10 + Math.random() * 22 });
      if (s.boss) { this.initBoss(s); return; }
      // formación: filas de hasta 5 ventanitas
      const n = Math.round(6 + 8 * d), cols = Math.min(4, n), rows = Math.ceil(n / cols), sp = 48;
      s.form = { cols, rows, sp, w: (cols - 1) * sp + VW, oy: 0 };
      const shooters = d >= 0.28 ? 1 + Math.round(3 * d) : 0, armors = d >= 0.14 ? Math.max(1, Math.round(5 * d)) : 0;
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i % cols;
        const sx = (cols - inRow) * sp / 2 + col * sp, sy = row * 29;
        s.ens.push({ sx, sy, x: r.x + r.w / 2, y: r.y - 30, w: VW, h: VH, hp: 1, kind: 'basic', st: 'enter', et: -i * 0.06, row, flash: 0, ft: 0, tele: 0 });
      }
      // los de arriba disparan, los blindados aguantan 2
      const order = s.ens.slice().sort(() => Math.random() - 0.5);
      order.slice(0, shooters).forEach((e) => { e.kind = 'shoot'; e.ft = 1.1 + Math.random() * 1.6; });
      order.slice(shooters, shooters + armors).forEach((e) => { e.kind = 'armor'; e.hp = 2; });
      s.total = n;
      s.roam = d >= 0.28; s.roamV = 30 + 70 * d; // desde la ronda 3 se sueltan y rebotan
      s.diveT = d >= 0.14 ? 1.6 + Math.random() : 99;
      s.T = (2.0 + n * 0.6) * (1 - 0.1 * d);
      s.descV = (r.h * 0.42) / s.T; // la formación baja hasta la zona del jugador al acabar el tiempo
    },
    initBoss(s) {
      const r = s.r, w = Math.min(136, r.w - 36), h = 98;
      s.bo = { x: r.x + r.w / 2 - w / 2, y: r.y - h - 10, w, h, hp: 80, max: 80, ent: 0, pat: 0, ph: 'enter', pt: 0, flash: 0, rage: false, dying: -1, vol: 0, volT: 0, ang: 0 };
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
      for (const b of s.bits) { b.y += b.v * dt; if (b.y > r.y + r.h) { b.y = r.y - 8; b.x = r.x + 4 + Math.random() * (r.w - 10); } }
      for (const q of s.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy *= 0.94; }
      s.parts = s.parts.filter((q) => q.t < q.life);
      if (s.hurt > 0) { s.hurt -= dt; return; }
      if (s.clearT >= 0) { s.clearT += dt; if (s.clearT > 0.35) s.win(); return; }
      s.pvx = G.lerp(s.pvx, (s.pl.x - (s.lpx == null ? s.pl.x : s.lpx)) / dt, 0.15); s.lpx = s.pl.x; // tu velocidad (para apuntar adelantado)
      // disparo automático
      s.fireT -= dt;
      if (s.fireT <= 0) { s.fireT = 0.13; s.shots.push({ x: s.pl.x + 1, y: s.pl.y - 4, w: 2, h: 6 }); A().sfx('pew'); }
      for (const b of s.shots) b.y -= 430 * dt;
      s.shots = s.shots.filter((b) => b.y > r.y - 8 && !b.dead);
      // balas enemigas
      const ph = { x: s.pl.x + 2, y: s.pl.y + 4, w: 8, h: 13 }; // caja pequeña: perdona los roces
      for (const q of s.pel) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (!s.bo || s.bo.dying < 0) if (hitR({ x: q.x - 2, y: q.y - 2, w: 4, h: 4 }, ph)) return this.die(s, 'INFECTED!');
      }
      s.pel = s.pel.filter((q) => q.y < r.y + r.h + 6 && q.y > r.y - 10 && q.x > r.x - 8 && q.x < r.x + r.w + 8);
      if (s.boss) this.updateBoss(s, dt, ph); else this.updateWave(s, dt, ph);
    },
    updateWave(s, dt, ph) {
      const r = s.r, d = s.d, f = s.form, alive = s.ens.length;
      const amp = Math.max(0, (r.w - f.w) / 2 - 4), sw = 0.9 + 0.8 * d;
      f.oy += s.descV * (0.7 + 0.9 * (1 - alive / s.total)) * dt;
      const ox = r.x + r.w / 2 - f.w / 2 + Math.sin(s.t * sw) * amp, oy = r.y + 16 + f.oy;
      const roamBot = Math.min(s.zoneTop - 6, r.y + r.h * 0.36 + f.oy) - VH; // zona por donde vagan (va bajando)
      // un bicho se lanza en picado de vez en cuando
      s.diveT -= dt;
      if (s.diveT <= 0) {
        s.diveT = (2.4 - 1.6 * d) * (0.7 + Math.random() * 0.6);
        const c = s.ens.filter((e) => e.st === 'form' || e.st === 'roam'); if (c.length) { const e = G.pick(c); e.prev = e.st; e.st = 'tele'; e.tt = 0.42; e.hx = e.x; e.hy = e.y; A().sfx('beepT'); }
      }
      for (const e of s.ens) {
        const fxp = ox + e.sx + Math.sin(s.t * sw * 1.7 + e.row * 0.9) * 9, fyp = oy + e.sy;
        if (e.flash > 0) e.flash -= dt;
        if (e.st === 'enter') {
          e.et += dt; const k = G.clamp(e.et / 0.55, 0, 1), k2 = 1 - (1 - k) * (1 - k);
          e.x = G.lerp(r.x + r.w / 2 - VW / 2, fxp, k2); e.y = G.lerp(r.y - 30, fyp, k2);
          if (k >= 1) { if (s.roam) { e.st = 'roam'; const a = Math.random() * Math.PI * 2, v = s.roamV * (0.7 + Math.random() * 0.6); e.vx = Math.cos(a) * v; e.vy = Math.sin(a) * v * 0.6; e.ct = 0.8 + Math.random(); } else e.st = 'form'; }
        } else if (e.st === 'form') { e.x = fxp; e.y = fyp; }
        else if (e.st === 'roam') { // rebotan sueltos por la parte de arriba y cambian de rumbo
          e.ct -= dt; if (e.ct <= 0) { e.ct = 0.8 + Math.random() * 1.2; const a = Math.random() * Math.PI * 2, v = s.roamV * (0.7 + Math.random() * 0.6); e.vx = Math.cos(a) * v; e.vy = Math.sin(a) * v * 0.6; }
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x < r.x + 2) { e.x = r.x + 2; e.vx = Math.abs(e.vx); } else if (e.x > r.x + r.w - VW - 2) { e.x = r.x + r.w - VW - 2; e.vx = -Math.abs(e.vx); }
          if (e.y < r.y + 14) { e.y = r.y + 14; e.vy = Math.abs(e.vy); } else if (e.y > roamBot) { e.y = roamBot; e.vy = -Math.abs(e.vy); }
        } else if (e.st === 'tele') {
          e.tt -= dt; const bx = e.prev === 'form' ? fxp : e.hx, by = e.prev === 'form' ? fyp : e.hy;
          e.x = bx + (Math.random() < 0.5 ? -1 : 1); e.y = by;
          if (e.tt <= 0) { e.st = 'dive'; e.vy = 160 + 150 * d; e.vx = 0; }
        } else if (e.st === 'dive') {
          const want = G.clamp((s.pl.x + 6 - (e.x + VW / 2)) * 2.2, -110, 110); e.vx += (want - e.vx) * Math.min(1, dt * 3);
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.y > r.y + r.h + 4) { e.st = 'back'; e.y = r.y - 24; e.bt = 0; }
        } else if (e.st === 'back') {
          e.bt += dt; const k = G.clamp(e.bt / 0.8, 0, 1), bx = e.prev === 'form' ? fxp : e.hx, by = e.prev === 'form' ? fyp : Math.min(e.hy, roamBot);
          e.x = G.lerp(e.x, bx, Math.min(1, dt * 6)); e.y = G.lerp(r.y - 24, by, k);
          if (k >= 1) { e.st = e.prev; e.ct = 0; }
        }
        // los tiradores avisan (parpadean) y luego disparan adonde vas a estar
        if (e.kind === 'shoot' && (e.st === 'form' || e.st === 'roam' || e.st === 'tele')) {
          if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { const sp = 95 + 90 * d, spr = d >= 0.45 ? [-0.22, 0, 0.22] : [0]; for (const o of spr) { const v = aimAt(s, e.x + VW / 2, e.y + VH, sp, o, 0.5 + 0.5 * d); pellet(s, e.x + VW / 2, e.y + VH + 2, v.vx, v.vy); } } }
          else { e.ft -= dt; if (e.ft <= 0) { e.ft = (2.1 - 1.0 * d) * (0.75 + Math.random() * 0.5); e.tele = 0.45; } }
        }
        if (e.y + VH >= r.y + r.h - 4 && e.st !== 'dive' && e.st !== 'back') return this.die(s, 'BREACH!');
        if (hitR(e, ph)) return this.die(s, 'INFECTED!');
      }
      this.hitShots(s, s.ens);
      if (!s.ens.length) { s.clearT = 0; s.pel = []; s.T = Math.max(s.T, s.t + 0.6); A().sfx('combo'); G.pulse({ flash: 0.12, flashCol: Gr }); }
    },
    hitShots(s, list) {
      for (const b of s.shots) {
        if (b.dead) continue;
        for (const e of list) {
          if (e.y + VH < s.r.y + 2 || !hitR(b, e)) continue;
          b.dead = true; e.hp--; e.flash = 0.07; burst(s, b.x, b.y, 3, [W, Gr], 50);
          if (e.hp <= 0) {
            e.dead = true; s.kills++;
            burst(s, e.x + VW / 2, e.y + VH / 2, 12, [Gr, W, B], 110);
            A().sfx('close', Math.min(9, s.kills)); G.pulse({ ab: 1.5 }); G.vibrate(5);
          } else A().sfx('hit');
          break;
        }
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].dead) list.splice(i, 1);
    },
    die(s, why) {
      s.hurt = 0.01; burst(s, s.pl.x + 6, s.pl.y + 10, 18, [W, Gr, B], 140);
      G.vibrate(60); G.pulse({ shake: 5, glitch: 0.6 }); s.fail(why);
    },
    // ---------- jefe: VIRUS DETECTED ----------
    updateBoss(s, dt, ph) {
      const r = s.r, bo = s.bo;
      if (bo.flash > 0) bo.flash -= dt;
      // muerte: explosiones en cadena y luego se gana
      if (bo.dying >= 0) {
        bo.dying += dt;
        if (Math.random() < dt * 14) { burst(s, bo.x + Math.random() * bo.w, bo.y + Math.random() * bo.h, 10, [W, Gr, B], 120); A().sfx('close', G.irand(3, 9)); }
        if (bo.dying > 1.15) s.win();
        return;
      }
      bo.pt += dt;
      if (bo.ph === 'enter') { bo.y = G.lerp(r.y - bo.h - 10, r.y + 16, G.clamp(bo.pt / 1.1, 0, 1)); if (bo.pt > 1.1) { bo.ph = 'cool'; bo.pt = 0.4; } }
      else {
        const amp = (r.w - bo.w) / 2 - 4;
        bo.ang += dt * (bo.rage ? 1.15 : 0.8); // fase acumulada: al enfadarse no pega saltos
        bo.x = r.x + r.w / 2 - bo.w / 2 + Math.sin(bo.ang) * amp;
        bo.y = r.y + 16 + Math.sin(s.t * 1.7) * 6;
      }
      const cx = bo.x + bo.w / 2, by = bo.y + bo.h, sp = bo.rage ? 1.15 : 1;
      if (bo.ph === 'cool' && bo.pt > (bo.rage ? 0.6 : 0.9)) { bo.ph = 'tele'; bo.pt = 0; A().sfx('warn'); }
      else if (bo.ph === 'tele' && bo.pt > 0.55) {
        bo.ph = 'fire'; bo.pt = 0; const pat = ['fan', 'aim', 'spawn', 'fan', 'aim'][bo.pat % 5]; bo.cur = pat; bo.pat++;
        if (pat === 'fan') { const n = bo.rage ? 9 : 7; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i / (n - 1) - 0.5) * 1.9; pellet(s, cx, by - 6, Math.cos(a) * 115 * sp, Math.sin(a) * 115 * sp, true); } A().sfx('zap'); }
        else if (pat === 'aim') { bo.vol = bo.rage ? 3 : 2; bo.volT = 0; }
        else { const n = bo.rage ? 3 : 2; for (let i = 0; i < n; i++) s.ens.push({ x: bo.x + 8 + i * (bo.w - 30) / Math.max(1, n - 1), y: by - 10, w: VW, h: VH, hp: 1, kind: 'dive', st: 'dive', vx: 0, vy: 95 + 30 * i, flash: 0, mini: true }); A().sfx('spawn'); }
      }
      if (bo.ph === 'fire') {
        if (bo.cur === 'aim' && bo.vol > 0) { bo.volT -= dt; if (bo.volT <= 0) { bo.vol--; bo.volT = 0.22; for (const o of [-0.2, 0, 0.2]) { const v = aimAt(s, cx, by, 150 * sp, o, 0.6); pellet(s, cx, by - 4, v.vx, v.vy); } A().sfx('pew'); } }
        if (bo.vol <= 0 && bo.pt > 0.35) { bo.ph = 'cool'; bo.pt = 0; }
      }
      // minivirus que bajan hacia ti
      for (const e of s.ens) {
        if (e.flash > 0) e.flash -= dt;
        const want = G.clamp((s.pl.x + 6 - (e.x + VW / 2)) * 1.8, -90, 90); e.vx += (want - e.vx) * Math.min(1, dt * 2.5);
        e.x += e.vx * dt; e.y += e.vy * dt; if (e.y > r.y + r.h + 4) e.dead = true;
        if (hitR(e, ph)) return this.die(s, 'INFECTED!');
      }
      s.ens = s.ens.filter((e) => !e.dead);
      this.hitShots(s, s.ens);
      // impactos en el jefe
      if (bo.ph !== 'enter') for (const b of s.shots) {
        if (b.dead || !hitR(b, bo)) continue;
        b.dead = true; bo.hp--; bo.flash = 0.06; burst(s, b.x, b.y, 3, [W, Gr], 60); A().sfx('hit');
        if (!bo.rage && bo.hp <= bo.max / 2) { bo.rage = true; G.pulse({ glitch: 0.8, ab: 4 }); A().sfx('alarm'); }
        if (bo.hp <= 0) { bo.dying = 0; s.pel = []; s.ens = []; s.T = Math.max(s.T, s.t + 1.6); A().sfx('boom'); G.pulse({ flash: 0.3, flashCol: W, shake: 6, glitch: 1 }); G.vibrate(120); break; }
      }
    },
    // ---------- dibujo ----------
    draw(s) {
      const r = s.r, T = G.ctx();
      T.drawImage(background(r.w, r.h), r.x, r.y);
      for (const b of s.bits) G.text(b.ch, Math.round(b.x), Math.round(b.y), B);
      if (s.boss) this.drawBoss(s);
      for (const e of s.ens) {
        let kind = e.kind;
        if (e.flash > 0) kind = 'flash';
        else if (e.kind === 'shoot' && e.tele > 0 && Math.floor(e.tele * 16) % 2 === 0) kind = 'shootT';
        else if (e.st === 'tele' || e.st === 'dive' || e.mini) kind = 'dive';
        else if (e.kind === 'armor' && e.hp < 2) kind = 'basic';
        const x = Math.round(e.x), y = Math.round(e.y);
        if (e.st === 'dive' && !e.mini) { G.rect(x + 4, y - 5, 1, 4, Gr); G.rect(x + VW - 5, y - 7, 1, 6, Gr); }
        T.drawImage(virusCv(kind), x, y);
        if (e.kind === 'shoot' && e.tele > 0) G.text('!', x + VW / 2, y - 9, Gr, { al: 'c', b: true });
      }
      // balas: las tuyas blancas, las enemigas verdes con centro negro
      for (const b of s.shots) { G.rect(b.x, b.y, 2, 6, W); G.px(b.x, b.y + 6, Gr); }
      for (const q of s.pel) {
        const x = Math.round(q.x), y = Math.round(q.y);
        if (q.big) { G.rect(x - 2, y - 3, 5, 7, Gr); G.rect(x - 3, y - 2, 7, 5, Gr); G.rect(x - 1, y - 1, 3, 3, K); }
        else { G.rect(x - 2, y - 1, 5, 3, Gr); G.rect(x - 1, y - 2, 3, 5, Gr); G.px(x, y, W); }
      }
      // la flecha (con brillo verde)
      if (!(s.done === 'lose')) {
        const px = Math.round(s.pl.x), py = Math.round(s.pl.y);
        T.save(); T.shadowColor = 'rgba(70,255,0,0.85)'; T.shadowBlur = 6;
        G.drawSpr('cursor', px, py, { '#': Gr, w: W }, 2);
        T.restore();
        G.drawSpr('cursor', px, py, { '#': K, w: W }, 2);
        if (Math.floor(s.t * 20) % 2) G.rect(px + 2, py + 25, 2, 2 + Math.floor(Math.random() * 3), Gr); // estela
      }
      for (const q of s.parts) G.rect(Math.round(q.x), Math.round(q.y), 2, 2, q.col);
      // marcador
      if (!s.boss) {
        G.rect(r.x, r.y, r.w, 11, K); G.dash(r.x, r.y + 11, r.w, B, 2, 2);
        G.text('VIRUSES ' + G.pad(s.ens.length, 2), r.x + 4, r.y + 2, Gr, { b: true });
        G.text('KILLS ' + G.pad(s.kills, 2), r.x + r.w - 4, r.y + 2, L, { al: 'r' });
        if (s.clearT >= 0) { const tw = 92; G.rect(r.x + r.w / 2 - tw / 2, r.y + r.h * 0.38, tw, 16, Gr); G.text('ALL CLEAN', r.x + r.w / 2, r.y + r.h * 0.38 + 5, K, { al: 'c', b: true }); }
      }
      if (s.done === 'lose') G.drect(r.x, r.y, r.w, r.h, 2, Gr, null);
    },
    drawBoss(s) {
      const r = s.r, bo = s.bo, T = G.ctx();
      // barra de vida arriba
      G.rect(r.x, r.y, r.w, 11, K);
      G.text('VIRUS.EXE', r.x + 4, r.y + 2, bo.rage && Math.floor(s.t * 6) % 2 ? W : Gr, { b: true });
      const hx = r.x + 66, hw = r.w - 70, f = Math.max(0, Math.round((hw - 4) * bo.hp / bo.max));
      G.box(hx, r.y + 1, hw, 9, Gr); for (let i = 0; i < f; i += 3) G.rect(hx + 2 + i, r.y + 3, 2, 5, bo.rage ? W : Gr);
      if (bo.dying >= 0 && Math.floor(bo.dying * 18) % 2) return; // parpadea mientras explota
      const sh = bo.dying >= 0 ? G.irand(-3, 3) : 0, x = Math.round(bo.x) + sh, y = Math.round(bo.y);
      T.save(); T.shadowColor = bo.rage ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,255,0.9)'; T.shadowBlur = 10; G.rect(x, y, bo.w, bo.h, B); T.restore();
      const in0 = G.drawFrame({ x, y, w: bo.w, h: bo.h, st: G.WSTYLES.b1, title: 'VIRUS DETECTED', stripes: true, xmode: 'x' });
      const sx = Math.round(in0.x + in0.w / 2 - 22), sy = in0.y + 3;
      const glow = bo.ph === 'tele' || bo.rage;
      if (glow) { G.rect(sx + 6, sy + 14, 10, 10, Gr); G.rect(sx + 28, sy + 14, 10, 10, Gr); }
      G.drawSpr('skull', sx + (bo.flash > 0 ? G.irand(-2, 2) : 0), sy, { '#': bo.flash > 0 ? Gr : W }, 2);
      if (bo.ph === 'tele' && Math.floor(bo.pt * 12) % 2) G.drect(sx, sy, 44, 42, 4, Gr, null);
      G.text(bo.rage ? 'CRITICAL ERROR' : 'ACCESS DENIED', in0.x + in0.w / 2, in0.y + 48, W, { al: 'c' });
      const bw = 40, gap = 6, bx = Math.round(in0.x + in0.w / 2 - bw - gap / 2), byy = in0.y + in0.h - 15;
      G.drawBtn(bx, byy, bw, 12, 'RETRY', W, B); G.drawBtn(bx + bw + gap, byy, bw, 12, 'CANCEL', W, B);
      if (bo.flash > 0) { G.box(x - 1, y - 1, bo.w + 2, bo.h + 2, W); G.box(x - 2, y - 2, bo.w + 4, bo.h + 4, Gr); } // impacto: solo el borde, para no tapar el dibujo
    },
  };

  // icono: la flecha dispara a una ventanita de virus que revienta
  G.ICONS[14] = function (t) {
    const c = t % 1.6, wx = Math.round(7 + Math.sin(t * 2.2) * 4), pop = c > 1.15;
    if (!pop) { G.rect(wx, 0, 11, 8, W); G.rect(wx + 1, 1, 9, 2, Gr); G.rect(wx + 1, 4, 9, 3, K); G.rect(wx + 4, 4, 3, 2, Gr); G.px(wx + 3, 6, Gr); G.px(wx + 7, 6, Gr); }
    else { const k = Math.floor((c - 1.15) * 20); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [2, 0], [-2, 0]]) G.px(wx + 5 + dx * (2 + k), 3 + dy * (1 + k), k % 2 ? W : Gr); }
    const cx = Math.round(12 + Math.sin(t * 2.2 - 0.6) * 3);
    if (!pop) for (let i = 0; i < 2; i++) { const yy = 11 - Math.floor((t * 40 + i * 4) % 8); if (yy > 7) G.rect(cx, yy, 1, 2, W); }
    G.drawSpr('cursor', cx, 10, { '#': Gr, w: W });
  };
  G.CARD_SCHEMES[14] = { top: Gr, tt: K, ib: K, grid: B, bot: Gr, nc: K, bt: K };
})(window.G);
