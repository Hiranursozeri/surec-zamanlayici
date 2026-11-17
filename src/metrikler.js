/**
 * Metrikler
 * Simülasyon bittikten sonra sonuçları hesaplar.
 *
 * Girdi:
 *  - surecler: Simülasyonu bitmiş Surec nesneleri (bitis ve ilkCalisma dolu)
 *  - gantt:    Gantt şemasının parçaları, zaman sırasıyla. Bağlı liste ya da dizi olabilir.
 *              Her parça: { tur: 'surec' | 'bos' | 'gecis', pid, baslangic, bitis }
 *                'surec' = bir süreç çalıştı, 'bos' = CPU boşta,
 *                'gecis' = bağlam değişimi (CPU süreç değiştirirken harcanan süre)
 */

// Sayıyı virgülden sonra 2 basamağa yuvarlar: 3.3333 -> 3.33
function yuvarla(sayi) {
  return Math.round(sayi * 100) / 100;
}

// Tek bir sürecin metrikleri
function surecMetrikleri(s) {
  if (s.bitis === null || s.ilkCalisma === null) {
    throw new Error(`${s.ad} henüz bitmedi, metrikleri hesaplanamaz`);
  }
  const donus = s.bitis - s.varis;        // turnaround: gelişinden bitişine kadar geçen süre
  const bekleme = donus - s.sure;         // waiting: bu sürenin CPU'da çalışmadan geçen kısmı
  const yanit = s.ilkCalisma - s.varis;   // response: gelişinden ilk kez CPU'ya alınmasına kadar
  return { donus, bekleme, yanit };
}

// Bir listenin ortalaması
function ortalama(sayilar) {
  if (sayilar.length === 0) return 0;
  let toplam = 0;
  for (const x of sayilar) toplam += x;
  return toplam / sayilar.length;
}

// Gantt girdisini diziye çevirir (bağlı liste gelirse)
function parcalar(gantt) {
  return typeof gantt.diziyeCevir === 'function' ? gantt.diziyeCevir() : gantt;
}

// CPU'nun bir süreçten başka bir sürece kaç kez geçtiği.
// Aradaki boşta ve geçiş parçaları sayılmaz, sadece çalışan süreç değişimine bakılır.
// Örnek: Spotify -> Chrome -> Chrome -> Spotify  =>  2 değişim
function baglamDegisimiSayisi(gantt) {
  let sayi = 0;
  let oncekiPid = null;
  for (const p of parcalar(gantt)) {
    if (p.tur !== 'surec') continue;
    if (oncekiPid !== null && p.pid !== oncekiPid) sayi++;
    oncekiPid = p.pid;
  }
  return sayi;
}

// Tüm sonuçları hesaplar
function hesapla(surecler, gantt) {
  const liste = parcalar(gantt);

  // 1) Süreç bazında metrikler
  const satirlar = surecler.map(s => ({ ...s.jsonHali(), ...surecMetrikleri(s) }));

  // 2) Toplam süre ve CPU kullanımı
  // İlk sürecin gelişinden son sürecin bitişine kadar geçen sürede
  // CPU'nun ne kadarını gerçekten bir süreç çalıştırarak geçirdiği.
  let calisma = 0, bos = 0, gecis = 0;
  for (const p of liste) {
    const uzunluk = p.bitis - p.baslangic;
    if (p.tur === 'surec') calisma += uzunluk;
    else if (p.tur === 'bos') bos += uzunluk;
    else if (p.tur === 'gecis') gecis += uzunluk;
  }
  const baslangic = Math.min(...surecler.map(s => s.varis));
  const bitis = Math.max(...surecler.map(s => s.bitis));
  const toplamSure = bitis - baslangic;
  const cpuKullanimi = toplamSure === 0 ? 0 : (calisma / toplamSure) * 100;

  return {
    surecler: satirlar,
    ortalama: {
      bekleme: yuvarla(ortalama(satirlar.map(r => r.bekleme))),
      donus: yuvarla(ortalama(satirlar.map(r => r.donus))),
      yanit: yuvarla(ortalama(satirlar.map(r => r.yanit))),
    },
    toplamSure,
    cpuKullanimi: yuvarla(cpuKullanimi),   // yüzde
    bostaSure: bos,
    gecisSuresi: gecis,
    baglamDegisimi: baglamDegisimiSayisi(liste),
  };
}

module.exports = { hesapla, surecMetrikleri, baglamDegisimiSayisi, yuvarla };