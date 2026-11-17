const test = require('node:test');
const assert = require('node:assert');
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

test('ders örneği: Gantt ve ortalamalar (3,33 / 6,67)', () => {
  const r = fifo(dersOrnegi());
  assert.strictEqual(r.yontem, 'FIFO');
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 5], [1002, 5, 8], [1003, 8, 10]]);
  assert.strictEqual(r.ortalama.bekleme, 3.33);
  assert.strictEqual(r.ortalama.donus, 6.67);
  assert.strictEqual(r.cpuKullanimi, 100);
  assert.strictEqual(r.baglamDegisimi, 2);
});

test('öğrenci senaryosu: konvoy etkisi, Spotify 95 ms bekler', () => {
  const r = fifo(senaryoYukle('ogrenci'));
  assert.deepStrictEqual(ozet(r.gantt), [
    [1001, 0, 80], [1002, 80, 110], [1003, 110, 120],
    [1004, 120, 145], [1005, 145, 195], [1006, 195, 200],
  ]);
  assert.strictEqual(satir(r, 1003).bekleme, 95);   // müzik 95 ms gecikti
  assert.strictEqual(satir(r, 1006).bekleme, 150);  // Discord bildirimi 150 ms gecikti
});

test('aynı anda gelenlerde PID küçük olan önce çalışmalı', () => {
  const r = fifo([
    new Surec({ pid: 1002, ad: 'Chrome', varis: 0, sure: 3 }),
    new Surec({ pid: 1001, ad: 'Spotify', varis: 0, sure: 2 }),
  ]);
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 2], [1002, 2, 5]]);
});

test('kimse yokken CPU boşta kalmalı', () => {
  const r = fifo([
    new Surec({ pid: 1001, ad: 'Chrome', varis: 0, sure: 4 }),
    new Surec({ pid: 1002, ad: 'Spotify', varis: 6, sure: 4 }),
  ]);
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 4], ['bos', 4, 6], [1002, 6, 10]]);
  assert.strictEqual(r.cpuKullanimi, 80);
});

test('bağlam değişimi süresi Gantt’a eklenmeli', () => {
  const r = fifo(dersOrnegi(), { gecis: 1 });
  assert.deepStrictEqual(ozet(r.gantt), [
    [1001, 0, 5], ['gecis', 5, 6], [1002, 6, 9], ['gecis', 9, 10], [1003, 10, 12],
  ]);
  assert.strictEqual(r.gecisSuresi, 2);
  assert.ok(r.cpuKullanimi < 100);
});

test('asıl süreç listesi değişmemeli', () => {
  const surecler = dersOrnegi();
  fifo(surecler);
  assert.ok(surecler.every(s => s.kalan === s.sure && s.bitis === null));
});

test('olay günlüğü zaman sırasında olmalı ve her süreci anlatmalı', () => {
  const r = fifo(dersOrnegi());
  const zamanlar = r.olaylar.map(o => o.zaman);
  assert.deepStrictEqual(zamanlar, [...zamanlar].sort((a, b) => a - b));
  for (const pid of [1001, 1002, 1003]) {
    assert.ok(r.olaylar.some(o => o.pid === pid && o.tip === 'geldi'));
    assert.ok(r.olaylar.some(o => o.pid === pid && o.tip === 'bitti'));
  }
});

test('görüntüler: t = 2 anında Antivirüs çalışıyor, kuyrukta Chrome ve Spotify var', () => {
  const r = fifo(dersOrnegi());
  const g = r.goruntuler.filter(x => x.zaman === 2).pop();
  assert.strictEqual(g.calisan, 1001);
  assert.deepStrictEqual(g.kuyruk, [1002, 1003]);
  assert.strictEqual(g.yapi.tur, 'dairesel');
  assert.strictEqual(g.yapi.hucreler.length, g.yapi.kapasite);
});

test('boş liste hata vermeli', () => {
  assert.throws(() => fifo([]), /en az bir süreç/);
});
