/* ============================================================
   db.js - Veritabani katmani (sql.js = tarayicida calisan gercek SQLite)

   Oyunun arka planinda calisan SQL burada. Oyun, her olayda asagidaki
   fonksiyonlardan birini cagirir; fonksiyonlar gercek SQL sorgusu calistirir:

     init()          CREATE TABLE, INSERT (tablolari kur, bolum/kargo verisini yaz)
     resetRun()      UPDATE  (yeni oyunda tum kargolari 'Havada' yap)
     collect()       UPDATE  (toplanan kargoyu 'Toplandi' yap)
     cargoProgress() SELECT COUNT + CASE + WHERE (bolumde kac kargo toplandi?)
     runStats()      SELECT COUNT, SUM (toplanan kargo adedi ve toplam agirlik)
     saveScore()     INSERT  (oyuncu ve skor kaydi)
     topScores()     SELECT + INNER JOIN + GROUP BY + ORDER BY + LIMIT (liderlik tablosu)

   Veritabani tarayicinin localStorage'ina kaydedilir; sayfa yenilense de
   skorlar kaybolmaz.

   Not: sql.js yuklenemezse oyun bozulmasin diye ayni islevleri goren basit bir
   yedek mod (saf JavaScript) devreye girer. Menude hangi modun aktif oldugu yazar.
   ============================================================ */

const GameDB = (() => {
  const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/';
  const LS_SQL = 'zerog_sqlite_v1';
  const LS_FB = 'zerog_yedek_v1';

  let SQL = null;       // sql.js motoru
  let db = null;        // SQLite veritabani
  let mode = 'YEDEK';   // 'SQLITE' veya 'YEDEK'
  let onLog = null;     // son SQL'i ekranda gostermek icin
  let lastSql = '';
  let fb = null;        // yedek mod verisi

  /* ---------- yardimcilar ---------- */
  function fmt(sql, params) {
    let i = 0;
    return sql.replace(/\s+/g, ' ').trim().replace(/\?/g, () => {
      const v = (params || [])[i++];
      return typeof v === 'string' ? "'" + v + "'" : String(v);
    });
  }
  function note(sql, params) {
    lastSql = fmt(sql, params);
    if (onLog) onLog(lastSql);
  }
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Yuklenemedi: ' + url));
      document.head.appendChild(s);
    });
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Zaman asimi')), ms))]);
  }
  function toBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromBase64(b64) {
    const s = atob(b64);
    const a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  /* ---------- SQL sorgu yardimcilari ---------- */
  function all(sql, params) {
    note(sql, params);
    const st = db.prepare(sql);
    st.bind(params || []);
    const rows = [];
    while (st.step()) rows.push(st.getAsObject());
    st.free();
    return rows;
  }
  function run(sql, params) {
    note(sql, params);
    db.run(sql, params || []);
  }
  function persist() {
    try {
      if (mode === 'SQLITE') localStorage.setItem(LS_SQL, toBase64(db.export()));
      else localStorage.setItem(LS_FB, JSON.stringify({ oyuncular: fb.oyuncular, skorlar: fb.skorlar }));
    } catch (e) { /* depolama kapaliysa sessizce gec */ }
  }

  /* ---------- Sema: tablolar, PRIMARY KEY, FOREIGN KEY, CHECK ---------- */
  const SCHEMA = `
    CREATE TABLE IF NOT EXISTS Oyuncular (
      Oyuncu_ID      INTEGER PRIMARY KEY AUTOINCREMENT,
      Kullanici_Adi  TEXT NOT NULL UNIQUE,
      Kayit_Tarihi   TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS Bolumler (
      Bolum_ID     INTEGER PRIMARY KEY,
      Bolum_Adi    TEXT NOT NULL,
      Hedef_Kargo  INTEGER NOT NULL CHECK (Hedef_Kargo > 0)
    );
    CREATE TABLE IF NOT EXISTS Kargolar (
      Kargo_ID  INTEGER PRIMARY KEY,
      Bolum_ID  INTEGER NOT NULL,
      Tur       TEXT NOT NULL CHECK (Tur IN ('Mavi', 'Kahverengi')),
      Agirlik   INTEGER NOT NULL,
      Puan      INTEGER NOT NULL,
      Durum     TEXT NOT NULL DEFAULT 'Havada' CHECK (Durum IN ('Havada', 'Toplandi')),
      FOREIGN KEY (Bolum_ID) REFERENCES Bolumler (Bolum_ID)
    );
    CREATE TABLE IF NOT EXISTS Skorlar (
      Skor_ID         INTEGER PRIMARY KEY AUTOINCREMENT,
      Oyuncu_ID       INTEGER NOT NULL,
      Skor            INTEGER NOT NULL,
      Toplanan_Kargo  INTEGER NOT NULL,
      Sure_Sn         INTEGER NOT NULL,
      Tarih           TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (Oyuncu_ID) REFERENCES Oyuncular (Oyuncu_ID)
    );
  `;

  function setupSql(levels) {
    let saved = null;
    try { saved = localStorage.getItem(LS_SQL); } catch (e) {}
    try { db = saved ? new SQL.Database(fromBase64(saved)) : new SQL.Database(); }
    catch (e) { db = new SQL.Database(); }
    db.run('PRAGMA foreign_keys = ON;');
    db.run(SCHEMA);
    // Bolum ve kargo bilgisi koddan gelir; her acilista yeniden yazilir.
    db.run('DELETE FROM Kargolar; DELETE FROM Bolumler;');
    levels.forEach(L => {
      db.run('INSERT INTO Bolumler (Bolum_ID, Bolum_Adi, Hedef_Kargo) VALUES (?, ?, ?)', [L.id, L.name, L.cargo.length]);
      L.cargo.forEach(c => {
        db.run('INSERT INTO Kargolar (Kargo_ID, Bolum_ID, Tur, Agirlik, Puan) VALUES (?, ?, ?, ?, ?)',
          [c.id, L.id, c.tur === 'k' ? 'Kahverengi' : 'Mavi', c.agirlik, c.puan]);
      });
    });
    persist();
    // Acilis sorgularini ekranda gostermeyelim
    lastSql = "CREATE TABLE Oyuncular, Bolumler, Kargolar, Skorlar";
  }

  function setupFallback(levels) {
    fb = { kargolar: [], oyuncular: [], skorlar: [] };
    levels.forEach(L => L.cargo.forEach(c => fb.kargolar.push({ id: c.id, bolum: L.id, agirlik: c.agirlik, puan: c.puan, durum: 'Havada' })));
    try {
      const s = JSON.parse(localStorage.getItem(LS_FB) || 'null');
      if (s) { fb.oyuncular = s.oyuncular || []; fb.skorlar = s.skorlar || []; }
    } catch (e) {}
    lastSql = 'YEDEK MOD';
  }

  /* ---------- disariya acilan fonksiyonlar ---------- */
  async function init(levels) {
    try {
      try {
        // asm.js surumu: .wasm dosyasi indirmek gerekmez, her ortamda calisir
        await withTimeout(loadScript(CDN + 'sql-asm.js'), 12000);
        SQL = await window.initSqlJs();
      } catch (e1) {
        await withTimeout(loadScript(CDN + 'sql-wasm.js'), 12000);
        SQL = await window.initSqlJs({ locateFile: f => CDN + f });
      }
      mode = 'SQLITE';
      setupSql(levels);
    } catch (e) {
      console.warn('[db] sql.js kullanilamadi, yedek mod:', e);
      SQL = null; db = null; mode = 'YEDEK';
      setupFallback(levels);
    }
  }

  function resetRun() {
    if (mode === 'SQLITE') run("UPDATE Kargolar SET Durum = 'Havada'");
    else { note("UPDATE Kargolar SET Durum = 'Havada'"); fb.kargolar.forEach(k => k.durum = 'Havada'); }
  }

  function collect(id) {
    const sql = "UPDATE Kargolar SET Durum = 'Toplandi' WHERE Kargo_ID = ?";
    if (mode === 'SQLITE') run(sql, [id]);
    else { note(sql, [id]); const k = fb.kargolar.find(k => k.id === id); if (k) k.durum = 'Toplandi'; }
  }

  function cargoProgress(levelId) {
    const sql = "SELECT COUNT(*) AS Toplam, SUM(CASE WHEN Durum = 'Toplandi' THEN 1 ELSE 0 END) AS Toplanan FROM Kargolar WHERE Bolum_ID = ?";
    if (mode === 'SQLITE') {
      const r = all(sql, [levelId])[0];
      return { toplam: r.Toplam || 0, toplanan: r.Toplanan || 0 };
    }
    note(sql, [levelId]);
    const list = fb.kargolar.filter(k => k.bolum === levelId);
    return { toplam: list.length, toplanan: list.filter(k => k.durum === 'Toplandi').length };
  }

  function runStats() {
    const sql = "SELECT COUNT(*) AS Adet, IFNULL(SUM(Agirlik), 0) AS Agirlik FROM Kargolar WHERE Durum = 'Toplandi'";
    if (mode === 'SQLITE') {
      const r = all(sql)[0];
      return { adet: r.Adet, agirlik: r.Agirlik };
    }
    note(sql);
    const t = fb.kargolar.filter(k => k.durum === 'Toplandi');
    return { adet: t.length, agirlik: t.reduce((a, k) => a + k.agirlik, 0) };
  }

  function saveScore(name, score, cargo, sec) {
    if (mode === 'SQLITE') {
      run('INSERT OR IGNORE INTO Oyuncular (Kullanici_Adi) VALUES (?)', [name]);
      const id = all('SELECT Oyuncu_ID FROM Oyuncular WHERE Kullanici_Adi = ?', [name])[0].Oyuncu_ID;
      run('INSERT INTO Skorlar (Oyuncu_ID, Skor, Toplanan_Kargo, Sure_Sn) VALUES (?, ?, ?, ?)', [id, score, cargo, sec]);
    } else {
      note('INSERT INTO Skorlar (Oyuncu_ID, Skor, Toplanan_Kargo, Sure_Sn) VALUES (?, ?, ?, ?)', [name, score, cargo, sec]);
      fb.skorlar.push({ ad: name, skor: score, kargo: cargo, sure: sec });
    }
    persist();
  }

  function topScores(limit) {
    const sql = `SELECT o.Kullanici_Adi AS Ad, MAX(s.Skor) AS Skor, COUNT(s.Skor_ID) AS Oyun
                 FROM Skorlar s INNER JOIN Oyuncular o ON o.Oyuncu_ID = s.Oyuncu_ID
                 GROUP BY o.Oyuncu_ID ORDER BY Skor DESC LIMIT ?`;
    if (mode === 'SQLITE') return all(sql, [limit]);
    note(sql, [limit]);
    const map = {};
    fb.skorlar.forEach(s => {
      const m = map[s.ad] || (map[s.ad] = { Ad: s.ad, Skor: 0, Oyun: 0 });
      m.Skor = Math.max(m.Skor, s.skor); m.Oyun++;
    });
    return Object.values(map).sort((a, b) => b.Skor - a.Skor).slice(0, limit);
  }

  return {
    init, resetRun, collect, cargoProgress, runStats, saveScore, topScores,
    setLogger(fn) { onLog = fn; },
    get lastSql() { return lastSql; },
    get mode() { return mode; },
    get label() { return mode === 'SQLITE' ? 'VERITABANI: SQLITE (SQL.JS)' : 'VERITABANI: YEDEK MOD'; }
  };
})();
