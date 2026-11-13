/**
 * Tek yönlü Bağlı Liste (Singly Linked List)
 * Projede iki yerde kullanılır:
 *  1) Tüm süreçlerin listesi (varış zamanına göre sıralı)
 *  2) Gantt şemasının parçaları (sona eklenerek)
 */

// Listenin her bir elemanı bir düğümdür: veri + sonraki düğümün adresi
class Dugum {
  constructor(veri) {
    this.veri = veri;
    this.sonraki = null;
  }
}

class BagliListe {
  constructor() {
    this.bas = null;   // head: ilk düğüm
    this.son = null;   // tail: son düğüm (sona eklemeyi O(1) yapar)
    this.boyut = 0;
  }

  bosMu() {
    return this.boyut === 0;
  }

  // Başa ekle - O(1)
  basaEkle(veri) {
    const yeni = new Dugum(veri);
    yeni.sonraki = this.bas;
    this.bas = yeni;
    if (this.son === null) this.son = yeni; // liste boştuysa son da bu düğüm
    this.boyut++;
  }

  // Sona ekle - O(1) (son işaretçisi sayesinde listeyi gezmeye gerek yok)
  sonaEkle(veri) {
    const yeni = new Dugum(veri);
    if (this.bosMu()) {
      this.bas = yeni;
    } else {
      this.son.sonraki = yeni;
    }
    this.son = yeni;
    this.boyut++;
  }

  // Sıralı ekle - O(n)
  // karsilastir(a, b) negatif dönerse a, b'den önce gelir.
  // Eşitlikte yeni eleman, eşit olanların SONUNA eklenir (önce gelen önde kalır).
  siraliEkle(veri, karsilastir) {
    // Durum 1: liste boş ya da yeni eleman en başa gelmeli
    if (this.bosMu() || karsilastir(veri, this.bas.veri) < 0) {
      this.basaEkle(veri);
      return;
    }
    // Durum 2: doğru yeri bul. "onceki" düğümün arkasına ekleyeceğiz.
    let onceki = this.bas;
    while (onceki.sonraki !== null && karsilastir(veri, onceki.sonraki.veri) >= 0) {
      onceki = onceki.sonraki;
    }
    const yeni = new Dugum(veri);
    yeni.sonraki = onceki.sonraki;
    onceki.sonraki = yeni;
    if (yeni.sonraki === null) this.son = yeni; // en sona eklendiyse son güncellenir
    this.boyut++;
  }

  // Baştan çıkar - O(1)
  bastanCikar() {
    if (this.bosMu()) {
      throw new Error('Liste boş');
    }
    const veri = this.bas.veri;
    this.bas = this.bas.sonraki;
    if (this.bas === null) this.son = null; // liste boşaldıysa son da sıfırlanır
    this.boyut--;
    return veri;
  }

  // Koşula uyan ilk elemanı bul - O(n)
  bul(kosul) {
    let gezici = this.bas;
    while (gezici !== null) {
      if (kosul(gezici.veri)) return gezici.veri;
      gezici = gezici.sonraki;
    }
    return null;
  }

  // Koşula uyan ilk elemanı sil - O(n). Silindiyse true döner.
  sil(kosul) {
    if (this.bosMu()) return false;

    // Silinecek eleman baştaysa
    if (kosul(this.bas.veri)) {
      this.bastanCikar();
      return true;
    }
    // Değilse, silinecek düğümün bir öncekini bul
    let onceki = this.bas;
    while (onceki.sonraki !== null) {
      if (kosul(onceki.sonraki.veri)) {
        const silinen = onceki.sonraki;
        onceki.sonraki = silinen.sonraki; // aradan çıkar: bağlantıyı atla
        if (silinen === this.son) this.son = onceki; // son silindiyse son güncellenir
        this.boyut--;
        return true;
      }
      onceki = onceki.sonraki;
    }
    return false;
  }

  // Listeyi baştan sona diziye çevirir - O(n)
  // Sunucudan arayüze JSON göndermek için kullanılacak
  diziyeCevir() {
    const sonuc = [];
    let gezici = this.bas;
    while (gezici !== null) {
      sonuc.push(gezici.veri);
      gezici = gezici.sonraki;
    }
    return sonuc;
  }
}

module.exports = BagliListe;