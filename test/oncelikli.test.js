const test = require('node:test');
const assert = require('node:assert');
const oncelikli = require('../src/zamanlayicilar/oncelikli');
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

test('kesintisiz, ders örneği: Gantt ve ortalamalar (3,00 / 6,33)', () => {
  const r = oncelikli(dersOrnegi(), { kesintili: false });
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 5], [1003, 5, 7], [1002, 7, 10]]);
  assert.strictEqual(r.ortalama.bekleme, 3);
  assert.strictEqual(r.ortalama.donus, 6.33);
  assert.strictEqual(r.yontem, 'Öncelikli (kesintisiz)');
});

test('kesintili, ders örneği: Spotify gelince Antivirüs durdurulmalı (2,67 / 6,00)', () => {
  const r = oncelikli(dersOrnegi(), { kesintili: true });
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 2], [1003, 2, 4], [1001, 4, 7], [1002, 7, 10]]);
  assert.strictEqual(r.ortalama.bekleme, 2.67);
  assert.strictEqual(r.ortalama.donus, 6);
  assert.strictEqual(satir(r, 1003).bekleme, 0);
  assert.strictEqual(r.baglamDegisimi, 3);
  assert.ok(r.olaylar.some(o => o.zaman === 2 && o.pid === 1001 && o.tip === 'durdu'));
});

test('kesintili: daha az önemli bir süreç gelirse çalışan süreç kesilmemeli', () => {
  // t = 1'de Chrome (3) geldi, Antivirüs (2) çalışmaya devam etmeli
  const r = oncelikli(dersOrnegi(), { kesintili: true });
  assert.ok(!r.olaylar.some(o => o.zaman === 1 && o.tip === 'durdu'));
});

test('kesintili: eşit öncelikli süreç gelirse çalışan süreç kesilmemeli', () => {
  const r = oncelikli([
    new Surec({ pid: 1001, ad: 'Chrome', varis: 0, sure: 5, oncelik: 2 }),
    new Surec({ pid: 1002, ad: 'VS Code', varis: 2, sure: 3, oncelik: 2 }),
  ], { kesintili: true });
  assert.deepStrictEqual(ozet(r.gantt), [[1001, 0, 5], [1002, 5, 8]]);
});

test('telefon senaryosu: kesintili modda gelen arama hiç beklememeli', () => {
  const kesintisiz = oncelikli(senaryoYukle('telefon'), { kesintili: false });
  const kesintili = oncelikli(senaryoYukle('telefon'), { kesintili: true });
  assert.strictEqual(satir(kesintisiz, 1003).yanit, 88);  // yedekleme bitene kadar bekler
  assert.strictEqual(satir(kesintili, 1003).yanit, 0);    // hemen açılır
});

test('oyun senaryosu: yaşlandırma Steam güncellemesinin açlığını azaltmalı', () => {
  const yok = oncelikli(senaryoYukle('oyun'), { yaslandirma: 0 });
  const var_ = oncelikli(senaryoYukle('oyun'), { yaslandirma: 20 });
  assert.strictEqual(satir(yok, 1001).ilkCalisma, 140);   // herkes bittikten sonra
  assert.strictEqual(satir(var_, 1001).ilkCalisma, 90);   // daha erken
  assert.ok(!yok.olaylar.some(o => o.tip === 'yaslandi'));
});

test('yaşlandırma: Steam’in önceliği her 20 ms’de bir kademe yükselmeli', () => {
  const r = oncelikli(senaryoYukle('oyun'), { yaslandirma: 20 });
  const steam = r.olaylar.filter(o => o.pid === 1001 && o.tip === 'yaslandi');
  assert.deepStrictEqual(steam.map(o => o.zaman), [20, 40, 60, 80]);
  assert.match(steam[3].mesaj, /2 → 1/);
});

test('görüntüler heap yapısını içermeli', () => {
  const r = oncelikli(dersOrnegi(), { kesintili: false });
  const g = r.goruntuler.find(x => x.zaman === 2);
  assert.strictEqual(g.yapi.tur, 'heap');
  assert.strictEqual(g.yapi.agac[0].pid, 1003);  // kökte en önemli süreç
});

test('tüm senaryolar, iki modda: her süreç bitmeli ve toplam çalışma doğru olmalı', () => {
  for (const id of ['ogrenci', 'oyun', 'sunucu', 'telefon']) {
    for (const ayar of [{ kesintili: false }, { kesintili: true }, { kesintili: true, yaslandirma: 10, gecis: 1 }]) {
      const surecler = senaryoYukle(id);
      const r = oncelikli(surecler, ayar);
      assert.ok(r.surecler.every(s => s.bitis !== null), `${id}: bitmeyen süreç var`);
      const calisma = r.gantt.filter(p => p.tur === 'surec').reduce((t, p) => t + p.bitis - p.baslangic, 0);
      assert.strictEqual(calisma, surecler.reduce((t, s) => t + s.sure, 0), `${id}: süreler tutmuyor`);
    }
  }
});

test('geçersiz yaşlandırma değeri hata vermeli', () => {
  assert.throws(() => oncelikli(dersOrnegi(), { yaslandirma: -5 }), /Yaşlandırma/);
});