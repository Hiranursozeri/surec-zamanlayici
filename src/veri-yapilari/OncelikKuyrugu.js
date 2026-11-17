/**
 * Öncelik Kuyruğu (Priority Queue) - Min-heap ile
 * En öncelikli eleman her zaman heap'in kökünde durur.
 * Öncelikli zamanlamada "hazır kuyruğu" olarak kullanılır.
 *
 * İlk sürümde sıralı bağlı liste kullanıyorduk (ekle O(n), çıkar O(1)).
 * Heap ile ikisi de O(log n) oldu. Metot adları aynı kaldığı için
 * zamanlayıcı kodlarında hiçbir şey değişmedi.
 */
const MinHeap = require('./MinHeap');

// Kural: önce öncelik (küçük sayı = daha önemli), sonra varış zamanı,
// o da eşitse PID. Heap kendi başına "önce gelen önde" sırasını
// korumadığı için eşitlikleri burada açıkça çözüyoruz.
function varsayilanKarsilastir(a, b) {
  if (a.oncelik !== b.oncelik) return a.oncelik - b.oncelik;
  if (a.varis !== b.varis) return a.varis - b.varis;
  if (a.pid < b.pid) return -1;
  if (a.pid > b.pid) return 1;
  return 0;
}

class OncelikKuyrugu {
  constructor(karsilastir = varsayilanKarsilastir) {
    this.heap = new MinHeap(karsilastir);
    this.karsilastir = karsilastir;
  }

  get boyut() {
    return this.heap.boyut;
  }

  bosMu() {
    return this.heap.bosMu();
  }

  // Ekle - O(log n)
  ekle(eleman) {
    this.heap.ekle(eleman);
  }

  // En öncelikliyi çıkar - O(log n)
  cikar() {
    if (this.bosMu()) {
      throw new Error('Kuyruk boş');
    }
    return this.heap.cikar();
  }

  // En öncelikliye bak ama çıkarma - O(1)
  onundeki() {
    return this.heap.enKucuk();
  }

  // Kuyruğun anlık içeriği, en öncelikliden en aza - O(n log n)
  // Heap dizisi sıralı değildir. Bu yüzden bir kopya heap oluşturup
  // ondan sırayla çıkarıyoruz. Asıl heap bozulmaz.
  elemanlar() {
    const kopya = new MinHeap(this.karsilastir);
    for (const e of this.heap.diziHali()) kopya.ekle(e);
    const sonuc = [];
    while (!kopya.bosMu()) sonuc.push(kopya.cikar());
    return sonuc;
  }

  // Heap'in ağaç sırasındaki hali - adım adım modda ağacı çizmek için
  agacHali() {
    return this.heap.diziHali();
  }
}

module.exports = OncelikKuyrugu;