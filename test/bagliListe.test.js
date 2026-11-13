const test = require('node:test');
const assert = require('node:assert');
const BagliListe = require('../src/veri-yapilari/BagliListe');

// Süreçleri varış zamanına göre sıralayan karşılaştırma fonksiyonu
const varisaGore = (a, b) => a.varis - b.varis;

test('yeni liste boş olmalı', () => {
  const l = new BagliListe();
  assert.strictEqual(l.bosMu(), true);
  assert.strictEqual(l.bas, null);
  assert.strictEqual(l.son, null);
});

test('sonaEkle sırayı korumalı', () => {
  const l = new BagliListe();
  l.sonaEkle('P1'); l.sonaEkle('P2'); l.sonaEkle('P3');
  assert.deepStrictEqual(l.diziyeCevir(), ['P1', 'P2', 'P3']);
  assert.strictEqual(l.son.veri, 'P3');
  assert.strictEqual(l.boyut, 3);
});

test('basaEkle elemanı en öne koymalı', () => {
  const l = new BagliListe();
  l.sonaEkle('P2');
  l.basaEkle('P1');
  assert.deepStrictEqual(l.diziyeCevir(), ['P1', 'P2']);
  assert.strictEqual(l.son.veri, 'P2');
});

test('siraliEkle varış zamanına göre sıralamalı, eşitlikte önce gelen önde kalmalı', () => {
  const l = new BagliListe();
  l.siraliEkle({ pid: 'P2', varis: 2 }, varisaGore);
  l.siraliEkle({ pid: 'P1', varis: 0 }, varisaGore); // başa
  l.siraliEkle({ pid: 'P3', varis: 5 }, varisaGore); // sona
  l.siraliEkle({ pid: 'P4', varis: 2 }, varisaGore); // P2 ile eşit -> P2'nin arkasına
  assert.deepStrictEqual(l.diziyeCevir().map(s => s.pid), ['P1', 'P2', 'P4', 'P3']);
  assert.strictEqual(l.son.veri.pid, 'P3');
});

test('bastanCikar sırayla vermeli, boşalınca son da null olmalı', () => {
  const l = new BagliListe();
  l.sonaEkle('P1'); l.sonaEkle('P2');
  assert.strictEqual(l.bastanCikar(), 'P1');
  assert.strictEqual(l.bastanCikar(), 'P2');
  assert.strictEqual(l.son, null);
  l.sonaEkle('P3'); // boşaldıktan sonra tekrar ekleme çalışmalı
  assert.deepStrictEqual(l.diziyeCevir(), ['P3']);
});

test('boş listeden çıkarma hata vermeli', () => {
  const l = new BagliListe();
  assert.throws(() => l.bastanCikar(), /Liste boş/);
});

test('sil: baştaki, ortadaki ve sondaki eleman', () => {
  const l = new BagliListe();
  ['P1', 'P2', 'P3', 'P4'].forEach(p => l.sonaEkle(p));
  assert.strictEqual(l.sil(p => p === 'P2'), true);  // ortadan
  assert.strictEqual(l.sil(p => p === 'P4'), true);  // sondan
  assert.strictEqual(l.son.veri, 'P3');              // son güncellenmeli
  assert.strictEqual(l.sil(p => p === 'P1'), true);  // baştan
  assert.deepStrictEqual(l.diziyeCevir(), ['P3']);
  assert.strictEqual(l.sil(p => p === 'P9'), false); // olmayan
  assert.strictEqual(l.boyut, 1);
});

test('bul koşula uyan ilk elemanı döndürmeli', () => {
  const l = new BagliListe();
  l.sonaEkle({ pid: 'P1', varis: 0 });
  l.sonaEkle({ pid: 'P2', varis: 3 });
  assert.strictEqual(l.bul(s => s.pid === 'P2').varis, 3);
  assert.strictEqual(l.bul(s => s.pid === 'P9'), null);
});