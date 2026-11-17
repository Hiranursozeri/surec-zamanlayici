const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

// Testler için sunucuyu boş bir portta açar (0 = işletim sistemi seçsin)
let sunucu, adres;
test.before(() => new Promise(tamam => {
  sunucu = app.listen(0, () => {
    adres = `http://localhost:${sunucu.address().port}`;
    tamam();
  });
}));
test.after(() => sunucu.close());

const getir = async (yol) => {
  const r = await fetch(adres + yol);
  return { durum: r.status, veri: await r.json() };
};
const gonder = async (yol, govde) => {
  const r = await fetch(adres + yol, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof govde === 'string' ? govde : JSON.stringify(govde),
  });
  return { durum: r.status, veri: await r.json() };
};

const dersOrnegi = [
  { pid: 1001, ad: 'Antivirüs', tur: 'arkaPlan', varis: 0, sure: 5, oncelik: 2 },
  { pid: 1002, ad: 'Chrome', tur: 'kullanici', varis: 1, sure: 3, oncelik: 3 },
  { pid: 1003, ad: 'Spotify', tur: 'etkilesimli', varis: 2, sure: 2, oncelik: 1 },
];

test('GET /api/durum', async () => {
  const { durum, veri } = await getir('/api/durum');
  assert.strictEqual(durum, 200);
  assert.match(veri.mesaj, /çalışıyor/);
});

test('GET /api/senaryolar dört senaryo döndürmeli', async () => {
  const { veri } = await getir('/api/senaryolar');
  assert.deepStrictEqual(veri.map(s => s.id), ['ogrenci', 'oyun', 'sunucu', 'telefon']);
});

test('GET /api/senaryolar/:id süreçleri döndürmeli, olmayan için 404', async () => {
  const { durum, veri } = await getir('/api/senaryolar/telefon');
  assert.strictEqual(durum, 200);
  assert.strictEqual(veri.surecler.find(s => s.pid === 1003).ad, 'Gelen arama');
  assert.strictEqual((await getir('/api/senaryolar/yok')).durum, 404);
});

test('POST /api/simule: üç yöntem ders örneğinde doğru ortalamaları vermeli', async () => {
  const beklenen = { fifo: [3.33, 6.67], rr: [4, 7.33], oncelikli: [2.67, 6] };
  for (const [yontem, [bekleme, donus]] of Object.entries(beklenen)) {
    const { durum, veri } = await gonder('/api/simule', {
      surecler: dersOrnegi, yontem, ayarlar: { quantum: 2, kesintili: true },
    });
    assert.strictEqual(durum, 200, yontem);
    assert.strictEqual(veri.ortalama.bekleme, bekleme, yontem);
    assert.strictEqual(veri.ortalama.donus, donus, yontem);
    assert.ok(veri.gantt.length > 0 && veri.olaylar.length > 0 && veri.goruntuler.length > 0);
  }
});

test('POST /api/karsilastir üç yöntemin özetini döndürmeli', async () => {
  const { durum, veri } = await gonder('/api/karsilastir', { surecler: dersOrnegi, ayarlar: { quantum: 2 } });
  assert.strictEqual(durum, 200);
  assert.deepStrictEqual(veri.map(r => r.id), ['fifo', 'rr', 'oncelikli']);
  assert.ok(veri.every(r => r.ortalama && r.surecler.length === 3));
});

test('hatalı girişler 400 ve Türkçe mesaj döndürmeli', async () => {
  const durumlar = [
    [{ surecler: [], yontem: 'fifo' }, /En az bir süreç/],
    [{ surecler: dersOrnegi, yontem: 'sjf' }, /Yöntem/],
    [{ surecler: dersOrnegi, yontem: 'toString' }, /Yöntem/],
    [{ surecler: [dersOrnegi[0], dersOrnegi[0]], yontem: 'fifo' }, /birden fazla/],
    [{ surecler: [{ ...dersOrnegi[0], sure: -3 }], yontem: 'fifo' }, /Antivirüs: Süre/],
    [{ surecler: dersOrnegi, yontem: 'rr', ayarlar: { quantum: 0 } }, /Quantum/],
    [{ surecler: Array.from({ length: 21 }, (_, i) => ({ pid: 1001 + i, ad: 'X', varis: 0, sure: 1 })), yontem: 'fifo' }, /En fazla 20/],
  ];
  for (const [govde, mesaj] of durumlar) {
    const { durum, veri } = await gonder('/api/simule', govde);
    assert.strictEqual(durum, 400, JSON.stringify(govde).slice(0, 60));
    assert.match(veri.hata, mesaj);
  }
});

test('bozuk JSON ve olmayan adres düzgün hata vermeli', async () => {
  const bozuk = await gonder('/api/simule', '{ bu json değil');
  assert.strictEqual(bozuk.durum, 400);
  assert.match(bozuk.veri.hata, /JSON/);
  assert.strictEqual((await getir('/api/olmayan')).durum, 404);
});