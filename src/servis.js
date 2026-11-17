/**
 * Servis katmanı
 * Arayüzden gelen ham JSON'u kontrol eder, Surec nesnelerine çevirir
 * ve istenen zamanlama yöntemini çalıştırır.
 *
 * Sunucu (app.js) sadece istekleri karşılar, asıl iş burada yapılır.
 * Böylece bu fonksiyonlar sunucu olmadan da test edilebilir.
 */
const { Surec } = require('./Surec');
const fifo = require('./zamanlayicilar/fifo');
const roundRobin = require('./zamanlayicilar/roundRobin');
const oncelikli = require('./zamanlayicilar/oncelikli');

const EN_FAZLA_SUREC = 20;

// Kullanıcının hatalı girişinden kaynaklanan hata (sunucu 400 döndürür)
class GirisHatasi extends Error {}

// Ham süreç listesini kontrol edip Surec nesnelerine çevirir
function surecleriOlustur(ham) {
  if (!Array.isArray(ham) || ham.length === 0) {
    throw new GirisHatasi('En az bir süreç eklemelisiniz');
  }
  if (ham.length > EN_FAZLA_SUREC) {
    throw new GirisHatasi(`En fazla ${EN_FAZLA_SUREC} süreç eklenebilir`);
  }
  const gorulenPidler = new Set();
  return ham.map((bilgi, i) => {
    if (gorulenPidler.has(bilgi?.pid)) {
      throw new GirisHatasi(`PID ${bilgi.pid} birden fazla süreçte kullanılmış`);
    }
    gorulenPidler.add(bilgi?.pid);
    try {
      return new Surec(bilgi ?? {});
    } catch (hata) {
      // Hangi satırda hata olduğunu kullanıcıya söyle
      const ad = bilgi && bilgi.ad ? bilgi.ad : `${i + 1}. süreç`;
      throw new GirisHatasi(`${ad}: ${hata.message}`);
    }
  });
}

// Ayarları kontrol eder ve varsayılan değerleri doldurur
function ayarlariOku(ham) {
  ham = ham ?? {};   // ayar gönderilmediyse hepsi varsayılan
  const ayar = {
    quantum: ham.quantum ?? 20,
    kesintili: ham.kesintili ?? true,
    yaslandirma: ham.yaslandirma ?? 0,
    gecis: ham.gecis ?? 0,
  };
  if (!Number.isInteger(ayar.quantum) || ayar.quantum < 1 || ayar.quantum > 500) {
    throw new GirisHatasi('Quantum 1 ile 500 ms arasında bir tam sayı olmalı');
  }
  if (typeof ayar.kesintili !== 'boolean') {
    throw new GirisHatasi('Kesintili ayarı true ya da false olmalı');
  }
  if (!Number.isInteger(ayar.yaslandirma) || ayar.yaslandirma < 0 || ayar.yaslandirma > 500) {
    throw new GirisHatasi('Yaşlandırma 0 (kapalı) ile 500 ms arasında bir tam sayı olmalı');
  }
  if (!Number.isInteger(ayar.gecis) || ayar.gecis < 0 || ayar.gecis > 50) {
    throw new GirisHatasi('Bağlam değişimi süresi 0 ile 50 ms arasında bir tam sayı olmalı');
  }
  return ayar;
}

// Yöntem adını gerçek fonksiyona bağlar
const YONTEMLER = {
  fifo: (surecler, a) => fifo(surecler, { gecis: a.gecis }),
  rr: (surecler, a) => roundRobin(surecler, { quantum: a.quantum, gecis: a.gecis }),
  oncelikli: (surecler, a) => oncelikli(surecler, {
    kesintili: a.kesintili, yaslandirma: a.yaslandirma, gecis: a.gecis,
  }),
};

// Tek yöntemle simülasyon
function simule({ surecler, yontem, ayarlar } = {}) {
  if (!Object.hasOwn(YONTEMLER, yontem)) {
    throw new GirisHatasi('Yöntem fifo, rr ya da oncelikli olmalı');
  }
  return YONTEMLER[yontem](surecleriOlustur(surecler), ayarlariOku(ayarlar));
}

// Aynı süreç setini üç yöntemle çalıştırıp özetleri yan yana verir.
// Karşılaştırma ekranında Gantt ve olaylar gerekmediği için sadece özet döner.
function karsilastir({ surecler, ayarlar } = {}) {
  const liste = surecleriOlustur(surecler);
  const ayar = ayarlariOku(ayarlar);
  return Object.entries(YONTEMLER).map(([id, calistir]) => {
    const r = calistir(liste, ayar);
    return {
      id,
      yontem: r.yontem,
      ortalama: r.ortalama,
      cpuKullanimi: r.cpuKullanimi,
      baglamDegisimi: r.baglamDegisimi,
      toplamSure: r.toplamSure,
      surecler: r.surecler.map(s => ({ pid: s.pid, ad: s.ad, bekleme: s.bekleme, yanit: s.yanit, donus: s.donus })),
    };
  });
}

module.exports = { simule, karsilastir, surecleriOlustur, ayarlariOku, GirisHatasi, EN_FAZLA_SUREC };