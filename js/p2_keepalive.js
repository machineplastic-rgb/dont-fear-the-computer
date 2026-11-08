'use strict';
// PARTE 2 · 22 KEEP.ALIVE: caen ventanas colgadas (NOT RESPONDING). Un toque las hace rebotar hacia arriba
// (y un poco de lado según dónde toques). Ninguna puede tocar la barra de tareas: hay que aguantar hasta el final.
// Jefe: caen más y más rápido, salen cada vez más y una enorme pesa mucho (hay que darle muchas veces).
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const APPS = ['PAINT.EXE', 'MAIL.EXE', 'CHAT.EXE', 'MUSIC.EXE', 'PHOTO.EXE', 'WORD.EXE', 'GAME.EXE', 'WEB.EXE', 'CALC.EXE', 'NOTES.EXE', 'MEDIA.EXE', 'FEED.EXE', 'INBOX'];
  const MINI = ['CAM.EXE', 'WEB.EXE', 'INBOX', 'CHAT', 'CALC', 'CLOCK', 'RADIO'];
  const NEAR = 18; // un toque a menos de esto de una ventana también vale (dedos gordos)
  const fit = (str, px) => { const n = Math.max(0, Math.floor((px + 1) / 6)); return str.length <= n ? str : n >= 3 ? str.slice(0, n - 1) + '.' : ''; };

  // tipos: mini (ligera, rebota más), normal y la grande del jefe (pesa: rebota poco)
  function mk(s, type, x, y, vy) {
    const st = type === 'big' ? G.WSTYLES[G.pick(['b3', 'm2', 'g4'])] : G.randStyle(s.block);
    const w = type === 'mini' ? 60 : type === 'big' ? 136 : G.irand(78, 84); // 'RESPONDING' cabe entero
    const h = type === 'mini' ? 34 : type === 'big' ? 72 : G.irand(40, 44);
    const title = type === 'big' ? 'NOT RESPONDING' : type === 'mini' ? G.pick(MINI) : G.pick(APPS);
    return {
      type, st, w, h, x: G.clamp(x == null ? G.rand(s.r.x + 2, s.r.x + s.r.w - w - 2) : x, s.r.x + 1, s.r.x + s.r.w - w - 1),
      y: y == null ? s.r.y - h - 2 : y, vx: G.rand(-14, 14), vy: vy || 0,
      tt: fit(title, w - 18), stripes: w - G.textW(fit(title, w - 18)) > 34,
      kf: type === 'mini' ? 1.06 : type === 'big' ? 0.8 : 1, gf: type === 'mini' ? 0.92 : type === 'big' ? 0.85 : 1,
      hit: 0, ph: G.rand(0, 3), warn: false, entering: y == null, n: 0,
    };
  }

  G.MICRO.keepalive = {
    mode: 'desk', cmd: 'KEEP UP!', hint: "DON'T LET THEM HIT THE TASKBAR", time: 8, fx: 0.55, winOnTimeout: true,
    help: ['FROZEN WINDOWS FALL.', 'TAP ONE TO BOUNCE IT', 'BACK UP. NONE CAN TOUCH', 'THE TASKBAR. HOLD ON!'],
    BOSS: { max: 4, sp: 0.4, i0: 2.6, i1: 1.4, T: 11, d: 0.6 }, // jefe: ventanas a la vez, aceleración, cada cuánto sale otra, duración, dureza de la física
    init(s) {
      const r = s.r, d = s.boss ? this.BOSS.d : s.d;
      s.g = 150 + 80 * d;               // gravedad (px/s²)
      s.kick = 255 + 35 * d;            // velocidad del rebote
      s.vmax = 250 + 90 * d;            // velocidad máxima de caída (para que siempre dé tiempo a verla)
      s.floor = r.y + r.h - 1;          // la barra de tareas empieza justo debajo
      s.wins = []; s.parts = []; s.rings = []; s.msgs = []; s.bounces = 0; s.speed = 1; s.warnCd = 0; s.crash = null; s.gl = null;
      if (s.boss) {
        s.T = this.BOSS.T;
        // salidas escalonadas: la de abajo cae ya, la mini va subiendo y la grande tarda (pesa pero cae de más arriba)
        s.wins.push(mk(s, 'big', r.x + r.w / 2 - 68, r.y + 26, 0));
        s.wins.push(mk(s, 'norm', r.x + 2, r.y + 210, 0));
        s.wins.push(mk(s, 'mini', r.x + r.w - 62, r.y + 110, -150));
        s.nextSpawn = 1.6;
        return;
      }
      const n0 = 2 + Math.floor(d * 2.5);           // 2, 2, 2, 3, 3
      const lanes = n0, lw = r.w / lanes;
      const offs = []; for (let i = 0; i < n0; i++) offs.push(i * Math.round(110 / n0 + 30));
      for (let i = offs.length - 1; i > 0; i--) { const j = G.irand(0, i); [offs[i], offs[j]] = [offs[j], offs[i]]; }
      for (let i = 0; i < n0; i++) {
        const type = Math.random() < 0.3 ? 'mini' : 'norm';
        const ww = type === 'mini' ? 60 : 81;
        const x = r.x + lw * i + (lw - ww) / 2 + G.rand(-8, 8);
        s.wins.push(mk(s, type, x, r.y + 16 + offs[i] + G.rand(0, 10), 0)); // alturas escalonadas: no caen todas a la vez
      }
      // más ventanas a mitad de ronda
      s.spawnAt = d >= 0.3 ? [s.T * (d >= 0.6 ? 0.3 : 0.4)] : [];
    },
    spawn(s) {
      const type = s.boss ? (Math.random() < 0.35 ? 'mini' : 'norm') : Math.random() < 0.3 ? 'mini' : 'norm';
      // que no salga justo encima de otra que también está arriba
      let best = null, bd = -1;
      for (let k = 0; k < 6; k++) {
        const w = type === 'mini' ? 60 : 81, x = G.rand(s.r.x + 2, s.r.x + s.r.w - w - 2);
        let dmin = 999; for (const o of s.wins) if (o.y < s.r.y + 140) dmin = Math.min(dmin, Math.abs(o.x + o.w / 2 - (x + w / 2)));
        if (dmin > bd) { bd = dmin; best = x; }
      }
      s.wins.push(mk(s, type, best, null, 40 + s.d * 30));
      A().sfx('spawn', 1);
    },
    down(s, x, y) {
      if (s.done) return;
      let pick = null, pb = -1, near = null, nd = NEAR;
      for (const w of s.wins) {
        const dx = Math.max(w.x - x, 0, x - (w.x + w.w)), dy = Math.max(w.y - y, 0, y - (w.y + w.h)), dist = Math.hypot(dx, dy);
        if (dist === 0) { if (w.y + w.h > pb) { pb = w.y + w.h; pick = w; } } // encima de varias: la más baja (la que corre peligro)
        else if (dist < nd) { nd = dist; near = w; }
      }
      const w = pick || near;
      if (!w) return;
      const danger = s.floor - (w.y + w.h) < 46 && w.vy > 0;
      w.vy = -s.kick * w.kf * Math.sqrt(s.speed);
      w.vx = G.clamp((w.x + w.w / 2 - x) / (w.w / 2), -1, 1) * 75 + G.rand(-10, 10); // tocar a la izquierda la manda a la derecha
      w.hit = 0.16; w.warn = false; w.entering = false; w.n++;
      s.bounces++;
      A().sfx('bounce', w.type === 'mini' ? 2.2 : w.type === 'big' ? 0 : 1 + Math.random() * 0.6); G.vibrate(8);
      G.pulse({ ab: w.type === 'big' ? 3 : 1.2 });
      s.rings.push({ x: w.x, y: w.y, w: w.w, h: w.h, t: 0, col: w.st.fr === K ? W : w.st.fr });
      for (let k = 0; k < 6; k++) s.parts.push({ x: x + G.rand(-6, 6), y: Math.min(y, w.y + w.h) + G.rand(-2, 2), vx: G.rand(-60, 60), vy: G.rand(20, 90), t: 0 });
      if (danger) { s.msgs.push({ x: w.x + w.w / 2, y: w.y, txt: 'CLOSE CALL!', t: 0, big: true }); A().sfx('combo'); }
      if (w.type === 'big') { G.pulse({ glitch: 0.35 }); A().sfx('glitch'); }
    },
    update(s, dt) {
      const r = s.r, k = s.T > 0 ? Math.min(1, s.t / s.T) : 0;
      s.speed = s.boss ? 1 + this.BOSS.sp * k : 1 + 0.18 * k; // cada vez caen más rápido (el jefe, mucho más)
      const g = s.g * s.speed, vmax = s.vmax * Math.sqrt(s.speed);
      // ventanas nuevas
      if (s.boss) {
        s.nextSpawn -= dt;
        if (s.nextSpawn <= 0 && s.t < s.T - 1.2) { if (s.wins.length < this.BOSS.max) this.spawn(s); s.nextSpawn = G.lerp(this.BOSS.i0, this.BOSS.i1, k); }
      } else if (s.spawnAt.length && s.t >= s.spawnAt[0]) { s.spawnAt.shift(); this.spawn(s); }
      s.warnCd -= dt;
      for (const w of s.wins) {
        if (w.hit > 0) w.hit -= dt;
        w.vy = Math.min(vmax * (w.type === 'big' ? 0.85 : 1), w.vy + g * w.gf * dt);
        w.vx *= 1 - 0.55 * dt;
        w.x += w.vx * dt; w.y += w.vy * dt;
        if (w.x < r.x + 1) { w.x = r.x + 1; w.vx = Math.abs(w.vx) * 0.8; }
        if (w.x + w.w > r.x + r.w - 1) { w.x = r.x + r.w - 1 - w.w; w.vx = -Math.abs(w.vx) * 0.8; }
        if (w.entering) { if (w.y >= r.y + 1) w.entering = false; }
        else if (w.y < r.y + 1 && w.vy < 0) { w.y = r.y + 1; w.vy = Math.abs(w.vy) * 0.2; } // techo
        const gap = s.floor - (w.y + w.h);
        if (w.vy > 0 && gap < 70 && !w.warn) { w.warn = true; if (s.warnCd <= 0) { A().sfx('beepT'); s.warnCd = 0.35; } }
        if (gap <= 0) { // tocó la barra de tareas
          w.y = s.floor - w.h; s.crash = w;
          G.pulse({ shake: 7, glitch: 0.8 }); A().sfx('drop');
          s.fail('SYSTEM FROZEN'); return;
        }
      }
      for (let i = 0; i < s.wins.length; i++) for (let j = i + 1; j < s.wins.length; j++) {
        const a = s.wins[i], b = s.wins[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox <= 0 || oy <= -4) continue;
        const dir = a.x + a.w / 2 <= b.x + b.w / 2 ? -1 : 1, push = Math.min(ox / 2 + 1, 300 * dt);
        a.x += dir * push; b.x -= dir * push;
        a.vx = dir * Math.max(Math.abs(a.vx), 45); b.vx = -dir * Math.max(Math.abs(b.vx), 45);
        for (const w of [a, b]) w.x = G.clamp(w.x, r.x + 1, r.x + r.w - 1 - w.w);
      }
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.4);
      s.rings.forEach((g2) => (g2.t += dt)); s.rings = s.rings.filter((g2) => g2.t < 0.16);
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.8);
      if (s.boss) { if (s.gl) { s.gl.t -= dt; if (s.gl.t <= 0) s.gl = null; } else if (Math.random() < dt * 2.5) s.gl = { w: G.pick(s.wins), y: G.irand(0, 30), col: G.pick([Gr, B, W]), t: 0.08 }; }
    },
    drawWin(s, w) {
      const st = w.st, hot = w.warn && w.vy > 0 && Math.floor(s.t * 10) % 2 === 0;
      let x = Math.round(w.x), y = Math.round(w.y) - (w.hit > 0.08 ? 2 : 0);
      if (s.crash === w) { x += G.irand(-1, 1); }
      const rr = G.drawFrame({ x, y, w: w.w, h: w.h, st, title: w.tt, stripes: w.stripes, xmode: 'x' });
      const hg = Math.floor((s.t + w.ph) / 0.5) % 2 ? 'hg1' : 'hg2', map = { '#': st.tx, o: st.ac === st.bd ? st.tx : st.ac };
      if (w.type === 'mini') {
        G.drawSpr(hg, rr.x + 3, rr.y + Math.floor((rr.h - 9) / 2), map);
        G.text('WAIT' + '...'.slice(0, 1 + Math.floor((s.t * 3 + w.ph) % 3)), rr.x + 13, rr.y + Math.floor((rr.h - 7) / 2), st.tx);
      } else if (w.type === 'big') {
        G.drawSpr(hg, rr.x + 5, rr.y + 5, map, 2);
        ['EXPLORER.EXE', 'IS NOT', 'RESPONDING'].forEach((ln, i) => G.text(ln, rr.x + 26, rr.y + 4 + i * 9, st.tx));
        G.drawBtn(rr.x + rr.w - 52, rr.y + rr.h - 15, 48, 12, 'END NOW', st.tx, st.bd);
        G.drawBtn(rr.x + rr.w - 100, rr.y + rr.h - 15, 44, 12, 'WAIT', st.tx, st.bd);
        if (w.n) G.text('x' + w.n, rr.x + 5, rr.y + rr.h - 11, st.tx, { b: true });
      } else {
        G.drawSpr(hg, rr.x + 3, rr.y + Math.floor((rr.h - 9) / 2), map);
        G.text('NOT', rr.x + 13, rr.y + Math.floor(rr.h / 2) - 8, st.tx);
        G.text('RESPONDING', rr.x + 13, rr.y + Math.floor(rr.h / 2) + 1, st.tx);
      }
      // a punto de caer: parpadea el borde
      if (hot) { G.box(x - 2, y - 2, w.w + 4, w.h + 4, Gr); G.box(x - 3, y - 3, w.w + 6, w.h + 6, K); }
      if (w.hit > 0) G.drect(rr.x, rr.y, rr.w, rr.h, 6, st.tx, null); // "despierta" un instante
      if (s.gl && s.gl.w === w) G.drect(x, y + Math.min(w.h - 4, s.gl.y), w.w, 4, 8, s.gl.col, null);
    },
    draw(s) {
      const r = s.r;
      G.drect(r.x, r.y, r.w, r.h, 6, K, null); // atenúa el fondo para que se lean las ventanas
      // la barra de tareas: línea de peligro
      const danger = s.wins.some((w) => w.warn && w.vy > 0), blink = danger && Math.floor(s.t * 8) % 2 === 0;
      G.rect(r.x, s.floor - 1, r.w, 2, K); G.dash(r.x, s.floor - 1, r.w, blink ? Gr : W, 4, 3);
      const lab = 'TASKBAR', lw = G.textW(lab) + 6;
      G.rect(r.x + r.w - lw - 2, s.floor - 13, lw, 10, blink ? Gr : K); G.box(r.x + r.w - lw - 2, s.floor - 13, lw, 10, W);
      G.text(lab, r.x + r.w - lw + 1, s.floor - 11, blink ? K : W);
      // sombra en el suelo bajo las que caen (para ver dónde van a tocar)
      for (const w of s.wins) {
        const gap = s.floor - (w.y + w.h);
        if (w.vy <= 0 || gap > 150) continue;
        const k = 1 - gap / 150, sw = Math.round(w.w * (0.4 + 0.6 * k));
        G.drect(Math.round(w.x + (w.w - sw) / 2), s.floor - 4, sw, 3, Math.round(4 + k * 12), w.warn ? Gr : W, null);
      }
      // de abajo arriba: la más baja (la que corre peligro) queda encima, igual que el toque
      const ord = s.wins.slice().sort((a, b) => a.y + a.h - (b.y + b.h));
      for (const w of ord) this.drawWin(s, w);
      for (const g of s.rings) { const k = g.t / 0.16, e = Math.round(2 + k * 8); G.box(g.x - e, g.y - e, g.w + e * 2, g.h + e * 2, g.col); }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y), 2, 2, p.t < 0.2 ? W : L);
      for (const m of s.msgs) {
        const tw = G.textW(m.txt, 1, 1, true) + 6, mx = Math.round(G.clamp(m.x - tw / 2, r.x + 1, r.x + r.w - tw - 1)), my = Math.round(m.y - 14 - m.t * 26);
        G.rect(mx, my, tw, 11, Gr); G.box(mx, my, tw, 11, K); G.text(m.txt, mx + 3, my + 2, K, { b: true });
      }
      // marcador
      const t1 = 'BOUNCES ' + s.bounces, w1 = G.textW(t1, 1, 1, true) + 6;
      G.rect(r.x + 2, r.y + 2, w1, 11, K); G.text(t1, r.x + 5, r.y + 4, W, { b: true });
      if (s.boss && s.speed > 1.05) {
        const t2 = 'SPEED x' + s.speed.toFixed(1), w2 = G.textW(t2) + 6, hot = Math.floor(s.t * 4) % 2 === 0;
        G.rect(r.x + r.w - w2 - 2, r.y + 2, w2, 11, hot ? Gr : K); G.box(r.x + r.w - w2 - 2, r.y + 2, w2, 11, Gr); G.text(t2, r.x + r.w - w2 + 1, r.y + 4, hot ? K : Gr);
      }
    },
  };

  // icono: dos ventanitas colgadas botando sobre la barra de tareas, el cursor las devuelve arriba
  G.ICONS[22] = function (t) {
    G.rect(0, 17, 24, 3, K); G.rect(1, 18, 4, 1, W);
    const win = (x, u, w, h, bar) => {
      const y = Math.round(16 - h - 9 * 4 * u * (1 - u));
      G.rect(x, y, w, h, W); G.box(x, y, w, h, K); G.rect(x, y, w, 2, bar); G.px(x + w - 2, y, W);
      G.rect(x + 2, y + 3, 1, h - 4, K); // relojito
      return y;
    };
    const u1 = (t % 1.1) / 1.1, u2 = ((t + 0.55) % 1.1) / 1.1;
    const y1 = win(2, u1, 11, 7, K);
    win(15, u2, 8, 6, B);
    if (u1 < 0.12 || u1 > 0.95) G.drawSpr('cursor', 6, Math.min(12, y1 + 6), { '#': K, w: W });
  };
  G.CARD_SCHEMES[22] = { top: K, tt: W, ib: Gr, grid: K, bot: B, nc: W, bt: W };
})(window.G);
