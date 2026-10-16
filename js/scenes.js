/* ============================================================
   scenes.js - Oyunun sahneleri
     BootScene  : grafikleri cizer, veritabanini baslatir
     MenuScene  : oyuncu adi girisi + liderlik tablosu (SQL'den)
     GameScene  : platform oyunu (kedi, kargo, lazer, dikenler, zero-g)
     EndScene   : sonuc ekrani, skoru SQL'e kaydeder, liderlik tablosu
   ============================================================ */

const W = 480, H = 272;
const FONT = '"Press Start 2P", "PS2P Local", monospace';

/* Oyun boyunca tasinan bilgiler */
const G = {
  name: 'PILOT', lives: 3, maxLives: 5, score: 0, cargo: 0, ms: 0, level: 0,
  reset() { this.lives = 3; this.score = 0; this.cargo = 0; this.ms = 0; this.level = 0; }
};

/* Yazi olusturma yardimcisi */
function txt(scene, x, y, s, size, color, origin) {
  const o = origin || [0, 0];
  const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: (size || 8) + 'px', color: color || '#f2c14e' }).setOrigin(o[0], o[1]);
  t.setShadow(1, 1, '#000000', 0, false, true);
  return t;
}
const pad = (n, l) => String(n).padStart(l, '0');
const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));

/* ============================================================
   BOOT
   ============================================================ */
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    ART.build(this);
    const A = (key, frames, rate, repeat) => this.anims.create({ key, frames: frames.map(f => ({ key: f })), frameRate: rate, repeat });
    A('idle', ['cat_idle0', 'cat_idle1'], 2.5, -1);
    A('walk', ['cat_walk0', 'cat_walk1', 'cat_walk2', 'cat_walk3'], 9, -1);
    A('jump', ['cat_jump'], 1, -1);
    A('hurt', ['cat_hurt'], 1, -1);
    txt(this, W / 2, H / 2, 'YUKLENIYOR...', 8, '#8fd3ff', [0.5, 0.5]);
    GameDB.init(LEVELS).then(() => this.scene.start('Menu'));
  }
}

/* ============================================================
   MENU
   ============================================================ */
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.started = false;
    this.bd = ART.backdrop(this);
    this.cameras.main.fadeIn(300);

    const title = txt(this, W / 2, 14, 'MEOW-G TERMINAL', 16, '#f2c14e', [0.5, 0]);
    this.tweens.add({ targets: title, y: 18, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, W / 2, 40, 'UZAY KARGO OPERASYONU', 8, '#8fd3ff', [0.5, 0]);

    // Kedi ve suzulen kutular
    const cat = this.add.sprite(96, 112, 'cat_idle0').setScale(4).play('idle');
    this.tweens.add({ targets: cat, y: 102, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    [[40, 78, 'box_blue', 0], [158, 96, 'box_brown', 400], [150, 142, 'box_blue', 800], [36, 146, 'box_brown', 1200]].forEach(([x, y, k, d]) => {
      const b = this.add.image(x, y, k).setScale(2);
      this.tweens.add({ targets: b, y: y - 8, angle: 12, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: d });
    });

    // Oyuncu adi
    txt(this, 24, 162, 'PILOT ADI:', 8, '#f2c14e');
    this.add.rectangle(24, 176, 168, 22, 0x0b0818).setOrigin(0).setStrokeStyle(2, 0x8fd3ff);
    this.name = '';
    try { this.name = (localStorage.getItem('zerog_name') || '').slice(0, 10); } catch (e) {}
    this.nameText = txt(this, 32, 183, '', 8, '#ffffff');
    this.go = txt(this, 24, 208, 'ENTER: BASLAT', 8, '#2bd96b');
    this.go.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.start());
    this.tweens.add({ targets: this.go, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

    // Liderlik tablosu (SQL sorgusu ile)
    this.add.rectangle(244, 62, 224, 140, 0x0b0818, 0.85).setOrigin(0).setStrokeStyle(2, 0x5a6393);
    txt(this, 256, 70, 'LIDERLIK TABLOSU', 8, '#8fd3ff');
    const rows = GameDB.topScores(5);
    if (!rows.length) {
      txt(this, 256, 106, 'HENUZ SKOR YOK', 8, '#ffffff');
      txt(this, 256, 124, 'ILK PILOT SEN OL!', 8, '#f2c14e');
    } else {
      rows.forEach((r, i) => {
        const col = i === 0 ? '#f2c14e' : '#ffffff';
        txt(this, 256, 92 + i * 20, (i + 1) + '.', 8, col);
        txt(this, 282, 92 + i * 20, r.Ad, 8, col);
        txt(this, 458, 92 + i * 20, pad(r.Skor, 5), 8, col, [1, 0]);
      });
    }
    txt(this, 256, 188, 'SQL: JOIN + GROUP BY', 8, '#7bd88f').setAlpha(0.8);

    txt(this, W / 2, 226, 'OKLAR / WASD: YURU   YUKARI / BOSLUK: ZIPLA', 8, '#c5cbe0', [0.5, 0]);
    txt(this, W / 2, 240, 'P: DURAKLAT    M: SES ACIK/KAPALI', 8, '#c5cbe0', [0.5, 0]);
    txt(this, W / 2, 256, GameDB.label, 8, GameDB.mode === 'SQLITE' ? '#7bd88f' : '#ff8a8a', [0.5, 0]);

    this.refresh();
    this.input.keyboard.on('keydown', ev => {
      SFX.start();
      const k = ev.key;
      if (k === 'Enter') { this.start(); return; }
      if (k === 'Backspace') this.name = this.name.slice(0, -1);
      else if (k.length === 1 && /[a-z0-9]/i.test(k) && this.name.length < 10) { this.name += k.toUpperCase(); SFX.play('tick'); }
      this.refresh();
    });
    this.input.once('pointerdown', () => SFX.start());
  }

  refresh() {
    const cursor = Math.floor(this.time.now / 400) % 2 ? '_' : ' ';
    this.nameText.setText((this.name || '') + cursor);
  }

  update() {
    this.bd.wall.tilePositionX += 0.25;
    this.refresh();
  }

  start() {
    if (this.started) return;
    this.started = true;
    G.reset();
    G.name = this.name || 'PILOT';
    try { localStorage.setItem('zerog_name', G.name); } catch (e) {}
    GameDB.resetRun();
    SFX.start(); SFX.play('start');
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { level: 0 }));
  }
}

/* ============================================================
   GAME
   ============================================================ */
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) { this.lvlIndex = (data && data.level) || 0; }

  create() {
    const L = this.L = LEVELS[this.lvlIndex];
    const worldW = L.cols * TILE;

    this.state = 'play';
    this.clock = 0; this.elapsed = 0;
    this.invuln = 0; this.stun = 0; this.coyote = 0; this.buffer = 0;
    this.jumpCut = false; this.inZone = false; this.wasGround = false;
    this.lastMsg = -99999; this.lastLaserSfx = -99999;
    this.collected = 0; this.total = L.cargo.length; this.doorOpen = false;
    this.respawn = { x: L.start[0] * TILE + 8, y: L.start[1] * TILE - 1 };
    this.zones = []; this.lasers = []; this.cpList = [];

    this.physics.world.setBounds(0, 0, worldW, H + 400);
    this.physics.world.checkCollision.down = false;   // asagi dusunce olum (kendimiz kontrol ediyoruz)
    this.cameras.main.setBounds(0, 0, worldW, H);
    this.cameras.main.fadeIn(300);
    this.bd = ART.backdrop(this);

    // Parcacik efektleri
    this.fxDust = this.add.particles(0, 0, 'spark', { lifespan: 380, speed: { min: 15, max: 45 }, scale: { start: 1, end: 0 }, gravityY: 40, tint: 0xaab4d8, emitting: false }).setDepth(40);
    this.fxSpark = this.add.particles(0, 0, 'spark', { lifespan: 520, speed: { min: 30, max: 90 }, scale: { start: 1.3, end: 0 }, gravityY: 60, tint: 0xf2c14e, emitting: false }).setDepth(40);
    this.fxHurt = this.add.particles(0, 0, 'spark', { lifespan: 500, speed: { min: 40, max: 120 }, scale: { start: 1.4, end: 0 }, gravityY: 120, tint: 0xff4466, emitting: false }).setDepth(40);

    this.buildPlayer();
    this.buildLevel();
    this.buildHud();
    this.buildInput();

    GameDB.setLogger(s => this.logText && this.logText.setText('SQL> ' + (s.length > 54 ? s.slice(0, 53) + '~' : s)));
    this.events.once('shutdown', () => GameDB.setLogger(null));

    // Bolum baslik karti
    const t1 = txt(this, W / 2, 62, 'SEKTOR ' + L.id, 16, '#f2c14e', [0.5, 0.5]).setScrollFactor(0).setDepth(110);
    const t2 = txt(this, W / 2, 86, L.name, 8, '#8fd3ff', [0.5, 0.5]).setScrollFactor(0).setDepth(110);
    this.tweens.add({ targets: [t1, t2], alpha: 0, delay: 1800, duration: 700, onComplete: () => { t1.destroy(); t2.destroy(); } });
  }

  /* ---------------- seviyeyi kur ---------------- */
  buildLevel() {
    const L = this.L;
    const p = this.player;

    // Katı bloklar
    this.solids = this.physics.add.staticGroup();
    const list = L.solids.map(s => s.concat(false));
    L.lasers.forEach(l => list.push([l[0] - 1, 0, 3, l[1], true]));   // lazer kapisinin ust kolonu
    list.forEach(([x, y, w, h, piston], i) => {
      const key = 'solid_' + L.id + '_' + i;
      ART.solidTexture(this, key, w, h, piston);
      this.solids.create(x * TILE, y * TILE, key).setOrigin(0, 0).refreshBody();
    });
    this.physics.add.collider(p, this.solids);

    // Zero-G alanlari
    L.zones.forEach(([x, y, w, h]) => {
      const rect = new Phaser.Geom.Rectangle(x * TILE, y * TILE, w * TILE, h * TILE);
      this.zones.push(rect);
      this.add.rectangle(rect.x, rect.y, rect.width, rect.height, 0x4aa8ff, 0.1).setOrigin(0).setDepth(-6);
      this.add.rectangle(rect.x, rect.y, rect.width, 2, 0x8fd3ff, 0.5).setOrigin(0).setDepth(-6);
      txt(this, rect.x + 4, rect.y + 5, 'ZERO-G', 8, '#8fd3ff').setAlpha(0.6).setDepth(-5);
      const n = Math.floor(w * h / 5);
      for (let i = 0; i < n; i++) {
        const bx = rect.x + Math.random() * rect.width, by = rect.y + Math.random() * rect.height;
        const b = this.add.image(bx, by, 'bubble').setAlpha(0.3 + Math.random() * 0.4).setDepth(-5);
        this.tweens.add({ targets: b, y: by - 30 - Math.random() * 40, alpha: 0, duration: 2500 + Math.random() * 3000, repeat: -1, delay: Math.random() * 3000 });
      }
    });

    // Dikenler
    L.spikes.forEach(([x, y, w]) => {
      for (let i = 0; i < w; i++) this.add.image((x + i) * TILE, y * TILE, 'spikes').setOrigin(0, 0).setDepth(5);
      const z = this.add.zone(x * TILE + w * 8, y * TILE + 8, w * TILE - 4, 10);
      this.physics.add.existing(z, true);
      this.hazard(z);
    });

    // Lazer kapilari
    L.lasers.forEach(([x, y1, period, offset]) => {
      const top = y1 * TILE + 5, bottom = 15 * TILE - 3;
      const cx = x * TILE + 8;
      const glow = this.add.rectangle(cx, (top + bottom) / 2, 8, bottom - top, 0xff2d55, 0.35).setDepth(6);
      const beam = this.add.rectangle(cx, (top + bottom) / 2, 4, bottom - top, 0xffd0d8).setDepth(7);
      this.physics.add.existing(beam, true);
      const topEm = this.add.image(x * TILE, y1 * TILE, 'emit_off').setOrigin(0, 0).setDepth(8);
      const botEm = this.add.image(x * TILE, 15 * TILE - 3, 'plate_off').setOrigin(0, 0).setDepth(8);
      beam.setData('on', false);
      this.physics.add.overlap(p, beam, () => this.hurt(), () => beam.getData('on'));
      this.lasers.push({ x, beam, glow, topEm, botEm, period, offset, on: false, warn: false });
      glow.setVisible(false); beam.setVisible(false);
    });

    // Mayinlar
    this.mines = this.physics.add.group({ allowGravity: false, immovable: true });
    L.mines.forEach(([x, y, amp, period]) => {
      const m = this.mines.create(x * TILE + 8, y * TILE + 8, 'mine').setDepth(9);
      m.body.setCircle(5, 3, 3);
      this.tweens.add({ targets: m, y: m.y + amp, duration: period / 2, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: m, angle: 360, duration: 3000, repeat: -1 });
    });
    this.physics.add.overlap(p, this.mines, () => this.hurt());

    // Kontrol noktalari
    L.checkpoints.forEach(([x, y]) => {
      const img = this.add.image(x * TILE + 4, y * TILE - 16, 'cp_off').setOrigin(0, 0).setDepth(4);
      const z = this.add.zone(x * TILE + 8, y * TILE - 10, 16, 20);
      this.physics.add.existing(z, true);
      const cp = { img, active: false, x: x * TILE + 8, y: y * TILE - 1 };
      this.cpList.push(cp);
      this.physics.add.overlap(p, z, () => {
        if (cp.active) return;
        this.cpList.forEach(o => { if (o.active) { o.active = false; o.img.setTexture('cp_off'); } });
        cp.active = true; img.setTexture('cp_on');
        this.respawn = { x: cp.x, y: cp.y };
        SFX.play('checkpoint');
        this.popText(cp.x, cp.y - 30, 'KAYIT!', '#2bd96b');
      });
    });

    // Kargolar
    this.cargoGroup = this.physics.add.group({ allowGravity: false, immovable: true });
    L.cargo.forEach(d => {
      const c = this.cargoGroup.create(d.x * TILE + 8, d.y * TILE + 8, d.tur === 'k' ? 'box_brown' : 'box_blue').setDepth(10);
      c.body.setSize(12, 12);
      c.setData('d', d);
      this.tweens.add({ targets: c, y: c.y - 3, duration: 900 + (d.id % 5) * 130, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: (d.id % 7) * 90 });
    });
    this.physics.add.overlap(p, this.cargoGroup, (pl, c) => this.collectCargo(c));

    // Cikis kapisi
    const ex = L.exit[0] * TILE, ey = L.exit[1] * TILE;
    this.door = this.add.image(ex, ey, 'door_closed').setOrigin(0, 0).setDepth(4);
    this.exitText = txt(this, ex + 8, ey - 10, 'CIKIS', 8, '#2bd96b', [0.5, 0.5]).setDepth(4).setVisible(false);
    const dz = this.add.zone(ex + 8, ey + 16, 12, 30);
    this.physics.add.existing(dz, true);
    this.physics.add.overlap(p, dz, () => this.touchDoor());

    // Ipucu yazilari
    (L.hints || []).forEach(([x, y, s]) => txt(this, x * TILE, y * TILE, s, 8, '#ffffff', [0.5, 0.5]).setAlpha(0.8).setDepth(-3));
  }

  hazard(zone) { this.physics.add.overlap(this.player, zone, () => this.hurt()); }

  /* ---------------- oyuncu ---------------- */
  buildPlayer() {
    const p = this.player = this.physics.add.sprite(this.respawn.x, this.respawn.y, 'cat_idle0');
    p.setOrigin(0.5, 1).setDepth(20);
    p.body.setSize(8, 12).setOffset(4, 5);       // kedinin carpisma kutusu: dar ve ayaklarda
    p.setCollideWorldBounds(true);
    p.body.setMaxVelocity(300, 520);
    p.anims.play('idle');
    this.cameras.main.startFollow(p, true, 0.1, 0.1);
  }

  /* ---------------- HUD ---------------- */
  buildHud() {
    const d = 100;
    const lbl = (x, y, s) => txt(this, x, y, s, 8, '#f2c14e').setScrollFactor(0).setDepth(d);
    const val = (x, y, s) => txt(this, x, y, s, 8, '#ffffff').setScrollFactor(0).setDepth(d);
    lbl(8, 6, 'LIVES:'); lbl(8, 18, 'SCORE:'); lbl(8, 30, 'CARGO:');
    this.hLives = val(64, 6, ''); this.hScore = val(64, 18, ''); this.hCargo = val(64, 30, '');
    this.hLevel = txt(this, W - 8, 6, 'SEKTOR ' + this.L.id + '/' + LEVELS.length, 8, '#8fd3ff', [1, 0]).setScrollFactor(0).setDepth(d);
    this.hTime = txt(this, W - 8, 18, '00:00', 8, '#ffffff', [1, 0]).setScrollFactor(0).setDepth(d);
    this.hSound = txt(this, W - 8, 30, '', 8, '#c5cbe0', [1, 0]).setScrollFactor(0).setDepth(d);
    this.hSound.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.toggleSound());
    this.add.rectangle(0, H - 12, W, 12, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(99);
    this.logText = txt(this, 4, H - 10, 'SQL> ' + (GameDB.lastSql || '').slice(0, 54), 8, '#7bd88f').setScrollFactor(0).setDepth(100);
    this.updateHud();
  }

  updateHud() {
    this.hLives.setText(String(G.lives));
    this.hScore.setText(pad(G.score, 5));
    this.hCargo.setText(this.collected + '/' + this.total);
    this.hSound.setText(SFX.muted ? 'SES: KAPALI' : 'SES: ACIK');
  }

  toggleSound() { SFX.toggleMute(); this.updateHud(); }

  buildInput() {
    const kb = this.input.keyboard;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.cur = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,SPACE');
    kb.on('keydown-M', () => this.toggleSound());
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown', () => SFX.start());
  }

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.physics.pause(); this.tweens.pauseAll();
      this.pauseText = txt(this, W / 2, H / 2, 'DURAKLATILDI', 16, '#ffffff', [0.5, 0.5]).setScrollFactor(0).setDepth(130);
    } else if (this.state === 'paused') {
      this.state = 'play';
      this.physics.resume(); this.tweens.resumeAll();
      if (this.pauseText) this.pauseText.destroy();
    }
  }

  /* ---------------- olaylar ---------------- */
  popText(x, y, s, color) {
    const t = txt(this, x, y, s, 8, color || '#ffffff', [0.5, 0.5]).setDepth(60);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  collectCargo(c) {
    if (!c.active || this.state !== 'play') return;
    const d = c.getData('d');
    this.tweens.killTweensOf(c);
    c.disableBody(true, true);
    this.fxSpark.explode(8, c.x, c.y);
    GameDB.collect(d.id);                                   // SQL: UPDATE
    const prog = GameDB.cargoProgress(this.L.id);           // SQL: SELECT COUNT ... CASE
    this.collected = prog.toplanan;
    G.score += d.puan; G.cargo++;
    SFX.play('collect');
    this.popText(c.x, c.y - 10, '+' + d.puan, '#f2c14e');
    this.updateHud();
    if (this.collected >= this.total && !this.doorOpen) this.openDoor();
  }

  openDoor() {
    this.doorOpen = true;
    this.door.setTexture('door_open');
    this.exitText.setVisible(true);
    this.tweens.add({ targets: this.exitText, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    SFX.play('open');
    this.popText(this.door.x + 8, this.door.y - 26, 'KAPI ACILDI!', '#2bd96b');
  }

  touchDoor() {
    if (this.state !== 'play') return;
    if (this.doorOpen) { this.finishLevel(); return; }
    if (this.clock - this.lastMsg > 1600) {
      this.lastMsg = this.clock;
      SFX.play('nope');
      this.popText(this.door.x + 8, this.door.y - 12, 'KARGO EKSIK!', '#ff8a8a');
    }
  }

  hurt() {
    if (this.state !== 'play' || this.invuln > 0) return;
    G.lives--;
    this.updateHud();
    SFX.play('hurt');
    this.cameras.main.shake(180, 0.012);
    const p = this.player;
    this.fxHurt.explode(10, p.x, p.y - 8);
    if (G.lives <= 0) { this.die(); return; }
    this.invuln = 1600; this.stun = 350;
    p.body.setVelocity(p.flipX ? 110 : -110, -190);
  }

  fallDeath() {
    if (this.state !== 'play') return;
    G.lives--;
    this.updateHud();
    SFX.play('hurt');
    this.cameras.main.shake(180, 0.012);
    if (G.lives <= 0) { this.die(); return; }
    const p = this.player;
    // body.reset: konumu VE fizik gecmisini sifirlar (setPosition kullanirsak kedi zeminden gecer)
    p.body.reset(this.respawn.x, this.respawn.y);
    p.body.setAllowGravity(true);
    this.inZone = false;
    this.invuln = 1600; this.stun = 0;
  }

  die() {
    this.state = 'dead';
    G.ms += this.elapsed;
    SFX.play('gameover');
    const p = this.player;
    p.anims.play('hurt', true);
    p.body.checkCollision.none = true;
    p.body.setAllowGravity(true);
    p.body.setVelocity(0, -220);
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { won: false }));
    });
  }

  finishLevel() {
    if (this.state !== 'play') return;
    this.state = 'clear';
    SFX.play('win');
    const p = this.player;
    p.body.setVelocity(0, 0); p.body.setAllowGravity(false);
    p.anims.play('idle', true);
    const secs = Math.floor(this.elapsed / 1000);
    const bonus = Math.max(0, this.L.par - secs) * 5;
    G.score += bonus; G.ms += this.elapsed;
    const gainLife = G.lives < G.maxLives;
    if (gainLife) G.lives++;
    const st = GameDB.runStats();                           // SQL: COUNT + SUM
    this.updateHud();

    const last = this.lvlIndex >= LEVELS.length - 1;
    const o = [];
    const add = obj => { obj.setScrollFactor(0).setDepth(120); o.push(obj); return obj; };
    add(this.add.rectangle(0, 0, W, H, 0x000000, 0.72).setOrigin(0));
    add(this.add.rectangle(90, 44, 300, 190, 0x0b0818, 0.95).setOrigin(0).setStrokeStyle(2, 0x2bd96b));
    add(txt(this, W / 2, 60, 'SEKTOR ' + this.L.id + ' TEMIZLENDI!', 8, '#2bd96b', [0.5, 0.5]));
    const line = (y, a, b, col) => { add(txt(this, 108, y, a, 8, '#f2c14e')); add(txt(this, 372, y, b, 8, col || '#ffffff', [1, 0])); };
    line(86, 'KARGO', this.collected + '/' + this.total);
    line(104, 'SURE', secs + ' SN');
    line(122, 'SURE BONUSU', '+' + bonus);
    line(140, 'TOPLAM AGIRLIK', st.agirlik + ' KG');
    line(158, 'SKOR', pad(G.score, 5), '#f2c14e');
    if (gainLife) line(176, 'EKSTRA CAN', '+1', '#ff8a8a');
    const hint = add(txt(this, W / 2, 210, last ? 'ENTER: SONUCLAR' : 'ENTER: SONRAKI SEKTOR', 8, '#ffffff', [0.5, 0.5]));
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    let done = false;
    const next = () => {
      if (done) return; done = true;
      G.level = this.lvlIndex + 1;
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        if (last) this.scene.start('End', { won: true });
        else this.scene.restart({ level: G.level });
      });
    };
    this.time.delayedCall(500, () => {
      this.input.keyboard.once('keydown-ENTER', next);
      this.input.once('pointerdown', next);
    });
  }

  /* ---------------- her kare ---------------- */
  update(time, delta) {
    this.bd.wall.tilePositionX = this.cameras.main.scrollX * 0.6;
    if (this.state !== 'play') return;

    const dt = Math.min(delta, 50) / 1000;
    this.clock += delta; this.elapsed += delta;
    const p = this.player, b = p.body;
    const secs = Math.floor(this.elapsed / 1000);
    this.hTime.setText(pad(Math.floor(secs / 60), 2) + ':' + pad(secs % 60, 2));

    // Lazerler
    this.lasers.forEach(l => {
      const ph = (this.clock + l.offset) % l.period;
      const on = ph < 1600;
      const warn = !on && ph >= l.period - 400;
      if (on !== l.on) {
        l.topEm.setTexture(on ? 'emit_on' : 'emit_off');
        l.botEm.setTexture(on ? 'plate_on' : 'plate_off');
        l.beam.setData('on', on);
        if (on && Math.abs(p.x - (l.x * TILE + 8)) < 150 && this.clock - this.lastLaserSfx > 300) { SFX.play('laser'); this.lastLaserSfx = this.clock; }
      }
      l.on = on; l.warn = warn;
      const show = on || warn;
      l.beam.setVisible(show); l.glow.setVisible(show);
      if (warn) { const f = Math.floor(this.clock / 60) % 2; l.beam.setAlpha(f ? 0.5 : 0.12); l.glow.setAlpha(f ? 0.2 : 0.05); }
      else { l.beam.setAlpha(1); l.glow.setAlpha(0.35); }
    });

    // Girdiler
    const left = this.cur.left.isDown || this.keys.A.isDown;
    const right = this.cur.right.isDown || this.keys.D.isDown;
    const up = this.cur.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;
    const down = this.cur.down.isDown || this.keys.S.isDown;
    const JD = Phaser.Input.Keyboard.JustDown;
    const jumpPressed = [JD(this.cur.up), JD(this.keys.W), JD(this.keys.SPACE)].some(Boolean);
    let dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (this.stun > 0) { this.stun -= delta; dir = 0; }
    if (this.invuln > 0) { this.invuln -= delta; p.setAlpha(Math.floor(this.clock / 80) % 2 ? 0.35 : 1); } else p.setAlpha(1);

    // Zero-G alani
    const inZone = this.zones.some(z => z.contains(b.center.x, b.center.y));
    if (inZone !== this.inZone) {
      this.inZone = inZone;
      b.setAllowGravity(!inZone);
      if (inZone) { SFX.play('zerog'); b.velocity.y *= 0.3; this.popText(p.x, p.y - 26, 'ZERO-G!', '#8fd3ff'); }
    }

    const onGround = b.blocked.down || b.touching.down;
    if (inZone) {
      if (this.stun <= 0) {
        const ty = up ? -75 : (down ? 75 : 0);
        b.velocity.x += (dir * 85 - b.velocity.x) * Math.min(1, 6 * dt);
        b.velocity.y += (ty - b.velocity.y) * Math.min(1, 4 * dt);
      }
    } else {
      if (onGround) { this.coyote = 110; this.jumpCut = false; } else this.coyote -= delta;
      if (jumpPressed) this.buffer = 120; else this.buffer -= delta;
      if (this.stun <= 0) b.velocity.x = approach(b.velocity.x, dir * 120, (onGround ? 1500 : 950) * dt);
      if (this.buffer > 0 && this.coyote > 0 && this.stun <= 0) {
        b.setVelocityY(-320);
        this.buffer = 0; this.coyote = 0;
        SFX.play('jump');
        this.fxDust.explode(4, p.x, p.y);
      }
      if (!up && b.velocity.y < -110 && !onGround && !this.jumpCut) { b.velocity.y *= 0.5; this.jumpCut = true; }
      if (onGround && !this.wasGround && this.prevVy > 170) this.fxDust.explode(5, p.x, p.y);
    }
    this.wasGround = onGround; this.prevVy = b.velocity.y;

    // Animasyon ve yon
    if (dir !== 0) p.setFlipX(dir < 0);
    let anim = 'idle';
    if (this.stun > 0) anim = 'hurt';
    else if (inZone || !onGround) anim = 'jump';
    else if (Math.abs(b.velocity.x) > 12) anim = 'walk';
    p.anims.play(anim, true);

    // Bosluga dusme
    if (p.y > H + 30) this.fallDeath();
  }
}

/* ============================================================
   END
   ============================================================ */
class EndScene extends Phaser.Scene {
  constructor() { super('End'); }

  create(data) {
    const won = !!(data && data.won);
    ART.backdrop(this);
    this.cameras.main.fadeIn(300);

    if (won) G.score += G.lives * 50;
    const secs = Math.floor(G.ms / 1000);
    GameDB.saveScore(G.name, G.score, G.cargo, secs);          // SQL: INSERT
    const rows = GameDB.topScores(5);                          // SQL: JOIN + GROUP BY + ORDER BY + LIMIT
    const lastQuery = GameDB.lastSql;

    txt(this, W / 2, 14, won ? 'GOREV TAMAM!' : 'OYUN BITTI', 16, won ? '#2bd96b' : '#ff6b6b', [0.5, 0]);
    txt(this, W / 2, 38, 'PILOT: ' + G.name, 8, '#8fd3ff', [0.5, 0]);
    if (won) SFX.play('win');

    const cat = this.add.sprite(60, 112, won ? 'cat_jump' : 'cat_hurt').setScale(4);
    this.tweens.add({ targets: cat, y: 102, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const line = (y, a, b) => { txt(this, 104, y, a, 8, '#f2c14e'); txt(this, 220, y, b, 8, '#ffffff', [1, 0]); };
    line(70, 'SKOR', pad(G.score, 5));
    line(88, 'KARGO', String(G.cargo));
    line(106, 'SURE', secs + ' SN');
    if (won) line(124, 'CAN BONUS', '+' + G.lives * 50);

    this.add.rectangle(240, 60, 232, 124, 0x0b0818, 0.85).setOrigin(0).setStrokeStyle(2, 0x5a6393);
    txt(this, 252, 68, 'LIDERLIK TABLOSU', 8, '#8fd3ff');
    rows.forEach((r, i) => {
      const me = r.Ad === G.name;
      const col = me ? '#f2c14e' : '#ffffff';
      txt(this, 252, 90 + i * 20, (me ? '>' : ' ') + (i + 1) + '.', 8, col);
      txt(this, 292, 90 + i * 20, r.Ad, 8, col);
      txt(this, 462, 90 + i * 20, pad(r.Skor, 5), 8, col, [1, 0]);
    });

    this.add.rectangle(8, 192, 464, 58, 0x000000, 0.6).setOrigin(0);
    txt(this, 14, 196, 'SON SQL SORGUSU:', 8, '#7bd88f');
    const q = txt(this, 14, 208, lastQuery.replace(/\s+/g, ' '), 8, '#c5cbe0');
    q.setWordWrapWidth(452).setLineSpacing(2);

    const hint = txt(this, W / 2, 254, 'ENTER: ANA MENU', 8, '#ffffff', [0.5, 0]);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.input.keyboard.on('keydown-M', () => SFX.toggleMute());
    this.time.delayedCall(600, () => {
      this.input.keyboard.once('keydown-ENTER', () => this.toMenu());
      this.input.once('pointerdown', () => this.toMenu());
    });
  }

  toMenu() {
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
  }
}
