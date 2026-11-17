const test = require('node:test');
const assert = require('node:assert');
const roundRobin = require('../src/zamanlayicilar/roundRobin');
const fifo = require('../src/zamanlayicilar/fifo');
const { Surec } = require('../src/Surec');
const { senaryoYukle } = require('../src/senaryolar');

// Takım rehberindeki örnek, gerçek isimlerle
function dersOrnegi() {
  return [
    new Surec({ pid: 1001, ad: 'Antivirüs', tur: 'arkaPlan', varis: 0, sure: 5, oncelik: 2 }),
    new Surec({ pid: 1002, ad: 'Chrome', tur: 'kullanici', varis: 1, sure: 3, oncelik: 3 }),
    new Surec({ pid: 1003, ad: 'Spotify', tur: 'etkilesimli', varis: 2, sure: 2, oncelik: 1 }),
  ];
}
const ozet = gantt => gantt.map(p => [p.tur === 'surec' ? p.pid : p.tur, p.baslangic, p.bitis]);
const satir = (r, pid) => r.surecler.find(s => s.pid === pid);

test('ders örneği (quantum 2): Gantt ve ortalamalar (4,00 / 7,33)', () => {
  const r = roundRobin(dersOrnegi(), { quantum: 2 });
  assert.deepStrictEqual(ozet(r.gantt), [
    [1001, 0, 2], [1002, 2, 4], [1003, 4, 6], [1001, 6, 8], [1002, 8, 9], [1001, 9, 10],
  ]);
  assert.strictEqual(r.ortalama.bekleme, 4);
  assert.strictEqual(r.ortalama.donus, 7.33);
  assert.strictEqual(r.ortalama.yanit, 1);   // FIFO'da 3,33 idi
  assert.strictEqual(r.baglamDegisimi, 5);
});

test('kural: t = 2’de Spotify, quantum’u dolan Antivirüs’ten önce kuyruğa girmeli', () => {
  const r = roundRobin(dersOrnegi(), { quantum: 2 });
  const g = r.goruntuler.filter(x => x.zaman === 2 && x.calisan === null).pop();
  assert.deepStrictEqual(g.kuyruk, [1002, 1003, 1001]);
});

test('öğrenci senaryosu: Spotify FIFO’dan çok daha az bekler', () => {
  const rr = roundRobin(senaryoYukle('ogrenci'), { quantum: 20 });
  const ff = fifo(senaryoYukle('ogrenci'));
  assert.ok(satir(rr, 1003).bekleme < satir(ff, 1003).bekleme);
  assert.ok(rr.ortalama.yanit < ff.ortalama.yanit);
});

test('quantum çok büyükse FIFO ile aynı sonucu vermeli', () => {
  const rr = roundRobin(dersOrnegi(), { quantum: 100 });
  const ff = fifo(dersOrnegi());
  assert.deepStrictEqual(ozet(rr.gantt), ozet(ff.gantt));
  assert.deepStrictEqual(rr.ortalama, ff.ortalama);
});

test('kuyrukta tek süreç varsa quantum dolunca aynı süreç devam etmeli', () => {
  const r = roundRobin([new Surec({ pid: 1001, ad: 'Chrome', varis: 0, sure: 5 })], { quantum: 2 });
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 5]]);  // parçalar birleşir
  assert.strictEqual(r.baglamDegisimi, 0);
});

test('küçük quantum + bağlam değişimi süresi CPU kullanımını düşürmeli', () => {
  const buyuk = roundRobin(dersOrnegi(), { quantum: 4, gecis: 1 });
  const kucuk = roundRobin(dersOrnegi(), { quantum: 1, gecis: 1 });
  assert.ok(kucuk.baglamDegisimi > buyuk.baglamDegisimi);
  assert.ok(kucuk.cpuKullanimi < buyuk.cpuKullanimi);
});

test('kimse yokken CPU boşta kalmalı', () => {
  const r = roundRobin([
    new Surec({ pid: 1001, ad: 'Chrome', varis: 0, sure: 3 }),
    new Surec({ pid: 1002, ad: 'Spotify', varis: 5, sure: 2 }),
  ], { quantum: 2 });
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 3], ['bos', 3, 5], [1002, 5, 7]]);
});

test('tüm senaryolarda her süreç bitmeli ve toplam çalışma doğru olmalı', () => {
  for (const id of ['ogrenci', 'oyun', 'sunucu', 'telefon']) {
    const surecler = senaryoYukle(id);
    const r = roundRobin(surecler, { quantum: 10 });
    assert.ok(r.surecler.every(s => s.bitis !== null), `${id}: bitmeyen süreç var`);
    const calisma = r.gantt.filter(p => p.tur === 'surec').reduce((t, p) => t + p.bitis - p.baslangic, 0);
    assert.strictEqual(calisma, surecler.reduce((t, s) => t + s.sure, 0), `${id}: süreler tutmuyor`);
  }
});

test('geçersiz quantum hata vermeli', () => {
  assert.throws(() => roundRobin(dersOrnegi(), { quantum: 0 }), /Quantum/);
  assert.throws(() => roundRobin(dersOrnegi(), {}), /Quantum/);
});