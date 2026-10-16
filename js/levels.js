/* ============================================================
   levels.js - Bolum tasarimlari
   Olcu birimi: 1 karo (TILE) = 16 piksel. Ekran 480x272 piksel.
   Zemin ust yuzu 15. satirda (y = 15 * 16 = 240 piksel).

   Alanlarin anlami:
     solids      [x, y, genislik, yukseklik]        katı bloklar / platformlar
     spikes      [x, y, genislik]                   dikenler
     lasers      [x, ustSatir, periyotMs, gecikmeMs] dikey lazer kapilari
     zones       [x, y, genislik, yukseklik]        sifir yercekimi alanlari
     mines       [x, y, genlikPiksel, periyotMs]    yukari-asagi gezen mayinlar
     checkpoints [x, y]                             kayit noktalari
     cargo       [x, y, tur]   tur: 'b' = mavi kutu, 'k' = kahverengi kutu
   ============================================================ */

const TILE = 16;

const LEVELS = [
  {
    id: 1, name: 'KARGO KOLTUGU', cols: 92, par: 60,
    start: [2, 15], exit: [88, 13],
    solids: [
      [0, 15, 24, 2], [8, 13, 5, 1], [15, 11, 4, 1],
      [27, 15, 16, 2], [33, 13, 3, 2], [38, 11, 4, 1],
      [46, 15, 14, 2], [55, 12, 4, 1],
      [63, 15, 29, 2], [68, 12, 2, 3], [72, 10, 4, 1]
    ],
    spikes: [[50, 14, 3]],
    lasers: [], zones: [], mines: [],
    checkpoints: [[47, 15]],
    hints: [
      [9, 7, 'OKLAR: YURU  YUKARI: ZIPLA'],
      [35, 9, 'TUM KARGOLARI TOPLA!'],
      [51, 9, 'DIKENLERDEN KACIN!'],
      [82, 10, 'KARGO TAMAMSA KAPI ACILIR']
    ],
    cargo: [
      [9, 12, 'b'], [16, 10, 'b'], [30, 14, 'k'], [34, 12, 'b'],
      [39, 10, 'k'], [51, 12, 'b'], [57, 11, 'k'], [73, 9, 'b']
    ]
  },
  {
    id: 2, name: 'LAZER KORIDORU', cols: 100, par: 80,
    start: [2, 15], exit: [95, 13],
    solids: [
      [0, 15, 20, 2], [6, 12, 4, 1],
      [23, 15, 24, 2],
      [47, 16, 16, 1],
      [63, 15, 37, 2], [68, 12, 3, 1], [73, 10, 4, 1]
    ],
    spikes: [[47, 15, 16], [66, 14, 2]],
    lasers: [[30, 9, 3200, 0], [40, 9, 3200, 1600], [80, 9, 3200, 0], [85, 9, 3200, 1600], [90, 9, 3200, 0]],
    zones: [[47, 3, 16, 12]],
    mines: [[55, 9, 35, 2500]],
    checkpoints: [[25, 15], [64, 15]],
    hints: [
      [9, 9, 'LAZERLER ACILIP KAPANIR'],
      [35, 12, 'KAPANINCA GEC!'],
      [55, 5, 'YUKARI / ASAGI: SERBEST UC']
    ],
    cargo: [
      [7, 11, 'b'], [27, 13, 'k'], [35, 14, 'b'], [44, 12, 'k'],
      [50, 9, 'b'], [54, 6, 'k'], [58, 11, 'b'],
      [69, 11, 'b'], [75, 9, 'k'], [87, 14, 'b']
    ]
  },
  {
    id: 3, name: 'SIFIR-G REAKTOR', cols: 112, par: 100,
    start: [2, 15], exit: [107, 13],
    solids: [
      [0, 15, 14, 2], [4, 12, 3, 1],
      [17, 15, 10, 2], [22, 12, 4, 1],
      [30, 15, 9, 2],
      [39, 16, 20, 1],
      [59, 15, 14, 2], [62, 12, 3, 1],
      [76, 15, 36, 2], [78, 12, 3, 1], [83, 10, 4, 1], [89, 12, 3, 1]
    ],
    spikes: [[19, 14, 2], [39, 15, 20], [86, 14, 3]],
    lasers: [[34, 9, 3200, 0], [66, 9, 3200, 0], [70, 9, 3200, 1600], [95, 9, 3200, 0], [100, 9, 3200, 1600]],
    zones: [[39, 2, 20, 13]],
    mines: [[42, 6, 40, 2400], [47, 11, 32, 2000], [52, 8, 38, 2600], [56, 5, 40, 2200]],
    checkpoints: [[18, 15], [60, 15], [77, 15]],
    hints: [
      [9, 9, 'SON SEKTOR: REAKTOR!'],
      [49, 4, 'MAYINLARA DOKUNMA!']
    ],
    cargo: [
      [5, 11, 'b'], [23, 11, 'k'], [29, 12, 'b'], [36, 14, 'b'],
      [44, 10, 'b'], [49, 5, 'k'], [54, 12, 'b'], [57, 9, 'k'],
      [63, 11, 'k'], [79, 11, 'b'], [84, 9, 'b'], [97, 14, 'k']
    ]
  }
];

/* Her kargoya essiz bir Kargo_ID, agirlik ve puan veriyoruz.
   Bu bilgiler veritabanina (Kargolar tablosu) yazilacak. */
(function kargoKimlikleriVer() {
  let id = 1;
  LEVELS.forEach(L => {
    L.cargo = L.cargo.map(([x, y, t]) => ({
      id: id++, x, y, tur: t,
      agirlik: t === 'k' ? 8 : 5,   // kg
      puan: t === 'k' ? 25 : 10
    }));
  });
})();
