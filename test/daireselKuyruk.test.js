const test = require('node:test');
const assert = require('node:assert');
const DaireselKuyruk = require('../src/veri-yapilari/DaireselKuyruk');

test('yeni kuyruk boş olmalı', () => {
  const k = new DaireselKuyruk(3);
  assert.strictEqual(k.bosMu(), true);
  assert.strictEqual(k.onundeki(), null);
});

test('FIFO sırası korunmalı', () => {
  const k = new DaireselKuyruk(3);
  k.ekle('P1'); k.ekle('P2'); k.ekle('P3');
  assert.strictEqual(k.cikar(), 'P1');
  assert.strictEqual(k.cikar(), 'P2');
  assert.strictEqual(k.cikar(), 'P3');
  assert.strictEqual(k.bosMu(), true);
});

test('dairesel sarma: boşalan baş hücre tekrar kullanılmalı', () => {
  const k = new DaireselKuyruk(3);
  k.ekle('P1'); k.ekle('P2'); k.ekle('P3');
  k.cikar();      // P1 çıktı, 0. indeks boşaldı
  k.ekle('P4');   // 0. indekse yazılmalı
  assert.strictEqual(k.son, 0);
  assert.strictEqual(k.kapasite, 3); // büyümeden sığmalı
  assert.deepStrictEqual(k.elemanlar(), ['P2', 'P3', 'P4']);
});

test('dolunca kapasite iki katına çıkmalı, sıra bozulmamalı', () => {
  const k = new DaireselKuyruk(2);
  k.ekle('P1'); k.ekle('P2');
  k.cikar();      // P1
  k.ekle('P3');   // sarma ile 0. indekse
  k.ekle('P4');   // kuyruk dolu -> büyüt
  assert.strictEqual(k.kapasite, 4);
  assert.deepStrictEqual(k.elemanlar(), ['P2', 'P3', 'P4']);
});

test('Round Robin senaryosu: quantum biten süreç sona döner', () => {
  const k = new DaireselKuyruk(4);
  k.ekle('P1'); k.ekle('P2'); k.ekle('P3');
  const calisan = k.cikar(); // P1 CPU'ya geçti
  k.ekle(calisan);           // quantum bitti, kuyruğun sonuna döndü
  assert.deepStrictEqual(k.elemanlar(), ['P2', 'P3', 'P1']);
});

test('boş kuyruktan çıkarma hata vermeli', () => {
  const k = new DaireselKuyruk();
  assert.throws(() => k.cikar(), /Kuyruk boş/);
});