/**
 * Öncelikli Zamanlama (Priority Scheduling)
 * CPU boşaldığında, bekleyenler arasından en önemli olan (en küçük öncelik sayısı) seçilir.
 * Hazır kuyruğu: Öncelik kuyruğu (min-heap)
 *
 * Ayarlar:
 *  - kesintili:   true  -> daha önemli bir süreç gelirse çalışan süreç durdurulur
 *                 false -> çalışan süreç bitene kadar devam eder
 *  - yaslandirma: 0 -> kapalı. Örneğin 20 -> kuyrukta her 20 ms beklemede öncelik 1 kademe yükselir
 *  - gecis:       bağlam değişimi süresi (ms)
 *
 * Yaşlandırma kuralları:
 *  - Öncelik en fazla 1'e kadar yükselir.
 *  - Süreç CPU'ya alındığında kazandığı öncelikle çalışır. Kesintiye uğrayıp
 *    kuyruğa geri dönerse önceliği orijinal haline döner ve yaşlandırma yeniden başlar.
 *  - Kesinti sadece yeni bir süreç geldiğinde kontrol edilir.
 */
const Simulasyon = require('./Simulasyon');
const OncelikKuyrugu = require('../veri-yapilari/OncelikKuyrugu');

function oncelikli(surecler, { kesintili = false, yaslandirma = 0, gecis = 0 } = {}) {
  if (!Number.isInteger(yaslandirma) || yaslandirma < 0) {
    throw new Error('Yaşlandırma aralığı 0 (kapalı) veya pozitif bir tam sayı olmalı');
  }
  const sim = new Simulasyon(surecler, new OncelikKuyrugu(), { gecis });

  // Kuyrukta bekleyen süreçlerin önceliklerini bekleme sürelerine göre günceller
  function yaslandir() {
    if (yaslandirma === 0 || sim.kuyruk.bosMu()) return;

    // Heap'teki bir elemanın önceliğini içeriden değiştirmek heap kuralını bozar.
    // Bu yüzden herkesi çıkarıyor, önceliklerini güncelliyor ve tekrar ekliyoruz.
    const bekleyenler = [];
    while (!sim.kuyruk.bosMu()) bekleyenler.push(sim.kuyruk.cikar());

    let degistiMi = false;
    for (const s of bekleyenler) {
      const giris = s.kuyrugaGiris ?? s.varis;       // kuyruğa en son girdiği an
      const kademe = Math.floor((sim.t - giris) / yaslandirma);
      const yeni = Math.max(1, s.ilkOncelik - kademe);
      // Önceliğin yükseldiği her anı olay günlüğüne kendi zamanıyla yaz
      for (let p = s.oncelik - 1; p >= yeni; p--) {
        const an = giris + (s.ilkOncelik - p) * yaslandirma;
        sim.olay(an, 'yaslandi', s,
          `${s.ad} ${an - giris} ms'dir bekliyor, önceliği ${p + 1} → ${p} oldu (yaşlandırma)`);
        degistiMi = true;
      }
      s.oncelik = yeni;
    }

    for (const s of bekleyenler) sim.kuyruk.ekle(s);
    if (degistiMi) sim.goruntu();
  }

  // Kuyruğun başındaki, çalışan süreçten daha mı önemli?
  // Eşitlikte kesmiyoruz: çalışan süreç devam eder.
  function dahaOnemliVarMi() {
    yaslandir();
    const enOnemli = sim.kuyruk.onundeki();
    return enOnemli !== null && enOnemli.oncelik < sim.calisan.oncelik;
  }

  // Çalışan süreci durdurup kuyruğa geri koyar
  function kes() {
    const s = sim.durdur(`${sim.calisan.ad} durduruldu, daha önemli ${sim.kuyruk.onundeki().ad} geldi`);
    s.oncelik = s.ilkOncelik;  // kazandığı öncelik sıfırlanır
    s.kuyrugaGiris = sim.t;    // yaşlandırma bu andan itibaren yeniden sayar
    sim.kuyruk.ekle(s);
    sim.goruntu();
  }

  while (!sim.bittiMi()) {
    sim.gelenleriAl();

    if (sim.kuyruk.bosMu()) {
      sim.bostaBekle();
      continue;
    }

    yaslandir();
    const s = sim.kuyruk.cikar();   // en önemli süreç
    sim.basla(s, `${s.ad} CPU'ya alındı (öncelik ${s.oncelik})`);

    // Bağlam değişimi sırasında daha önemli biri geldiyse hemen kes
    if (kesintili && dahaOnemliVarMi()) {
      kes();
      continue;
    }

    sim.calistir(s.kalan, kesintili ? dahaOnemliVarMi : null);

    if (!s.bittiMi()) {
      kes();   // calistir erken döndüyse sebebi kesintidir
    }
  }

  const ad = ['Öncelikli', kesintili ? 'kesintili' : 'kesintisiz'];
  if (yaslandirma > 0) ad.push(`yaşlandırma ${yaslandirma} ms`);
  return sim.sonuc(`${ad[0]} (${ad.slice(1).join(', ')})`);
}

module.exports = oncelikli;