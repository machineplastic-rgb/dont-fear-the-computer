'use strict';
// PARTE 2 · 16 SCREENSAVER: el escritorio se queda en reposo y salta el salvapantallas.
// El logo NEØ OS rebota en diagonal; hay que tocar (en cualquier sitio) justo cuando encaja en una esquina.
// El recorrido se calcula hacia atrás desde la esquina, así que siempre llega a tiempo.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;
  const LW = 68, LH = 30; // tamaño del logo

  // rebote perfecto: posición plegada entre 0 y X
  function fold(q, X) { const m = ((q % (2 * X)) + 2 * X) % (2 * X); return m <= X ? m : 2 * X - m; }
  function pos(lg, t) { return { x: fold(lg.qx + lg.sx * lg.v * t, lg.X), y: fold(lg.qy + lg.sy * lg.v * t, lg.Y) }; }
  function cornerDist(lg, t) { const p = pos(lg, t); return Math.max(Math.min(p.x, lg.X - p.x), Math.min(p.y, lg.Y - p.y)); }
  // rebotes acumulados (sube en cada pared): sirve para cambiar de color
  function bounces(lg, t) { return Math.floor((lg.qx + lg.sx * lg.v * t) / lg.X) * lg.sx + Math.floor((lg.qy + lg.sy * lg.v * t) / lg.Y) * lg.sy; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // instantes en que un eje toca pared entre t0 y t1 (cálculo directo, sin simular)
  function touches(q, sg, v, X, t0, t1) {
    const a = q + sg * v * t0, b = q + sg * v * t1, out = [];
    for (let k = Math.ceil(Math.min(a, b) / X); k * X <= Math.max(a, b); k++) out.push((k * X - q) / (sg * v));
    return out;
  }
  // ¿pasa cerca (≤ c) de alguna esquina entre t0 y t1, sin contar la esquina buena de th?
  function otherCorner(lg, c, t0, t1) {
    const tx = touches(lg.qx, lg.sx, lg.v, lg.X, t0 - 1, t1 + 1), ty = touches(lg.qy, lg.sy, lg.v, lg.Y, t0 - 1, t1 + 1), w = (2 * c) / lg.v;
    for (const a of tx) for (const b of ty) { const t = (a + b) / 2; if (Math.abs(a - b) <= w && t >= t0 && t <= t1 && Math.abs(t - lg.th) > 0.02) return true; }
    return false;
  }

  // diseña un logo que encaja en una esquina justo en th: se calcula hacia atrás desde la esquina
  function makeLogo(s, th, o) {
    o = o || {};
    const X = s.box.w - LW, Y = s.box.h - LH, v = s.v, tol = s.tol;
    let lg = null;
    for (let k = 0; k < 200; k++) {
      const cx = G.chance(0.5) ? 0 : X, cy = G.chance(0.5) ? 0 : Y, sx = G.chance(0.5) ? 1 : -1, sy = G.chance(0.5) ? 1 : -1;
      lg = { X, Y, v, sx, sy, qx: cx - sx * v * th, qy: cy - sy * v * th, th, fake: !!o.fake, hit: null };
      if (k < 160) {
        if (otherCorner(lg, tol * 1.7, -0.3, th + 1)) continue; // ninguna otra esquina en toda la ronda
        if (o.avoid && o.avoid.some((ta) => cornerDist(lg, ta) <= tol * 2.4)) continue; // ni a la vez que otro
      }
      break;
    }
    lg.styles = shuffle(Array.from(new Set(G.STYLE_SETS[Math.min(s.block, 3)])));
    lg.nb = bounces(lg, 0); lg.nb0 = lg.nb;
    return lg;
  }

  // ---------- dibujo ----------
  function drawLogo(x, y, st, inv) {
    let bd = st.bd, tx = st.tx;
    if (inv) { const k = bd; bd = tx; tx = k; }
    G.drect(x + 3, y + 3, LW, LH, 8, st.sh, null);
    if (st.out) G.box(x - 1, y - 1, LW + 2, LH + 2, st.out);
    G.rect(x, y, LW, LH, st.fr); G.rect(x + 2, y + 2, LW - 4, LH - 4, bd);
    G.drawSpr('eyelogo', x + 5, y + 8, { '#': tx }, 2);
    G.text('NEØ', x + 27, y + 4, tx, { s: 2 });
    G.text('OS 98', x + 27, y + 20, tx);
  }
  function drawFake(x, y) { // logo falso: punteado, como las X falsas
    G.drect(x, y, LW, LH, 8, L, null);
    G.rect(x + 2, y + 2, LW - 4, LH - 4, K);
    G.drect(x + 2, y + 2, LW - 4, LH - 4, 2, L, null);
    G.drawSpr('eyelogo', x + 5, y + 8, { '#': L }, 2);
    G.text('NEØ', x + 27, y + 4, L, { s: 2 });
    G.text('OS 98', x + 27, y + 20, L);
  }
  // corchete punteado de esquina (fuera de la zona del logo)
  function bracket(x, y, dx, dy, col, solid) {
    const n = 20;
    for (let i = 0; i < n; i++) {
      if (solid || i % 2 === 0) { G.px(x + dx * i, y, col); G.px(x, y + dy * i, col); }
      if (solid || i % 2 === 1) { G.px(x + dx * (i + 2), y + dy * 2, col); G.px(x + dx * 2, y + dy * (i + 2), col); }
    }
  }

  G.MICRO.screensaver = {
    mode: 'desk', cmd: 'CORNER!', hint: 'TAP WHEN THE LOGO HITS A CORNER', time: 4,
    help: ['THE SCREEN SAVER IS ON.', 'TAP ANYWHERE THE MOMENT', 'THE LOGO HITS A CORNER.', 'DOTTED LOGOS ARE FAKE.'],
    init(s) {
      const r = s.r;
      s.box = { x: r.x + 6, y: r.y + 6, w: r.w - 12, h: r.h - 6 - 16 };
      s.v = (58 + 36 * s.d) * (s.boss ? 1.04 : 1); // velocidad por eje (px/s)
      s.tol = 15 - 5 * s.d + (s.boss ? 2 : 0); // margen de la esquina (px)
      s.logos = []; s.got = 0; s.lock = 0; s.flash = [0, 0, 0, 0]; s.msgs = [];
      if (s.boss) {
        s.hint = 'THREE LOGOS: CATCH EACH ONE';
        let th = G.rand(1.7, 2.3);
        for (let i = 0; i < 3; i++) { s.logos.push(makeLogo(s, th)); th += G.rand(1.0, 1.4); }
        s.need = 3;
      } else {
        const decoys = s.d >= 0.25 ? (s.d >= 0.55 ? 2 : 1) : 0; // logos falsos que encajan antes (cebo)
        let th = G.rand(1.9 + 0.5 * s.d, 2.8 + 0.9 * s.d);
        th = Math.max(th, [0, 2.4, 3.0][decoys]);
        const real = makeLogo(s, th), avoid = [th];
        let td = th;
        for (let i = 0; i < decoys; i++) { td -= G.rand(0.65, 0.95); avoid.push(td); s.logos.push(makeLogo(s, td, { fake: true, avoid: avoid.slice(0, -1) })); }
        if (decoys) s.hint = decoys > 1 ? 'DOTTED LOGOS ARE FAKE' : 'THE DOTTED LOGO IS FAKE';
        s.logos.push(real);
        s.need = 1;
      }
      s.T = Math.max(...s.logos.filter((l) => !l.fake).map((l) => l.th)) + 0.85;
    },
    update(s, dt) {
      if (s.lock > 0) s.lock -= dt;
      for (const lg of s.logos) {
        if (lg.hit) continue;
        const nb = bounces(lg, s.t);
        if (nb !== lg.nb) { lg.nb = nb; if (!lg.fake) A().sfx('bounce', G.irand(0, 2)); }
      }
      s.msgs.forEach((m) => (m.t += dt)); s.msgs = s.msgs.filter((m) => m.t < 0.8);
    },
    tap(s) {
      if (s.lock > 0 || s.done) return;
      const reals = s.logos.filter((l) => !l.fake && !l.hit);
      const got = reals.filter((l) => cornerDist(l, s.t) <= s.tol || cornerDist(l, s.t - 0.07) <= s.tol); // un pelín de margen por el retraso de la pantalla táctil
      if (got.length) {
        for (const lg of got) {
          const p = pos(lg, s.t), cx = p.x < lg.X / 2 ? 0 : lg.X, cy = p.y < lg.Y / 2 ? 0 : lg.Y;
          lg.hit = { x: cx, y: cy, at: G.time, st: lg.styles[(((lg.nb - lg.nb0) % lg.styles.length) + lg.styles.length) % lg.styles.length] };
          const c = (cx ? 1 : 0) + (cy ? 2 : 0); s.flash[c] = G.time + 0.45;
          s.msgs.push({ x: s.box.x + cx + LW / 2, y: s.box.y + cy + (cy ? -13 : LH + 6), dir: cy ? -1 : 1, t: 0 }); // el texto se aleja de la esquina
          s.got++;
        }
        A().sfx('close', 3 + s.got * 2); G.pulse({ ab: 3, shake: 3 }); G.vibrate(25);
        s.lock = 0.15;
        if (s.got >= s.need) s.win();
        return;
      }
      if (s.logos.some((l) => l.fake && cornerDist(l, s.t) <= s.tol + 4)) { A().sfx('fake'); s.fail('FAKE LOGO'); return; }
      const next = Math.min(...reals.map((l) => l.th));
      s.fail(s.t < next ? 'TOO SOON' : 'TOO LATE');
    },
    draw(s) {
      const r = s.r, bx = s.box;
      G.drect(r.x, r.y, r.w, r.h, 12, K, null); // el escritorio se apaga (se sigue viendo el fondo)
      // esquinas marcadas
      const cs = [[bx.x - 2, bx.y - 2, 1, 1], [bx.x + bx.w + 1, bx.y - 2, -1, 1], [bx.x - 2, bx.y + bx.h + 1, 1, -1], [bx.x + bx.w + 1, bx.y + bx.h + 1, -1, -1]];
      cs.forEach(([x, y, dx, dy], i) => { const on = s.flash[i] > G.time; bracket(x, y, dx, dy, on ? (Math.floor(G.time * 16) % 2 ? W : s.acc === L ? W : s.acc) : W, on); });
      // logos: los falsos debajo
      for (const lg of s.logos) if (lg.fake) { const p = pos(lg, s.t); drawFake(Math.round(bx.x + p.x), Math.round(bx.y + p.y)); }
      for (const lg of s.logos) {
        if (lg.fake) continue;
        if (lg.hit) { // se queda clavado, parpadea y se cierra como una ventana
          const k = G.time - lg.hit.at, x = bx.x + lg.hit.x, y = bx.y + lg.hit.y;
          if (k < 0.3) drawLogo(x, y, G.WSTYLES[lg.hit.st], Math.floor(k * 20) % 2 === 0);
          else if (k < 0.44) { const q = 1 - (k - 0.3) / 0.14; for (let i = 0; i < 2; i++) { const kk = q - i * 0.25; if (kk <= 0) continue; const ww = LW * kk, hh = LH * kk; G.box(x + (LW - ww) / 2, y + (LH - hh) / 2, ww, hh, W); } }
          continue;
        }
        const p = pos(lg, s.t), nb = bounces(lg, s.t), n = lg.styles.length;
        drawLogo(Math.round(bx.x + p.x), Math.round(bx.y + p.y), G.WSTYLES[lg.styles[(((nb - lg.nb0) % n) + n) % n]], false);
      }
      for (const m of s.msgs) G.text('CORNER!', m.x, m.y + m.dir * m.t * 22, W, { al: 'c', b: true });
      const sec = Math.floor(s.t);
      G.text('IDLE 00:' + String(5 + sec).padStart(2, '0'), r.x + 4, r.y + r.h - 9, W);
      G.text('CORNERS ' + s.got + '/' + s.need, r.x + r.w - 4, r.y + r.h - 9, W, { al: 'r', b: true });
    },
  };

  // icono: monitor con el logo rebotando; destella al encajar en la esquina
  G.ICONS[16] = function (t) {
    G.rect(1, 0, 22, 16, W); G.rect(2, 1, 20, 14, K);
    G.rect(9, 16, 6, 2, W); G.rect(6, 18, 12, 2, W);
    const q = t * 10, x = 3 + Math.round(fold(q, 12)), y = 2 + Math.round(fold(q, 8));
    const hit = (q % 24) < 1.5 || (q % 24) > 22.5; // 24 = mcm(12, 8): ahí coinciden las dos paredes
    const c = hit && Math.floor(t * 12) % 2 ? Gr : W;
    G.rect(x, y, 6, 4, c); G.rect(x + 1, y + 1, 2, 2, K); G.rect(x + 4, y + 1, 1, 2, K);
    for (const [cx, cy, dx, dy] of [[3, 2, 1, 1], [20, 2, -1, 1], [3, 13, 1, -1], [20, 13, -1, -1]]) { G.px(cx, cy, L); G.px(cx + dx * 2, cy, L); G.px(cx, cy + dy * 2, L); }
  };
  G.CARD_SCHEMES[16] = { top: W, tt: K, ib: B, grid: K, bot: L, nc: B, bt: K };
})(window.G);
