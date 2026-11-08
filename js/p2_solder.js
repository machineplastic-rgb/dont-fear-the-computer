'use strict';
// SOLDER (parte 2, nivel 18): gira las piezas de la placa para que la corriente vaya del VCC al chip.
// La corriente se ve en tiempo real (relleno desde la fuente); desde la ronda 4 hay "bit flips" que giran una pieza.
// Jefe: MOTHERBOARD, tres chips (CPU, RAM, GPU) que tienen que encenderse a la vez.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  // bits de conexión de cada pieza: N=1 E=2 S=4 O=8
  const DIRS = [[1, 0, -1], [2, 1, 0], [4, 0, 1], [8, -1, 0]];
  const rot = (m) => ((m << 1) | (m >> 3)) & 15; // giro de 90º a la derecha
  const opp = (b) => ((b << 2) | (b >> 2)) & 15;
  const nbits = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  function tapsTo(m, want) { let x = m; for (let k = 0; k < 4; k++) { if (x === want) return k; x = rot(x); } return 9; }
  function rotN(m, k) { for (let i = 0; i < k; i++) m = rot(m); return m; }
  const GLOW = 'rgba(70,255,0,0.75)';

  // ---------- generador: árbol de solución + piezas señuelo + giros al azar ----------
  function dfs(cols, rows, start, isGoal, heur, avoid, spread) {
    const seen = new Uint8Array(cols * rows), path = []; let steps = 0;
    function go(i) {
      if (++steps > 5000) return false;
      seen[i] = 1; path.push(i);
      const c = i % cols, r = (i / cols) | 0, nb = [];
      for (const [, dx, dy] of DIRS) {
        const nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const j = nr * cols + nc;
        if (isGoal(j) && !seen[j]) { path.push(j); return true; }
        if (!seen[j] && !avoid[j]) nb.push([j, heur(j) + Math.random() * spread]);
      }
      nb.sort((a, b) => a[1] - b[1]);
      for (const [j] of nb) if (go(j)) return true;
      path.pop(); return false;
    }
    return go(start) ? path : null;
  }
  function link(mask, cols, a, b) {
    const ca = a % cols, ra = (a / cols) | 0, cb = b % cols, rb = (b / cols) | 0;
    for (const [bit, dx, dy] of DIRS) if (ca + dx === cb && ra + dy === rb) { mask[a] |= bit; mask[b] |= opp(bit); return; }
  }
  function genBoard(s) {
    const d = s.d, boss = s.boss;
    const cols = boss ? 5 : d < 0.2 ? 4 : 5, rows = boss ? 7 : d < 0.2 ? 5 : d < 0.55 ? 6 : 7, n = cols * rows;
    const id = (c, r) => r * cols + c;
    let best = null;
    for (let tries = 0; tries < 40 && !best; tries++) {
      const cs = boss ? G.irand(1, cols - 2) : G.irand(0, cols - 1), ct = boss ? G.irand(1, cols - 2) : G.irand(0, cols - 1);
      const src = { c: cs, r: 0 }, targets = [{ c: ct, r: rows - 1, side: 4, name: 'CPU' }];
      if (boss) { targets.push({ c: cols - 1, r: G.irand(2, rows - 3), side: 2, name: 'RAM' }); targets.push({ c: 0, r: G.irand(2, rows - 3), side: 8, name: 'GPU' }); }
      // camino principal VCC → CPU, más largo y retorcido cuanto más difícil
      const goal = id(ct, rows - 1), manh = Math.abs(cs - ct) + rows - 1;
      const minL = manh + 1 + Math.round(d * 4), maxL = minL + 3 + Math.round(d * 5);
      let path = null, pd = 1e9;
      for (let k = 0; k < 50; k++) {
        const p = dfs(cols, rows, id(cs, 0), (j) => j === goal, (j) => Math.abs((j % cols) - ct) + Math.abs(((j / cols) | 0) - (rows - 1)), new Uint8Array(n), 1 + 3.5 * d);
        if (!p) continue;
        const off = p.length < minL ? minL - p.length : p.length > maxL ? p.length - maxL : 0;
        if (off < pd) { pd = off; path = p; if (!off) break; }
      }
      if (!path) continue;
      const want = new Uint8Array(n), tree = new Uint8Array(n);
      for (let k = 0; k + 1 < path.length; k++) link(want, cols, path[k], path[k + 1]);
      path.forEach((i) => (tree[i] = 1));
      // jefe: RAM y GPU se enganchan al árbol con su propio cable
      let ok = true;
      for (const tg of targets.slice(1)) {
        const t0 = id(tg.c, tg.r); if (tree[t0]) continue;
        const dist = new Int16Array(n).fill(999), q = []; for (let i = 0; i < n; i++) if (tree[i]) { dist[i] = 0; q.push(i); }
        while (q.length) { const i = q.shift(), c = i % cols, r = (i / cols) | 0; for (const [, dx, dy] of DIRS) { const nc = c + dx, nr = r + dy; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue; const j = id(nc, nr); if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } } }
        const p2 = dfs(cols, rows, t0, (j) => tree[j] === 1, (j) => dist[j], tree, 2.5);
        if (!p2) { ok = false; break; }
        for (let k = 0; k + 1 < p2.length; k++) link(want, cols, p2[k], p2[k + 1]);
        p2.forEach((i) => (tree[i] = 1));
      }
      if (!ok) continue;
      want[id(cs, 0)] |= 1; for (const tg of targets) want[id(tg.c, tg.r)] |= tg.side;
      best = { cols, rows, src, targets, want, tree, pathLen: path.length };
    }
    return best;
  }

  // corriente desde el VCC: distancia de cada pieza encendida, fugas (cables que no llegan a nada) y chips encendidos
  function flood(s) {
    const { cols, rows, mask } = s, n = cols * rows, dist = s.dist; dist.fill(-1); s.leaks.length = 0;
    const lit = s.targets.map(() => false), i0 = s.src.r * cols + s.src.c, q = [];
    if (mask[i0] & 1) { dist[i0] = 0; q.push(i0); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], c = i % cols, r = (i / cols) | 0, m = mask[i];
      for (const [bit, dx, dy] of DIRS) {
        if (!(m & bit)) continue;
        const nc = c + dx, nr = r + dy;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) {
          if (i === i0 && bit === 1) continue; // la entrada del VCC
          const k = s.targets.findIndex((t) => t.c === c && t.r === r && t.side === bit);
          if (k >= 0) lit[k] = true; else s.leaks.push([i, bit]);
          continue;
        }
        const j = nr * cols + nc;
        if (mask[j] & opp(bit)) { if (dist[j] < 0) { dist[j] = dist[i] + 1; q.push(j); } }
        else s.leaks.push([i, bit]);
      }
    }
    s.lit = lit; s.powered = q.length;
    return lit.every(Boolean);
  }

  // ---------- dibujo de una pieza (coordenadas relativas al centro de la casilla) ----------
  function arms(m, S, w, col) {
    const h0 = Math.floor(S / 2), hw = Math.floor(w / 2);
    G.rect(-hw, -hw, w, w, col);
    if (m & 1) G.rect(-hw, -h0, w, h0, col);
    if (m & 4) G.rect(-hw, 0, w, S - h0, col);
    if (m & 2) G.rect(0, -hw, S - h0, w, col);
    if (m & 8) G.rect(-h0, -hw, h0, w, col);
  }
  function piece(m, S, tw, on) {
    if (!m) return;
    const T = G.ctx(), pr = Math.floor(tw / 2) + 2;
    if (on) {
      T.save(); T.shadowColor = GLOW; T.shadowBlur = 6; arms(m, S, tw, Gr); G.circ(0, 0, pr, Gr, null); T.restore();
      G.rect(-1, -1, 2, 2, W); // sin línea blanca: así se ven los puntos de corriente
    } else {
      arms(m, S, tw, L); G.circ(0, 0, pr, L, null);
      arms(m, S, Math.max(2, tw - 4), K); G.circ(0, 0, pr - 2, K, null); G.rect(-1, -1, 2, 2, L);
    }
  }

  // fondo fijo de cada ronda: placa, zócalos, componentes y tornillos
  function makeBg(s) {
    const r = s.r, o = G.mkCanvas(r.w, r.h), T0 = G.ctx(), ox = -r.x, oy = -r.y;
    G.target(o.x);
    try {
      o.x.translate(ox, oy);
      G.rect(r.x, r.y, r.w, r.h, K);
      for (let y = r.y + 3; y < r.y + r.h; y += 6) for (let x = r.x + 3; x < r.x + r.w; x += 6) G.px(x, y, B);
      // pistas de adorno en los márgenes
      const R = G.rng(s.seed);
      for (let k = 0; k < 10; k++) {
        let x = r.x + Math.floor(R() * r.w), y = r.y + s.head + Math.floor(R() * (r.h - s.head)); const hz = R() < 0.5, len = 10 + Math.floor(R() * 40);
        for (let j = 0; j < len; j++) { if (hz) x++; else y++; G.px(x, y, B); }
        G.rect(x - 1, y - 1, 3, 3, B); G.px(x, y, K);
      }
      // marco de la placa
      const bw = s.cols * s.S, bh = s.rows * s.S;
      G.rect(s.bx - 3, s.by - 3, bw + 6, bh + 6, K); G.box(s.bx - 3, s.by - 3, bw + 6, bh + 6, B); G.box(s.bx - 1, s.by - 1, bw + 2, bh + 2, L);
      for (let i = 0; i < s.cols * s.rows; i++) {
        const c = i % s.cols, rr = (i / s.cols) | 0, x = s.bx + c * s.S, y = s.by + rr * s.S, S = s.S;
        G.dash(x + 2, y, S - 3, B, 1, 2); G.dash(x + 2, y + S - 1, S - 3, B, 1, 2);
        for (let yy = y + 2; yy < y + S - 1; yy += 3) { G.px(x, yy, B); G.px(x + S - 1, yy, B); }
        G.px(x + 1, y + 1, B); G.px(x + S - 2, y + 1, B); G.px(x + 1, y + S - 2, B); G.px(x + S - 2, y + S - 2, B);
        if (s.locked[i]) { // tornillos: no se puede girar
          G.drect(x + 1, y + 1, S - 2, S - 2, 3, B, null);
          for (const [px, py] of [[x + 3, y + 3], [x + S - 6, y + 3], [x + 3, y + S - 6], [x + S - 6, y + S - 6]]) { G.rect(px, py, 3, 3, L); G.px(px + 1, py + 1, K); }
        }
        if (s.comp[i]) { // componente suelto (resistencia / condensador / chip) que no conduce
          const cx = x + Math.floor(S / 2), cy = y + Math.floor(S / 2), u = Math.max(4, Math.floor(S / 7));
          if (s.comp[i] === 1) { G.rect(cx - u * 3, cy, u * 6, 1, L); G.rect(cx - u * 2, cy - u, u * 4, u * 2, L); for (const k of [-1, 0, 1]) G.rect(cx + k * u - 1, cy - u, 2, u * 2, k ? B : K); }
          else if (s.comp[i] === 2) { G.rect(cx - 1, cy - u * 2, 2, u * 4, L); G.rect(cx - u * 2, cy - 2, u * 4, 1, L); G.rect(cx - u * 2, cy + 1, u * 4, 1, L); G.rect(cx - u, cy - 1, u * 2, 2, K); }
          else { G.rect(cx - u * 2, cy - u * 2, u * 4, u * 4, L); G.box(cx - u * 2, cy - u * 2, u * 4, u * 4, W); for (let k = -u * 2 + 2; k < u * 2 - 1; k += 3) { G.px(cx + k, cy - u * 2 - 2, L); G.px(cx + k, cy + u * 2 + 1, L); } G.px(cx - u * 2 + 2, cy - u * 2 + 2, K); }
        }
      }
    } finally { o.x.setTransform(1, 0, 0, 1, 0, 0); G.target(T0); }
    return o.c;
  }

  G.MICRO.solder = {
    mode: 'window', cmd: 'CONNECT!', hint: 'TAP TILES TO ROTATE THE WIRES', time: 10, fx: 0.4,
    help: ['TAP TILES TO ROTATE', 'THE WIRES. CONNECT', 'POWER (VCC) TO THE', 'CHIP BEFORE TIME OUT.'],
    init(s) {
      const d = s.d; let b = null; for (let k = 0; k < 6 && !b; k++) b = genBoard(s);
      Object.assign(s, { cols: b.cols, rows: b.rows, src: b.src, targets: b.targets, want: b.want, tree: b.tree, seed: G.irand(1, 99999) });
      const n = s.cols * s.rows;
      s.mask = new Uint8Array(n); s.locked = new Uint8Array(n); s.comp = new Uint8Array(n); s.anim = new Float32Array(n); s.dist = new Int16Array(n); s.leaks = [];
      s.parts = []; s.flip = null; s.solved = false; s.taps = 0; s.newPow = 0; s.flash = 0;
      // señuelos: piezas sueltas (más T cuanto más difícil) y algún componente que no conduce
      const pool = [];
      for (let i = 0; i < n; i++) if (!s.tree[i]) pool.push(i);
      const comps = s.boss ? 3 : d >= 0.3 ? G.irand(1, 2) : 0;
      for (let k = 0; k < comps && pool.length > 4; k++) { const j = pool.splice(G.irand(0, pool.length - 1), 1)[0]; s.comp[j] = G.irand(1, 3); s.locked[j] = 1; }
      for (const i of pool) { const u = Math.random(); s.mask[i] = u < 0.32 - 0.1 * d ? 5 : u < 0.72 - 0.12 * d ? 3 : u < 0.97 ? 7 : 15; }
      // piezas de la solución ya fijadas con tornillos (en el jefe y al final)
      const fixable = []; for (let i = 0; i < n; i++) if (s.tree[i]) fixable.push(i);
      const fixN = s.boss ? 3 : d >= 0.55 ? 1 : 0;
      const lockable = fixable.filter((i) => i !== s.src.r * s.cols + s.src.c && !s.targets.some((t) => t.r * s.cols + t.c === i));
      for (let k = 0; k < fixN && lockable.length; k++) { const j = lockable.splice(G.irand(0, lockable.length - 1), 1)[0]; s.locked[j] = 1; }
      // giros al azar: cuantas más pulsaciones mínimas, más difícil
      const minT = 3 + Math.round(d * 8) + (s.boss ? 3 : 0);
      for (let tries = 0; tries < 60; tries++) {
        for (let i = 0; i < n; i++) {
          if (s.comp[i]) continue;
          if (s.tree[i]) s.mask[i] = s.locked[i] ? s.want[i] : rotN(s.want[i], Math.random() < 0.62 + 0.3 * d ? G.irand(1, 3) : 0);
          else s.mask[i] = rotN(s.mask[i], G.irand(0, 3));
        }
        s.minTaps = 0; for (let i = 0; i < n; i++) if (s.tree[i] && !s.locked[i]) s.minTaps += tapsTo(s.mask[i], s.want[i]);
        if (s.minTaps >= minT && s.minTaps <= minT + 2 + Math.round(d * 3) && !flood(s)) break;
      }
      flood(s);
      // medidas: casillas grandes para el pulgar; en el jefe deja sitio a los chips laterales
      const r = s.r; s.head = 14;
      const side = s.boss ? 28 : 3, topZ = 18, botZ = 26;
      const availW = r.w - side * 2, availH = r.h - s.head - topZ - botZ - 4;
      s.S = Math.max(24, Math.min(Math.floor(availW / s.cols), Math.floor(availH / s.rows), 52));
      s.tw = Math.max(6, 2 * Math.round(s.S * 0.085));
      s.bx = r.x + Math.floor((r.w - s.S * s.cols) / 2);
      s.by = r.y + s.head + topZ + Math.floor((availH - s.S * s.rows) / 2);
      s.bg = makeBg(s);
      // bit flips desde la ronda 4: una pieza parpadea y luego gira sola
      s.flipEvery = s.boss ? 3.6 : d >= 0.4 ? 3.6 - 1.2 * d : 0;
      s.nextFlip = 3.0;
      s.hint = s.boss ? 'POWER CPU + RAM + GPU AT ONCE' : s.flipEvery ? 'TAP TO ROTATE. BITS FLIP SOMETIMES' : 'TAP TILES TO ROTATE THE WIRES';
      if (s.boss) s.title = 'MOTHERBOARD';
      // tiempo: lectura + pulsaciones mínimas + recorrido; algo más si hay bit flips
      let treeN = 0; for (let i = 0; i < n; i++) treeN += s.tree[i];
      let T = 4 + s.minTaps * 0.5 + treeN * 0.22;
      if (s.flipEvery) T += (T / s.flipEvery) * 0.5;
      s.T = T;
    },
    cellAt(s, x, y) {
      const c = Math.floor((x - s.bx) / s.S), r = Math.floor((y - s.by) / s.S);
      return c >= 0 && r >= 0 && c < s.cols && r < s.rows ? r * s.cols + c : -1;
    },
    turn(s, i, auto) {
      s.mask[i] = rot(s.mask[i]); s.anim[i] = -Math.PI / 2;
      const before = s.powered, done = flood(s);
      if (!auto) { s.taps++; A().sfx('tap'); if (s.powered > before) A().sfx('beepT'); }
      if (done && !s.solved) this.solve(s);
    },
    solve(s) {
      s.solved = true; s.flash = 1; s.flip = null;
      A().sfx('zap'); G.pulse({ flash: 0.25, flashCol: W, ab: 3, shake: 2 }); G.vibrate(30);
      for (const t of s.targets) { const p = this.portXY(s, t); for (let k = 0; k < 16; k++) s.parts.push({ x: p.x, y: p.y, vx: G.rand(-90, 90), vy: G.rand(-110, 40), t: 0, life: G.rand(0.3, 0.6), col: k % 3 ? Gr : W }); }
      s.win();
    },
    tap(s, x, y) {
      if (s.solved) return;
      const i = this.cellAt(s, x, y); if (i < 0) return;
      if (s.locked[i]) { A().sfx('deny'); G.pulse({ shake: 1.5 }); s.anim[i] = 0.12; return; }
      this.turn(s, i, false);
    },
    update(s, dt) {
      for (let i = 0; i < s.anim.length; i++) if (s.anim[i]) { s.anim[i] *= Math.exp(-dt * 38); if (Math.abs(s.anim[i]) < 0.02) s.anim[i] = 0; }
      s.parts.forEach((p) => { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; }); s.parts = s.parts.filter((p) => p.t < p.life);
      s.flash = Math.max(0, s.flash - dt * 2.5);
      if (s.solved || !s.flipEvery) return;
      // bit flip: aviso 0,7 s y luego la pieza gira sola
      if (!s.flip && s.t >= s.nextFlip - 0.7) {
        const n = s.cols * s.rows, on = [], any = [];
        for (let i = 0; i < n; i++) { if (s.locked[i] || s.comp[i] || s.mask[i] === 15 || !s.mask[i]) continue; any.push(i); if (s.dist[i] > 0) on.push(i); }
        const list = on.length && Math.random() < 0.6 ? on : any;
        if (list.length) { s.flip = { i: list[G.irand(0, list.length - 1)], t0: s.t }; A().sfx('warn'); }
        else s.nextFlip += s.flipEvery;
      }
      if (s.flip && s.t >= s.nextFlip) {
        const i = s.flip.i; s.flip = null; s.nextFlip += s.flipEvery;
        A().sfx('glitch'); G.pulse({ glitch: 0.35, ab: 2 });
        const c = i % s.cols, r = (i / s.cols) | 0, cx = s.bx + c * s.S + s.S / 2, cy = s.by + r * s.S + s.S / 2;
        for (let k = 0; k < 8; k++) s.parts.push({ x: cx, y: cy, vx: G.rand(-60, 60), vy: G.rand(-80, 10), t: 0, life: 0.35, col: k % 2 ? B : W });
        this.turn(s, i, true);
      }
    },
    portXY(s, t) {
      const S = s.S, x0 = s.bx + t.c * S, y0 = s.by + t.r * S;
      if (t.side === 4) return { x: x0 + Math.floor(S / 2), y: y0 + S };
      if (t.side === 2) return { x: x0 + S, y: y0 + Math.floor(S / 2) };
      return { x: x0, y: y0 + Math.floor(S / 2) };
    },
    draw(s) {
      const T = G.ctx(), r = s.r, S = s.S, tw = s.tw, hw = tw / 2, t = s.t;
      T.drawImage(s.bg, r.x, r.y);
      // cabecera: qué hay que encender y estado
      G.rect(r.x, r.y, r.w, s.head - 2, K); G.dash(r.x, r.y + s.head - 3, r.w, B, 2, 1);
      const names = s.targets.map((tg) => tg.name).join(' ');
      G.text('VCC ► ' + names, r.x + 4, r.y + 3, Gr);
      if (s.flip) G.text('BIT FLIP!', r.x + r.w - 4, r.y + 3, Math.floor(t * 8) % 2 ? W : Gr, { al: 'r', b: true });
      else if (s.targets.length > 1) G.text(s.lit.filter(Boolean).length + '/' + s.targets.length + ' ON', r.x + r.w - 4, r.y + 3, s.solved ? Gr : L, { al: 'r' });
      else G.text(s.solved ? 'ONLINE' : 'OFFLINE', r.x + r.w - 4, r.y + 3, s.solved ? Gr : Math.floor(t * 2) % 2 ? L : B, { al: 'r' });
      // VCC: la fuente, encima de su columna
      const sx = s.bx + s.src.c * S + Math.floor(S / 2), sy = s.by;
      T.save(); T.shadowColor = GLOW; T.shadowBlur = 4 + Math.sin(t * 6) * 3;
      G.rect(sx - 16, sy - 17, 32, 12, K); G.box(sx - 16, sy - 17, 32, 12, Gr); G.text('VCC', sx, sy - 14, Gr, { al: 'c', b: true });
      G.rect(sx - hw, sy - 5, tw, 5, Gr);
      T.restore();
      G.rect(sx - 1, sy - 5, 2, 5, W);
      // piezas
      for (let i = 0; i < s.cols * s.rows; i++) {
        const m = s.mask[i]; if (!m) continue;
        const c = i % s.cols, rr = (i / s.cols) | 0, cx = s.bx + c * S + Math.floor(S / 2), cy = s.by + rr * S + Math.floor(S / 2);
        T.save(); T.translate(cx, cy); if (s.anim[i]) T.rotate(s.anim[i]);
        piece(m, S, tw, s.dist[i] >= 0);
        T.restore();
      }
      // corriente que fluye: puntos blancos de la entrada al centro y del centro a las salidas
      const u = (t * 2.2) % 1, h0 = Math.floor(S / 2);
      for (let i = 0; i < s.cols * s.rows; i++) {
        const dd = s.dist[i]; if (dd < 0 || s.anim[i]) continue;
        const c = i % s.cols, rr = (i / s.cols) | 0, cx = s.bx + c * S + h0, cy = s.by + rr * S + h0;
        for (const [bit, dx, dy] of DIRS) {
          if (!(s.mask[i] & bit)) continue;
          const nc = c + dx, nr = rr + dy, inb = nc >= 0 && nr >= 0 && nc < s.cols && nr < s.rows, j = nr * s.cols + nc;
          const incoming = inb ? s.dist[j] === dd - 1 && (s.mask[j] & opp(bit)) : dd === 0 && bit === 1;
          let k;
          if (incoming) { if (u >= 0.5) continue; k = 1 - u * 2; } else { if (u < 0.5) continue; k = u * 2 - 1; }
          G.rect(cx + Math.round(dx * k * h0) - 1, cy + Math.round(dy * k * h0) - 1, 2, 2, W);
        }
      }
      // fugas: chispas donde un cable con corriente no llega a nada
      for (const [i, bit] of s.leaks) {
        if (Math.random() < 0.35) continue;
        const c = i % s.cols, rr = (i / s.cols) | 0, dir = DIRS.find((q) => q[0] === bit);
        const ex = s.bx + c * S + h0 + dir[1] * (h0 - 1), ey = s.by + rr * S + h0 + dir[2] * (h0 - 1);
        for (let k = 0; k < 3; k++) G.px(ex + G.irand(-3, 3), ey + G.irand(-3, 3), k ? Gr : W);
      }
      // aviso de bit flip: la pieza parpadea
      if (s.flip) {
        const i = s.flip.i, c = i % s.cols, rr = (i / s.cols) | 0, x = s.bx + c * S, y = s.by + rr * S, on = Math.floor(t * 10) % 2;
        G.drect(x + 1, y + 1, S - 2, S - 2, on ? 8 : 4, B, null); G.box(x, y, S, S, on ? W : Gr); G.text('!', x + S / 2, y + S / 2 - 7, on ? W : Gr, { al: 'c', s: 2, b: true });
      }
      // chips de destino
      s.targets.forEach((tg, k) => this.drawChip(s, tg, s.lit[k], t));
      for (const p of s.parts) G.rect(p.x, p.y, 2, 2, p.col);
      if (s.solved) {
        if (s.boss) { // SYSTEM ONLINE a lo grande
          const by = s.by + Math.floor(s.rows * S * 0.7) - 16, bw = Math.min(r.w - 12, 196), bx = r.x + Math.floor((r.w - bw) / 2);
          G.rect(bx, by, bw, 32, K); T.save(); T.shadowColor = GLOW; T.shadowBlur = 10; G.box(bx, by, bw, 32, Gr); G.text('SYSTEM ONLINE', bx + bw / 2, by + 9, Gr, { al: 'c', s: 2, b: true }); T.restore();
        }
      }
    },
    drawChip(s, tg, on, t) {
      const T = G.ctx(), p = this.portXY(s, tg), tw = s.tw, hw = tw / 2, col = on ? Gr : L;
      let x, y, w, h;
      if (tg.side === 4) { w = Math.min(64, Math.round(s.S * 1.5)); h = 18; x = p.x - Math.floor(w / 2); y = p.y + 5; G.rect(p.x - hw, p.y, tw, 5, col); }
      else { w = 21; h = Math.round(s.S * 1.3); y = p.y - Math.floor(h / 2); x = tg.side === 2 ? p.x + 4 : p.x - 4 - w; G.rect(tg.side === 2 ? p.x : p.x - 4, p.y - hw, 4, tw, col); }
      // patas
      if (tg.side === 4) for (let k = x + 3; k < x + w - 2; k += 4) { G.rect(k, y - 2, 2, 2, L); G.rect(k, y + h, 2, 2, L); }
      else for (let k = y + 3; k < y + h - 2; k += 4) { G.rect(x - 2, k, 2, 2, L); G.rect(x + w, k, 2, 2, L); }
      if (on) { T.save(); T.shadowColor = GLOW; T.shadowBlur = 8 + s.flash * 14; G.rect(x, y, w, h, Gr); T.restore(); if (s.flash > 0.5) G.box(x - 2, y - 2, w + 4, h + 4, W); }
      else { G.rect(x, y, w, h, K); G.box(x, y, w, h, L); }
      G.px(x + 2, y + 2, on ? K : L);
      const label = tg.side === 4 && on ? tg.name + ' OK' : tg.name;
      G.text(label, x + w / 2, y + Math.floor(h / 2) - 3, on ? K : Math.floor(t * 2) % 2 ? L : W, { al: 'c', b: true });
    },
  };

  // icono de la tarjeta: una pieza fija y otra que gira hasta encender el LED
  G.ICONS[18] = function (t) {
    const ph = Math.floor(t * 1.6) % 4, m = rotN(12, ph), on = !!(m & 8), led = on && (m & 4);
    G.rect(0, 9, 2, 2, Gr);
    G.box(2, 4, 10, 11, B); G.rect(2, 9, 10, 2, Gr);
    G.box(12, 4, 10, 11, B);
    const cx = 16, cy = 9, col = on ? Gr : L;
    G.rect(cx, cy, 2, 2, col);
    if (m & 1) G.rect(cx, 4, 2, 5, col);
    if (m & 4) G.rect(cx, cy, 2, 6, col);
    if (m & 2) G.rect(cx, cy, 6, 2, col);
    if (m & 8) G.rect(12, cy, 4, 2, col);
    G.rect(14, 16, 6, 3, led ? Gr : L); G.rect(16, 15, 2, 1, led ? Gr : L);
    if (led && Math.floor(t * 8) % 2) { G.px(13, 15, W); G.px(21, 15, W); G.px(17, 19, W); }
  };
  G.CARD_SCHEMES[18] = { top: Gr, tt: K, ib: K, grid: B, bot: B, nc: Gr, bt: W };
})(window.G);
