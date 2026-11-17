const test = require('node:test');
const assert = require('node:assert');
const OncelikKuyrugu = require('../src/veri-yapilari/OncelikKuyrugu');

// Testlerde kullanacağımız küçük yardımcı: süreç nesnesi oluşturur
const surec = (pid, varis, oncelik) => ({ pid, varis, oncelik });

test('yeni kuyruk boş olmalı', () => {
  const k = new OncelikKuyrugu();
  assert.strictEqual(k.bosMu(), true);
  assert.strictEqual(k.boyut, 0);
  assert.strictEqual(k.onundeki(), null);
});

test('en öncelikli (en küçük sayı) önce çıkmalı', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec(1001, 0, 2));
  k.ekle(surec(1002, 1, 3));
  k.ekle(surec(1003, 2, 1));
  assert.strictEqual(k.cikar().pid, 1003);
  assert.strictEqual(k.cikar().pid, 1001);
  assert.strictEqual(k.cikar().pid, 1002);
  assert.strictEqual(k.bosMu(), true);
});

test('öncelikler eşitse önce gelen önde olmalı', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec(1004, 3, 2)); // geç gelen ama önce eklenen
  k.ekle(surec(1001, 0, 2)); // erken gelen
  assert.deepStrictEqual(k.elemanlar().map(s => s.pid), [1001, 1004]);
});

test('öncelik ve varış eşitse PID küçük olan önde olmalı', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec(1002, 0, 1));
  k.ekle(surec(1001, 0, 1));
  assert.strictEqual(k.cikar().pid, 1001);
});

test('onundeki elemanı çıkarmadan göstermeli', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec(1001, 0, 2));
  k.ekle(surec(1003, 2, 1));
  assert.strictEqual(k.onundeki().pid, 1003);
  assert.strictEqual(k.boyut, 2); // hâlâ 2 eleman olmalı
});

test('elemanlar() sıralı liste vermeli ama kuyruğu bozmamalı', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec(1001, 0, 2));
  k.ekle(surec(1002, 1, 3));
  k.ekle(surec(1003, 2, 1));
  assert.deepStrictEqual(k.elemanlar().map(s => s.pid), [1003, 1001, 1002]);
  assert.strictEqual(k.boyut, 3);
  assert.strictEqual(k.cikar().pid, 1003);
});

test('boş kuyruktan çıkarma hata vermeli', () => {
  const k = new OncelikKuyrugu();
  assert.throws(() => k.cikar(), /Kuyruk boş/);
});

test('dairesel kuyrukla aynı metotlara sahip olmalı', () => {
  const k = new OncelikKuyrugu();
  for (const metot of ['ekle', 'cikar', 'onundeki', 'bosMu', 'elemanlar']) {
    assert.strictEqual(typeof k[metot], 'function', metot + ' eksik');
  }
});