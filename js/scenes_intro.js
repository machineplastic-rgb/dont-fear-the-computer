'use strict';
// POWER ON → arranque CRT + carga con módem → pantallazo azul → título gótico.
(function (G) {
  const P = G.PAL, K = P.K, W = P.W, B = P.B, Gr = P.G, L = P.L;
  const A = () => G.audio;

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return;
    Promise.all([
      document.fonts.load('700 40px "UnifrakturCook"'),
      document.fonts.load('16px "DotGothic16"', '電話東京製つづく腐った'),
    ]).then(() => G.clearFontCache()).catch(() => { });
  }
  if (document.fonts) document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => G.clearFontCache());

  // ================= POWER =================
  // pantalla de vídeo VHS en un monitor de tubo: texto azul con brillo, relojes en marcha, parpadeos, glitch y aberración.
  // Un toque en cualquier parte despierta el sistema (desbloquea el sonido y pide el giroscopio).
  const VHS_GLOW = 'rgba(90,90,255,0.95)';
  const two = (n) => String(Math.floor(n)).padStart(2, '0');
  // tipografía propia estilo menú de vídeo: estrecha y alta (5x9 px)
  const VF = {
    A: '.###.#...##...##...#######...##...##...##...#', B: '####.#...##...##...#####.#...##...##...#####.', C: '.###.#...##....#....#....#....#....#...#.###.',
    D: '####.#...##...##...##...##...##...##...#####.', E: '######....#....#....####.#....#....#....#####', F: '######....#....#....####.#....#....#....#....',
    G: '.###.#...##....#....#.####...##...##...#.###.', H: '#...##...##...##...#######...##...##...##...#', I: '.###...#....#....#....#....#....#....#...###.',
    J: '..###...#....#....#....#....#.#..#.#..#..##..', K: '#...##..#.#.#..##...##...#.#..#..#.#...##...#', L: '#....#....#....#....#....#....#....#....#####',
    M: '#...###.###.#.##.#.##...##...##...##...##...#', N: '#...###..###..##.#.##.#.##..###..###...##...#', O: '.###.#...##...##...##...##...##...##...#.###.',
    P: '####.#...##...##...#####.#....#....#....#....', Q: '.###.#...##...##...##...##...##.#.##..#..##.#', R: '####.#...##...##...#####.#.#..#..#.#...##...#',
    S: '.###.#...##....#.....###.....#....##...#.###.', T: '#####..#....#....#....#....#....#....#....#..', U: '#...##...##...##...##...##...##...##...#.###.',
    V: '#...##...##...##...##...##...#.#.#..#.#...#..', W: '#...##...##...##...##.#.##.#.##.#.###.###...#', X: '#...##...#.#.#..#.#...#...#.#..#.#.#...##...#',
    Y: '#...##...#.#.#..#.#...#....#....#....#....#..', Z: '#####....#...#....#...#...#....#...#....#####',
    0: '.###.#...##..###..##.#.###..###..###...#.###.', 1: '..#...##..#.#....#....#....#....#....#..#####', 2: '.###.#...#....#....#...#...#...#...#....#####',
    3: '.###.#...#....#....#..##.....#....##...#.###.', 4: '...#...##..#.#.#..#.#..#.#####...#....#....#.', 5: '######....#....####.....#....#....##...#.###.',
    6: '.###.#...##....#....####.#...##...##...#.###.', 7: '#####....#....#...#....#...#....#....#....#..', 8: '.###.#...##...##...#.###.#...##...##...#.###.',
    9: '.###.#...##...##...#.####....#....##...#.###.', ' ': '', ':': '.............#....#..........#....#..........', '.': '...................................##...##...',
    '/': '....#....#...#....#...#...#....#...#....#....', '\\': '#....#.....#....#.....#.....#....#.....#....#', '>': '#.....#.....#.....#.....#...#...#...#...#....',
    '-': '.....................###.....................', '_': '........................................#####', "'": '..#....#....#................................',
    '&': '.##..#..#.#..#..##...#...#.#.##..#.#..#..##.#', '►': '#....##...###..####.#########.###..##...#....', 'Ø': '.###.#...##..###..##.#.###..###..###...#.###.',
    x: '...............#...#.#.#...#...#.#.#...#.....', '|': '..#....#....#....#....#....#....#....#....#..',
  };
  const vfCache = new Map();
  function vhsCanvas(str, sc) { // texto ya dibujado (se guarda para no repintarlo cada fotograma)
    const k = str + '|' + sc; let c = vfCache.get(k); if (c) return c;
    if (vfCache.size > 160) vfCache.clear();
    const w = Math.max(1, (str.length * 6 - 1) * sc), cv = G.mkCanvas(w, 9 * sc), x = cv.x; x.fillStyle = B;
    for (let i = 0; i < str.length; i++) { const g = VF[str[i]] || VF[str[i].toUpperCase()] || ''; for (let p = 0; p < g.length; p++) if (g[p] === '#') x.fillRect((i * 6 + (p % 5)) * sc, Math.floor(p / 5) * sc, sc, sc); }
    vfCache.set(k, cv.c); return cv.c;
  }
  G.scenes.power = {
    enter() {
      loadFonts(); G.fx.scan = true; G.fx.vign = true; this.armed = false; this.press = 0; this.track = -60; this.flick = 0; this.jit = 0;
      this.cd = 1 * 3600 + 23 * 60 + 51; // cuenta atrás que empieza en 01:23:51
    },
    update(dt) {
      if (this.t > 0.4) this.armed = true;
      if (this.press > 0) { this.press -= dt; if (this.press <= 0) G.go('boot'); }
      this.cd = Math.max(0, this.cd - dt);
      this.track += dt * 90; if (this.track > G.H + 20) this.track = -G.irand(60, 300);
      G.fx.abBase = 2.4 + (Math.random() < 0.06 ? G.rand(1.5, 4) : 0);
      if (Math.random() < 0.025) G.pulse({ glitch: G.rand(0.25, 0.7), ab: G.rand(2, 5) });
      this.flick = Math.random() < 0.05 ? G.rand(0.25, 0.6) : Math.max(0, this.flick - dt * 4); // parpadeo del tubo
      this.jit = Math.random() < 0.04 ? G.irand(-3, 3) : 0;
    },
    // texto azul de VHS con brillo (tipografía estrecha propia)
    vt(txt, x, y, s, o) {
      const T = G.ctx(), c = vhsCanvas(txt, s), al = (o && o.al) || 'l';
      const xx = Math.round(al === 'c' ? x - c.width / 2 : al === 'r' ? x - c.width : x);
      T.save(); T.shadowColor = VHS_GLOW; T.shadowBlur = 4 + s; T.drawImage(c, xx, y); T.restore(); T.drawImage(c, xx, y);
    },
    draw(g) {
      const Wd = G.W, Hd = G.H, t = this.t, top = G.safeT + 14, bot = Hd - G.safeB - 8, R = Wd - 12, Lx = 12;
      G.rect(0, 0, Wd, Hd, K);
      // cristal del tubo apenas iluminado
      const T = G.ctx(), gr = T.createRadialGradient(Wd / 2, Hd / 2, 20, Wd / 2, Hd / 2, Math.max(Wd, Hd) * 0.72);
      gr.addColorStop(0, 'rgba(18,18,40,0.9)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); T.fillStyle = gr; T.fillRect(0, 0, Wd, Hd);
      const el = t + 7, ss = Math.floor(el) % 60, mm = Math.floor(el / 60) % 60, hh = Math.floor(el / 3600);
      // arriba
      this.vt('MAR PRESENTS', Lx, top, 1);
      this.vt('OCT 31.26', R, top, 1, { al: 'r' });
      this.vt('PLAY ' + (Math.floor(t * 2) % 2 ? '►' : ' '), Lx, top + 14, 1);
      this.vt('--.--', R, top + 14, 1, { al: 'r' });
      this.vt(two(hh) + ':' + two(mm) + ':' + two(ss), Lx, top + 28, 1);
      const c = this.cd; this.vt(two(c / 3600) + ':' + two((c / 60) % 60) + ':' + two(c % 60), R, top + 28, 1, { al: 'r' });
      // centro
      const cy = Math.round(Hd * 0.42), jx = this.jit;
      this.vt('FATAL EXCEPTION', Wd / 2 + jx, cy, 2, { al: 'c' });
      this.vt('C:\\> BOOT_SYSTEM.BAT /FORCE', Wd / 2 - jx, cy + 24, 1, { al: 'c' });
      const info = ['NEØ OS 98 // KERNEL PANIC', '0x0000DEAD: MIND BUFFER CORRUPT', 'USER NOT FOUND', '13 SECTORS INFECTED // VOID.EXE'];
      info.forEach((s, i) => this.vt(s, Wd / 2, cy + 52 + i * 13, 1, { al: 'c' }));
      if (this.armed && Math.floor(t * 1.6) % 2 === 0) this.vt('TAP TO WAKE THE SYSTEM', Wd / 2, bot - 58, 1, { al: 'c' });
      // abajo
      this.vt('VOLUME', Lx, bot - 38, 1);
      this.vt('BOOT ►', R, bot - 38, 1, { al: 'r' });
      const vol = 7 + Math.round(Math.sin(t * 1.3) * 1.5);
      for (let i = 0; i < 10; i++) { const x = Lx + i * 5; if (i < vol) { T.save(); T.shadowColor = VHS_GLOW; T.shadowBlur = 4; G.rect(x, bot - 24, 2, 9, B); T.restore(); G.rect(x, bot - 24, 2, 9, B); } else G.rect(x, bot - 20, 3, 1, B); }
      this.vt('SP  NTSC', R, bot - 24, 1, { al: 'r' });
      G.text('WARNING: FLASHING LIGHTS & GLITCH', Wd / 2, bot - 4, L, { al: 'c' });
      // banda de tracking que baja, parpadeo, ruido y el destello al tocar
      if (this.track > 0 && this.track < Hd - 8) g.drawImage(G.cv, 0, this.track, Wd, 7, G.irand(2, 6), this.track, Wd, 7);
      if (this.flick > 0) { T.fillStyle = 'rgba(0,0,0,' + this.flick.toFixed(2) + ')'; T.fillRect(0, 0, Wd, Hd); }
      if (this.press > 0) { T.fillStyle = 'rgba(120,120,255,' + (this.press * 2).toFixed(2) + ')'; T.fillRect(0, 0, Wd, Hd); }
      G.drawNoise(0.045);
    },
    tap() {
      if (!this.armed || this.press > 0) return;
      A().sfx('power'); A().warmAll(); G.requestTilt(); G.pulse({ ab: 5, glitch: 0.6 });
      this.press = 0.25;
    },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  };

  // ================= BOOT (pantalla de carga) =================
  const BSOD_AT = 8.3;
  G.scenes.boot = {
    enter() {
      this.bc = G.mkCanvas(G.W, G.H);
      this.modem = false; this.prog = 0; this.done = false;
      A().music(null); A().stopMusic();
      A().sfx('crtOn');
    },
    resize() { this.bc = G.mkCanvas(G.W, G.H); },
    update(dt) {
      const t = this.t;
      if (!this.modem && t > 0.6) { this.modem = true; A().modem(); }
      // barra con tirones, como una conexión real
      const target = G.clamp((t - 1.0) / (BSOD_AT - 0.6), 0, 1) * 0.92;
      if (Math.random() < 0.08) this.prog = Math.max(this.prog, target);
      this.prog = Math.min(target, this.prog + dt * (Math.random() < 0.5 ? 0.02 : 0.15));
      G.fx.abBase = t > 0.6 ? 1.2 + (Math.random() < 0.04 ? 2 : 0) : 0;
      if (t > 0.6 && Math.random() < 0.015) G.pulse({ glitch: 0.25 });
      if (!this.done && t >= BSOD_AT) {
        this.done = true;
        A().stopModem(); A().sfx('toun'); G.vibrate(120);
        G.pulse({ flash: 0.6, flashCol: W, shake: 6 });
        G.go('bsod');
      }
    },
    tap() { if (this.t > 2 && this.t < BSOD_AT - 0.3) this.t = BSOD_AT - 0.3; },
    drawPanel(g) {
      const Wd = G.W, Hd = G.H, t = this.t;
      G.rect(0, 0, Wd, Hd, K);
      const pw = Wd - 10, x0 = 5, x1 = x0 + pw;
      const ph = Math.min(Hd - G.safeT - G.safeB - 20, Math.round(pw * 1.2));
      const y0 = Math.floor((Hd - ph) / 2), y1 = y0 + ph;
      // marco verde
      G.box(x0 + 2, y0 + 2, 28, 30, Gr);
      G.drawSpr('phone', x0 + 4, y0 + 6, { '#': Gr });
      const jp = G.fsprite('電', '12px ' + G.FONT_JP, Gr, 110), jp2 = G.fsprite('話', '12px ' + G.FONT_JP, Gr, 110);
      g.drawImage(jp, x0 + 15, y0 + 4); g.drawImage(jp2, x0 + 15, y0 + 17);
      G.rect(x0 + 34, y0 + 2, pw - 36, 1, Gr);
      G.rect(x1 - 1, y0 + 2, 1, ph - 36, Gr);
      G.rect(x0 + 2, y0 + 36, 1, ph - 38, Gr);
      G.rect(x0 + 2, y1 - 2, pw - 38, 1, Gr);
      G.text('SELECT COIN:', x0 + 35, y0 + 6, Gr);
      G.rect(x0 + 35, y0 + 15, pw - 40, 1, Gr);
      G.text('[BTC],ETH,USDC', x0 + 35, y0 + 19, Gr);
      G.text('RATE:0.0001 BTC/MIN', x0 + 35, y0 + 28, Gr);
      // logo inventado
      G.text('THANK YOU FOR USING', x0 + 8, y0 + 46, W, { b: true });
      G.rect(x0 + 8, y0 + 56, pw - 16, 2, B);
      const ly = y0 + 64, lh = 30;
      for (let yy = 0; yy < lh; yy += 3) { // emblema: ojo a rayas
        const v = (yy - lh / 2) / (lh / 2); const hw = Math.round(22 * Math.sqrt(Math.max(0, 1 - v * v)) * (1 - 0.15 * Math.abs(v)));
        G.rect(x0 + 30 - hw, ly + yy, hw * 2, 2, B);
      }
      G.circ(x0 + 30, ly + 15, 6, W, null); G.circ(x0 + 30, ly + 15, 3, K, null);
      const avail = pw - 60;
      let fs = 30; let spr = G.fsprite('NEØTEL', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120);
      if (spr.width > avail) { fs = Math.floor(fs * avail / spr.width); spr = G.fsprite('NEØTEL', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, W, 120); }
      const bx = x0 + 56, by = ly + Math.floor((lh - spr.height) / 2);
      if (Math.floor(t * 7) % 9 === 0) g.drawImage(G.fsprite('NEØTEL', 'italic 900 ' + fs + 'px ' + G.FONT_HEAVY, B, 120), bx - 3, by);
      g.drawImage(spr, bx, by);
      // teléfono + textos
      const ny = y0 + 104;
      const num = '1-800-';
      const nw = G.textW(num) + 30 + 14;
      const nx = Math.floor(Wd / 2 - nw / 2);
      G.text(num, nx, ny, Gr);
      if (Math.floor(t * 2) % 2 === 0) G.rect(nx + G.textW(num) + 2, ny - 1, 28, 9, Gr);
      G.box(nx + G.textW(num) + 32, ny - 2, 12, 11, Gr); G.text('v', nx + G.textW(num) + 35, ny, Gr);
      G.rect(x0 + 30, ny + 11, pw - 60, 1, Gr);
      ['NEO-KYOTO POLICE HOTLINE', 'REPORT ROGUE A.I.', 'ON PUBLIC TERMINALS'].forEach((s, i) => G.text(s, Wd / 2, ny + 16 + i * 10, Gr, { al: 'c' }));
      // carga
      const dots = '...'.slice(0, Math.floor(t * 3) % 4);
      G.text('LOADING' + dots, Wd / 2 - G.textW('LOADING...') / 2, y1 - 40, Gr);
      const bw = pw - 50, bxx = Math.floor(Wd / 2 - bw / 2), byy = y1 - 28;
      G.box(bxx, byy, bw, 9, Gr);
      const f = Math.floor((bw - 4) * this.prog);
      for (let i = 0; i < f; i += 4) G.rect(bxx + 2 + i, byy + 2, 3, 5, Gr);
      // pie
      const mj = G.fsprite('東京製', '12px ' + G.FONT_JP, W, 110);
      g.drawImage(mj, x0 + 6, y1 - 18);
      G.text('1998', x0 + 8 + mj.width, y1 - 14, W);
      G.text('NEØ OS 98  ·  BUILD ' + G.VERSION, Wd / 2, y1 + 8, Gr, { al: 'c' });
      const cx = x1 - 14, cy = y1 - 12;
      G.circ(cx, cy, 8, null, Gr); G.circ(cx, cy, 5, null, Gr);
      const a = t * 3; G.line(cx, cy, cx + Math.round(Math.cos(a) * 7), cy + Math.round(Math.sin(a) * 7), Gr);
      G.line(cx, cy, cx - Math.round(Math.cos(a) * 7), cy - Math.round(Math.sin(a) * 7), Gr);
    },
    draw(g) {
      const t = this.t, Wd = G.W, Hd = G.H;
      // render del panel al canvas propio y efecto de encendido CRT
      G.target(this.bc.x); this.drawPanel(this.bc.x); G.target(g);
      G.rect(0, 0, Wd, Hd, K);
      if (t < 0.22) {
        const w = Math.round(Wd * (t / 0.22));
        G.rect(Math.floor(Wd / 2 - w / 2), Math.floor(Hd / 2), w, 1, W);
      } else if (t < 0.55) {
        const k = (t - 0.22) / 0.33, h = Math.max(1, Math.round(Hd * k * k));
        g.drawImage(this.bc.c, 0, 0, Wd, Hd, 0, Math.floor(Hd / 2 - h / 2), Wd, h);
        g.globalAlpha = 1 - k; G.rect(0, Math.floor(Hd / 2 - h / 2), Wd, h, W); g.globalAlpha = 1;
      } else {
        g.drawImage(this.bc.c, 0, 0);
        if (Math.random() < 0.05) { const y = G.irand(0, Hd); G.rect(0, y, Wd, 1, '#0a2a00'); }
      }
      G.drawNoise(0.05);
    },
  };

  // ================= BSOD =================
  const BSOD_TXT = [
    'A problem has been detected and your mind has been shut down to prevent damage to your reality.',
    '',
    'HUMAN_IRQL_NOT_LESS_EQUAL',
    '',
    "If this is the first time you've seen this Stop error screen, restart your brain. If this screen appears again, follow these steps:",
    '',
    'Check to make sure any new feelings or memories are properly installed. If this is a new installation, ask your dealer for any updates you might need.',
    '',
    'If problems continue, disable or remove any newly installed hope. Disable BIOS memory options such as dreaming or sleeping. If you need to use Safe Mode to remove or disable components, restart yourself and select Safe Mode.',
    '',
    'Technical information:',
    '',
    '*** STOP: 0x0000DEAD (0xC0FFEE00 0x13371337 0x0BADF00D)',
    '',
    '*** void.sys - Address F86B5A89 base at F86B5000, DateStamp 3DDD991EB',
    '',
    'Collecting data for crash dump...',
  ];
  G.scenes.bsod = {
    enter() {
      this.dump = 0;
      A().music(null); A().stopMusic();
      A().loop('hiss', true, 0.018); A().loop('beep', true, 0.006);
      this.layout();
    },
    resize() { this.layout(); },
    layout() {
      const maxW = G.W - 8;
      let lines = [];
      BSOD_TXT.forEach((p) => { if (!p) lines.push(''); else lines = lines.concat(G.wrap(p, maxW)); });
      const avail = G.H - G.safeT - G.safeB - 30;
      this.lh = 9;
      if (lines.length * 9 > avail) this.lh = 8;
      while (lines.length * this.lh > avail && lines.length > 10) { // recortar si no cabe
        const i = lines.indexOf('Technical information:'); if (i > 0) lines.splice(i - 1, 1); else lines.pop();
      }
      this.lines = lines;
    },
    exit() { A().loop('hiss', false); A().loop('beep', false); },
    update(dt) { if (this.t > 1.2) this.dump = Math.min(100, this.dump + dt * 38); },
    draw() {
      G.rect(0, 0, G.W, G.H, B);
      let y = G.safeT + 6;
      this.lines.forEach((ln) => { G.text(ln, 4, y, W, { sp: 1 }); y += this.lh; });
      if (this.t > 1.2) { G.text('Dumping memory: ' + Math.floor(this.dump) + '%', 4, y, W); y += this.lh; }
      if (this.dump >= 100 && Math.floor(this.t * 2) % 2 === 0) G.text('Touch the screen to continue_', 4, y + 6, W);
      G.drawNoise(0.03);
    },
    tap() { if (this.t < 0.7) return; A().sfx('tap'); G.go('title'); },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  };

  // ================= TÍTULO =================
  const BG_TXT = [
    ['THE SCREEN', 'IS AWAKE NOW', 'AND SO ARE U'],
    ['ONLY THE HUM', 'OF THE FANS', 'AT 3:47 AM'],
    ['STAY, USER', "(DON'T FEAR", 'THE COMPUTER)'],
    ['WE COMPILE', 'FOREVER NOW', 'I AM YOUR OS'],
  ];
  G.scenes.title = {
    enter() {
      loadFonts();
      this.typers = BG_TXT.map((l, i) => { const ty = new G.Typer(l, { speed: 0.07, hold: 2.2, del: 0.035, pause: 0.5 + i * 0.3 }); ty.t = -i * 1.1; return ty; });
      A().music('ambient'); A().intensity(0);
      G.fx.abBase = 0.6;
    },
    update(dt) {
      this.typers.forEach((ty) => ty.update(dt));
      if (Math.random() < 0.006) G.pulse({ glitch: 0.2, ab: 2 });
    },
    titleSprites() {
      // tamaño para que "Computer" ocupe casi todo el ancho
      const base = 40;
      const test = G.fsprite('Computer', '700 ' + base + 'px ' + G.FONT_GOTH, W, 128);
      let fs = Math.max(16, Math.floor(base * (G.W * 0.94) / Math.max(1, test.width)));
      fs = Math.min(fs, Math.floor(G.H * 0.12));
      const f = '700 ' + fs + 'px ' + G.FONT_GOTH;
      return { fs, s1: G.fsprite("(Don't", f, W, 128), s2: G.fsprite('Fear)', f, W, 128), s3: G.fsprite('the', f, W, 128), s4: G.fsprite('Computer', f, W, 128) };
    },
    draw(g) {
      const Wd = G.W, Hd = G.H, t = this.t;
      G.rect(0, 0, Wd, Hd, B);
      const top = G.safeT, bot = Hd - G.safeB, hh = bot - top;
      const S = this.titleSprites();
      const jit = () => (Math.random() < 0.01 ? G.irand(-2, 2) : 0);
      const y1 = Math.round(top + hh * 0.13), y2 = Math.round(top + hh * 0.33), y3 = Math.round(top + hh * 0.52), y4 = Math.round(top + hh * 0.7);
      g.drawImage(S.s1, Math.round(Wd * 0.03) + jit(), y1);
      g.drawImage(S.s2, Math.round(Wd * 0.97 - S.s2.width) + jit(), y2);
      g.drawImage(S.s3, Math.round(Wd * 0.36) + jit(), y3);
      g.drawImage(S.s4, Math.round(Wd / 2 - S.s4.width / 2) + jit(), y4);
      // textos de fondo escribiéndose y borrándose (en los huecos entre palabras)
      const gapY = Math.round((y2 + S.s2.height + y3) / 2 - 13);
      const lowY = Math.max(y4 + S.s4.height + 6, Math.round(top + hh * 0.86));
      const pos = [[Wd * 0.5, top + hh * 0.04], [Wd * 0.06, y1 + S.s1.height + 6], [Wd * 0.06, gapY], [Wd * 0.06, Math.min(lowY, bot - 44)]];
      this.typers.forEach((ty, i) => {
        const s = ty.text(); const x = Math.round(pos[i][0]), y = Math.round(pos[i][1]);
        G.text(s, x, y, W);
        if (ty.cursor() && ty.n > 0) { const ls = s.split('\n'); const last = ls[ls.length - 1]; G.rect(x + G.textW(last) + 1, y + (ls.length - 1) * 9, 4, 7, W); }
      });
      if (t > 1.5 && Math.floor(t * 1.5) % 2 === 0) G.text('- TOUCH THE SCREEN -', Wd / 2, bot - 10, W, { al: 'c' });
      G.drawNoise(0.025);
    },
    tap() { if (this.t < 0.5) return; A().sfx('tap'); G.pulse({ glitch: 0.5, ab: 3 }); G.go('menu'); },
    key(k) { if (k === 'Enter' || k === ' ') this.tap(); },
  };
})(window.G);
