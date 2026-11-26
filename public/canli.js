/**
 * Canlı mod
 * Saat akarken kullanıcı bir uygulamaya tıklar, uygulama tam o milisaniyede açılır
 * ve simülasyon yeniden hesaplanır.
 *
 * Neden yeniden hesaplamak doğru sonuç verir? Zamanlama yöntemleri geleceği bilmez,
 * her an sadece o ana kadar gelmiş süreçlere bakarak karar verir. Yeni bir uygulama
 * t anında eklenince t'den önceki her şey aynı kalır, sadece t'den sonrası değişir.
 * Gantt şemasında karartılmış kısım, o ana kadar bilinenlere göre "plan"dır.
 */

// Açılabilecek uygulamalar
const UYGULAMALAR = [
  { simge: '🎵', ad: 'Spotify – müzik çalma', tur: 'etkilesimli', sure: 10 },
  { simge: '📞', ad: 'Gelen arama', tur: 'etkilesimli', sure: 15 },
  { simge: '💬', ad: 'Discord – mesaj bildirimi', tur: 'etkilesimli', sure: 5 },
  { simge: '🌐', ad: 'Chrome – sayfa yükleme', tur: 'kullanici', sure: 25 },
  { simge: '💻', ad: 'VS Code – proje derleme', tur: 'kullanici', sure: 30 },
  { simge: '📸', ad: 'Kamera – fotoğraf çekme', tur: 'etkilesimli', sure: 12 },
  { simge: '📝', ad: 'Log dosyası yazma', tur: 'sistem', sure: 12 },
  { simge: '🛡️', ad: 'Antivirüs taraması', tur: 'arkaPlan', sure: 80 },
  { simge: '☁️', ad: 'Fotoğraf yedekleme', tur: 'arkaPlan', sure: 100 },
  { simge: '⬇️', ad: 'Windows Update', tur: 'bakim', sure: 50 },
];

const canliSaat = {
  akiyor: false,     // saat ilerliyor mu
  sonKare: null,     // bir önceki karenin zaman damgası
  hiz: 30,           // gerçek 1 saniyede simülasyonda geçen ms
};

function uygulamalariCiz() {
  $('uygulamalar').innerHTML = UYGULAMALAR.map((u, i) => `
    <button type="button" class="uygulama-dugme" data-uygulama="${i}" title="${kacis(u.ad)} şimdi açılsın">
      <span class="simge" aria-hidden="true">${u.simge}</span>
      <b>${kacis(u.ad.split(' – ')[0])}</b>
      <small>${u.sure} ms · öncelik ${TURLER[u.tur].oncelik}</small>
    </button>`).join('');
}

// Canlı modu başlatır: liste boşalır, saat 0'da bekler
function canliAc() {
  if (durum.oynuyor) oynatDurdur();
  durum.canli = true;
  durum.surecler = [];
  durum.sonuc = null;
  durum.t = 0;
  $('senaryoSec').value = '';
  $('senaryoKart').hidden = true;
  $('sonuclar').hidden = true;
  $('canliKart').hidden = false;
  $('canliDuraklat').disabled = true;
  $('canliDuraklat').textContent = '❚❚ Duraklat';
  $('canliIpucu').textContent = 'Saat, ilk uygulamayı açtığında başlar. Soldan yöntemi değiştirirsen aynı an için yeniden hesaplanır.';
  document.body.classList.add('canli-modu');
  saatYaz();
  surecListesiCiz();
  hataGoster('');
}

// Canlı modu sonlandırır. Süreçler tabloda kalır, normal ekrana dönülür.
function canliKapat() {
  saatDurdur();
  durum.canli = false;
  $('canliKart').hidden = true;
  document.body.classList.remove('canli-modu');
}

function canliBitir() {
  canliKapat();
  if (durum.sonuc) {
    durum.t = zamanAraligi()[1];
    hepsiniCiz();
  } else {
    surecListesiCiz();
  }
}

// Yeni bir uygulamayı tam şu anda açar
async function canliEkle({ ad, tur, sure, oncelik }) {
  if (durum.surecler.length >= EN_FAZLA_SUREC) {
    return hataGoster(`En fazla ${EN_FAZLA_SUREC} süreç açılabilir.`);
  }
  // Aynı uygulama ikinci kez açılırsa adına sıra numarası eklenir
  const ayniAdli = durum.surecler.filter(s => s.ad === ad || s.ad.startsWith(`${ad} (`)).length;
  const pid = durum.surecler.length ? Math.max(...durum.surecler.map(s => s.pid)) + 1 : 1001;
  durum.surecler.push({
    pid,
    ad: ayniAdli ? `${ad} (${ayniAdli + 1})` : ad,
    tur,
    varis: Math.round(durum.t),
    sure,
    oncelik: oncelik ?? TURLER[tur].oncelik,
  });
  surecListesiCiz();
  $('canliIpucu').textContent = 'Karartılmış bloklar şu ana kadar açılan uygulamalara göre plandır. Yeni bir uygulama açınca plan değişebilir.';
  await calistir();
  if (!canliSaat.akiyor && durum.sonuc) saatBaslat();
}

// ===== Saat =====
function saatYaz() {
  $('canliSaat').textContent = `t = ${Math.round(durum.t)} ms`;
}

function saatBaslat() {
  canliSaat.akiyor = true;
  canliSaat.sonKare = null;
  $('canliKart').classList.add('akiyor');
  $('canliDuraklat').disabled = false;
  $('canliDuraklat').textContent = '❚❚ Duraklat';
  requestAnimationFrame(saatKaresi);
}

function saatDurdur() {
  canliSaat.akiyor = false;
  $('canliKart').classList.remove('akiyor');
  $('canliDuraklat').textContent = '▶ Devam et';
}

function saatKaresi(zamanDamgasi) {
  if (!canliSaat.akiyor || !durum.canli) return;
  if (canliSaat.sonKare !== null) {
    durum.t += ((zamanDamgasi - canliSaat.sonKare) / 1000) * canliSaat.hiz;
  }
  canliSaat.sonKare = zamanDamgasi;
  saatYaz();
  if (durum.sonuc) {
    $('zamanKaydirici').max = zamanAraligi()[1];
    anCiz();
  }
  requestAnimationFrame(saatKaresi);
}

// ===== Olay bağlantıları =====
$('canliModu').addEventListener('click', canliAc);
$('canliBitir').addEventListener('click', canliBitir);
$('canliDuraklat').addEventListener('click', () => (canliSaat.akiyor ? saatDurdur() : saatBaslat()));
$('canliHiz').addEventListener('change', e => { canliSaat.hiz = Number(e.target.value); });
$('uygulamalar').addEventListener('click', e => {
  const dugme = e.target.closest('[data-uygulama]');
  if (dugme && durum.canli) canliEkle(UYGULAMALAR[Number(dugme.dataset.uygulama)]);
});

uygulamalariCiz();
