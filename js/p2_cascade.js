'use strict';
// PARTE 2 · 18 CASCADE: apilar ventanas. Una ventana va de lado a lado sobre la pila y un toque la suelta.
// Lo que sobresale se corta y se cae. Las ventanas son las de la parte 1 (error, aviso, palabra grande,
// carga, copiando, login, smiley, fotos, iconos...), cada una con su alto, su estilo y su forma de moverse.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const S = G.scenes.game;

  const GAP = 28;  // hueco entre la pila y la ventana que se mueve
  const MIN = 8;   // menos que esto encima de la pila = se cae
  const PT = 3;    // margen para el "PERFECT!" (encaja sola)

  // tipos de ventana (los de la parte 1 + fotos e iconos) · [peso, alto]
  const KINDS = {
    error: [5, 56], warn: [4, 56], fix: [3, 62], big: [4, 62], loading: [3, 60], mini: [1.5, 34],
    mwin: [3.5, 0], photo: [3, 53], icons: [3, 50], timer: [2, 60], copying: [2, 78], login: [1.5, 80],
    pics: [1.5, 68], smiley: [1.2, 86], hydra: [1, 56], confirm: [1, 56],
  };
  // formas de moverse, de más fácil a más difícil
  const MOVES = [['slide'], ['slide', 'ease', 'drop'], ['ease', 'swing', 'drop', 'dash', 'slide'], ['swing', 'turn', 'dash', 'accel', 'drop', 'ease']];
  const BOSS_MOVES = ['turn', 'swing', 'accel', 'dash', 'drop'];

  const fit = (str, px) => { const n = Math.max(0, Math.floor((px + 1) / 6)); return str.length <= n ? str : n >= 3 ? str.slice(0, n - 1) + '.' : ''; };
  // vuelve a colocar textos y botones al ancho actual de la ventana
  function relayout(o) {
    o.title = o.full ? fit(o.full, o.w - (o.xl ? 26 : 16)) : '';
    if (o.msg) o.lines = G.wrap(o.msg, Math.max(12, o.w - 26)).slice(0, 2);
    if (o.lbls) {
      const bw = 40, gap = 6, tot = o.lbls.length * bw + (o.lbls.length - 1) * gap;
      o.btns = o.lbls.map((lb, i) => ({ lbl: lb, x: Math.floor(o.w / 2 - tot / 2) + i * (bw + gap), y: o.h - 18, w: bw, h: 13 }));
    } else o.btns = [];
  }
  // ventana como las de la parte 1 (mismos campos que S.makeWin, para pintarla con S.drawBody)
  function mk(s, w, type, hh) {
    const th = G.THEMES[G.irand(1, 12)], st = G.randStyle(s.block);
    const msg = () => (G.chance(0.8) ? G.pick(th.msgs) : G.pick(G.GENERIC_MSGS));
    const o = { type, w, h: KINDS[type] ? KINDS[type][1] : 50, st: Object.assign({}, st, { sh: null }), st0: st, full: G.pick(th.titles), xl: G.chance(0.22), stripes: G.chance(0.55), xmode: 'x', lbls: null, seed: Math.random() };
    switch (type) {
      case 'error': o.full = G.chance(0.5) ? 'ERROR' : o.full; o.msg = msg(); o.lbls = G.chance(0.5) ? ['OK'] : ['RETRY', 'CANCEL']; break;
      case 'hydra': o.type = 'error'; o.full = 'LOOP.EXE'; o.msg = 'CLOSE ME AND I COME BACK TWICE'; o.lbls = ['OK']; break;
      case 'warn': o.full = G.chance(0.5) ? 'WARNING' : o.full; o.msg = msg(); o.lbls = ['OK']; break;
      case 'confirm': o.full = 'LEAVING?'; o.lines = ['ARE YOU REALLY', 'LEAVING ME?']; o.lbls = ['YES', 'NO']; break;
      case 'fix': o.full = 'ERROR'; o.lbls = ['FIX']; break;
      case 'big': o.word = G.pick(th.bigs); o.jp = /[^\x00-\x7F]/.test(o.word) && o.word !== '∞'; o.heavy = !o.jp && G.chance(0.45); break;
      case 'loading': o.full = 'LOADING'; o.pp = G.rand(0, 0.6); o.rate = 1 / G.rand(2.4, 3.8); o.lbls = ['CANCEL']; break;
      case 'copying': o.full = 'COPYING...'; o.pp = G.rand(0, 0.5); o.rate = 1 / G.rand(5.5, 7.5); o.file = G.pick(['FILE.EXE', 'HAPPY.EXE', 'VOID.DLL', 'SOUL.SYS', 'TIME.DAT']); o.lbls = ['CANCEL']; break;
      case 'login': o.full = G.chance(0.5) ? 'LOGIN' : 'WELCOME'; o.lbls = ['OK', 'CANCEL']; break;
      case 'smiley': o.full = G.chance(0.5) ? 'HAPPY?' : 'SMILE'; o.lbls = ['OK']; o.tear = G.chance(0.6); break;
      case 'pics': o.full = G.pick(['PICS', 'MEMORIES', 'C:/LIFE']); break;
      case 'timer': o.full = 'TIME.EXE'; o.cd = G.rand(2, 9); break;
      case 'mini': o.full = 'AGAIN'; o.stripes = false; o.xl = false; break;
      case 'mwin': o.kind = G.pick(G.MINI_KINDS); o.h = hh || 45; break; // mini-ventanas animadas (reproductor, reloj, gráfica...)
      case 'photo': {
        const P0 = o.h - 19, ramps = G.camRamps(s.block), set = G.CAPTCHA_SET.slice().sort(() => Math.random() - 0.5);
        o.P = P0; o.pics = set.slice(0, 3).map(([nm]) => G.camPhoto(nm, G.irand(1, 99999), G.pick(ramps), P0));
        o.full = set[0][0].toUpperCase() + '.BMP'; o.stripes = false; break; }
      case 'icons': o.full = G.pick(['C:/STUFF', 'MY FILES', 'DESKTOP', 'C:/HOME']); o.icons = G.ICON20_TRASH.slice().sort(() => Math.random() - 0.5).slice(0, 6); break;
      case 'drive': o.full = 'C:\\'; o.h = 40; o.st = Object.assign({}, s.st, { sh: null }); o.st0 = s.st; o.stripes = true; o.xl = false; break;
    }
    relayout(o); return o;
  }
  function body(o, r, block) {
    const st = o.st, T = G.ctx();
    if (o.type === 'photo') {
      for (let i = 0, x = r.x + 2; x < r.x + r.w; i++, x += o.P + 4) { T.drawImage(o.pics[i % o.pics.length], x, r.y + 2); G.box(x - 1, r.y + 1, o.P + 2, o.P + 2, st.tx); }
    } else if (o.type === 'icons') {
      o.icons.forEach((ic, i) => {
        const cx = r.x + 20 + i * 40; if (cx - 20 > r.x + r.w) return;
        T.drawImage(G.icon20(ic, block), cx - 10, r.y + 2);
        G.text(G.ICON20_LABEL[ic] || ic.toUpperCase(), cx, r.y + 25, st.tx, { al: 'c' });
      });
    } else if (o.type === 'drive') {
      T.drawImage(G.icon20('harddisk', block), r.x + 3, r.y + 3);
      G.text('FOUNDATION.SYS', r.x + 27, r.y + 4, st.tx); G.text('DO NOT MOVE', r.x + 27, r.y + 13, st.tx);
    } else S.drawBody.call(S, o, r); // igual que en la parte 1
  }
  // dibuja la ventana con origen fx, mostrando solo [fx+a, fx+b] (el trozo que queda tras el corte)
  function drawWin(s, o, fx, y, a, b, base) {
    const T = G.ctx(), st = o.st0, x = Math.round(fx), yy = Math.round(y), h = o.h;
    const va = x + Math.round(a), vb = x + Math.round(b);
    if (vb - va < 1) return;
    G.drect(vb, yy + 3, 3, h, 8, st.sh, null); // sombra dura (solo a la derecha: la de abajo la tapa la ventana de debajo)
    if (base) G.drect(va + 3, yy + h, vb - va, 3, 8, st.sh, null);
    T.save(); T.beginPath(); T.rect(va - 1, yy - 1, vb - va + 2, h + 2); T.clip();
    o.x = x; o.y = yy;
    if (o.type === 'mwin') G.miniWin(x, yy, o.w, h, o.kind, G.time, o.st0, o.seed);
    else { const r = G.drawFrame(o); body(o, r, s.block); }
    T.restore();
    // canto del corte
    if (a > 0.5) { G.rect(va, yy, 1, h, st.fr); G.rect(va - 1, yy - 1, 1, h + 2, st.out || st.fr); }
    if (b < o.w - 0.5) { G.rect(vb - 1, yy, 1, h, st.fr); G.rect(vb, yy - 1, 1, h + 2, st.out || st.fr); }
  }
  // cosas que se animan dentro de las ventanas (barras de carga, cuenta atrás)
  function tickWin(o, dt) {
    if (o.rate) { o.pp += o.rate * dt; if (o.pp > 1.35) o.pp = 0; o.prog = Math.min(1, o.pp); }
    if (o.cd != null) { o.cd -= dt; if (o.cd <= 0) o.cd = 9; }
  }

  G.MICRO.cascade = {
    mode: 'desk', cmd: 'STACK!', hint: 'REACH THE TARGET LINE', time: 9, fx: 0.6,
    help: ['TAP TO DROP THE WINDOW.', 'WHAT HANGS OVER THE', 'EDGE GETS CUT OFF.', 'REACH THE TARGET LINE.'],
    init(s) {
      const r = s.r, d = s.d, boss = s.boss;
      s.need = boss ? 10 : 4 + Math.round(d * 4);
      s.w0 = Math.round(boss ? 118 : G.rand(112, 140) - 30 * d);   // ancho inicial (cambia en cada ronda)
      s.v0 = boss ? 132 : 88 + 110 * d;                            // velocidad base de la ventana
      s.moves = boss ? BOSS_MOVES : MOVES[Math.min(3, Math.floor(d * 4 + 0.35))];
      s.swayA = boss ? 8 : 0;                                      // el jefe: la torre se balancea
      s.alt = boss || d > 0.15;                                    // entra por un lado y por el otro
      // cola de ventanas: así la línea objetivo se sabe desde el principio
      s.queue = []; let last = null;
      const wts = {}; for (const k in KINDS) wts[k] = KINDS[k][0];
      for (let i = 0; i < s.need; i++) { let k; do k = G.wpick(wts); while (k === last); last = k; s.queue.push({ k, h: k === 'mwin' ? G.irand(40, 50) : KINDS[k][1] }); }
      const base = mk(s, s.w0, 'drive');
      const by = r.y + r.h - base.h - 6;
      s.stack = [{ o: base, fx: Math.round(r.x + (r.w - s.w0) / 2), a: 0, b: s.w0, y: by }];
      s.targetY = by - s.queue.reduce((acc, q) => acc + q.h, 0);
      s.placed = 0; s.cam = 0; s.mov = null; s.drop = null; s.nextT = 0; s.side = -1; s.streak = 0; s.perf = 0;
      s.pieces = []; s.ghosts = []; s.parts = []; s.msgs = []; s.reach = 0; s.gl = null;
      const travel = r.w - s.w0 - 2;
      s.T = (boss ? 2.2 : 1.4) + s.need * (0.65 + travel / s.v0 + 0.1);
      this.spawn(s);
    },
    off(s, i) { return s.swayA ? s.swayA * Math.sin(s.t * 1.7) * Math.pow(Math.min(1, i / s.need), 1.2) : 0; },
    top(s) { return s.stack[s.stack.length - 1]; },
    laneY(s, o) { return this.top(s).y - GAP - o.h; },
    spawn(s) {
      const r = s.r, top = this.top(s), tw = Math.round(top.b - top.a);
      const q = s.queue[s.placed] || { k: 'error', h: 56 }, type = q.k;
      // a veces llega una ventana más ancha que la pila (lo que sobra se corta igual)
      const wide = type !== 'mini' && G.chance(0.25) && tw < r.w - 60 ? G.irand(10, 24) : 0;
      const o = mk(s, tw + wide, type, q.h);
      let dir = 1;
      if (s.alt) { s.side = -s.side; dir = s.side; }
      const kind = G.pick(s.moves), v = s.v0 * G.rand(0.85, 1.15) * (kind === 'dash' ? 1.35 : 1);
      const lo = r.x + 1, hi = r.x + r.w - 1 - o.w;
      s.mov = { o, x: dir > 0 ? lo : hi, dir, kind, v, ph: Math.random() * 6, t: 0, yo: 0, enter: kind === 'drop' ? 0 : 1, boost: 1, next: G.rand(0.35, 0.8), pause: 0 };
      if (kind === 'swing') { s.mov.ph = dir > 0 ? -Math.PI / 2 : Math.PI / 2; s.mov.om = (v * Math.PI) / Math.max(20, hi - lo); }
      A().sfx('spawn', G.irand(0, 2));
    },
    down(s) {
      if (!s.mov || s.drop || s.done) return;
      const m = s.mov, ly = this.top(s).y - m.o.h;
      s.drop = { o: m.o, x: m.x, y: this.laneY(s, m.o) + m.yo, vy: 140, ly, t: 0 };
      s.mov = null; A().sfx('tap');
    },
    land(s) {
      const dr = s.drop, n = s.stack.length, top = s.stack[n - 1], r = s.r;
      const tOff = this.off(s, n - 1), nOff = this.off(s, n);
      const tl = top.fx + top.a + tOff, tr = top.fx + top.b + tOff;
      let x = dr.x; const w = dr.o.w;
      let l = Math.max(x, tl), rr = Math.min(x + w, tr);
      const perfect = (tr - tl) - (rr - l) <= PT;
      if (perfect) { x = w > tr - tl ? G.clamp(x, tr - w, tl) : tl; l = Math.max(x, tl); rr = Math.min(x + w, tr); }
      if (rr - l < MIN) { // no se sostiene: se cae entera
        dr.miss = true; dr.x = x; dr.vx = (x + w / 2 < (tl + tr) / 2 ? -1 : 1) * 50; dr.vy = 60;
        A().sfx('deny'); G.pulse({ shake: 4 });
        return;
      }
      // lo que sobresale se corta y se cae
      const cut = (a, b) => { s.pieces.push({ o: dr.o, fx: x, a: a - x, b: b - x, y: dr.ly, vy: 30, vx: (a < l ? -1 : 1) * G.rand(25, 45), t: 0 }); };
      if (l > x + 0.5) cut(x, l);
      if (x + w > rr + 0.5) cut(rr, x + w);
      const rec = { o: dr.o, fx: x - nOff, a: l - x, b: rr - x, y: dr.ly };
      s.stack.push(rec); s.drop = null; s.placed++;
      const cx = (l + rr) / 2, sy = dr.ly;
      if (perfect) {
        s.streak++; s.perf++;
        // tres seguidas: la ventana crece un poco (sin pasar del ancho inicial)
        let txt = 'PERFECT!';
        const vis = rec.b - rec.a;
        if (s.streak % 3 === 0 && vis < s.w0) {
          const g = Math.min(8, s.w0 - vis), o = Object.assign({}, rec.o); // copia: los trozos cortados siguen con la vieja
          rec.fx = rec.fx + rec.a - g / 2; o.w = Math.round(vis + g); rec.o = o; rec.a = 0; rec.b = o.w;
          rec.fx = G.clamp(rec.fx, r.x + 1 - nOff, r.x + r.w - 1 - o.w - nOff); relayout(o);
          txt = 'PERFECT! +WIDTH';
        }
        s.msgs.push({ x: cx, y: sy, txt, t: 0, big: true });
        A().sfx('combo'); G.pulse({ ab: 2, flash: 0.08, flashCol: W }); G.vibrate(15);
        for (let k = 0; k < 8; k++) s.parts.push({ x: cx + G.rand(-30, 30), y: sy, vx: G.rand(-70, 70), vy: G.rand(-120, -40), t: 0 });
      } else {
        s.streak = 0;
        s.msgs.push({ x: cx, y: sy, txt: '-' + Math.round((tr - tl) - (rr - l)) + 'PX', t: 0 });
        A().sfx('close', s.placed); A().sfx('drop'); G.pulse({ ab: 1.5 }); G.vibrate(10);
      }
      if (s.placed >= s.need) { s.reach = 1; s.win(); G.pulse({ flash: 0.12, flashCol: W }); return; }
      s.nextT = 0.16;
    },
    moveWin(s, m, dt) {
      const r = s.r, lo = r.x + 1, hi = r.x + r.w - 1 - m.o.w;
      m.t += dt;
      if (m.enter < 1) { m.enter = Math.min(1, m.enter + dt / 0.5); const k = 1 - m.enter; m.yo = -Math.round(k * k * 170); }
      if (m.kind === 'swing') { // péndulo: lento en los extremos y sube un poco
        m.ph += m.om * dt; m.x = (lo + hi) / 2 + ((hi - lo) / 2) * Math.sin(m.ph);
        m.yo = -Math.round(6 * Math.pow(Math.sin(m.ph), 2));
        return;
      }
      let v = m.v * m.boost;
      if (m.kind === 'ease') v *= 1 + 0.5 * Math.sin(m.t * 4.6 + m.ph);
      else if (m.kind === 'dash') { // va a tirones: se para un momento (NOT RESPONDING) y arranca
        if (m.pause > 0) { m.pause -= dt; v = 0; }
        else { m.next -= dt; if (m.next <= 0) { m.pause = 0.24; m.next = G.rand(0.35, 0.75); } }
      } else if (m.kind === 'turn') { // cambia de sentido a mitad de camino
        m.next -= dt; if (m.next <= 0) { m.dir = -m.dir; m.next = G.rand(0.3, 0.85); }
      }
      m.x += m.dir * v * dt;
      const bump = () => { if (m.kind === 'accel') m.boost = Math.min(1.7, m.boost * 1.15); };
      if (m.x < lo) { m.x = lo; m.dir = 1; bump(); }
      if (m.x > hi) { m.x = hi; m.dir = -1; bump(); }
    },
    update(s, dt) {
      const r = s.r;
      // cámara: si la torre sube mucho, baja la vista (la ventana que se mueve siempre a la vista)
      const lane = s.mov ? this.laneY(s, s.mov.o) : s.drop ? s.drop.ly - GAP : this.top(s).y - GAP - 50;
      const want = Math.max(0, r.y + 18 - lane);
      s.cam += (want - s.cam) * Math.min(1, dt * 6);
      if (s.mov) { this.moveWin(s, s.mov, dt); tickWin(s.mov.o, dt); }
      for (const e of s.stack) tickWin(e.o, dt);
      const dr = s.drop;
      if (dr) {
        dr.t += dt; dr.vy += 2600 * dt; dr.y += dr.vy * dt; tickWin(dr.o, dt);
        if (dr.miss) { dr.x += dr.vx * dt; if (dr.y > r.y + r.h + 30 - s.cam || dr.t > 0.7) { s.fail('MISSED'); return; } }
        else if (dr.y >= dr.ly) { dr.y = dr.ly; this.land(s); if (s.done) return; }
      }
      if (s.nextT > 0) { s.nextT -= dt; if (s.nextT <= 0) this.spawn(s); }
      // trozos cortados: caen y se cierran como las ventanas de la parte 1
      for (const p of s.pieces) {
        p.t += dt; p.vy += 900 * dt; p.y += p.vy * dt; p.fx += p.vx * dt;
        if (p.t > 0.42 && !p.gone) {
          p.gone = true;
          const x = p.fx + p.a, w = p.b - p.a, st = p.o.st0;
          s.ghosts.push({ x, y: p.y, w, h: p.o.h, t: 0, col: st.fr === K ? W : st.fr });
          for (let k = 0; k < 5; k++) s.parts.push({ x: x + G.rand(0, w), y: p.y + G.rand(0, p.o.h), vx: G.rand(-50, 50), vy: G.rand(-90, -20), t: 0 });
        }
      }
      s.pieces = s.pieces.filter((p) => !p.gone);
      s.ghosts.forEach((g) => (g.t += dt)); s.ghosts = s.ghosts.filter((g) => g.t < 0.14);
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }); s.parts = s.parts.filter((p) => p.t < 0.45);
      s.msgs.forEach((m2) => (m2.t += dt)); s.msgs = s.msgs.filter((m2) => m2.t < 0.8);
      // jefe: rayas de glitch en ventanas al azar
      if (s.boss) { if (s.gl) { s.gl.t -= dt; if (s.gl.t <= 0) s.gl = null; } else if (Math.random() < dt * 3) { const i = G.irand(0, s.stack.length - 1); s.gl = { i, y: G.irand(0, s.stack[i].o.h - 5), col: G.pick([Gr, B, W]), t: 0.08 }; } }
    },
    draw(s) {
      const r = s.r, cam = Math.round(s.cam), T = G.ctx();
      G.drect(r.x, r.y, r.w, r.h, 8, K, null); // atenúa el fondo para que se lean las ventanas (como TRASH)
      T.save(); T.beginPath(); T.rect(r.x, r.y, r.w, r.h); T.clip();
      // línea objetivo
      const ty = Math.round(s.targetY + cam);
      const hot = s.reach && Math.floor(s.t * 10) % 2 === 0;
      G.dash(r.x, ty - 1, r.w, hot ? Gr : W, 3, 2); G.dash(r.x + 1, ty, r.w, K, 3, 2);
      const lab = 'TARGET', lw = G.textW(lab) + 6;
      G.rect(r.x + r.w - lw - 2, ty - 11, lw, 10, hot ? Gr : K); G.box(r.x + r.w - lw - 2, ty - 11, lw, 10, W);
      G.text(lab, r.x + r.w - lw + 1, ty - 9, hot ? K : W);
      // la pila (de abajo arriba: la sombra de cada una cae sobre la de debajo)
      s.stack.forEach((e, i) => {
        const y = e.y + cam, fx = e.fx + this.off(s, i);
        if (y > r.y + r.h + 4 || y + e.o.h < r.y - 4) return;
        drawWin(s, e.o, fx, y, e.a, e.b, i === 0);
        if (s.gl && s.gl.i === i) G.drect(fx + e.a, y + s.gl.y, e.b - e.a, 4, 8, s.gl.col, null);
      });
      for (const p of s.pieces) drawWin(s, p.o, p.fx, p.y + cam, p.a, p.b, false);
      for (const g of s.ghosts) { const k = 1 - g.t / 0.14; for (let i = 0; i < 2; i++) { const kk = k - i * 0.25; if (kk <= 0) continue; const ww = g.w * kk, hh = g.h * kk; G.box(g.x + (g.w - ww) / 2, g.y + cam + (g.h - hh) / 2, ww, hh, g.col); } }
      if (s.drop) drawWin(s, s.drop.o, s.drop.x, s.drop.y + cam, 0, s.drop.o.w, false);
      const m = s.mov;
      if (m) {
        let jx = 0, jy = 0;
        if (s.boss && Math.random() < 0.5) { jx = G.irand(-1, 1); jy = G.irand(-1, 1); } // el jefe tiembla
        const y = this.laneY(s, m.o) + m.yo + cam;
        drawWin(s, m.o, m.x + jx, y + jy, 0, m.o.w, false);
        if (m.kind === 'dash' && m.pause > 0) { // se ha colgado un momento
          const lbl = 'NOT RESPONDING', lw2 = G.textW(lbl) + 6, lx = Math.round(G.clamp(m.x + m.o.w / 2 - lw2 / 2, r.x + 1, r.x + r.w - lw2 - 1));
          G.rect(lx, Math.round(y) + 2, lw2, 9, K); G.text(lbl, lx + 3, Math.round(y) + 3, W);
        }
        if (s.boss && Math.random() < 0.05) G.drect(m.x, y + G.irand(0, m.o.h - 4), m.o.w, 3, 8, G.pick([Gr, B, W]), null);
      }
      for (const p of s.parts) G.rect(Math.round(p.x), Math.round(p.y + cam), 3, 3, p.t < 0.2 ? W : L);
      for (const mm of s.msgs) { // etiqueta con fondo, para que se lea sobre cualquier fondo
        const tw = G.textW(mm.txt, 1, 1, !!mm.big) + 6, mx = Math.round(G.clamp(mm.x - tw / 2, r.x + 1, r.x + r.w - tw - 1)), my = Math.round(mm.y + cam - 14 - mm.t * 26);
        G.rect(mx, my, tw, 11, mm.big ? Gr : K); G.box(mx, my, tw, 11, mm.big ? K : W);
        G.text(mm.txt, mx + 3, my + 2, mm.big ? K : W, { b: !!mm.big });
      }
      T.restore();
      // marcador
      const t1 = 'FLOORS ' + s.placed + '/' + s.need, w1 = G.textW(t1, 1, 1, true) + 6;
      G.rect(r.x + 2, r.y + 2, w1, 11, K); G.text(t1, r.x + 5, r.y + 4, W, { b: true });
      if (s.streak >= 2) { const t2 = 'PERFECT x' + s.streak, w2 = G.textW(t2) + 6; G.rect(r.x + r.w - w2 - 2, r.y + 2, w2, 11, Gr); G.text(t2, r.x + r.w - w2 + 1, r.y + 4, K); }
      T.globalAlpha = 1;
    },
  };

  // icono: una ventana va y viene y cae sobre la pila
  G.ICONS[18] = function (t) {
    const win = (x, y, w, bar) => { G.rect(x, y, w, 5, W); G.box(x, y, w, 5, K); G.rect(x, y, w, 2, bar); G.px(x + w - 2, y, W); };
    win(3, 15, 18, K); win(5, 10, 15, Gr);
    const c = t % 2.2;
    if (c < 1.6) win(Math.round(5 + 4 * Math.sin(c * 4)), 1, 15, B);
    else { const k = Math.min(1, (c - 1.6) / 0.15); win(5, Math.round(1 + 4 * k), 15, B); }
  };
  G.CARD_SCHEMES[18] = { top: Gr, tt: K, ib: B, grid: K, bot: L, nc: B, bt: K };
})(window.G);
