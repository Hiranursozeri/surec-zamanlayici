/**
 * Round Robin - Sırayla dönme
 * Her süreç en fazla "quantum" ms çalışır. İşi bitmediyse kuyruğun sonuna döner.
 * Hazır kuyruğu: Dairesel kuyruk
 *
 * Eşzamanlılık kuralı: Bir sürecin quantum'u dolduğu anda yeni bir süreç de
 * geliyorsa, ÖNCE yeni gelen kuyruğa girer, SONRA quantum'u dolan.
 */
const Simulasyon = require('./Simulasyon');
const DaireselKuyruk = require('../veri-yapilari/DaireselKuyruk');

function roundRobin(surecler, { quantum, gecis = 0 } = {}) {
  if (!Number.isInteger(quantum) || quantum < 1) {
    throw new Error('Quantum 1 veya daha büyük bir tam sayı olmalı');
  }
  const sim = new Simulasyon(surecler, new DaireselKuyruk(4), { gecis });

  while (!sim.bittiMi()) {
    sim.gelenleriAl();

    if (sim.kuyruk.bosMu()) {
      sim.bostaBekle();
      continue;
    }

    const s = sim.kuyruk.cikar();         // sıradaki süreç
    sim.basla(s, `${s.ad} CPU'ya alındı (en fazla ${quantum} ms)`);
    sim.calistir(quantum);                // en fazla bir quantum çalıştır

    if (!s.bittiMi()) {
      sim.gelenleriAl();                  // kural: önce bu anda gelenler
      sim.durdur(`${s.ad} süresi doldu, kuyruğun sonuna döndü (kalan ${s.kalan} ms)`);
      sim.kuyruk.ekle(s);                 // sonra quantum'u dolan süreç
      sim.goruntu();
    }
  }

  return sim.sonuc(`Round Robin (quantum ${quantum} ms)`);
}

module.exports = roundRobin;