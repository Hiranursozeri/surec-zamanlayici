const test = require('node:test');
const assert = require('node:assert');
const { senaryoListesi, senaryoYukle } = require('../src/senaryolar');
const { Surec } = require('../src/Surec');

test('dört senaryo olmalı', () => {
  const ids = senaryoListesi().map(s => s.id);
  assert.deepStrictEqual(ids, ['ogrenci', 'oyun', 'sunucu', 'telefon']);
});

test('her senaryonun özet bilgileri dolu olmalı', () => {
  for (const s of senaryoListesi()) {
    assert.ok(s.ad && s.aciklama && s.ders, `${s.id} bilgileri eksik`);
    assert.ok(s.onerilenQuantum > 0, `${s.id} quantum değeri yok`);
  }
});

test('her senaryo geçerli Surec nesneleri üretmeli', () => {
  for (const { id, surecSayisi } of senaryoListesi()) {
    const surecler = senaryoYukle(id); // geçersiz veri varsa Surec burada hata fırlatır
    assert.strictEqual(surecler.length, surecSayisi);
    assert.ok(surecler.length <= 20, `${id} 20 süreçten fazla`);
    assert.ok(surecler.every(s => s instanceof Surec));
  }
});

test('PID’ler her senaryoda benzersiz olmalı', () => {
  for (const { id } of senaryoListesi()) {
    const pidler = senaryoYukle(id).map(s => s.pid);
    assert.strictEqual(new Set(pidler).size, pidler.length, `${id} içinde aynı PID var`);
  }
});

test('her senaryo hikâyesi için gerekli süreçleri içermeli', () => {
  for (const { id } of senaryoListesi()) {
    const surecler = senaryoYukle(id);
    assert.ok(surecler.some(s => s.varis === 0), `${id}: 0. ms'de başlayan süreç yok`);
    assert.ok(surecler.some(s => s.oncelik === 1), `${id}: etkileşimli (öncelik 1) süreç yok`);
    assert.ok(surecler.some(s => s.oncelik >= 4), `${id}: düşük öncelikli süreç yok`);
  }
});

test('her yükleme yeni nesneler vermeli', () => {
  const ilk = senaryoYukle('ogrenci');
  ilk[0].calistir(0, 80); // antivirüsü bitir
  const ikinci = senaryoYukle('ogrenci');
  assert.strictEqual(ikinci[0].kalan, 80);
  assert.notStrictEqual(ilk[0], ikinci[0]);
});

test('olmayan senaryo hata vermeli', () => {
  assert.throws(() => senaryoYukle('uzay-istasyonu'), /Böyle bir senaryo yok/);
});