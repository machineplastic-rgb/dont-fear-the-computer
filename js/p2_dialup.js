'use strict';
// PARTE 2 · 20 DIAL.UP: conexión por módem. Mantén el dedo para subir la señal y suéltalo para que baje
// (la aguja tiene inercia). Mientras la señal esté dentro de la franja, la conexión se carga; fuera, hay
// ruido en la línea y si se acumula demasiado: NO CARRIER. Jefe: tormenta (la franja salta y salen pop-ups).
// Aspecto: ventana de "acceso telefónico" de los 90 (usuario, contraseña, número, velocidad, duración,
// bytes, luces del módem), con el azul del bloque 1 mandando.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, L = P.L;
  const A = () => G.audio;

  const SPD = 38; // píxeles por segundo que avanza la traza del osciloscopio
  const POPS = [
    ['CALL WAITING', ['INCOMING CALL!', 'PICK UP?']],
    ['DISCONNECT?', ['IDLE FOR 0 SEC.', 'HANG UP NOW?']],
    ['NEØTEL', ['FREE HOURS LEFT:', '0:00']],
    ['LINE NOISE', ['STATIC DETECTED', 'ON YOUR LINE']],
    ['MODEM.SYS', ['SPEAKER TOO LOUD.', 'TURN IT UP?']],
  ];
  const PHONE = '555-0198';
  const STATUS = [[0, 'DIALING ' + PHONE + '...'], [0.25, 'VERIFYING USER NAME...'], [0.5, 'VERIFYING PASSWORD...'], [0.75, 'LOGGING ON TO NETWORK...']];
  const LEDS = ['CD', 'OH', 'RD', 'SD', 'TR'];

  function center(s, off) {
    const base = 0.5 + s.amp * Math.sin(s.ph) + s.amp2 * Math.sin(s.ph2);
    return G.clamp(base + (off == null ? s.off : off), s.hw + 0.04, 1 - s.hw - 0.04);
  }
  const yOf = (s, u) => Math.round(s.sc.y + s.sc.h - 4 - G.clamp(u, 0, 1) * (s.sc.h - 8));
  const pid = (e) => (e && e.pointerId != null ? e.pointerId : 1);
  const num = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const dur = (t) => { const k = Math.floor(t); return '000:' + String(Math.floor(k / 60)).padStart(2, '0') + ':' + String(k % 60).padStart(2, '0'); };

  // campo hundido de los 90 (blanco, sombra negra arriba-izquierda)
  function field(x, y, w, h, txt, col) {
    G.rect(x, y, w, h, W); G.box(x, y, w, h, B);
    G.rect(x + 1, y + 1, w - 2, 1, K); G.rect(x + 1, y + 1, 1, h - 2, K);
    if (txt) G.text(txt, x + 4, y + Math.floor((h - 7) / 2), col || K);
  }

  G.MICRO.dialup = {
    mode: 'float', tilt: 3, cmd: 'CONNECT!', hint: 'HOLD TO RAISE THE SIGNAL', time: 6, fx: 0.4,
    help: ['HOLD: SIGNAL GOES UP.', 'LET GO: IT FALLS.', 'KEEP IT IN THE BAND', 'UNTIL YOU CONNECT.'],
    float(aw, ah) { return { w: aw - 10, h: Math.min(ah - 30, 372), title: 'CONNECT TO NEØTEL' }; },
    init(s) {
      const r = s.r, d = s.d;
      // aguja: cuanto más difícil, más pesada (menos freno = se pasa de largo)
      s.hold = new Set(); s.u = 0.06; s.v = 0;
      s.lift = 3.4 - 0.6 * d; s.fall = 2.8 - 0.4 * d; s.damp = 3.2 - 1.2 * d;
      // franja: más estrecha y más rápida; a partir de la mitad cambia de ritmo y hay ráfagas de estática
      s.hw = s.boss ? 0.13 : 0.17 - 0.06 * d;
      s.amp = s.boss ? 0.2 : 0.16 + 0.1 * d; s.amp2 = 0.03 + 0.03 * d; s.spd = s.boss ? 1.1 : 0.85 + 0.65 * d;
      s.ph = G.rand(0, 6.28); s.ph2 = G.rand(0, 6.28); s.mul = 1; s.mt = 0.8;
      s.off = 0; s.offT = 0; s.ghost = null; s.jt = 2.4;
      s.gust = d > 0.5 && !s.boss ? (d - 0.5) * 2.4 : 0; s.static = 0;
      // conexión y ruido
      s.fillT = s.boss ? 3.9 : 2.8 + 1.5 * d; s.drain = 0.06 + 0.06 * d; s.noiseMax = s.boss ? 2.2 : 1.8 - 0.4 * d;
      s.T = s.boss ? s.fillT * 2 + 2 : s.fillT * 1.6 + 1.4;
      s.p = 0; s.noise = 0; s.entered = false; s.inb = false; s.step = 0; s.wt = 0;
      s.hist = []; s.pops = []; s.popT = 1.4; s.last = 0;
      s.rx = 0; s.tx = 0; s.title = 'CONNECT TO NEØTEL'; // contadores de bytes (solo decorado)
      // fondo: siempre uno de los azules de la parte 1 (que mande el azul)
      if (G.scene && G.scene.mg === this && s.block === 1) G.scene.wall = G.wallpaper(1, 1000 + G.irand(0, 5) * 131);
      s.hint = s.boss ? 'STORM! TAP THE POP-UPS AWAY' : d > 0.5 ? 'HOLD TO RAISE THE SIGNAL. STATIC!' : 'HOLD TO RAISE THE SIGNAL';
      // maqueta de la ventana: iconos, campos, estado, pantalla, barras, detalles y botón
      const FIX = 226; // todo lo que no es la pantalla (con los 5 campos)
      s.compact = r.h - FIX < 90; // pantallas bajas: menos campos
      const fieldsH = s.compact ? 38 : 62;
      s.lay = { icons: r.y + 4, fields: r.y + 36 };
      s.lay.status = s.lay.fields + fieldsH;
      const scY = s.lay.status + 13;
      const scH = Math.max(70, r.h - (FIX - 62 + fieldsH));
      s.sc = { x: r.x + 9, y: scY, w: r.w - 18, h: scH };
      s.lay.conn = scY + scH + 6; s.lay.noise = s.lay.conn + 24; s.lay.box = s.lay.noise + 18; s.lay.btn = s.lay.box + 48;
      s.c = center(s);
    },
    update(s, dt) {
      // si el juego estuvo en pausa, el dedo puede haberse levantado sin que llegara el aviso
      const now = performance.now(); if (s.last && now - s.last > 250) s.hold.clear(); s.last = now;
      const d = s.d;
      // franja
      if (d > 0.4) { s.mt -= dt; if (s.mt <= 0) { s.mt = G.rand(0.5, 1.2); s.mul = G.rand(0.7, 1.35); } }
      s.ph += dt * s.spd * s.mul; s.ph2 += dt * s.spd * 1.7 * s.mul;
      if (s.boss) { // tormenta: avisa con la franja fantasma y salta
        s.jt -= dt;
        if (s.jt <= 0.6 && s.ghost == null) {
          const c0 = center(s); let best = 0;
          for (let k = 0; k < 12; k++) { const o = G.rand(-0.32, 0.32); if (Math.abs(center(s, o) - c0) > 0.24) { best = o; break; } best = o; }
          s.ghost = best; A().sfx('warn');
        }
        if (s.jt <= 0) { s.offT = s.ghost; s.ghost = null; s.jt = G.rand(2.3, 2.9); A().sfx('zap'); G.pulse({ glitch: 0.45, ab: 3 }); s.static = 0.3; }
        s.popT -= dt;
        if (s.popT <= 0 && s.pops.length < 2 && s.t > 1) {
          s.popT = G.rand(2.4, 3.2);
          const [title, lines] = G.pick(POPS), sc = s.sc, w = 120, h = 48;
          const cy = yOf(s, s.c) + G.irand(-12, 12);
          s.pops.push({ x: Math.round(G.rand(sc.x + 2, sc.x + sc.w - w - 12)), y: Math.round(G.clamp(cy - h / 2, sc.y - 6, sc.y + sc.h - h + 6)), w, h, st: G.randStyle(s.block), title, lines, t: 0, stripes: true, xmode: 'x' });
          A().sfx('spawn', G.irand(0, 2));
        }
        for (const p of s.pops) p.t += dt;
        s.pops = s.pops.filter((p) => p.t < 3.4);
      }
      s.off += (s.offT - s.off) * Math.min(1, dt * 14);
      s.c = center(s);
      // aguja
      const holding = s.hold.size > 0;
      s.v += (holding ? s.lift : -s.fall) * dt; s.v *= Math.exp(-s.damp * dt);
      if (s.gust && Math.random() < dt * s.gust) { s.v += (Math.random() < 0.5 ? -1 : 1) * G.rand(0.45, 0.8); s.static = 0.35; A().sfx('type', 2.5); }
      s.u += s.v * dt;
      if (s.u < 0) { s.u = 0; s.v = Math.max(0, s.v); }
      if (s.u > 1) { s.u = 1; s.v = Math.min(0, s.v); }
      if (s.static > 0) s.static -= dt;
      if (holding) s.tx += dt * G.rand(260, 420); // lo que "envías" al dar señal
      // dentro o fuera de la franja
      const was = s.inb; s.inb = Math.abs(s.u - s.c) <= s.hw;
      if (s.inb) {
        if (!was) A().sfx('pick');
        s.entered = true; s.p += dt / s.fillT; s.rx += dt * G.rand(3000, 3600);
        const st = Math.floor(s.p * 8); if (st > s.step) { s.step = st; A().sfx('snake', Math.min(1, s.p)); }
      } else if (s.entered || s.t > 1.3) { // al principio hay un momento para subir la aguja sin que cuente
        s.p = Math.max(0, s.p - s.drain * dt); s.noise += dt;
        if (Math.random() < dt * 9) A().sfx('type', 1.4);
        s.wt -= dt; if (s.noise > s.noiseMax * 0.6 && s.wt <= 0) { s.wt = 0.45; A().sfx('warn'); }
      }
      s.hist.push({ t: s.t, u: s.u, inb: s.inb });
      const keep = (s.sc.w - 20) / SPD + 0.2; while (s.hist.length && s.t - s.hist[0].t > keep) s.hist.shift();
      if (s.p >= 1) { s.p = 1; s.title = 'CONNECTED TO NEØTEL'; s.win(); return; }
      if (s.noise >= s.noiseMax) { s.fail('NO CARRIER'); return; }
      if (s.t >= s.T) s.fail('LINE BUSY');
    },
    down(s, x, y, e) {
      for (let i = s.pops.length - 1; i >= 0; i--) {
        const p = s.pops[i];
        if (G.inR(x, y, p, 4)) { s.pops.splice(i, 1); A().sfx('close', 3); G.pulse({ ab: 1.5 }); G.vibrate(8); return; }
      }
      s.hold.add(pid(e));
    },
    up(s, x, y, e) { s.hold.delete(pid(e)); },
    draw(s) {
      const r = s.r, sc = s.sc, T = G.ctx(), lay = s.lay;
      const t = s.t, win = s.done === 'win', lose = s.done === 'lose', holding = s.hold.size > 0, blink = Math.floor(t * 6) % 2;
      // ---- tú --- módem --- NEØTEL, con paquetes que viajan según el progreso ----
      const iy = lay.icons, xs = [r.x + 14, Math.round(r.x + r.w / 2 - 10), r.x + r.w - 34], labs = ['YOU', 'MODEM', 'NEØTEL'];
      ['system', 'phone', 'globe'].forEach((n, i) => { T.drawImage(G.icon20(n, s.block), xs[i], iy, 20, 20); G.text(labs[i], xs[i] + 10, iy + 22, B, { al: 'c', b: i === 2 }); });
      for (let k = 0; k < 2; k++) {
        const x0 = xs[k] + 24, x1 = xs[k + 1] - 4, yy = iy + 10, on = win || s.p > (k === 0 ? 0.02 : 0.5);
        G.dash(x0, yy, x1 - x0, B, 2, 2);
        if (on && !lose) for (let j = 0; j < 2; j++) { const f = ((t * 1.6 + j * 0.5) % 1); G.rect(Math.round(x0 + f * (x1 - x0 - 3)), yy - 1, 3, 3, K); }
        if (lose) G.text('×', (x0 + x1) / 2, yy - 3, K, { al: 'c', b: true });
      }
      // ---- datos de la conexión (como el cuadro de diálogo de los 90) ----
      const lx = r.x + 8, fx = r.x + 72, fw = r.w - 80;
      let y = lay.fields;
      G.text('USER NAME:', lx, y + 2, B); field(fx, y, fw, 11, 'GUEST98'); y += 12;
      G.text('PASSWORD:', lx, y + 2, B); field(fx, y, fw, 11, '********'); y += 12;
      if (!s.compact) { // casilla marcada
        G.box(fx, y + 1, 9, 9, B); G.rect(fx + 1, y + 2, 1, 7, K); G.rect(fx + 1, y + 2, 7, 1, K);
        G.line(fx + 2, y + 5, fx + 4, y + 7, B); G.line(fx + 4, y + 7, fx + 7, y + 3, B);
        G.text('SAVE PASSWORD', fx + 13, y + 2, B); y += 12;
      }
      const nd = Math.min(PHONE.length, Math.floor(t / 0.09)); // el número se marca dígito a dígito
      G.text('PHONE:', lx, y + 2, B); field(fx, y, fw, 11, PHONE.slice(0, nd) + (nd < PHONE.length && blink ? '_' : ''));
      if (nd < PHONE.length) G.text('DIAL', fx + fw - 4, y + 2, B, { al: 'r', b: true });
      y += 12;
      if (!s.compact) {
        G.text('DIAL FROM:', lx, y + 2, B); field(fx, y, fw, 11, 'HOME');
        G.rect(fx + fw - 11, y + 1, 10, 9, B); G.text('▼', fx + fw - 6, y + 2, W, { al: 'c' });
      }
      // ---- estado ----
      let msg = STATUS[0][1]; for (const [k, m] of STATUS) if (s.p >= k) msg = m;
      if (win) msg = 'CONNECTED AT 28,800 BPS'; else if (lose) msg = s.reason === 'LINE BUSY' ? 'THE LINE IS BUSY' : 'NO CARRIER';
      G.rect(r.x + 4, lay.status - 1, r.w - 8, 1, B);
      G.text('STATUS:', lx, lay.status + 3, K, { b: true });
      if (!lose || blink) G.text(msg, lx + G.textW('STATUS:', 1, 1, true) + 5, lay.status + 3, win ? B : K, { b: win });
      // ---- osciloscopio de la portadora (pantalla azul) ----
      G.rect(sc.x - 2, sc.y - 2, sc.w + 4, sc.h + 4, K); G.rect(sc.x - 1, sc.y - 1, sc.w + 2, sc.h + 2, W); G.rect(sc.x, sc.y, sc.w, sc.h, B);
      for (const q of [0.25, 0.5, 0.75]) G.dash(sc.x + 1, yOf(s, q), sc.w - 18, K, 1, 3);
      const yT = yOf(s, s.c + s.hw), yB = yOf(s, s.c - s.hw);
      G.drect(sc.x + 1, yT, sc.w - 17, yB - yT, 6, K, null); // franja más oscura: la traza blanca se lee encima
      const eh = s.inb ? 2 : 1;
      G.rect(sc.x + 1, yT, sc.w - 17, eh, W); G.rect(sc.x + 1, yB - eh + 1, sc.w - 17, eh, W);
      const bl = 'CARRIER BAND', blw = G.textW(bl, 1, 1, true) + 4;
      G.rect(sc.x + 2, yT + 2, blw, 9, B); G.text(bl, sc.x + 4, yT + 3, W, { b: true });
      if (s.ghost != null && Math.floor(t * 10) % 2) { // aviso del salto
        const gc = center(s, s.ghost), gT = yOf(s, gc + s.hw), gB = yOf(s, gc - s.hw);
        G.dash(sc.x + 1, gT, sc.w - 17, K, 3, 2); G.dash(sc.x + 1, gB, sc.w - 17, K, 3, 2); G.dash(sc.x + 1, gT + 1, sc.w - 17, W, 3, 2); G.dash(sc.x + 1, gB - 1, sc.w - 17, W, 3, 2);
        G.text('JUMP!', sc.x + sc.w - 22, gT + 3, W, { al: 'r', b: true });
      }
      // traza: blanca y gruesa dentro de la franja, negra a trozos fuera
      const nowX = sc.x + sc.w - 22;
      T.save(); T.beginPath(); T.rect(sc.x, sc.y, sc.w - 16, sc.h); T.clip();
      for (let i = 1; i < s.hist.length; i++) {
        const a = s.hist[i - 1], b = s.hist[i];
        const xa = Math.round(nowX - (s.t - a.t) * SPD), xb = Math.round(nowX - (s.t - b.t) * SPD), ya = yOf(s, a.u), yb = yOf(s, b.u);
        if (b.inb) { G.line(xa, ya, xb, yb, W); G.line(xa, ya + 1, xb, yb + 1, W); }
        else if (Math.floor(xb / 2) % 2 === 0) { G.line(xa, ya, xb, yb, K); G.line(xa, ya + 1, xb, yb + 1, K); }
      }
      T.restore();
      // estática / interferencias
      if (s.static > 0 || (s.boss && Math.random() < 0.08)) for (let k = 0; k < 5; k++) G.drect(sc.x + 1, G.irand(sc.y + 1, sc.y + sc.h - 3), sc.w - 2, G.irand(1, 3), 4, W, null);
      // regla y aguja
      const rx = sc.x + sc.w - 15, yu = yOf(s, s.u);
      G.rect(rx - 1, sc.y, 16, sc.h, K);
      G.rect(rx, sc.y, 1, sc.h, W);
      for (let q = 0; q <= 10; q++) G.rect(rx, yOf(s, q / 10), q % 5 === 0 ? 5 : 3, 1, W);
      G.tri(sc.x + sc.w - 2, yu - 5, sc.x + sc.w - 2, yu + 5, rx + 2, yu, W);
      G.rect(nowX - 2, yu - 2, 5, 5, s.inb ? W : K); G.box(nowX - 3, yu - 3, 7, 7, s.inb ? K : W);
      G.text(holding ? '▲' : '▼', nowX - 2, holding ? yu - 13 : yu + 6, W);
      G.rect(sc.x + 1, sc.y + 1, 72, 10, K);
      if (s.inb && !s.done && Math.floor(t * 4) % 2) G.text('ON-LINE', sc.x + 4, sc.y + 3, W, { b: true });
      else G.text('SIGNAL ' + String(Math.round(s.u * 100)).padStart(3, ' ') + '%', sc.x + 4, sc.y + 3, W);
      // ---- barra de conexión (punteada, como las de la parte 1) ----
      y = lay.conn;
      G.text('CONNECTING', lx, y, B, { b: true }); G.text(Math.floor(s.p * 100) + '%', r.x + r.w - 8, y, B, { al: 'r', b: true });
      const bw = r.w - 16, f = Math.round((bw - 4) * s.p), hot = s.p > 0.8 && Math.floor(t * 8) % 2;
      G.box(lx, y + 10, bw, 11, B);
      for (let i = 0; i < f; i += 4) G.rect(lx + 2 + i, y + 12, Math.min(3, f - i), 7, hot ? K : B);
      // ---- ruido acumulado ----
      y = lay.noise;
      const nk = s.noise / s.noiseMax, segs = 10, n = Math.min(segs, Math.ceil(nk * segs)), alarm = nk > 0.6 && Math.floor(t * 8) % 2;
      G.text('LINE NOISE', lx, y + 1, alarm ? K : B, { b: true });
      const sx = r.x + r.w - 8 - segs * 9;
      for (let i = 0; i < segs; i++) { G.box(sx + i * 9, y, 8, 9, B); if (i < n) G.rect(sx + i * 9 + 2, y + 2, 4, 5, alarm ? K : B); }
      // ---- detalles: velocidad, duración, bytes, servidor y luces del módem ----
      y = lay.box;
      const gx = lx, gw = r.w - 16, gh = 44;
      G.box(gx, y, gw, gh, B);
      G.rect(gx + 4, y - 4, G.textW('CONNECTION', 1, 1, true) + 4, 9, W); G.text('CONNECTION', gx + 6, y - 3, B, { b: true });
      const dbw = G.textW('NO DETAILS <<') + 8; G.drawBtn(gx + gw - dbw - 3, y - 5, dbw, 11, 'NO DETAILS <<', B, W, false);
      const off = s.u < 0.02 && !s.entered;
      const dist = Math.abs(s.u - s.c) - s.hw;
      const speed = win || s.inb ? '28,800 BPS' : off ? '----' : dist < 0.08 ? '14,400 BPS' : dist < 0.18 ? '9,600 BPS' : dist < 0.3 ? '2,400 BPS' : '300 BPS';
      const vx = gx + 58, ly = y + 6;
      G.text('SPEED', gx + 5, ly, K); G.text(speed, vx, ly, s.inb || win ? B : K, { b: s.inb || win });
      G.text('DURATION', gx + 5, ly + 9, K); G.text(dur(t), vx, ly + 9, B);
      G.text('RECEIVED', gx + 5, ly + 18, K); G.text(num(s.rx) + ' B', vx, ly + 18, B);
      G.text('SENT', gx + 5, ly + 27, K); G.text(num(s.tx) + ' B', vx, ly + 27, B);
      // luces: CD portadora · OH descolgado · RD recibe · SD envía · TR listo
      const lit = {
        CD: !lose && (win || s.inb), OH: !lose || blink, RD: !lose && (win ? Math.random() < 0.7 : s.inb && Math.random() < 0.75),
        SD: !lose && (holding ? Math.random() < 0.8 : win && Math.random() < 0.3), TR: true,
      };
      const lx0 = gx + gw - 5 - LEDS.length * 16 + 3;
      LEDS.forEach((k, i) => {
        const x = lx0 + i * 16;
        G.box(x - 1, ly + 1, 10, 6, K); G.rect(x, ly + 2, 8, 4, lit[k] ? B : W);
        if (lit[k]) G.rect(x + 1, ly + 3, 2, 1, W);
        G.text(k, x + 4, ly + 9, K, { al: 'c' });
      });
      G.text('SERVER', lx0 - 2, ly + 18, K); G.text('PPP', lx0 + 40, ly + 18, B);
      G.text('PROTO', lx0 - 2, ly + 27, K); G.text('TCP/IP', lx0 + 40, ly + 27, B);
      // ---- botón que muestra si estás dando señal ----
      y = lay.btn;
      const bh = Math.max(12, Math.min(16, r.y + r.h - 3 - y));
      G.drawBtn(lx, y, bw, bh, win ? 'DISCONNECT' : holding ? 'BOOSTING ▲' : 'HOLD ANYWHERE TO BOOST', B, W, holding && !s.done, { double: !holding });
      // ---- pop-ups de la tormenta (encima de todo) ----
      for (const p of s.pops) {
        const pr = G.drawFrame(p);
        G.drawSpr('warn', pr.x + 4, pr.y + 4, { '#': p.st.ac });
        p.lines.forEach((ln, i) => G.text(ln, pr.x + 19, pr.y + 4 + i * 9, p.st.tx));
        if (Math.floor(p.t * 3) % 2 === 0) G.text('TAP TO CLOSE', pr.x + pr.w / 2, pr.y + pr.h - 11, p.st.tx, { al: 'c' });
      }
    },
  };

  // icono de la tarjeta: pantalla azul con la franja y la traza blancas, y el módem con sus luces
  G.ICONS[20] = function (t) {
    G.rect(1, 0, 22, 13, K); G.rect(2, 1, 20, 11, B);
    G.drect(2, 4, 20, 5, 4, W, null); G.rect(2, 4, 20, 1, W); G.rect(2, 8, 20, 1, W);
    let py = null;
    for (let x = 2; x < 22; x++) {
      const y = Math.round(6.5 + Math.sin((x + t * 8) * 0.38) * 3.6);
      if (py != null) G.line(x - 1, py, x, y, y >= 4 && y <= 8 ? W : K);
      py = y;
    }
    G.rect(2, 14, 20, 6, W); G.box(2, 14, 20, 6, K);
    const k = Math.floor(t * 5);
    [B, B, B].forEach((c, i) => G.rect(5 + i * 4, 16, 2, 2, (k + i) % 3 ? c : W));
    for (let x = 16; x < 20; x += 2) G.rect(x, 16, 1, 3, K);
  };
  G.CARD_SCHEMES[20] = { top: B, tt: W, ib: W, grid: B, bot: B, nc: W, bt: W };
})(window.G);
