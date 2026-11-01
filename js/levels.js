'use strict';
// Configuración de los 13 sectores. Cada 3 niveles cambia modo, color y música.
(function (G) {
  G.MODE_NAMES = { micro: 'MICRO', purge: 'PURGE', overflow: 'OVERFLOW', glitch: 'GLITCH', chaos: 'CHAOS', serpent: 'SERPENT' };
  G.TIERS = ['α', 'β', 'γ', 'Ω+'];
  G.MUSIC_BY_BLOCK = ['midtempo', 'darksynth', 'industrial', 'chaos', 'serpent'];

  // types: pesos de cada tipo de ventana
  G.LEVELS = [null,
    { n: 1, name: 'CLOSE.ALL', mode: 'purge', block: 0, quota: 24, time: 60, keep: 3, maxOn: 9, spawn: [1.15, 0.75], types: { error: 6, warn: 2, big: 3, pics: 1 } },
    { n: 2, name: 'TRASH', mode: 'micro', game: 'trash', block: 0, rounds: 8 },
    { n: 3, name: 'LOAD.100', mode: 'micro', game: 'load', block: 0, rounds: 8 },
    { n: 4, name: 'DEFRAG', mode: 'micro', game: 'defrag', block: 1, rounds: 8 },
    { n: 5, name: 'VERIFY', mode: 'micro', game: 'verify', block: 1, rounds: 8 },
    { n: 6, name: 'INTRUDER', mode: 'micro', game: 'intruder', block: 1, rounds: 8 },
    { n: 7, name: 'SPOT.DIFF', mode: 'micro', game: 'spot', block: 2, rounds: 8 },
    { n: 8, name: 'CURSOR', mode: 'micro', game: 'cursor', block: 2, rounds: 8 },
    { n: 9, name: 'MINEFIELD', mode: 'micro', game: 'mines', block: 2, rounds: 8 },
    { n: 10, name: 'ECHO.EXE', mode: 'micro', game: 'echo', block: 3, rounds: 8 },
    { n: 11, name: 'NOTIFY', mode: 'micro', game: 'notify', block: 3, rounds: 8 },
    { n: 12, name: 'BSOD.RUN', mode: 'micro', game: 'dodge', block: 3, rounds: 8 },
    { n: 13, name: 'SERPENT', mode: 'serpent', block: 4, N: 45, time: 30 },
  ];

  // textos temáticos (cada sector = lo que dibuja su tarjeta)
  G.THEMES = {
    1: { titles: ['REFRESH', 'FEED.EXE', 'UPDATE'], msgs: ['PULL TO REFRESH', 'NEW CONTENT!', 'REFRESHING...', '0 NEW POSTS', 'STILL LOADING', 'SCROLL MORE'], bigs: ['WAIT', 'MORE', 'AGAIN', '更新'] },
    2: { titles: ['INBOX', 'NOTIFY', 'MSG.EXE'], msgs: ['999+ UNREAD', 'NEW MESSAGE', 'SEEN 03:12', 'TYPING...', 'REPLY NOW', '47 MENTIONS'], bigs: ['PING', 'READ', '!!!', '通知'] },
    3: { titles: ['DOPAMINE', 'BRAIN.SYS', 'HYPE.EXE'], msgs: ['+1 LIKE', 'OVERCLOCKING', 'BRAIN AT 98°C', 'MORE MORE MORE', 'REWARD READY'], bigs: ['HYPE', 'WOW', 'HIT', '興奮'] },
    4: { titles: ['HOME.SYS', 'COCOON', 'DELIVERY'], msgs: ['STAY INSIDE', 'ORDER ETA 4MIN', 'OUTSIDE: 404', 'DO NOT OPEN', 'DOOR LOCKED'], bigs: ['HOME', 'STAY', 'SAFE?', '部屋'] },
    5: { titles: ['SELF.LOCK', 'FEELINGS', 'MOOD.DLL'], msgs: ['NO SMILE', 'CLOSE YOURSELF', 'FEELINGS NOT FOUND', 'SOCIAL ERROR'], bigs: ['SAD', 'HIDE', 'NO', 'つづく'] },
    6: { titles: ['INSOMNIA', 'SLEEP.EXE', 'NIGHT'], msgs: ['03:47 AM', 'SLEEP.EXE NOT FOUND', 'ONE MORE VIDEO', 'EYES OPEN', 'WHY ARE U UP'], bigs: ['AWAKE', '03:47', '眠れない'] },
    7: { titles: ['TIME.EXE', 'CLOCK', 'LATE'], msgs: ['LOSING TIME', '24 HOURS REMAINING', 'WHERE DID IT GO', 'TICK TOCK', 'DEADLINE'], bigs: ['TICK', 'LATE', '時間'] },
    8: { titles: ['NO.SIGNAL', 'NET.SYS', 'PACKET'], msgs: ['NO SIGNAL', 'RECONNECTING...', 'PACKET LOST', 'PING 9999MS', 'LINK DOWN'], bigs: ['LOST', 'OFF', '切断'] },
    9: { titles: ['JUNK.EXE', 'LEISURE', 'ORDER'], msgs: ['ORDER NOW', 'FREE TIME 0:00', 'SCROLL MORE', 'ADD TO CART', 'EAT. SCROLL.'], bigs: ['YUM', 'MORE', '腐った'] },
    10: { titles: ['LOOP.EXE', 'AGAIN', 'REPEAT'], msgs: ['LOOP DETECTED', 'AGAIN AGAIN', 'CTRL+Z', 'REPEAT.EXE', 'SAME DAY'], bigs: ['LOOP', 'AGAIN', '∞', '循環'] },
    11: { titles: ['LINK.EXE', 'FRIEND', 'CALL'], msgs: ['ARE YOU THERE?', 'FRIEND REQUEST', 'SEEN', 'CALL ME BACK', 'TYPING...'], bigs: ['HELLO?', 'LINK', 'つながり'] },
    12: { titles: ['SLEEP.SYS', 'HALT', 'VIRUS'], msgs: ['SYSTEM HALT', 'GOODNIGHT USER', 'SHUT DOWN?', 'SLEEP MODE', 'MEMORY LEAK'], bigs: ['SLEEP', 'ZZZ', 'おやすみ'] },
  };
  G.GENERIC_MSGS = ['CLICK "OK" TO OK', 'ERROR 666', 'IDEAS MISSING', 'FILE NOT FOUND', 'ACCESS DENIED', 'UNKNOWN ERROR', 'TRY AGAIN', 'FATAL? MAYBE'];

  G.objectiveText = function (c) {
    if (c.mode === 'micro') { const m = G.MICRO[c.game]; return m.help.concat(['', 'WIN ' + c.rounds + ' ROUNDS  ' + String.fromCharCode(9829) + ' x4']); }
    if (c.mode === 'purge') return ['CLOSE ' + c.quota + ' WINDOWS', 'IN ' + c.time + ' SECONDS'];
    if (c.mode === 'overflow') return ['SURVIVE ' + c.time + ' SECONDS', "DON'T LET THEM FILL", 'THE SCREEN'];
    if (c.mode === 'glitch') return ['CLOSE ' + c.quota + ' WINDOWS', 'IN ' + c.time + ' SECONDS', 'HOURGLASS = TIME THIEF', 'DOTTED X = FAKE'];
    if (c.variant === 'loop') return ['SURVIVE ' + c.time + ' SECONDS', 'LOOP.EXE MULTIPLIES', "DON'T OVERLOAD"];
    if (c.variant === 'link') return ['CLOSE ' + c.quota + ' WINDOWS', 'IN ' + c.time + ' SECONDS', 'THEY ALWAYS ASK', '"ARE YOU SURE?"'];
    if (c.variant === 'boss') return ['DESTROY THE VIRUS', 'TAP THE SKULL', 'BEFORE ' + c.time + ' SECONDS'];
    return ['CLOSE THEM ALL'];
  };

  G.scaleConfig = function (L, tier) {
    const c = JSON.parse(JSON.stringify(L));
    const k = tier || 0;
    c.tier = k;
    if (c.quota) c.quota = Math.round(c.quota * (1 + 0.18 * k));
    if (c.spawn) c.spawn = [c.spawn[0] * (1 - 0.09 * k), c.spawn[1] * (1 - 0.09 * k)];
    if (c.mode === 'overflow' || c.variant === 'loop') c.time += 5 * k;
    if (c.move) c.move = Math.min(0.95, c.move + 0.08 * k);
    c.speed = 1 + 0.22 * k;
    if (c.rounds) c.rounds += k;
    if (c.thief) c.thief += 0.03 * k;
    if (c.fake) c.fake += 0.03 * k;
    if (c.hydra) c.hydra += 0.05 * k;
    if (c.bossHP) c.bossHP = Math.round(c.bossHP * (1 + 0.15 * k));
    if (c.cap && k >= 2 && c.variant !== 'boss') c.cap -= 1;
    if (c.keep && k >= 1) c.keep += 1;
    if (c.maxOn) c.maxOn += k;
    if (c.cap && c.maxOn) c.cap = Math.max(c.cap, c.maxOn + 3);
    return c;
  };
})(window.G);
