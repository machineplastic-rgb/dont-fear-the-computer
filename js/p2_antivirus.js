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
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  // pieza de la formación (el aspecto se elige después con setLook); las 'mini' son las AGAIN del jefe
  function mkEnemy(s, kind, o) {
    const e = Object.assign({ w: VW, h: VH, kind: 'basic', look: null, hp: 1, max: 1, flash: 0, tele: 0, ft: 0, crack: G.rand(0, 6), span: 1, ox: 0, oy: 0, seed: Math.random() * 10 }, o);
    if (kind === 'mini') { e.kind = 'mini'; e.look = 'err'; e.st = G.WSTYLES[G.pick(pool(s).basic)]; e.title = 'AGAIN'; }
    return e;
  }

  // ---------- ventanitas variadas (como un collage de pop-ups 1 bit y azul) ----------
  const WORDS = ['STAY', 'WAIT', 'NOPE', 'LOL', 'HELP', 'LOST', 'BYE', 'BUSY', 'RUN', 'NO'];
  const SCRIPT = ['Static', 'Lost', 'Glitch', 'Ghost', 'Hello', 'Sorry'];
  const MSGS = ['NO SMILE', 'NOT FOUND', 'BAD SECTOR', 'NO SIGNAL', 'TRY AGAIN', 'LOW MEMORY'];
  const USERS = ['GUEST', 'ADMIN', 'ROOT', 'USER01'];
  const FILES = ['FILE.EXE', 'PHOTOS.ZIP', 'MUSIC.MP3', 'DIARY.TXT'];
  const SCRIPT_FONT = (fs) => 'italic bold ' + fs + 'px Georgia, "Times New Roman", serif';
  // tamaño de cada tipo (las grandes ocupan dos columnas y aguantan más)
  const SIZE = { err: [VW, VH], warn: [VW, VH], virus: [VW, VH], hg: [24, 34], smile: [36, 36], mine: [46, 40], load: [50, 30], paint: [26, 58], retry: [98, 42], login: [104, 50], copy: [104, 54], skull: [104, 58] };
  // estilo por bloque de color: en el bloque 0 no hay azul
  function ST(s, k) {
    if (s.block >= 2 && Math.random() < 0.3) return G.WSTYLES[G.pick(pool(s).basic)];
    k = Array.isArray(k) ? G.pick(k) : k;
    if (s.block === 0 && k[0] !== 'm') k = { b1: 'm4', b2: 'm1', b3: 'm2', b4: 'm3' }[k] || 'm1';
    return G.WSTYLES[k];
  }
  function setLook(s, e, look) {
    const d = s.d, pl = pool(s), hard = d >= 0.4;
    let [w, h] = SIZE[look] || [VW, VH], kind = 'basic', hp = 1, st, title = '';
    e.look = look; e.blk = s.block;
    switch (look) {
      case 'err': st = ST(s, pl.basic); title = G.pick(TITLES); break;
      case 'warn': kind = 'armor'; st = G.WSTYLES[pl.armor]; title = 'WARN!'; hp = hard ? 3 : 2; break;
      case 'stack': kind = 'armor'; hp = hard ? 3 : 2; w = VW + (hp - 1) * 4; h = VH + (hp - 1) * 4; e.lst = Array.from({ length: hp }, () => ST(s, pl.basic)); st = e.lst[hp - 1]; title = 'ERROR'; break;
      case 'virus': kind = 'shoot'; st = G.WSTYLES[pl.shoot]; title = 'VIRUS'; hp = d >= 0.3 ? 2 : 1; break;
      case 'hg': st = ST(s, ['m1', 'm3', 'b2', 'b4']); break;
      case 'smile': st = ST(s, ['b1', 'm2', 'm1', 'b3']); break;
      case 'mine': st = ST(s, ['m5', 'm5', 'b4']); title = 'MINES'; e.cells = Array.from({ length: 14 }, () => G.pick([0, 0, 0, 1, 1, 2, 3])); break;
      case 'load': st = ST(s, ['b3', 'b1']); break;
      case 'banner': st = ST(s, ['m1', 'm2', 'b1', 'b3', 'm4']); e.word = G.pick(WORDS); w = G.textW(e.word, 2) + 8; h = 24; break;
      case 'script': {
        st = ST(s, ['m1', 'b2', 'm3']); e.word = G.pick(SCRIPT);
        let fs = 15; while (fs > 10 && G.fsprite(e.word, SCRIPT_FONT(fs), '#ffffff').width > 44) fs--;
        e.font = SCRIPT_FONT(fs); const sp = G.fsprite(e.word, e.font, '#ffffff'); w = sp.width + 8; h = Math.max(18, sp.height + 4); break;
      }
      case 'paint': st = ST(s, ['m1', 'b4', 'm3']); hp = d >= 0.3 ? 2 : 1; break;
      case 'retry': kind = 'armor'; st = ST(s, ['b1', 'b2']); title = 'ERROR'; e.msg = G.pick(MSGS); hp = hard ? 3 : 2; break;
      case 'login': kind = 'armor'; st = ST(s, ['m2', 'm4']); title = 'LOGIN'; e.user = G.pick(USERS); hp = hard ? 4 : 3; break;
      case 'copy': kind = 'armor'; st = ST(s, ['b2', 'b4']); title = 'COPYING...'; e.file = G.pick(FILES); hp = hard ? 4 : 3; break;
      case 'skull': kind = 'shoot'; st = ST(s, 'b1'); title = 'VIRUS DETECTED'; hp = hard ? 4 : 3; break;
    }
    if (e.span === 2) w = Math.min(w, Math.floor(s.colSp + VW));
    Object.assign(e, { kind, w, h, hp, max: hp, st, title });
    if (kind === 'shoot') e.ft = G.rand(0.8, 1.6);
  }

  // calavera en trama (blanca sobre azul): se pinta en grises y se pasa a 1 bit con Bayer
  const skCache = new Map();
  function skullMask(w, h) {
    const k = w + 'x' + h; let m = skCache.get(k); if (m) return m;
    const o = G.mkCanvas(w, h), x = o.x;
    x.save(); x.scale(w / 34, h / 40);
    const lg = x.createRadialGradient(11, 10, 1, 15, 17, 27); lg.addColorStop(0, '#fff'); lg.addColorStop(0.5, '#b4b4b4'); lg.addColorStop(1, '#262626');
    x.fillStyle = lg;
    x.beginPath(); x.ellipse(17, 15, 15, 14, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(3, 15); x.lineTo(31, 15); x.lineTo(29, 27); x.lineTo(25, 30); x.lineTo(25, 38); x.lineTo(9, 38); x.lineTo(9, 30); x.lineTo(5, 27); x.closePath(); x.fill();
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.beginPath(); x.ellipse(30, 24, 4, 8, 0, 0, Math.PI * 2); x.fill(); // sombra en la mejilla
    x.fillStyle = '#000'; // cuencas, nariz y dientes
    x.beginPath(); x.ellipse(11, 20, 5, 4.6, 0.2, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(23, 20, 5, 4.6, -0.2, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(17, 24); x.lineTo(14.4, 29.5); x.lineTo(19.6, 29.5); x.closePath(); x.fill();
    x.fillStyle = '#e0e0e0'; x.fillRect(10, 31, 14, 6);
    x.fillStyle = '#000'; x.fillRect(10, 33.6, 14, 1); for (let i = 0; i < 5; i++) x.fillRect(12.2 + i * 2.6, 31, 1, 6);
    x.restore();
    const d = x.getImageData(0, 0, w, h).data; m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (d[i * 4 + 3] > 140) m[i] = d[i * 4] / 255 > (G.bayer(i % w, Math.floor(i / w)) + 0.5) / 16 ? 1 : 0;
    skCache.set(k, m); return m;
  }
  function skullArt(w, h, col) {
    const k = w + 'x' + h + col; let c = skCache.get(k); if (c) return c;
    const m = skullMask(w, h), o = G.mkCanvas(w, h), id = o.x.createImageData(w, h), rgb = G.hexRGB(col);
    for (let i = 0; i < w * h; i++) if (m[i]) { id.data[i * 4] = rgb[0]; id.data[i * 4 + 1] = rgb[1]; id.data[i * 4 + 2] = rgb[2]; id.data[i * 4 + 3] = 255; }
    o.x.putImageData(id, 0, 0); skCache.set(k, o.c); return o.c;
  }

  // ---------- dibujo de cada tipo ----------
  function shadow(x, y, w, h, st) { G.drect(x + 3, y + 3, w, h, 8, st.sh, null); if (st.out) G.box(x - 1, y - 1, w + 2, h + 2, st.out); }
  function okBtn(rr, st) { const bx = rr.x + rr.w - 21, byy = rr.y + 3; G.rect(bx, byy, 18, 9, st.bd); G.box(bx, byy, 18, 9, st.tx); G.text('OK', bx + 9, byy + 1, st.tx, { al: 'c' }); }
  function btn(x, y, w, h, lbl, st, on) {
    G.rect(x, y, w, h, on ? st.tx : st.bd); G.box(x, y, w, h, st.tx);
    G.text(lbl, x + w / 2, y + Math.floor((h - 7) / 2), on ? st.bd : st.tx, { al: 'c' });
  }
  function bar(x, y, w, h, k, col, seg) {
    G.box(x, y, w, h, col);
    const n = Math.floor((w - 3) / (seg + 1)), f = Math.round(n * G.clamp(k, 0, 1));
    for (let i = 0; i < f; i++) G.rect(x + 2 + i * (seg + 1), y + 2, seg, h - 4, col);
  }
  const frame = (x, y, e, st, title, stripes) => G.drawFrame({ x, y, w: e.w, h: e.h, st, title: title == null ? e.title : title, stripes: !!stripes, xmode: 'x' });
  function ants(x, y, w, h) { // selección con hormiguitas (blanco y negro que avanzan)
    const T = G.ctx(), ph = Math.floor(G.time * 10); let i = 0;
    const P = (px, py) => { T.fillStyle = ((i++ + ph) >> 1) & 1 ? W : K; T.fillRect(px, py, 1, 1); };
    for (let k = 0; k < w; k++) P(x + k, y);
    for (let k = 1; k < h; k++) P(x + w - 1, y + k);
    for (let k = w - 2; k >= 0; k--) P(x + k, y + h - 1);
    for (let k = h - 2; k > 0; k--) P(x, y + k);
  }
  const TOOLS = [ // paleta de dibujo: 8 herramientas propias de 8x8
    (x, y, c) => { G.line(x + 2, y + 7, x + 7, y + 2, c); G.px(x + 3, y + 7, c); }, // lápiz
    (x, y, c) => G.box(x + 2, y + 3, 6, 4, c), // rectángulo
    (x, y, c) => G.line(x + 2, y + 2, x + 7, y + 7, c), // línea
    (x, y, c) => G.ell(x + 5, y + 5, 3, 2, null, c), // elipse
    (x, y, c) => G.text('A', x + 3, y + 2, c), // texto
    (x, y, c) => { G.rect(x + 3, y + 4, 4, 4, c); G.line(x + 2, y + 3, x + 5, y + 1, c); G.px(x + 8, y + 7, c); }, // cubo
    (x, y, c) => { G.box(x + 2, y + 4, 6, 3, c); G.rect(x + 2, y + 4, 3, 3, c); }, // goma
    (x, y, c) => { G.circ(x + 4, y + 4, 2, null, c); G.line(x + 6, y + 6, x + 8, y + 8, c); }, // lupa
  ];
  const DRAW = {
    err(x, y, e, st) { const rr = frame(x, y, e, st); G.drawSpr('xcirc', rr.x + 3, rr.y + 3, { '#': st.ac }); okBtn(rr, st); },
    warn(x, y, e, st) { const rr = frame(x, y, e, st); G.box(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2, st.tx); G.drawSpr('warn', rr.x + 3, rr.y + 3, { '#': st.ac }); okBtn(rr, st); },
    virus(x, y, e, st) { const rr = frame(x, y, e, st); G.drawSpr(Math.floor(G.time * 6) % 2 ? 'bug' : 'bug2', rr.x + 2, rr.y + 2, { '#': st.tx, g: st.bd }, 1); okBtn(rr, st); },
    stack(x, y, e, st) { // montón de ERROR en cascada: cada golpe cierra la de delante
      const n = Math.max(1, e.hp);
      for (let j = 0; j < n; j++) {
        const s2 = j === n - 1 ? st : e.lst[j];
        const rr = G.drawFrame({ x: x + j * 4, y: y + j * 4, w: VW, h: VH, st: s2, title: 'ERROR', stripes: false, xmode: 'x' });
        if (j === n - 1) { G.drawSpr('xcirc', rr.x + 3, rr.y + 3, { '#': s2.ac }); okBtn(rr, s2); }
      }
    },
    hg(x, y, e, st) { // reloj de arena: la arena cae y se da la vuelta
      const rr = frame(x, y, e, st, '', false), cx = rr.x + 10, y0 = rr.y + 1, y1 = rr.y + rr.h - 2;
      const k = (G.time * 0.55 + e.seed) % 1, flip = k > 0.9, mid = Math.round((y0 + y1) / 2) + 1;
      G.rect(cx - 6, y0, 13, 2, st.tx); G.rect(cx - 6, y1, 13, 2, st.tx);
      G.line(cx - 5, y0 + 2, cx, mid - 1, st.tx); G.line(cx + 5, y0 + 2, cx, mid - 1, st.tx);
      G.line(cx, mid, cx - 5, y1 - 1, st.tx); G.line(cx, mid, cx + 5, y1 - 1, st.tx);
      const top = flip ? 0 : 1 - k, bot = flip ? 1 : k, hT = mid - 1 - (y0 + 3), hB = y1 - 1 - (mid + 1);
      for (let yy = 0; yy < hT; yy++) { const fy = y0 + 3 + yy, rel = (yy + 1) / hT; if (rel > 1 - top * 0.9 || (yy === hT - 1 && top > 0.05)) { const hw = Math.max(0, Math.round(3.5 * (1 - yy / hT))); G.drect(cx - hw, fy, hw * 2 + 1, 1, 10, st.tx, null); } }
      for (let yy = 0; yy < hB; yy++) { const fy = y1 - 2 - yy, rel = (yy + 1) / hB; if (rel <= bot * 0.9 + 0.05) { const hw = Math.max(0, Math.round(3.5 * (1 - yy / hB))); G.drect(cx - hw, fy, hw * 2 + 1, 1, 10, st.tx, null); } }
      if (!flip && k < 0.88 && Math.floor(G.time * 12) % 2) G.rect(cx, mid, 1, hB, st.tx); // el hilito que cae
    },
    smile(x, y, e, st) { // carita seleccionada con sus tiradores, como en un programa de dibujo
      const cx = x + 18, cy = y + 18 + (Math.floor(G.time * 3 + e.seed) % 2);
      G.circ(cx, cy, 16, st.out === W ? K : W); G.circ(cx, cy, 15, st.bd);
      G.drawSpr('smiley', cx - 15, cy - 15, { '#': st.tx, o: st.tx }, 2);
      ants(x, y, e.w, e.h);
      for (const hx of [0, 16, 32]) for (const hy of [0, 16, 32]) if (hx !== 16 || hy !== 16) { G.rect(x + hx, y + hy, 4, 4, W); G.box(x + hx, y + hy, 4, 4, K); }
    },
    mine(x, y, e, st) { // buscaminas en miniatura
      const rr = frame(x, y, e, st), flag = e.blk === 0 ? K : B;
      G.rect(rr.x + 1, rr.y + 1, 13, 9, K); G.text(G.pad(e.cells.filter((c) => c === 2).length + 5, 2), rr.x + 2, rr.y + 2, W);
      G.rect(rr.x + rr.w - 14, rr.y + 1, 13, 9, K); G.text(G.pad(Math.floor(G.time + e.seed * 9) % 100, 2), rr.x + rr.w - 13, rr.y + 2, W);
      const fx = rr.x + Math.floor(rr.w / 2) - 5, fy = rr.y + 1;
      G.rect(fx, fy, 10, 9, W); G.box(fx, fy, 10, 9, K); G.px(fx + 3, fy + 3, K); G.px(fx + 6, fy + 3, K); G.rect(fx + 3, fy + 6, 4, 1, K); G.px(fx + 2, fy + 5, K); G.px(fx + 7, fy + 5, K);
      const gx = rr.x + Math.floor((rr.w - 43) / 2), gy = rr.y + 12;
      G.rect(gx, gy, 43, 13, K); // rejilla: casillas levantadas, destapadas, banderas y minas
      e.cells.forEach((c, i) => {
        const cx = gx + 1 + (i % 7) * 6, cy = gy + 1 + Math.floor(i / 7) * 6;
        if (c === 0 || c === 2) { G.rect(cx, cy, 5, 5, L); G.rect(cx, cy, 5, 1, W); G.rect(cx, cy, 1, 5, W); if (c === 2) { G.rect(cx + 2, cy + 1, 2, 2, flag); G.px(cx + 2, cy + 3, K); } }
        else { G.rect(cx, cy, 5, 5, W); if (c === 3) { G.rect(cx + 1, cy + 2, 3, 1, K); G.rect(cx + 2, cy + 1, 1, 3, K); } }
      });
    },
    load(x, y, e, st) { const rr = frame(x, y, e, st, '', true); G.text('LOADING', rr.x + 2, rr.y + 1, st.tx); bar(rr.x + 1, rr.y + 9, rr.w - 2, 6, ((G.time * 0.45 + e.seed) % 1.25), st.tx, 2); },
    banner(x, y, e, st) { shadow(x, y, e.w, e.h, st); G.rect(x, y, e.w, e.h, st.fr); G.rect(x + 2, y + 2, e.w - 4, e.h - 4, st.bd); G.text(e.word, x + e.w / 2, y + 5, st.tx, { al: 'c', s: 2 }); },
    script(x, y, e, st) {
      shadow(x, y, e.w, e.h, st); G.rect(x, y, e.w, e.h, st.fr); G.rect(x + 1, y + 1, e.w - 2, e.h - 2, st.bd);
      const sp = G.fsprite(e.word, e.font, st.tx); G.ctx().drawImage(sp, Math.round(x + (e.w - sp.width) / 2), Math.round(y + (e.h - sp.height) / 2));
    },
    paint(x, y, e, st) { // paleta de herramientas en vertical
      const rr = frame(x, y, e, st, '', false), sel = Math.floor(G.time * 1.5 + e.seed) % 8;
      for (let i = 0; i < 8; i++) {
        const cx = rr.x + (i % 2) * 12, cy = rr.y + Math.floor(i / 2) * 11, on = i === sel;
        G.rect(cx, cy, 10, 10, on ? st.tx : st.bd); G.box(cx, cy, 10, 10, st.tx); TOOLS[i](cx, cy, on ? st.bd : st.tx);
      }
    },
    retry(x, y, e, st) {
      const rr = frame(x, y, e, st, null, true);
      G.drawSpr('xcirc', rr.x + 4, rr.y + 3, { '#': st.ac }); G.text(e.msg, rr.x + 18, rr.y + 4, st.tx, { b: true });
      const bw1 = 38, bw2 = 44, bx = rr.x + Math.round((rr.w - bw1 - bw2 - 6) / 2), by = rr.y + rr.h - 12;
      btn(bx, by, bw1, 11, 'RETRY', st, Math.floor(G.time * 2 + e.seed) % 4 === 0); btn(bx + bw1 + 6, by, bw2, 11, 'CANCEL', st);
    },
    login(x, y, e, st) {
      const rr = frame(x, y, e, st, null, true), n = Math.min(6, Math.floor((G.time * 3 + e.seed * 3) % 9)), fw = rr.w - 54;
      G.text('USER', rr.x + 3, rr.y + 3, st.tx); G.box(rr.x + 52, rr.y + 1, fw, 10, st.tx); G.text(e.user, rr.x + 54, rr.y + 3, st.tx);
      G.text('PASSWORD', rr.x + 3, rr.y + 15, st.tx); G.box(rr.x + 52, rr.y + 13, fw, 10, st.tx); G.text('*'.repeat(n), rr.x + 54, rr.y + 15, st.tx);
      if (Math.floor(G.time * 3) % 2) G.rect(rr.x + 54 + n * 6, rr.y + 15, 1, 7, st.tx);
      btn(rr.x + rr.w - 78, rr.y + rr.h - 11, 30, 10, 'OK', st); btn(rr.x + rr.w - 44, rr.y + rr.h - 11, 42, 10, 'CANCEL', st);
    },
    copy(x, y, e, st) {
      const rr = frame(x, y, e, st, null, true), k = (G.time * 0.12 + e.seed) % 1;
      G.text(e.file, rr.x + 3, rr.y + 2, st.tx, { b: true }); G.text('"C:/" TO "DOCS"', rr.x + 3, rr.y + 11, st.tx);
      bar(rr.x + 3, rr.y + 20, rr.w - 6, 8, k, st.tx, 3);
      G.text('ETA ' + (3 - Math.floor(k * 3)) + ':' + G.pad(59 - Math.floor((G.time * 7) % 60), 2), rr.x + 3, rr.y + 31, st.tx);
      btn(rr.x + rr.w - 44, rr.y + 29, 42, 10, 'CANCEL', st);
    },
    skull(x, y, e, st) { // VIRUS DETECTED con calavera en trama
      const rr = frame(x, y, e, st, null, false);
      G.ctx().drawImage(skullArt(34, 40, st.tx), rr.x + 2, rr.y + 1);
      G.text('YOUR FILES', rr.x + 40, rr.y + 3, st.tx); G.text('BELONG TO', rr.x + 40, rr.y + 12, st.tx); G.text('ME NOW', rr.x + 40, rr.y + 21, st.tx, { b: true });
      btn(rr.x + 40, rr.y + rr.h - 12, 38, 11, 'RETRY', st, Math.floor(G.time * 2 + e.seed) % 3 === 0);
    },
  };

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
      s.rows = plan.map((p, i) => ({ type: p.type, i, h: VH, y: 0 }));
      plan.forEach((p, i) => {
        if (p.type === 'slide') { for (let k = 0; k < p.n; k++) s.ens.push(mkEnemy(s, 'basic', { row: i, slot: k })); return; } // fila que patina de lado a lado
        const cols = shuffle(Array.from({ length: C }, (_, k) => k)).slice(0, p.n).sort((a, b) => a - b);
        // dos columnas seguidas pueden juntarse en una ventana grande (aguanta más golpes)
        let merges = i === 0 ? (d >= 0.14 ? (d >= 0.55 && C >= 4 ? 2 : 1) : 0) : (d >= 0.4 && Math.random() < 0.4 ? 1 : 0);
        const used = new Set();
        for (const j of shuffle(cols.map((_, j) => j))) {
          if (merges <= 0) break;
          const a = cols[j], b = cols[j + 1];
          if (b === a + 1 && !used.has(a) && !used.has(b)) { used.add(a); used.add(b); s.ens.push(mkEnemy(s, 'basic', { row: i, slot: a, span: 2 })); merges--; }
        }
        for (const c of cols) if (!used.has(c)) s.ens.push(mkEnemy(s, 'basic', { row: i, slot: c }));
      });
      // grandes: LOGIN, COPYING, ERROR con RETRY o la calavera VIRUS DETECTED (esta dispara)
      let armors = d >= 0.14 ? 1 + Math.floor(d * 3) : 0, shooters = d >= 0.14 ? 1 + Math.round(d * 3) : 0;
      const bigBag = shuffle(['login', 'copy', 'retry']); if (Math.random() < 0.5) bigBag.push('skull'); else bigBag.unshift('skull');
      s.ens.filter((e) => e.span === 2).sort((a, b) => a.row - b.row).forEach((e) => {
        let look = bigBag.pop() || G.pick(['login', 'copy', 'retry']);
        if (look === 'skull' && shooters <= 0) look = 'copy';
        setLook(s, e, look); if (e.kind === 'shoot') shooters--; else armors--;
      });
      // blindadas (montón de ERROR o aviso) y tiradoras (VIRUS) entre las pequeñas; las que disparan, en las filas de arriba
      const free = () => s.ens.filter((e) => !e.look);
      shuffle(free().filter((e) => s.rows[e.row].type === 'grid')).slice(0, Math.max(0, armors)).forEach((e) => setLook(s, e, Math.random() < 0.5 ? 'stack' : 'warn'));
      free().sort((a, b) => a.row - b.row || Math.random() - 0.5).slice(0, Math.max(0, shooters)).forEach((e) => setLook(s, e, 'virus'));
      // el resto, todas distintas (la paleta alta y el buscaminas, como mucho una vez)
      const bag = shuffle(['err', 'hg', 'smile', 'mine', 'load', 'banner', 'script', 'paint', 'banner', 'err', 'smile', 'load']);
      free().forEach((e) => { if (!bag.length) bag.push(...shuffle(['err', 'hg', 'smile', 'load', 'banner', 'script'])); setLook(s, e, bag.pop()); });
      // alto de cada fila (manda la más alta) y sitio de cada ventana dentro de su hueco
      let yy = 0;
      s.rows.forEach((row, i) => {
        let es = s.ens.filter((e) => e.row === i);
        if (row.type === 'slide') {
          es.sort((a, b) => a.slot - b.slot);
          const span = () => es.reduce((a, e) => a + e.w, 0) + (es.length - 1) * SLIDE_GAP;
          while (es.length > 1 && span() > r.w - 8) { const x = es.pop(); s.ens.splice(s.ens.indexOf(x), 1); }
          let x = 0; es.forEach((e) => { e.ox = x; x += e.w + SLIDE_GAP; });
          row.span = span(); row.x = G.rand(r.x + 4, Math.max(r.x + 4, r.x + r.w - 4 - row.span)); row.v = (40 + 75 * d) * (i % 2 ? -1 : 1) * G.rand(0.85, 1.15);
        } else es.forEach((e) => { const cw = e.span === 2 ? s.colSp + VW : VW; e.ox = Math.round(G.clamp(4 + e.slot * s.colSp + (cw - e.w) / 2, 1, r.w - e.w - 1)); });
        row.h = Math.max(VH, ...es.map((e) => e.h)); row.y = yy; yy += row.h + ROWG;
        es.forEach((e) => (e.oy = Math.round((row.h - e.h) / 2)));
      });
      const rowsH = yy - ROWG;
      // aparecen una a una, como las ventanas de la parte 1
      s.ens.sort((a, b) => a.row - b.row || a.ox - b.ox);
      s.ens.forEach((e, k) => { e.st8 = 'enter'; e.et = -k * 0.05; });
      s.total = s.ens.length;
      const H = s.ens.reduce((a, e) => a + e.hp, 0);
      s.T = (2.4 + 0.55 * s.total + 0.3 * (H - s.total)) * (1 + 0.04 * (s.rows.length - 1));
      s.fy0 = r.y + 6;
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
      const r = s.r, row = s.rows[e.row];
      return { x: (row.type === 'slide' ? row.x : r.x) + e.ox, y: s.fy + row.y + e.oy };
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
        const c = s.ens.filter((e) => e.st8 === 'form'), near = c.filter((e) => Math.abs(e.x + e.w / 2 - s.pl.x) < 60);
        const e = near.length && Math.random() < 0.6 ? G.pick(near) : c.length ? G.pick(c) : null;
        if (e) pellet(s, e.x + e.w / 2 + G.irand(-8, 8), e.y + e.h + 4, 0, 125 + 90 * d);
      }
      // de vez en cuando una ventana (pequeña) se lanza en picado hacia ti
      s.diveT -= dt;
      if (s.diveT <= 0) {
        s.diveT = (2.6 - 1.4 * d) * G.rand(0.7, 1.3);
        const c = s.ens.filter((e) => e.st8 === 'form' && e.kind !== 'shoot' && e.span !== 2); if (c.length) { const e = G.pick(c); e.st8 = 'tele'; e.tt = 0.42; A().sfx('beepT'); }
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
          const want = G.clamp((s.pl.x + 4 - (e.x + e.w / 2)) * 2.2, -110, 110); e.vx += (want - e.vx) * Math.min(1, dt * 3);
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.y > r.y + r.h + 4) { e.st8 = 'back'; e.bt = 0; e.y = r.y - e.h - 4; }
        } else if (e.st8 === 'back') { // vuelve a su sitio desde arriba
          e.bt += dt; const k = G.clamp(e.bt / 0.7, 0, 1);
          e.x = G.lerp(e.x, p.x, Math.min(1, dt * 7)); e.y = G.lerp(r.y - e.h - 4, p.y, k);
          if (k >= 1) e.st8 = 'form';
        }
        // las tiradoras avisan (parpadean) y luego disparan adonde vas a estar (la calavera grande, en abanico)
        if (e.kind === 'shoot' && e.st8 === 'form') {
          if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { const sp = 105 + 100 * d, spr = d >= 0.45 ? [-0.22, 0, 0.22] : e.span === 2 ? [-0.15, 0.15] : [0]; for (const o of spr) { const v = aimAt(s, e.x + e.w / 2, e.y + e.h, sp, o, d >= 0.3 ? 1 : 0.5); pellet(s, e.x + e.w / 2, e.y + e.h + 3, v.vx, v.vy); } A().sfx('zap'); } }
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
        for (const e of list) if (!e.dead && e.y + e.h > s.r.y + 2 && hitR(b, e) && (!best || e.y + e.h > best.y + best.h)) best = e;
        if (!best) continue;
        const e = best; b.dead = true; e.hp--; e.flash = 0.07;
        if (e.hp <= 0) {
          e.dead = true; s.kills++; ghost(s, e);
          burst(s, e.x + e.w / 2, e.y + 6, e.span === 2 ? 9 : 5, e.st.bar === K ? (s.block === 0 ? W : e.st.fr) : e.st.bar);
          A().sfx('close', Math.min(9, s.kills)); G.pulse({ ab: e.span === 2 ? 2.5 : 1.5 }); G.vibrate(6);
        } else if (e.look === 'stack') { // se cierra la ventana de delante del montón
          const j = e.hp; ghost(s, { x: e.x + j * 4, y: e.y + j * 4, w: VW, h: VH, st: e.lst[j] }); e.st = e.lst[j - 1];
          A().sfx('close', G.irand(2, 5)); burst(s, e.x + j * 4 + VW / 2, e.y + j * 4 + 6, 3, e.st.fr);
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
      const EW = e.w, EH = e.h;
      if (e.st8 === 'enter') { // se abre: contorno que crece, como al aparecer
        if (e.et < 0) return;
        const k = Math.min(1, e.et / 0.12), ww = Math.max(4, EW * k), hh = Math.max(3, EH * k);
        G.box(x + (EW - ww) / 2, y + (EH - hh) / 2, ww, hh, e.st.fr === K ? K : e.st.fr); return;
      }
      if (e.flash > 0) x += G.irand(-1, 1);
      const telegraph = (e.kind === 'shoot' && e.tele > 0) || e.st8 === 'tele';
      const blink = telegraph && Math.floor(G.time * 16) % 2 === 0;
      const st = blink ? { fr: e.st.fr, bd: e.st.tx, bar: e.st.bd, bt: e.st.tx, tx: e.st.bd, ac: e.st.bd, sh: e.st.sh, out: e.st.out } : e.st;
      if (e.st8 === 'dive' && e.kind !== 'mini') { G.dash(x + 6, y - 6, EW - 12, st.fr === K ? W : st.fr, 2, 3); G.dash(x + 10, y - 10, EW - 20, st.fr === K ? W : st.fr, 2, 4); }
      (DRAW[e.look] || DRAW.err)(x, y, e, st);
      if (e.max > 1 && e.hp < e.max && e.look !== 'stack') { // grietas según el daño
        const n = e.max - e.hp, c0 = e.crack, sp = Math.max(4, EW - 16);
        for (let i = 0; i < n; i++) { const cx0 = x + 8 + ((c0 * 7 + i * 17) % sp); G.line(cx0, y + 1, cx0 + 4, y + 9, st.tx); G.line(cx0 + 4, y + 9, cx0 - 1, y + 17, st.tx); G.line(cx0 - 1, y + 17, cx0 + 5, y + EH - 2, st.tx); }
      }
      if (e.flash > 0) G.drect(x, y, EW, EH, 8, W, null);
      if (telegraph) { const tw = 9; G.rect(x + EW / 2 - tw / 2, y - 12, tw, 10, K); G.text('!', x + EW / 2, y - 10, W, { al: 'c', b: true }); }
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
