/* ============================================================
   art.js - Butun piksel grafikleri KODLA cizilir (dis resim dosyasi yok).
   Her sprite kucuk bir canvas'a piksel piksel boyanir, Phaser'a doku
   olarak eklenir. Oyun 480x272 cozunurlukte cizilip ekrana buyutuldugu
   icin kalin, net "retro piksel" gorunumu otomatik olusur.

   Renk paleti referans gorselden alindi: koyu mor-lacivert uzay,
   seftali renkli ay, mavi-gri metal paneller, sari-siyah tehlike seritleri,
   turuncu astronot kedi.
   ============================================================ */

const ART = (() => {
  const W = 480, H = 272;

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

  /* Doku olustur (varsa tekrar olusturma) */
  function mk(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    const c = t.getContext();
    c.imageSmoothingEnabled = false;
    draw(c, w, h);
    t.refresh();
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------------- ASTRONOT KEDI (16x17 piksel) ---------------- */
  const CAT_COL = {
    H: '#8fd3ff', h: '#e6f7ff', q: '#27407a',          // kask
    O: '#ff9a2e', o: '#d9701a', E: '#16142a', N: '#ff6f91', // kedi
    W: '#e8eefc', B: '#3f7fe0', b: '#2a56a8',          // tulum
    Y: '#f2c14e', R: '#e0405a', G: '#8a90a8'           // rozet, bot
  };
  const CAT_TOP = [
    '....HHHHHHHH....',
    '...HqOqqqqOqH...',
    '..HqOOqqqqOOqH..',
    '..HqOOOOOOOOqH..',
    '..HqOoOOOOoOqH..',
    '..HqOEOOOOEOqH..',
    '..HqOEOOOOEOqH..',
    '..HqOOONNOOOqH..',
    '...HqOOOOOOqH...',
    '....HWWWWWWH....',
    '...bBBYBBRBBb...',
    '...bBBBBBBBBb...',
    '....BBBBBBBB....'
  ];
  const CAT_LEGS = {
    stand: ['....bBB..BBb....', '....bBB..BBb....', '...GGGG..GGGG...'],
    walkA: ['....bBB..BBb....', '...bBB....BBb...', '..GGGG....GGGG..'],
    walkB: ['....bBB..BBb....', '....bBB...bBB...', '...GGGG....GGGG.'],
    jump:  ['....bBB..BBb....', '....bBBBBBBb....', '....GGG..GGG....']
  };
  const TAIL_A = [[3, 12, 'O'], [2, 12, 'O'], [1, 11, 'O'], [1, 10, 'O'], [1, 9, 'o'], [2, 8, 'O']];
  const TAIL_B = [[3, 12, 'O'], [2, 12, 'O'], [1, 12, 'O'], [0, 11, 'O'], [0, 10, 'o'], [1, 9, 'O']];
  const TAIL_UP = [[3, 12, 'O'], [2, 11, 'O'], [2, 10, 'O'], [2, 9, 'o'], [2, 8, 'O'], [2, 7, 'O']];

  function drawCat(c, legs, tail, yoff, hurt) {
    tail.forEach(([x, y, k]) => px(c, x, y + yoff, 1, 1, CAT_COL[k]));
    CAT_TOP.concat(CAT_LEGS[legs]).forEach((row, ry) => {
      for (let rx = 0; rx < 16; rx++) {
        const ch = row[rx];
        if (ch !== '.') px(c, rx, ry + yoff, 1, 1, CAT_COL[ch]);
      }
    });
    // kask parlamasi
    px(c, 3, 1 + yoff, 1, 1, CAT_COL.h);
    px(c, 2, 3 + yoff, 1, 1, CAT_COL.h);
    px(c, 2, 4 + yoff, 1, 1, CAT_COL.h);
    if (hurt) {
      // aci cekince: kapali gozler + acik agiz
      [[5, 5], [5, 6], [10, 5], [10, 6]].forEach(([x, y]) => px(c, x, y + yoff, 1, 1, CAT_COL.O));
      [[4, 6], [5, 6], [10, 6], [11, 6]].forEach(([x, y]) => px(c, x, y + yoff, 1, 1, CAT_COL.E));
      px(c, 7, 7 + yoff, 2, 1, CAT_COL.E);
    }
  }

  function buildCat(scene) {
    const frames = {
      cat_idle0: ['stand', TAIL_A, 1], cat_idle1: ['stand', TAIL_B, 0],
      cat_walk0: ['walkA', TAIL_A, 1], cat_walk1: ['stand', TAIL_B, 0],
      cat_walk2: ['walkB', TAIL_A, 1], cat_walk3: ['stand', TAIL_B, 0],
      cat_jump:  ['jump', TAIL_UP, 0]
    };
    Object.keys(frames).forEach(k => {
      const [legs, tail, yoff] = frames[k];
      mk(scene, k, 16, 17, c => drawCat(c, legs, tail, yoff, false));
    });
    mk(scene, 'cat_hurt', 16, 17, c => drawCat(c, 'stand', TAIL_B, 1, true));
  }

  /* ---------------- KARGO KUTULARI (16x16) ---------------- */
  function cornersCut(c) {
    [[0, 0], [15, 0], [0, 15], [15, 15]].forEach(([x, y]) => c.clearRect(x, y, 1, 1));
  }
  function buildBoxes(scene) {
    mk(scene, 'box_blue', 16, 16, c => {
      px(c, 0, 0, 16, 16, '#12214d');
      px(c, 1, 1, 14, 14, '#3b6fd4');
      px(c, 1, 1, 14, 2, '#6aa0f0');
      px(c, 1, 1, 2, 14, '#5b8fe6');
      px(c, 1, 13, 14, 2, '#2f58ab');
      px(c, 6, 1, 4, 3, '#a8c8ff');
      px(c, 4, 8, 2, 4, '#cfe3ff'); px(c, 7, 6, 2, 6, '#cfe3ff'); px(c, 10, 9, 2, 3, '#cfe3ff');
      cornersCut(c);
    });
    mk(scene, 'box_brown', 16, 16, c => {
      px(c, 0, 0, 16, 16, '#4a2c16');
      px(c, 1, 1, 14, 14, '#a0673a');
      px(c, 1, 1, 14, 2, '#c98e57');
      px(c, 1, 1, 2, 14, '#b87a46');
      px(c, 1, 13, 14, 2, '#7d4d29');
      px(c, 7, 1, 2, 14, '#d9b27c');
      px(c, 9, 8, 4, 4, '#efe3c8');
      px(c, 10, 9, 1, 1, '#7d4d29'); px(c, 12, 9, 1, 1, '#7d4d29'); px(c, 10, 11, 2, 1, '#7d4d29');
      cornersCut(c);
    });
  }

  /* ---------------- TEHLIKELER ---------------- */
  function buildHazards(scene) {
    mk(scene, 'spikes', 16, 16, c => {
      px(c, 0, 12, 16, 4, '#3c4268');
      px(c, 0, 12, 16, 1, '#5a6290');
      px(c, 2, 14, 2, 1, '#262a45'); px(c, 12, 14, 2, 1, '#262a45');
      const wid = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4];
      [0, 6, 12].forEach(x0 => {
        wid.forEach((w, r) => {
          const xs = x0 + Math.floor((4 - w) / 2);
          for (let i = 0; i < w; i++) px(c, xs + i, r, 1, 1, i < w / 2 ? '#d5dbf0' : '#8a92b2');
        });
      });
    });
    mk(scene, 'mine', 16, 16, c => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d <= 4.7) px(c, x, y, 1, 1, d > 3.6 ? '#3a4066' : '#5b6485');
      }
      px(c, 5, 5, 2, 2, '#9aa3c8');
      px(c, 7, 7, 2, 2, '#ff3b5c');
      [[7, 0], [7, 14], [0, 7], [14, 7]].forEach(([x, y]) => px(c, x, y, 2, 2, '#c5cbe0'));
      [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => px(c, x, y, 2, 2, '#c5cbe0'));
      [[7, 2], [7, 12], [2, 7], [12, 7]].forEach(([x, y]) => px(c, x, y, 2, 2, '#8a92b2'));
    });
    // lazer yayicilari (acik / kapali)
    [['on', '#ff3b5c'], ['off', '#5a2030']].forEach(([n, col]) => {
      mk(scene, 'emit_' + n, 16, 5, c => {
        px(c, 0, 0, 16, 3, '#2a2e48'); px(c, 2, 3, 12, 2, '#454c75'); px(c, 6, 3, 4, 2, col);
        px(c, 0, 0, 16, 1, '#4e5683');
      });
      mk(scene, 'plate_' + n, 16, 3, c => {
        px(c, 0, 0, 16, 3, '#2a2e48'); px(c, 6, 0, 4, 2, col); px(c, 0, 2, 16, 1, '#171a2e');
      });
    });
  }

  /* ---------------- KAPI, KONTROL NOKTASI, EFEKTLER ---------------- */
  function buildProps(scene) {
    mk(scene, 'door_closed', 16, 32, c => {
      px(c, 0, 0, 16, 32, '#20233a');
      px(c, 1, 1, 14, 30, '#3a4066');
      px(c, 3, 3, 10, 26, '#2b304e');
      px(c, 7, 3, 2, 26, '#1a1d33');
      px(c, 3, 5, 2, 2, '#ff3b5c'); px(c, 11, 5, 2, 2, '#ff3b5c');
      for (let i = 0; i < 10; i++) px(c, 3 + i, 24 + (i % 2), 1, 3 - (i % 2), (i >> 1) % 2 ? '#f2c14e' : '#1a1c2c');
    });
    mk(scene, 'door_open', 16, 32, c => {
      px(c, 0, 0, 16, 32, '#20233a');
      px(c, 1, 1, 14, 30, '#3a4066');
      px(c, 3, 3, 10, 26, '#070a16');
      px(c, 5, 6, 6, 22, '#0f1a3a');
      px(c, 6, 10, 4, 14, '#1c3270');
      px(c, 7, 8, 1, 1, '#ffffff'); px(c, 10, 14, 1, 1, '#f2c14e'); px(c, 6, 20, 1, 1, '#d94fd0');
      px(c, 3, 5, 2, 2, '#2bd96b'); px(c, 11, 5, 2, 2, '#2bd96b');
    });
    [['off', '#5a2030'], ['on', '#2bd96b']].forEach(([n, col]) => {
      mk(scene, 'cp_' + n, 8, 16, c => {
        px(c, 3, 4, 2, 12, '#8a90a8');
        px(c, 1, 14, 6, 2, '#4a5170');
        px(c, 2, 0, 4, 4, col);
        px(c, 2, 0, 1, 1, '#ffffff');
      });
    });
    mk(scene, 'spark', 3, 3, c => { px(c, 1, 0, 1, 3, '#fff'); px(c, 0, 1, 3, 1, '#fff'); });
    mk(scene, 'bubble', 2, 2, c => px(c, 0, 0, 2, 2, '#bfe6ff'));
  }

  /* ---------------- PLATFORM / ZEMIN ---------------- */
  function stripeBand(c, x, y, w, h) {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
      px(c, x + xx, y + yy, 1, 1, ((x + xx + yy) >> 2) & 1 ? '#f2c14e' : '#1a1c2c');
    }
  }
  function metalTile(c, x, y, seed) {
    px(c, x, y, 16, 16, '#3f4670');
    px(c, x, y, 16, 1, '#5a6393'); px(c, x, y, 1, 16, '#4b5382');
    px(c, x + 15, y, 1, 16, '#2a2f4c'); px(c, x, y + 15, 16, 1, '#2a2f4c');
    [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => px(c, x + a, y + b, 2, 2, '#2a2f4c'));
    if (seed % 3 === 0) { px(c, x + 4, y + 6, 8, 1, '#2a2f4c'); px(c, x + 4, y + 8, 8, 1, '#2a2f4c'); px(c, x + 4, y + 10, 8, 1, '#2a2f4c'); }
  }
  /* Genisligi w, yuksekligi h karo olan blok dokusu. piston=true ise
     (lazer kapisinin ust kolonu) seritli kenar altta olur. */
  function solidTexture(scene, key, w, h, piston) {
    mk(scene, key, w * 16, h * 16, c => {
      for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) metalTile(c, tx * 16, ty * 16, tx + ty);
      if (piston) {
        stripeBand(c, 0, h * 16 - 5, w * 16, 5);
        px(c, 0, h * 16 - 6, w * 16, 1, '#0f1020');
      } else {
        stripeBand(c, 0, 0, w * 16, 5);
        px(c, 0, 5, w * 16, 1, '#0f1020');
      }
    });
  }

  /* ---------------- ARKA PLAN ---------------- */
  function buildBackdrop(scene) {
    // Uzay: bantli mor gradyan + yildizlar + dev ay
    mk(scene, 'space', W, H, c => {
      const bands = ['#0b0818', '#100b24', '#150e2d', '#1a1236', '#20173e', '#271c46'];
      const bh = H / bands.length;
      bands.forEach((col, i) => px(c, 0, Math.floor(i * bh), W, Math.ceil(bh) + 1, col));
      for (let i = 1; i < bands.length; i++) {
        const y = Math.floor(i * bh);
        for (let x = 0; x < W; x += 2) { px(c, x, y - 1, 1, 1, bands[i]); px(c, x + 1, y, 1, 1, bands[i - 1]); }
      }
      const r = mulberry32(7);
      const cols = ['#ffffff', '#cfd8ff', '#f2c14e', '#d94fd0'];
      for (let i = 0; i < 170; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H), col = cols[Math.floor(r() * cols.length)];
        px(c, x, y, 1, 1, col);
        if (r() < 0.08) { px(c, x - 1, y, 3, 1, col); px(c, x, y - 1, 1, 3, col); }
      }
      // dev ay
      const cx = 330, cy = 86, R = 64;
      for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
        const d = Math.hypot(x, y);
        if (d > R) continue;
        let col = d > R - 3 ? '#e8c3a4' : '#d9a98a';
        const shade = x / R + (y / R) * 0.3;
        if (shade > 0.62 || (shade > 0.35 && ((x + y) & 1) === 0)) col = '#b9856a';
        px(c, cx + x, cy + y, 1, 1, col);
      }
      [[-22, -16, 12], [12, 10, 9], [-6, 32, 7], [30, -26, 6], [-38, 14, 6], [14, -40, 5]].forEach(([dx, dy, rr]) => {
        for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
          const d = Math.hypot(x, y);
          if (d > rr) continue;
          px(c, cx + dx + x, cy + dy + y, 1, 1, d > rr - 1.5 && (x + y) < 0 ? '#e0b79b' : '#c4917a');
        }
      });
    });

    // Duvar: metal paneller + uzaya bakan pencere (pencere ici saydam)
    mk(scene, 'wall', 128, 272, c => {
      px(c, 0, 0, 128, 272, '#2d3250');
      for (let py = 0; py < 272; py += 68) for (let pxx = 0; pxx < 128; pxx += 64) {
        px(c, pxx, py, 64, 1, '#3b4268'); px(c, pxx, py, 1, 68, '#3b4268');
        px(c, pxx + 63, py, 1, 68, '#212540'); px(c, pxx, py + 67, 64, 1, '#212540');
        [[3, 3], [59, 3], [3, 63], [59, 63]].forEach(([a, b]) => px(c, pxx + a, py + b, 2, 2, '#4e5683'));
      }
      px(c, 0, 200, 128, 72, 'rgba(0,0,0,0.18)');
      // boru
      px(c, 0, 118, 128, 10, '#3a4066'); px(c, 0, 118, 128, 2, '#58628e'); px(c, 0, 126, 128, 2, '#1c2038');
      [[30, 116], [94, 116]].forEach(([a, b]) => px(c, a, b, 4, 14, '#1c2038'));
      // pencere
      px(c, 28, 30, 72, 52, '#161a2e');
      px(c, 30, 32, 68, 48, '#4e5683');
      px(c, 32, 34, 64, 44, '#161a2e');
      c.clearRect(34, 36, 60, 40);
      px(c, 63, 36, 2, 40, '#20243d');
    });

    // Kenarlari karartan vinyet
    mk(scene, 'vignette', W, H, c => {
      const g = c.createRadialGradient(W / 2, H / 2, 110, W / 2, H / 2, 310);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    });
  }

  /* Sahneye arka plan katmanlarini ekler */
  function backdrop(scene) {
    scene.add.image(0, 0, 'space').setOrigin(0).setScrollFactor(0).setDepth(-30);
    const r = mulberry32(11);
    for (let i = 0; i < 20; i++) {
      const s = scene.add.image(Math.floor(r() * W), Math.floor(r() * H), 'spark')
        .setScrollFactor(0).setDepth(-25).setAlpha(0.15 + r() * 0.2).setTint(i % 3 === 0 ? 0xf2c14e : (i % 3 === 1 ? 0xd94fd0 : 0xffffff));
      scene.tweens.add({ targets: s, alpha: 1, duration: 600 + r() * 1400, yoyo: true, repeat: -1, delay: r() * 1500 });
    }
    const wall = scene.add.tileSprite(0, 0, W, H, 'wall').setOrigin(0).setScrollFactor(0).setDepth(-20);
    scene.add.image(0, 0, 'vignette').setOrigin(0).setScrollFactor(0).setDepth(90);
    return { wall };
  }

  function build(scene) {
    buildCat(scene);
    buildBoxes(scene);
    buildHazards(scene);
    buildProps(scene);
    buildBackdrop(scene);
  }

  return { build, backdrop, solidTexture, mk, px };
})();
