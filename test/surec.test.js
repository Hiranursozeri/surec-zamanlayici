const test = require('node:test');
const assert = require('node:assert');
const { Surec, TURLER } = require('../src/Surec');

const spotify = () => new Surec({
  pid: 1003, ad: 'Spotify – müzik çalma', tur: 'etkilesimli', varis: 15, sure: 10,
});

test('bilgiler doğru kaydedilmeli', () => {
  const s = spotify();
  assert.strictEqual(s.pid, 1003);
  assert.strictEqual(s.ad, 'Spotify – müzik çalma');
  assert.strictEqual(s.varis, 15);
  assert.strictEqual(s.sure, 10);
  assert.strictEqual(s.kalan, 10);
  assert.strictEqual(s.ilkCalisma, null);
  assert.strictEqual(s.bitis, null);
});

test('öncelik verilmezse türden gelmeli', () => {
  assert.strictEqual(spotify().oncelik, 1);
  const antivirus = new Surec({ pid: 1001, ad: 'Antivirüs taraması', tur: 'arkaPlan', varis: 0, sure: 80 });
  assert.strictEqual(antivirus.oncelik, TURLER.arkaPlan.oncelik);
  assert.strictEqual(antivirus.turEtiketi, 'Arka plan');
});

test('kullanıcı önceliği elle değiştirebilmeli', () => {
  const s = new Surec({ pid: 1004, ad: 'Chrome', tur: 'kullanici', varis: 20, sure: 25, oncelik: 1 });
  assert.strictEqual(s.oncelik, 1);
});

test('calistir: kalan süre azalmalı, ilk çalışma ve bitiş kaydedilmeli', () => {
  const s = spotify();
  assert.strictEqual(s.calistir(15, 4), 4);   // 15-19 arası çalıştı
  assert.strictEqual(s.ilkCalisma, 15);
  assert.strictEqual(s.kalan, 6);
  assert.strictEqual(s.bittiMi(), false);
  assert.strictEqual(s.calistir(30, 4), 4);   // ilk çalışma değişmemeli
  assert.strictEqual(s.ilkCalisma, 15);
  assert.strictEqual(s.calistir(40, 10), 2);  // sadece kalan 2 ms çalışabilir
  assert.strictEqual(s.bittiMi(), true);
  assert.strictEqual(s.bitis, 42);
});

test('biten süreç tekrar çalıştırılamamalı', () => {
  const s = spotify();
  s.calistir(15, 10);
  assert.throws(() => s.calistir(25, 1), /zaten bitti/);
});

test('kopya simülasyon bilgilerini sıfırlamalı, orijinali bozmamalı', () => {
  const s = spotify();
  s.calistir(15, 10);
  s.oncelik = 3; // yaşlandırma gibi bir değişiklik
  const k = s.kopya();
  assert.strictEqual(k.kalan, 10);
  assert.strictEqual(k.bitis, null);
  assert.strictEqual(k.oncelik, 1);
  assert.strictEqual(s.bittiMi(), true); // orijinal aynı kalmalı
});

test('hatalı girişler reddedilmeli', () => {
  const temel = { pid: 1001, ad: 'Test', tur: 'kullanici', varis: 0, sure: 10 };
  assert.throws(() => new Surec({ ...temel, pid: 0 }), /PID/);
  assert.throws(() => new Surec({ ...temel, ad: '  ' }), /adı/);
  assert.throws(() => new Surec({ ...temel, tur: 'uzayli' }), /Bilinmeyen/);
  assert.throws(() => new Surec({ ...temel, varis: -5 }), /Varış/);
  assert.throws(() => new Surec({ ...temel, sure: 0 }), /Süre/);
  assert.throws(() => new Surec({ ...temel, sure: 501 }), /Süre/);
  assert.throws(() => new Surec({ ...temel, oncelik: 6 }), /Öncelik/);
  assert.throws(() => new Surec({ ...temel, varis: 2.5 }), /Varış/);
});

test('jsonHali arayüz için gerekli alanları içermeli', () => {
  const j = spotify().jsonHali();
  assert.deepStrictEqual(Object.keys(j).sort(),
    ['ad', 'bitis', 'ilkCalisma', 'oncelik', 'pid', 'sure', 'tur', 'turEtiketi', 'varis'].sort());
});