/**
 * Simülasyon altyapısı
 * Üç zamanlama yönteminin (FIFO, Round Robin, Öncelikli) ortak işlerini yapar:
 *  - Henüz gelmemiş süreçleri varış sırasıyla bekletir (bağlı liste)
 *  - Zamanı gelen süreçleri hazır kuyruğuna alır
 *  - Gantt şemasını kaydeder (bağlı liste)
 *  - Olay günlüğünü ve adım adım mod için kuyruk görüntülerini tutar
 *
 * Yöntemler sadece "kuyruktan kimi seçeceğim, ne kadar çalıştıracağım?"
 * sorusuyla ilgilenir. Geri kalan her şey burada.
 */
const BagliListe = require('../veri-yapilari/BagliListe');
const DaireselKuyruk = require('../veri-yapilari/DaireselKuyruk');
const { hesapla } = require('../metrikler');

// Gelecek süreçlerin sırası: önce varış zamanı, eşitse PID küçük olan
const varisSirasi = (a, b) => (a.varis - b.varis) || (a.pid - b.pid);

class Simulasyon {
  /**
   * @param surecler  Surec listesi. Asıl liste değişmez, her sürecin kopyası kullanılır.
   * @param kuyruk    Hazır kuyruğu: DaireselKuyruk ya da OncelikKuyrugu
   * @param ayarlar   { gecis: bağlam değişimi süresi (ms), varsayılan 0 }
   */
  constructor(surecler, kuyruk, { gecis = 0 } = {}) {
    if (!Array.isArray(surecler) || surecler.length === 0) {
      throw new Error('Simülasyon için en az bir süreç gerekli');
    }
    if (!Number.isInteger(gecis) || gecis < 0) {
      throw new Error('Bağlam değişimi süresi 0 veya daha büyük bir tam sayı olmalı');
    }
    this.surecler = surecler.map(s => s.kopya());
    this.kuyruk = kuyruk;
    this.gecis = gecis;

    this.bekleyenler = new BagliListe();   // henüz gelmemiş süreçler
    for (const s of this.surecler) this.bekleyenler.siraliEkle(s, varisSirasi);

    this.gantt = new BagliListe();         // Gantt şemasının parçaları
    this.olaylar = [];                     // olay günlüğü
    this.goruntuler = [];                  // adım adım mod için anlık durumlar

    this.t = this.bekleyenler.bas.veri.varis;  // simülasyon ilk varışla başlar
    this.calisan = null;                   // şu an CPU'daki süreç
    this.sonCalisanPid = null;             // bağlam değişimini anlamak için
  }

  // Bekleyen ya da kuyrukta süreç kalmadıysa simülasyon biter
  bittiMi() {
    return this.bekleyenler.bosMu() && this.kuyruk.bosMu() && this.calisan === null;
  }

  // Zamanı gelmiş (varis <= t) tüm süreçleri hazır kuyruğuna alır
  gelenleriAl() {
    let geldiMi = false;
    while (!this.bekleyenler.bosMu() && this.bekleyenler.bas.veri.varis <= this.t) {
      const s = this.bekleyenler.bastanCikar();
      this.kuyruk.ekle(s);
      this.olay(s.varis, 'geldi', s, `${s.ad} açıldı, hazır kuyruğuna eklendi`);
      geldiMi = true;
    }
    if (geldiMi) this.goruntu();
    return geldiMi;
  }

  // Kuyruk boşsa CPU bir sonraki süreç gelene kadar boşta bekler
  bostaBekle() {
    const sonraki = this.bekleyenler.bas.veri.varis;
    this.olay(this.t, 'bos', null, `CPU boşta, ${sonraki} ms'ye kadar bekliyor`);
    this.ganttEkle('bos', null, this.t, sonraki);
    this.t = sonraki;
  }

  // Seçilen süreç bir öncekinden farklıysa bağlam değişimi süresi harcanır
  baglamDegistir(s) {
    if (this.gecis > 0 && this.sonCalisanPid !== null && this.sonCalisanPid !== s.pid) {
      this.ganttEkle('gecis', null, this.t, this.t + this.gecis);
      this.t += this.gecis;
      this.gelenleriAl(); // geçiş sırasında gelenler de kuyruğa girer
    }
  }

  // Süreci CPU'ya alır
  basla(s, mesaj = `${s.ad} CPU'ya alındı`) {
    this.baglamDegistir(s);
    this.calisan = s;
    this.olay(this.t, 'basladi', s, mesaj);
    this.goruntu();
  }

  /**
   * Çalışan süreci en fazla "sure" ms çalıştırır.
   * Çalışırken gelen süreçleri tam geldikleri anda kuyruğa alır.
   * kesilmeli() verilirse ve her gelişten sonra true dönerse erken durur
   * (kesintili öncelikli zamanlama için).
   * Gerçekte kaç ms çalıştığını döndürür.
   */
  calistir(sure, kesilmeli = null) {
    const s = this.calisan;
    let toplam = 0;
    while (toplam < sure && !s.bittiMi()) {
      const sonrakiVaris = this.bekleyenler.bosMu() ? Infinity : this.bekleyenler.bas.veri.varis;
      const adim = Math.min(sure - toplam, s.kalan, sonrakiVaris - this.t);
      if (adim > 0) {
        const c = s.calistir(this.t, adim);
        this.ganttEkle('surec', s.pid, this.t, this.t + c);
        this.t += c;
        toplam += c;
        this.sonCalisanPid = s.pid;
      }
      // Bu anda gelen süreç varsa ama çalışan süreç zaten bitti ya da süresi dolduysa
      // gelenleri burada almıyoruz. Onları yöntem kendisi alacak (Round Robin kuralı).
      if (s.bittiMi() || toplam >= sure) break;
      if (this.gelenleriAl() && kesilmeli && kesilmeli()) break;
    }
    if (s.bittiMi()) {
      this.olay(this.t, 'bitti', s, `${s.ad} tamamlandı (${s.bitis - s.varis - s.sure} ms bekledi)`);
      this.calisan = null;
    }
    return toplam;
  }

  // Çalışan süreci CPU'dan indirir (kuyruğa geri koymak yöntemin işi)
  durdur(mesaj) {
    const s = this.calisan;
    this.olay(this.t, 'durdu', s, mesaj);
    this.calisan = null;
    return s;
  }

  // Gantt'a parça ekler. Aynı süreç kesintisiz devam ediyorsa son parçayı uzatır.
  ganttEkle(tur, pid, baslangic, bitis) {
    const son = this.gantt.son ? this.gantt.son.veri : null;
    if (son && son.tur === tur && son.pid === pid && son.bitis === baslangic) {
      son.bitis = bitis;
    } else {
      this.gantt.sonaEkle({ tur, pid, baslangic, bitis });
    }
  }

  olay(zaman, tip, s, mesaj) {
    this.olaylar.push({ zaman, tip, pid: s ? s.pid : null, mesaj });
  }

  // O anki durumun fotoğrafı: CPU'da kim var, kuyrukta kimler var
  goruntu() {
    const g = {
      zaman: this.t,
      calisan: this.calisan ? this.calisan.pid : null,
      kuyruk: this.kuyruk.elemanlar().map(s => s.pid),
    };
    if (this.kuyruk instanceof DaireselKuyruk) {
      // Dairesel kuyruğun iç yapısı: hücreler, baş ve son indeksleri
      g.yapi = {
        tur: 'dairesel',
        kapasite: this.kuyruk.kapasite,
        bas: this.kuyruk.bas,
        son: this.kuyruk.son,
        hucreler: Array.from({ length: this.kuyruk.kapasite },
          (_, i) => (this.kuyruk.dizi[i] ? this.kuyruk.dizi[i].pid : null)),
      };
    } else if (typeof this.kuyruk.agacHali === 'function') {
      // Heap'in ağaç hali: dizideki sırasıyla (pid ve o anki öncelik)
      g.yapi = {
        tur: 'heap',
        agac: this.kuyruk.agacHali().map(s => ({ pid: s.pid, oncelik: s.oncelik })),
      };
    }
    this.goruntuler.push(g);
  }

  // Sonuç: metrikler + Gantt + olay günlüğü + görüntüler
  sonuc(yontem) {
    // Olayları zamana göre sırala. Eşit zamanlarda kayıt sırası korunur.
    const olaylar = this.olaylar
      .map((o, i) => ({ ...o, i }))
      .sort((a, b) => (a.zaman - b.zaman) || (a.i - b.i))
      .map(({ i, ...o }) => o);
    return {
      yontem,
      ...hesapla(this.surecler, this.gantt),
      gantt: this.gantt.diziyeCevir(),
      olaylar,
      goruntuler: this.goruntuler,
    };
  }
}

module.exports = Simulasyon;