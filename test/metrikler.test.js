const test = require('node:test');
const assert = require('node:assert');
const { Surec } = require('../src/Surec');
const BagliListe = require('../src/veri-yapilari/BagliListe');
const { hesapla, surecMetrikleri, baglamDegisimiSayisi, yuvarla } = require('../src/metrikler');

// Yardımcı: süreci oluşturup verilen zaman aralıklarında çalıştırır
function calismis(bilgi, araliklar) {
  const s = new Surec(bilgi);
  for (const [bas, bit] of araliklar) s.calistir(bas, bit - bas);
  return s;
}
const parca = (pid, baslangic, bitis) => ({ tur: 'surec', pid, baslangic, bitis });

test('tek sürecin dönüş, bekleme ve yanıt süresi', () => {
  // Spotify 15'te geldi, 40-50 arası çalıştı
  const s = calismis({ pid: 1003, ad: 'Spotify', tur: 'etkilesimli', varis: 15, sure: 10 }, [[40, 50]]);
  assert.deepStrictEqual(surecMetrikleri(s), { donus: 35, bekleme: 25, yanit: 25 });
});

test('parça parça çalışan süreçte yanıt ve bekleme farklı olmalı', () => {
  // VS Code 0'da geldi: 0-2 ve 6-8 arası çalıştı
  const s = calismis({ pid: 1002, ad: 'VS Code', varis: 0, sure: 4 }, [[0, 2], [6, 8]]);
  assert.deepStrictEqual(surecMetrikleri(s), { donus: 8, bekleme: 4, yanit: 0 });
});

test('bitmemiş süreç için hata vermeli', () => {
  const s = new Surec({ pid: 1001, ad: 'Chrome', varis: 0, sure: 5 });
  assert.throws(() => surecMetrikleri(s), /henüz bitmedi/);
});

test('dokümandaki FIFO örneği: ortalamalar 3,33 ve 6,67 olmalı', () => {
  const s1 = calismis({ pid: 1001, ad: 'Antivirüs', tur: 'arkaPlan', varis: 0, sure: 5 }, [[0, 5]]);
  const s2 = calismis({ pid: 1002, ad: 'Chrome', varis: 1, sure: 3 }, [[5, 8]]);
  const s3 = calismis({ pid: 1003, ad: 'Spotify', tur: 'etkilesimli', varis: 2, sure: 2 }, [[8, 10]]);
  const gantt = new BagliListe();
  gantt.sonaEkle(parca(1001, 0, 5));
  gantt.sonaEkle(parca(1002, 5, 8));
  gantt.sonaEkle(parca(1003, 8, 10));

  const r = hesapla([s1, s2, s3], gantt);
  assert.strictEqual(r.ortalama.bekleme, 3.33);
  assert.strictEqual(r.ortalama.donus, 6.67);
  assert.strictEqual(r.ortalama.yanit, 3.33);   // FIFO'da yanıt = bekleme
  assert.strictEqual(r.cpuKullanimi, 100);
  assert.strictEqual(r.baglamDegisimi, 2);
  assert.strictEqual(r.surecler[2].ad, 'Spotify');
  assert.strictEqual(r.surecler[2].bekleme, 6);
});

test('CPU boşta kalırsa kullanım düşmeli', () => {
  // Chrome 0-4 çalıştı, CPU 4-6 boşta, Spotify 6-10 çalıştı
  const s1 = calismis({ pid: 1001, ad: 'Chrome', varis: 0, sure: 4 }, [[0, 4]]);
  const s2 = calismis({ pid: 1002, ad: 'Spotify', varis: 6, sure: 4 }, [[6, 10]]);
  const gantt = [parca(1001, 0, 4), { tur: 'bos', pid: null, baslangic: 4, bitis: 6 }, parca(1002, 6, 10)];
  const r = hesapla([s1, s2], gantt);
  assert.strictEqual(r.toplamSure, 10);
  assert.strictEqual(r.bostaSure, 2);
  assert.strictEqual(r.cpuKullanimi, 80);
});

test('bağlam değişimi sayısı: boşta ve geçiş parçaları sayılmamalı', () => {
  // Round Robin örneği: 1001, 1002, 1003, 1001, 1002, 1001 -> 5 değişim
  const rr = [[1001, 0, 2], [1002, 2, 4], [1003, 4, 6], [1001, 6, 8], [1002, 8, 9], [1001, 9, 10]]
    .map(([p, b, s]) => parca(p, b, s));
  assert.strictEqual(baglamDegisimiSayisi(rr), 5);

  // Aynı süreç arka arkaya iki parça: değişim yok. Aradaki geçiş parçası sayılmaz.
  const g = [parca(1001, 0, 2), parca(1001, 2, 4), { tur: 'gecis', pid: null, baslangic: 4, bitis: 5 }, parca(1002, 5, 7)];
  assert.strictEqual(baglamDegisimiSayisi(g), 1);
});

test('yuvarla iki basamağa yuvarlamalı', () => {
  assert.strictEqual(yuvarla(10 / 3), 3.33);
  assert.strictEqual(yuvarla(20 / 3), 6.67);
  assert.strictEqual(yuvarla(4), 4);
});