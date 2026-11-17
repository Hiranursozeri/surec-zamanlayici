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
  k.ekle(surec('P1', 0, 2));
  k.ekle(surec('P2', 1, 3));
  k.ekle(surec('P3', 2, 1));
  assert.strictEqual(k.cikar().pid, 'P3');
  assert.strictEqual(k.cikar().pid, 'P1');
  assert.strictEqual(k.cikar().pid, 'P2');
  assert.strictEqual(k.bosMu(), true);
});

test('öncelikler eşitse önce gelen önde olmalı', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec('P4', 3, 2)); // geç gelen ama önce eklenen
  k.ekle(surec('P1', 0, 2)); // erken gelen
  assert.deepStrictEqual(k.elemanlar().map(s => s.pid), ['P1', 'P4']);
});

test('onundeki elemanı çıkarmadan göstermeli', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec('P1', 0, 2));
  k.ekle(surec('P3', 2, 1));
  assert.strictEqual(k.onundeki().pid, 'P3');
  assert.strictEqual(k.boyut, 2); // hâlâ 2 eleman olmalı
});

test('dokümandaki örnek: t = 5 anında P3, P2’den önce seçilmeli', () => {
  const k = new OncelikKuyrugu();
  k.ekle(surec('P2', 1, 3));
  k.ekle(surec('P3', 2, 1));
  assert.strictEqual(k.cikar().pid, 'P3');
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