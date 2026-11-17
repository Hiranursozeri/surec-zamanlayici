const test = require('node:test');
const assert = require('node:assert');
const MinHeap = require('../src/veri-yapilari/MinHeap');

// Heap kuralını kontrol eder: her ebeveyn, çocuklarından küçük ya da eşit olmalı
function heapKuraliSaglaniyorMu(h) {
  const d = h.diziHali();
  for (let i = 0; i < d.length; i++) {
    const sol = 2 * i + 1;
    const sag = 2 * i + 2;
    if (sol < d.length && h.karsilastir(d[i], d[sol]) > 0) return false;
    if (sag < d.length && h.karsilastir(d[i], d[sag]) > 0) return false;
  }
  return true;
}

test('yeni heap boş olmalı', () => {
  const h = new MinHeap();
  assert.strictEqual(h.bosMu(), true);
  assert.strictEqual(h.enKucuk(), null);
});

test('ekle: yukarı taşıma adım adım doğru çalışmalı', () => {
  const h = new MinHeap();
  h.ekle(5); h.ekle(3); h.ekle(8);
  assert.deepStrictEqual(h.diziHali(), [3, 5, 8]);
  h.ekle(1); // sona eklenir, önce 5 ile sonra 3 ile yer değiştirip köke çıkar
  assert.deepStrictEqual(h.diziHali(), [1, 3, 8, 5]);
});

test('cikar: aşağı taşıma adım adım doğru çalışmalı', () => {
  const h = new MinHeap();
  [5, 3, 8, 1].forEach(x => h.ekle(x)); // [1, 3, 8, 5]
  assert.strictEqual(h.cikar(), 1);     // 5 köke gelir, 3 ile yer değiştirir
  assert.deepStrictEqual(h.diziHali(), [3, 5, 8]);
});

test('karışık sayılar küçükten büyüğe çıkmalı', () => {
  const h = new MinHeap();
  [42, 7, 19, 3, 25, 3, 88, 1, 56, 14].forEach(x => h.ekle(x));
  assert.strictEqual(heapKuraliSaglaniyorMu(h), true);
  const cikanlar = [];
  while (!h.bosMu()) cikanlar.push(h.cikar());
  assert.deepStrictEqual(cikanlar, [1, 3, 3, 7, 14, 19, 25, 42, 56, 88]);
});

test('her ekleme ve çıkarmadan sonra heap kuralı korunmalı', () => {
  const h = new MinHeap();
  for (const x of [9, 4, 7, 1, 8, 2, 6]) {
    h.ekle(x);
    assert.strictEqual(heapKuraliSaglaniyorMu(h), true);
  }
  while (!h.bosMu()) {
    h.cikar();
    assert.strictEqual(heapKuraliSaglaniyorMu(h), true);
  }
});

test('özel karşılaştırma ile max-heap gibi çalışabilmeli', () => {
  const h = new MinHeap((a, b) => b - a); // ters kural: büyük olan önce
  [2, 9, 4].forEach(x => h.ekle(x));
  assert.strictEqual(h.cikar(), 9);
});

test('boş heapten çıkarma hata vermeli', () => {
  const h = new MinHeap();
  assert.throws(() => h.cikar(), /Heap boş/);
});