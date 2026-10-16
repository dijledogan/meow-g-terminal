/* ============================================================
   audio.js - 8-bit ses efektleri ve kucuk bir muzik dongusu.
   Hicbir ses dosyasi yok: sesler tarayicinin Web Audio API'si ile
   kodla uretiliyor (kare dalga / ucgen dalga).
   ============================================================ */

const SFX = (() => {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }

  const sounds = {
    tick:     () => tone(660, 0.04, 'square', 0.04),
    jump:     () => tone(260, 0.13, 'square', 0.05, 640),
    collect:  () => { tone(880, 0.07, 'square', 0.06); tone(1320, 0.14, 'square', 0.06, null, 0.07); },
    hurt:     () => tone(260, 0.35, 'sawtooth', 0.09, 45),
    laser:    () => tone(900, 0.08, 'sawtooth', 0.025, 300),
    zerog:    () => tone(300, 0.4, 'triangle', 0.06, 900),
    checkpoint: () => { tone(660, 0.08, 'square', 0.05); tone(990, 0.12, 'square', 0.05, null, 0.08); },
    open:     () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.05, null, i * 0.07)); },
    nope:     () => tone(180, 0.18, 'square', 0.05, 120),
    win:      () => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.06, null, i * 0.11)); },
    gameover: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.08, null, i * 0.2)); },
    start:    () => { [330, 440, 554, 660].forEach((f, i) => tone(f, 0.1, 'square', 0.05, null, i * 0.06)); }
  };

  /* Basit muzik: bas + arpej, La minor */
  const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];
  const ARP  = [440, 523.25, 659.25, 523.25, 440, 587.33, 698.46, 587.33];
  function musicTick() {
    if (muted) return;
    tone(BASS[step % 8], 0.22, 'triangle', 0.05);
    if (step % 2 === 1) tone(ARP[step % 8], 0.09, 'square', 0.012);
    step++;
  }
  function startMusic() {
    if (musicTimer || muted) return;
    musicTimer = setInterval(musicTick, 230);
  }
  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (!muted) ctx.resume();
  });

  return {
    play(name) { if (sounds[name]) sounds[name](); },
    /* Ilk tus/tik hareketinden sonra cagrilir (tarayici izni icin sart) */
    start() { ensure(); startMusic(); },
    toggleMute() {
      muted = !muted;
      if (muted) stopMusic(); else { ensure(); startMusic(); }
      return muted;
    },
    get muted() { return muted; }
  };
})();
