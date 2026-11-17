/**
 * FIFO (First In, First Out) - İlk gelen ilk çalışır
 * Kesintisizdir: Bir süreç CPU'ya alındıysa bitene kadar bırakmaz.
 * Hazır kuyruğu: Dairesel kuyruk
 */
const Simulasyon = require('./Simulasyon');
const DaireselKuyruk = require('../veri-yapilari/DaireselKuyruk');

function fifo(surecler, ayarlar = {}) {
  const sim = new Simulasyon(surecler, new DaireselKuyruk(4), ayarlar);

  while (!sim.bittiMi()) {
    sim.gelenleriAl();

    if (sim.kuyruk.bosMu()) {
      sim.bostaBekle();
      continue;
    }

    const s = sim.kuyruk.cikar();   // kuyruğun başındaki, yani ilk gelen
    sim.basla(s);
    sim.calistir(s.kalan);          // bitene kadar çalıştır
  }

  return sim.sonuc('FIFO');
}

module.exports = fifo;