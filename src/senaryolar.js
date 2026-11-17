/**
 * Hazır Senaryolar
 * Gerçek hayattan dört durum. Her senaryo, zamanlama yöntemlerinin
 * farklı bir davranışını göstermek için tasarlandı ("ders" alanı).
 *
 * Birimler: varış ve süre milisaniye (ms). Öncelik verilmezse süreç türünden gelir.
 */
const { Surec } = require('./Surec');

const SENARYOLAR = {
  ogrenci: {
    ad: 'Öğrenci bilgisayarı',
    aciklama: 'Ödev yaparken müzik dinleyen bir öğrenci. Arka planda antivirüs taraması ve güncelleme var.',
    ders: 'FIFO’da uzun antivirüs taraması herkesi bekletir ve müzik takılır (konvoy etkisi).',
    onerilenQuantum: 20,
    surecler: [
      { pid: 1001, ad: 'Antivirüs taraması',     tur: 'arkaPlan',    varis: 0,  sure: 80 },
      { pid: 1002, ad: 'VS Code – proje derleme', tur: 'kullanici',   varis: 10, sure: 30 },
      { pid: 1003, ad: 'Spotify – müzik çalma',   tur: 'etkilesimli', varis: 15, sure: 10 },
      { pid: 1004, ad: 'Chrome – sayfa yükleme',  tur: 'kullanici',   varis: 20, sure: 25 },
      { pid: 1005, ad: 'Windows Update',          tur: 'bakim',       varis: 30, sure: 50 },
      { pid: 1006, ad: 'Discord – mesaj bildirimi', tur: 'etkilesimli', varis: 45, sure: 5 },
    ],
  },

  oyun: {
    ad: 'Oyun oynarken',
    aciklama: 'Arkadaşlarıyla sesli sohbet ederek oyun oynayan ve oyunu kaydeden bir kullanıcı.',
    ders: 'Öncelikli yöntemde oyun akıcı kalır ama Steam güncellemesi hep ertelenir (açlık). Yaşlandırma bunu çözer.',
    onerilenQuantum: 10,
    surecler: [
      { pid: 1001, ad: 'Steam – oyun güncellemesi',    tur: 'bakim',       varis: 0,  sure: 120 },
      { pid: 1002, ad: 'Oyun – kare çizimi',           tur: 'etkilesimli', varis: 0,  sure: 40 },
      { pid: 1003, ad: 'Discord – sesli sohbet',       tur: 'etkilesimli', varis: 5,  sure: 15 },
      { pid: 1004, ad: 'OBS – ekran kaydı',            tur: 'kullanici',   varis: 10, sure: 35 },
      { pid: 1005, ad: 'Tarayıcı – rehber videosu',    tur: 'kullanici',   varis: 25, sure: 20 },
      { pid: 1006, ad: 'Windows Defender – hızlı tarama', tur: 'arkaPlan', varis: 40, sure: 30 },
    ],
  },

  sunucu: {
    ad: 'Web sunucusu',
    aciklama: 'Bir e-ticaret sitesinin sunucusu. Müşteri istekleri gelirken gece yedeklemesi de çalışıyor.',
    ders: 'Round Robin’de kısa müşteri istekleri uzun yedeklemenin arkasında kalmaz, herkes sırayla hizmet alır.',
    onerilenQuantum: 15,
    surecler: [
      { pid: 1001, ad: 'Gece yedeklemesi',          tur: 'arkaPlan',    varis: 0,  sure: 150 },
      { pid: 1002, ad: 'Kullanıcı girişi isteği',   tur: 'etkilesimli', varis: 5,  sure: 8 },
      { pid: 1003, ad: 'Ürün arama sorgusu',        tur: 'kullanici',   varis: 8,  sure: 25 },
      { pid: 1004, ad: 'Log dosyası yazma',         tur: 'sistem',      varis: 10, sure: 12 },
      { pid: 1005, ad: 'Sipariş onay e-postası',    tur: 'sistem',      varis: 20, sure: 18 },
      { pid: 1006, ad: 'Ödeme isteği',              tur: 'etkilesimli', varis: 22, sure: 10 },
      { pid: 1007, ad: 'Günlük satış raporu',       tur: 'bakim',       varis: 30, sure: 60 },
    ],
  },

  telefon: {
    ad: 'Akıllı telefon',
    aciklama: 'Instagram’da gezinirken arama gelen ve sonra fotoğraf çeken bir kullanıcı.',
    ders: 'Kesintili öncelikte gelen arama her şeyi durdurup hemen çalışır. Kesintisizde arama, Instagram bitene kadar bekler.',
    onerilenQuantum: 10,
    surecler: [
      { pid: 1001, ad: 'Fotoğraf yedekleme (bulut)', tur: 'arkaPlan',    varis: 0,  sure: 100 },
      { pid: 1002, ad: 'Instagram – akış yükleme',   tur: 'kullanici',   varis: 5,  sure: 30 },
      { pid: 1003, ad: 'Gelen arama',                tur: 'etkilesimli', varis: 12, sure: 15 },
      { pid: 1004, ad: 'WhatsApp – bildirim',        tur: 'sistem',      varis: 18, sure: 5 },
      { pid: 1005, ad: 'GPS – konum güncelleme',     tur: 'sistem',      varis: 25, sure: 8 },
      { pid: 1006, ad: 'Uygulama güncellemeleri',    tur: 'bakim',       varis: 30, sure: 70 },
      { pid: 1007, ad: 'Kamera – fotoğraf çekme',    tur: 'etkilesimli', varis: 50, sure: 12 },
    ],
  },
};

// Arayüzdeki "Senaryo seç" menüsü için özet liste
function senaryoListesi() {
  return Object.entries(SENARYOLAR).map(([id, s]) => ({
    id,
    ad: s.ad,
    aciklama: s.aciklama,
    ders: s.ders,
    onerilenQuantum: s.onerilenQuantum,
    surecSayisi: s.surecler.length,
  }));
}

// Senaryonun süreçlerini her çağrıda yeni Surec nesneleri olarak üretir.
// Böylece bir simülasyon süreçleri değiştirse bile senaryonun kendisi bozulmaz.
function senaryoYukle(id) {
  const s = SENARYOLAR[id];
  if (!s) {
    throw new Error(`Böyle bir senaryo yok: ${id}`);
  }
  return s.surecler.map(bilgi => new Surec(bilgi));
}

module.exports = { senaryoListesi, senaryoYukle };