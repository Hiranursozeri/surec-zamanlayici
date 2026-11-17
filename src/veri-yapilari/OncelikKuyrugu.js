/**
 * Öncelik Kuyruğu (Priority Queue) - Sıralı bağlı liste ile
 * En öncelikli eleman her zaman listenin başında durur.
 * Öncelikli zamanlamada "hazır kuyruğu" olarak kullanılır.
 *
 * Not: Hoca heap'i anlattıktan sonra bu dosyanın içi min-heap ile
 * yeniden yazılacak. Metot adları aynı kalacağı için zamanlayıcı
 * kodlarında hiçbir şey değişmeyecek.
 */
const BagliListe = require('./BagliListe');

// Varsayılan kural: önce önceliğe bak (küçük sayı = daha önemli),
// öncelikler eşitse önce gelen (varış zamanı küçük olan) öne geçer.
function varsayilanKarsilastir(a, b) {
  if (a.oncelik !== b.oncelik) {
    return a.oncelik - b.oncelik;
  }
  return a.varis - b.varis;
}

class OncelikKuyrugu {
  constructor(karsilastir = varsayilanKarsilastir) {
    this.liste = new BagliListe();  // elemanları sıralı tutan bağlı liste
    this.karsilastir = karsilastir;
  }

  get boyut() {
    return this.liste.boyut;
  }

  bosMu() {
    return this.liste.bosMu();
  }

  // Ekle - O(n): doğru yeri bulana kadar listeyi gezer
  ekle(eleman) {
    this.liste.siraliEkle(eleman, this.karsilastir);
  }

  // En öncelikliyi çıkar - O(1): o zaten listenin başında
  cikar() {
    if (this.bosMu()) {
      throw new Error('Kuyruk boş');
    }
    return this.liste.bastanCikar();
  }

  // En öncelikliye bak ama çıkarma - O(1)
  onundeki() {
    return this.bosMu() ? null : this.liste.bas.veri;
  }

  // Kuyruğun anlık içeriği (en öncelikliden en aza) - O(n)
  // Arayüzdeki adım adım modda göstermek için
  elemanlar() {
    return this.liste.diziyeCevir();
  }
}

module.exports = OncelikKuyrugu;