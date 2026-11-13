/**
 * Dairesel Kuyruk (Circular Queue)
 * Dizi tabanlıdır. Dolduğunda kapasitesini iki katına çıkarır.
 * FIFO ve Round Robin zamanlayıcılarında "hazır kuyruğu" olarak kullanılır.
 */
class DaireselKuyruk {
  constructor(kapasite = 8) {
    if (!Number.isInteger(kapasite) || kapasite < 1) {
      throw new Error('Kapasite pozitif bir tam sayı olmalı');
    }
    this.dizi = new Array(kapasite);
    this.kapasite = kapasite;
    this.bas = 0;    // front: sıradaki çıkacak elemanın indeksi
    this.son = -1;   // rear: en son eklenen elemanın indeksi
    this.boyut = 0;  // kuyruktaki eleman sayısı
  }

  bosMu() {
    return this.boyut === 0;
  }

  doluMu() {
    return this.boyut === this.kapasite;
  }

  // enqueue - O(1) (büyütme gerektiğinde O(n))
  ekle(eleman) {
    if (this.doluMu()) {
      this.#buyut();
    }
    this.son = (this.son + 1) % this.kapasite; // sona gelince başa sar
    this.dizi[this.son] = eleman;
    this.boyut++;
  }

  // dequeue - O(1)
  cikar() {
    if (this.bosMu()) {
      throw new Error('Kuyruk boş');
    }
    const eleman = this.dizi[this.bas];
    this.dizi[this.bas] = undefined;            // hücreyi temizle
    this.bas = (this.bas + 1) % this.kapasite;  // sona gelince başa sar
    this.boyut--;
    return eleman;
  }

  // peek - O(1)
  onundeki() {
    return this.bosMu() ? null : this.dizi[this.bas];
  }

  // Kuyruğun anlık içeriği (baştan sona) - O(n)
  // Arayüzdeki adım adım modda kuyruğu göstermek için kullanılacak
  elemanlar() {
    const sonuc = [];
    for (let i = 0; i < this.boyut; i++) {
      sonuc.push(this.dizi[(this.bas + i) % this.kapasite]);
    }
    return sonuc;
  }

  // Kapasiteyi iki katına çıkarır, elemanları sırasıyla yeni dizinin başına dizer - O(n)
  #buyut() {
    const yeniKapasite = this.kapasite * 2;
    const yeniDizi = new Array(yeniKapasite);
    for (let i = 0; i < this.boyut; i++) {
      yeniDizi[i] = this.dizi[(this.bas + i) % this.kapasite];
    }
    this.dizi = yeniDizi;
    this.kapasite = yeniKapasite;
    this.bas = 0;
    this.son = this.boyut - 1;
  }
}

module.exports = DaireselKuyruk;