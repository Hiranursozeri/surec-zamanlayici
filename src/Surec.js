/**
 * Süreç (Process)
 * Bilgisayarda çalışmak isteyen tek bir uygulamayı temsil eder.
 * Örnek: "Spotify – müzik çalma", 15. ms'de geldi, 10 ms CPU istiyor.
 *
 * Bir süreç iki tür bilgi taşır:
 *  1) Kullanıcının girdiği bilgiler: pid, ad, tür, varış, süre, öncelik
 *  2) Simülasyon sırasında dolan bilgiler: kalan süre, ilk çalışma anı, bitiş anı
 */

// Süreç türleri ve varsayılan öncelikleri (1 = en yüksek öncelik)
// Gerçek işletim sistemlerinde de kullanıcının hemen fark edeceği işler
// (müzik, arama, oyun) yüksek, arka plan işleri düşük önceliklidir.
const TURLER = {
  etkilesimli: { etiket: 'Etkileşimli', oncelik: 1 }, // müzik, sesli arama, oyun
  kullanici:   { etiket: 'Kullanıcı',   oncelik: 2 }, // tarayıcı, editör, derleme
  sistem:      { etiket: 'Sistem',      oncelik: 3 }, // log yazma, ağ servisi
  arkaPlan:    { etiket: 'Arka plan',   oncelik: 4 }, // antivirüs, yedekleme
  bakim:       { etiket: 'Bakım',       oncelik: 5 }, // güncelleme, indeksleme
};

const SINIRLAR = {
  enKucukOncelik: 1,
  enBuyukOncelik: 5,
  enKisaSure: 1,      // ms
  enUzunSure: 500,    // ms
};

class Surec {
  constructor({ pid, ad, tur = 'kullanici', varis, sure, oncelik }) {
    if (!Number.isInteger(pid) || pid < 1) {
      throw new Error('PID pozitif bir tam sayı olmalı');
    }
    if (typeof ad !== 'string' || ad.trim() === '') {
      throw new Error('Sürecin bir adı olmalı');
    }
    if (!(tur in TURLER)) {
      throw new Error(`Bilinmeyen süreç türü: ${tur}`);
    }
    if (!Number.isInteger(varis) || varis < 0) {
      throw new Error('Varış zamanı 0 veya daha büyük bir tam sayı olmalı');
    }
    if (!Number.isInteger(sure) || sure < SINIRLAR.enKisaSure || sure > SINIRLAR.enUzunSure) {
      throw new Error(`Süre ${SINIRLAR.enKisaSure} ile ${SINIRLAR.enUzunSure} ms arasında olmalı`);
    }
    // Öncelik verilmezse türün varsayılan önceliği kullanılır
    const secilenOncelik = oncelik ?? TURLER[tur].oncelik;
    if (!Number.isInteger(secilenOncelik) ||
        secilenOncelik < SINIRLAR.enKucukOncelik || secilenOncelik > SINIRLAR.enBuyukOncelik) {
      throw new Error(`Öncelik ${SINIRLAR.enKucukOncelik} ile ${SINIRLAR.enBuyukOncelik} arasında olmalı`);
    }

    // Kullanıcının girdiği bilgiler
    this.pid = pid;
    this.ad = ad.trim();
    this.tur = tur;
    this.varis = varis;
    this.sure = sure;               // toplam CPU ihtiyacı (burst time)
    this.ilkOncelik = secilenOncelik;

    // Simülasyon sırasında değişen bilgiler
    this.oncelik = secilenOncelik;  // yaşlandırma ile değişebilir
    this.kalan = sure;              // kalan CPU ihtiyacı
    this.ilkCalisma = null;         // CPU'ya ilk kez alındığı an (yanıt süresi için)
    this.bitis = null;              // işini bitirdiği an
  }

  get turEtiketi() {
    return TURLER[this.tur].etiket;
  }

  bittiMi() {
    return this.kalan === 0;
  }

  // Süreci "simdi" anında ms kadar çalıştırır.
  // Gerçekte kaç ms çalıştığını döndürür (kalan süreden fazla çalışamaz).
  calistir(simdi, ms) {
    if (this.bittiMi()) {
      throw new Error(`${this.ad} zaten bitti`);
    }
    if (this.ilkCalisma === null) {
      this.ilkCalisma = simdi;
    }
    const calisilan = Math.min(ms, this.kalan);
    this.kalan -= calisilan;
    if (this.bittiMi()) {
      this.bitis = simdi + calisilan;
    }
    return calisilan;
  }

  // Simülasyon bilgileri sıfırlanmış yeni bir kopya.
  // Her zamanlama yöntemi kendi kopyasıyla çalışır, böylece
  // aynı süreç seti üç yöntemde de baştan başlar.
  kopya() {
    return new Surec({
      pid: this.pid,
      ad: this.ad,
      tur: this.tur,
      varis: this.varis,
      sure: this.sure,
      oncelik: this.ilkOncelik,
    });
  }

  // Arayüze gönderilecek sade hali
  jsonHali() {
    return {
      pid: this.pid,
      ad: this.ad,
      tur: this.tur,
      turEtiketi: this.turEtiketi,
      varis: this.varis,
      sure: this.sure,
      oncelik: this.ilkOncelik,
      ilkCalisma: this.ilkCalisma,
      bitis: this.bitis,
    };
  }
}

module.exports = { Surec, TURLER, SINIRLAR };