/**
 * Min-Heap (İkili Yığın)
 * Tam ikili ağaç, dizi içinde saklanır. Kural: Her düğüm, çocuklarından
 * küçük ya da eşittir (karsilastir fonksiyonuna göre). Bu yüzden en küçük
 * eleman her zaman kökte, yani dizinin 0. indeksinde durur.
 *
 * Dizide ağaç ilişkileri (i = düğümün indeksi):
 *   ebeveyn   = (i - 1) / 2   (aşağı yuvarlanır)
 *   sol çocuk = 2i + 1
 *   sağ çocuk = 2i + 2
 */
class MinHeap {
  constructor(karsilastir = (a, b) => a - b) {
    this.dizi = [];
    this.boyut = 0;
    this.karsilastir = karsilastir;
  }

  bosMu() {
    return this.boyut === 0;
  }

  // En küçüğe bak, çıkarma - O(1)
  enKucuk() {
    return this.bosMu() ? null : this.dizi[0];
  }

  // Ekle - O(log n)
  // Elemanı ağacın en sonuna koy, sonra yerini bulana kadar yukarı taşı.
  ekle(eleman) {
    this.dizi[this.boyut] = eleman;
    this.boyut++;
    this.#yukariTasi(this.boyut - 1);
  }

  // En küçüğü çıkar - O(log n)
  // Kökü al. En sondaki elemanı köke koy, sonra yerini bulana kadar aşağı taşı.
  cikar() {
    if (this.bosMu()) {
      throw new Error('Heap boş');
    }
    const enKucuk = this.dizi[0];
    this.boyut--;
    this.dizi[0] = this.dizi[this.boyut];
    this.dizi[this.boyut] = undefined; // son hücreyi temizle
    if (this.boyut > 0) {
      this.#asagiTasi(0);
    }
    return enKucuk;
  }

  // Heap'in dizi hali (ağaç sırasıyla) - arayüzde ağacı çizmek için
  diziHali() {
    return this.dizi.slice(0, this.boyut);
  }

  // i'deki eleman ebeveyninden küçük olduğu sürece yer değiştir
  #yukariTasi(i) {
    while (i > 0) {
      const ebeveyn = Math.floor((i - 1) / 2);
      if (this.karsilastir(this.dizi[i], this.dizi[ebeveyn]) >= 0) {
        break; // ebeveyn zaten küçük ya da eşit: yerini buldu
      }
      this.#takas(i, ebeveyn);
      i = ebeveyn;
    }
  }

  // i'deki eleman çocuklarından büyük olduğu sürece küçük çocukla yer değiştir
  #asagiTasi(i) {
    while (true) {
      const sol = 2 * i + 1;
      const sag = 2 * i + 2;
      let enKucuk = i;

      if (sol < this.boyut && this.karsilastir(this.dizi[sol], this.dizi[enKucuk]) < 0) {
        enKucuk = sol;
      }
      if (sag < this.boyut && this.karsilastir(this.dizi[sag], this.dizi[enKucuk]) < 0) {
        enKucuk = sag;
      }
      if (enKucuk === i) {
        break; // iki çocuktan da küçük ya da eşit: yerini buldu
      }
      this.#takas(i, enKucuk);
      i = enKucuk;
    }
  }

  #takas(i, j) {
    const gecici = this.dizi[i];
    this.dizi[i] = this.dizi[j];
    this.dizi[j] = gecici;
  }
}

module.exports = MinHeap;