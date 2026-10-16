/* ============================================================
   main.js - Oyunu baslatir.
   Ekran 480x272 piksel; tarayici penceresine sigacak sekilde
   buyutulur (piksel kalitesi korunur).
   ============================================================ */
(function () {
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 480,
    height: 272,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#0b0818',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { y: 800 }, debug: false } },
    scene: [BootScene, MenuScene, GameScene, EndScene]
  };

  function baslat() { window.__game = new Phaser.Game(config); }

  // Piksel font yuklenmeden baslama (yazilar bozuk gorunmesin).
  // Iki kaynak var: Google Fonts (internetteyse) ve dosyaya gomulu kopya.
  const yukle = f => (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('8px "' + f + '"'), new Promise(r => setTimeout(r, 2500))]).catch(() => {})
    : Promise.resolve();
  Promise.all([yukle('Press Start 2P'), yukle('PS2P Local')]).then(baslat, baslat);
})();
