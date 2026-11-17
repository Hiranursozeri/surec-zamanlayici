/**
 * Süreç Zamanlayıcı - Arayüz
 * Sunucudaki API'yi çağırır ve sonuçları çizer.
 * Simülasyonun kendisi sunucuda yapılır, burada sadece gösterim var.
 */

// ===== Uygulamanın durumu =====
const durum = {
  surecler: [],          // { pid, ad, tur, varis, sure, oncelik }
  yontem: 'rr',          // 'fifo' | 'rr' | 'oncelikli'
  sonuc: null,           // /api/simule cevabı
  karsilastirma: null,   // /api/karsilastir cevabı
  t: 0,                  // ekranda gösterilen an (ms)
  oynuyor: false,
};

// Süreç türleri (sunucudaki Surec.js ile aynı)
const TURLER = {
  etkilesimli: { ad: 'Etkileşimli', oncelik: 1 },
  kullanici: { ad: 'Kullanıcı', oncelik: 2 },
  sistem: { ad: 'Sistem', oncelik: 3 },
  arkaPlan: { ad: 'Arka plan', oncelik: 4 },
  bakim: { ad: 'Bakım', oncelik: 5 },
};
const EN_FAZLA_SUREC = 20;

const YONTEM_ACIKLAMA = {
  fifo: 'İlk gelen ilk çalışır. Başlayan süreç bitene kadar CPU’yu bırakmaz. Hazır kuyruğu: dairesel kuyruk.',
  rr: 'Herkes sırayla en fazla bir quantum çalışır, işi bitmezse kuyruğun sonuna döner. Hazır kuyruğu: dairesel kuyruk.',
  oncelikli: 'En önemli süreç (en küçük öncelik sayısı) önce çalışır. Hazır kuyruğu: öncelik kuyruğu (min-heap).',
};

// Süreç renkleri: listedeki sıraya göre sabit atanır. Her tema için ayrı doğrulanmış palet.
const PALET = {
  yumusak: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  koyu: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#0ca30c', '#9085e9', '#e66767'],
};
const DIGER = { yumusak: '#8691a3', koyu: '#5e6b84' };
const OLCU_RENK = { yumusak: ['#2a78d6', '#eb6834', '#1baf7a'], koyu: ['#3987e5', '#d95926', '#199e70'] };

// ===== Küçük yardımcılar =====
const $ = id => document.getElementById(id);
const sayi = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const yaz = x => sayi.format(x);
const tema = () => document.documentElement.dataset.tema;

// Kullanıcının yazdığı metni HTML'e güvenle koymak için
function kacis(metin) {
  return String(metin).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renk(pid) {
  const i = durum.surecler.findIndex(s => s.pid === pid);
  return i >= 0 && i < 8 ? PALET[tema()][i] : DIGER[tema()];
}

// Renkli zemin üzerindeki yazı: koyu mu beyaz mı daha okunaklı?
function yaziRengi(hex) {
  const kanal = i => {
    const v = parseInt(hex.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * kanal(1) + 0.7152 * kanal(3) + 0.0722 * kanal(5);
  const koyuIle = (L + 0.05) / (0.0165 + 0.05);   // #1d2533
  const beyazIle = 1.05 / (L + 0.05);
  return koyuIle >= beyazIle ? '#1d2533' : '#ffffff';
}
const boya = pid => `background:${renk(pid)};color:${yaziRengi(renk(pid))}`;

const surecBul = pid => durum.surecler.find(s => s.pid === pid);
const kisaAd = ad => ad.split(' – ')[0];

function hataGoster(mesaj) {
  $('hata').textContent = mesaj;
  $('hata').hidden = !mesaj;
}

async function api(yol, govde) {
  const cevap = await fetch(yol, govde === undefined ? undefined : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(govde),
  });
  const veri = await cevap.json();
  if (!cevap.ok) throw new Error(veri.hata || 'Beklenmeyen bir hata oluştu');
  return veri;
}

// ===== Tema =====
function temaUygula(ad) {
  document.documentElement.dataset.tema = ad;
  $('temaAdi').textContent = ad === 'koyu' ? 'Sunum teması' : 'Koyu tema';
  try { localStorage.setItem('tema', ad); } catch { /* tarayıcı izin vermiyorsa önemli değil */ }
  surecListesiCiz();
  if (durum.sonuc) hepsiniCiz();
}

// ===== Ayarlar =====
function ayarlar() {
  return {
    quantum: Number($('quantum').value),
    kesintili: $('kesintili').checked,
    yaslandirma: Number($('yaslandirma').value),
    gecis: Number($('gecis').value),
  };
}

function ayarGorunurlugu() {
  document.querySelectorAll('.segment button').forEach(b =>
    b.classList.toggle('secili', b.dataset.yontem === durum.yontem));
  document.querySelectorAll('[data-gorunur]').forEach(el =>
    el.hidden = el.dataset.gorunur !== durum.yontem);
  $('yontemAciklama').textContent = YONTEM_ACIKLAMA[durum.yontem];
}

// Bir şey değişince sonuç ekrandaysa otomatik yeniden çalıştır
let bekletme;
function degisiklikOldu() {
  if (!durum.sonuc) return;
  clearTimeout(bekletme);
  bekletme = setTimeout(calistir, 250);
}

// ===== Senaryolar =====
async function senaryolariYukle() {
  try {
    for (const s of await api('/api/senaryolar')) {
      $('senaryoSec').append(new Option(s.ad, s.id));
    }
  } catch {
    hataGoster('Sunucuya bağlanılamadı. Terminalde "npm run dev" çalışıyor mu?');
  }
}

async function senaryoSec(id) {
  if (!id) {
    $('senaryoKart').hidden = true;
    return;
  }
  try {
    const s = await api(`/api/senaryolar/${id}`);
    durum.surecler = s.surecler.map(({ pid, ad, tur, varis, sure, oncelik }) => ({ pid, ad, tur, varis, sure, oncelik }));
    durum.sonuc = null;
    $('quantum').value = s.onerilenQuantum;
    $('senaryoAd').textContent = s.ad;
    $('senaryoAciklama').textContent = s.aciklama;
    $('senaryoDers').textContent = s.ders;
    $('senaryoKart').hidden = false;
    surecListesiCiz();
    await calistir();
  } catch (e) {
    hataGoster(e.message);
  }
}

// ===== Süreçler ve sonuçları tablosu =====
function surecListesiCiz() {
  const r = durum.sonuc;
  const satirSonuc = pid => (r ? r.surecler.find(s => s.pid === pid) : null);
  const enCok = r ? Math.max(...r.surecler.map(s => s.bekleme)) : null;

  if (durum.surecler.length === 0) {
    $('surecListesi').innerHTML = '<tr class="bos-satir"><td colspan="11">Henüz süreç yok. Üstten bir senaryo seç ya da aşağıdan kendi uygulamanı ekle.</td></tr>';
  } else {
    $('surecListesi').innerHTML = durum.surecler.map(s => {
      const x = satirSonuc(s.pid);
      const hucre = (deger, ilk = false, ek = '') =>
        `<td class="sag sonuc ${ilk ? 'sonuc-bas' : ''} ${x ? ek : 'bos-deger'}">${x ? deger : '–'}</td>`;
      return `
      <tr>
        <td><div class="uygulama"><span class="renk" style="background:${renk(s.pid)}"></span><span>${kacis(s.ad)}</span><span class="pid">${s.pid}</span></div></td>
        <td><span class="tur-etiket">${TURLER[s.tur]?.ad ?? s.tur}</span></td>
        <td class="sag">${s.varis}</td><td class="sag">${s.sure}</td><td class="sag">${s.oncelik}</td>
        ${hucre(x?.ilkCalisma, true)}${hucre(x?.bitis)}${hucre(x?.yanit)}
        ${hucre(x?.bekleme, false, x && x.bekleme === enCok && enCok > 0 ? 'en-kotu' : '')}${hucre(x?.donus)}
        <td class="sag"><button class="sil" data-sil="${s.pid}" title="Sil" aria-label="${kacis(s.ad)} sil">✕</button></td>
      </tr>`;
    }).join('');
  }

  $('tabloAlt').innerHTML = r && durum.surecler.length ? `
    <tr><td colspan="5">Ortalama</td><td></td><td></td>
      <td class="sag">${yaz(r.ortalama.yanit)}</td><td class="sag">${yaz(r.ortalama.bekleme)}</td><td class="sag">${yaz(r.ortalama.donus)}</td><td></td></tr>` : '';
  $('surecSayisi').textContent = `${durum.surecler.length} / ${EN_FAZLA_SUREC}`;
  $('sonucDurumu').textContent = r ? `Sonuçlar: ${r.yontem}` : 'Sonuç sütunları simülasyondan sonra dolar';
}

function surecEkle(e) {
  e.preventDefault();
  if (durum.surecler.length >= EN_FAZLA_SUREC) {
    return hataGoster(`En fazla ${EN_FAZLA_SUREC} süreç eklenebilir.`);
  }
  const pid = durum.surecler.length ? Math.max(...durum.surecler.map(s => s.pid)) + 1 : 1001;
  durum.surecler.push({
    pid,
    ad: $('fAd').value.trim(),
    tur: $('fTur').value,
    varis: Number($('fVaris').value),
    sure: Number($('fSure').value),
    oncelik: Number($('fOncelik').value),
  });
  hataGoster('');
  $('fAd').value = '';
  $('fAd').focus();
  surecListesiCiz();
  degisiklikOldu();
}

// ===== Simülasyon =====
async function calistir() {
  if (durum.surecler.length === 0) {
    return hataGoster('Önce en az bir süreç ekle ya da bir senaryo seç.');
  }
  const govde = { surecler: durum.surecler, yontem: durum.yontem, ayarlar: ayarlar() };
  $('calistir').disabled = true;
  try {
    const [sonuc, karsilastirma] = await Promise.all([
      api('/api/simule', govde),
      api('/api/karsilastir', govde),
    ]);
    durum.sonuc = sonuc;
    durum.karsilastirma = karsilastirma;
    durum.t = zamanAraligi()[1];  // önce sonucun tamamını göster
    hataGoster('');
    $('sonuclar').hidden = false;
    hepsiniCiz();
  } catch (e) {
    hataGoster(e.message);
  } finally {
    $('calistir').disabled = false;
  }
}

function zamanAraligi() {
  const g = durum.sonuc.gantt;
  return [Math.min(...g.map(p => p.baslangic)), Math.max(...g.map(p => p.bitis))];
}

function hepsiniCiz() {
  surecListesiCiz();
  kpiCiz();
  icgoruCiz();
  karsilastirmaCiz();
  const [bas, son] = zamanAraligi();
  Object.assign($('zamanKaydirici'), { min: bas, max: son, value: durum.t });
  anCiz();
}

// Zamana bağlı olanları (Gantt, kuyruk, günlük) yeniden çizer
function anCiz() {
  $('zamanEtiketi').textContent = `t = ${yaz(durum.t)} ms`;
  $('zamanKaydirici').value = durum.t;
  ganttCiz();
  kuyrukCiz();
  gunlukCiz();
}

// ===== Özet kartları =====
function kpiCiz() {
  const r = durum.sonuc;
  const fifo = durum.karsilastirma.find(k => k.id === 'fifo');
  const fark = anahtar => {
    if (durum.yontem === 'fifo') return 'Karşılaştırma için temel yöntem';
    const f = r.ortalama[anahtar] - fifo.ortalama[anahtar];
    if (Math.abs(f) < 0.005) return 'FIFO ile aynı';
    return `FIFO'ya göre <em class="${f < 0 ? 'iyi' : 'kotu'}">${f > 0 ? '+' : '−'}${yaz(Math.abs(f))}</em>`;
  };
  const kart = (etiket, deger, birim, not) => `
    <div class="kpi"><div class="etiket">${etiket}</div>
      <div class="deger">${deger}<small>${birim}</small></div><div class="not">${not}</div></div>`;
  $('kpiler').innerHTML =
    kart('Ortalama bekleme', yaz(r.ortalama.bekleme), 'ms', fark('bekleme')) +
    kart('Ortalama yanıt', yaz(r.ortalama.yanit), 'ms', fark('yanit')) +
    kart('Ortalama dönüş', yaz(r.ortalama.donus), 'ms', fark('donus')) +
    kart('CPU kullanımı', yaz(r.cpuKullanimi), '%', `Boşta ${r.bostaSure} ms · geçiş ${r.gecisSuresi} ms`) +
    kart('Bağlam değişimi', r.baglamDegisimi, 'kez', `Toplam süre ${r.toplamSure} ms`);
}

// ===== İçgörüler: sonuçlardan otomatik çıkarılan cümleler =====
function icgoruCiz() {
  const r = durum.sonuc;
  const a = ayarlar();
  const satirlar = [];
  const ekle = (tur, rozet, metin) => satirlar.push(
    `<div class="satir-icgoru"><span class="rozet ${tur}">${rozet}</span><span>${metin}</span></div>`);
  const ad = s => `<b>${kacis(s.ad)}</b>`;

  // Konvoy etkisi: kısa bir iş, önündeki uzun iş yüzünden çok beklediyse
  if (durum.yontem === 'fifo' || (durum.yontem === 'oncelikli' && !a.kesintili)) {
    let enKotu = null;
    for (const s of r.surecler) {
      if (s.sure > 20 || s.bekleme < 40) continue;
      const onundeki = r.gantt.find(p => p.tur === 'surec' && p.pid !== s.pid && p.baslangic <= s.varis && s.varis < p.bitis);
      const engel = onundeki && r.surecler.find(x => x.pid === onundeki.pid);
      if (engel && engel.sure >= 3 * s.sure && (!enKotu || s.bekleme > enKotu.s.bekleme)) enKotu = { s, engel };
    }
    if (enKotu) {
      ekle('uyari', 'Konvoy etkisi', `${ad(enKotu.s)} sadece ${enKotu.s.sure} ms'lik bir iş için ${enKotu.s.bekleme} ms bekledi, çünkü önündeki ${ad(enKotu.engel)} ${enKotu.engel.sure} ms sürdü.`);
    }
  }

  // Açlık: yaşlandırma kapalıyken düşük öncelikli bir süreç çok geç başladıysa
  if (durum.yontem === 'oncelikli' && a.yaslandirma === 0) {
    const ac = r.surecler.filter(s => s.oncelik >= 4).sort((x, y) => y.yanit - x.yanit)[0];
    if (ac && ac.yanit >= 60) {
      ekle('uyari', 'Açlık riski', `${ad(ac)} (öncelik ${ac.oncelik}) ${ac.yanit} ms boyunca hiç CPU'ya alınamadı. Yaşlandırmayı açarak bunu azaltabilirsin.`);
    }
  }
  const yaslanma = r.olaylar.filter(o => o.tip === 'yaslandi').length;
  if (yaslanma > 0) {
    ekle('bilgi', 'Yaşlandırma', `Bekleyen uygulamaların önceliği toplam ${yaslanma} kez yükseltildi. Ayrıntılar olay günlüğünde.`);
  }

  // Kesintiler
  const kesinti = r.olaylar.filter(o => o.tip === 'durdu').length;
  if (kesinti > 0 && durum.yontem === 'rr') {
    ekle('bilgi', 'Sıra değişimi', `Quantum dolduğu için uygulamalar ${kesinti} kez kuyruğun sonuna gönderildi.`);
  } else if (kesinti > 0) {
    ekle('bilgi', 'Kesinti', `Daha önemli bir uygulama geldiği için çalışan uygulama ${kesinti} kez durduruldu.`);
  }

  // Bağlam değişimi maliyeti
  if (r.gecisSuresi > 0) {
    ekle('uyari', 'Geçiş maliyeti', `CPU, uygulama değiştirmeye ${r.gecisSuresi} ms harcadı. Bu, toplam sürenin %${yaz(r.gecisSuresi / r.toplamSure * 100)}'i.`);
  }

  // En iyi yöntem
  const enIyi = anahtar => durum.karsilastirma.reduce((x, y) => (y.ortalama[anahtar] < x.ortalama[anahtar] ? y : x));
  const b = enIyi('bekleme'), y = enIyi('yanit');
  ekle('iyi', 'Karşılaştırma', `Bu uygulamalar için en düşük ortalama bekleme <b>${kisaYontem(b.yontem)}</b> (${yaz(b.ortalama.bekleme)} ms), en hızlı yanıt <b>${kisaYontem(y.yontem)}</b> (${yaz(y.ortalama.yanit)} ms).`);

  $('icgoruler').innerHTML = satirlar.slice(0, 4).join('');
}

const kisaYontem = yontem => yontem.split(' (')[0];

// ===== Gantt şeması =====
function adimSec(aralik) {
  for (const adim of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) {
    if (aralik / adim <= 12) return adim;
  }
  return 1000;
}

function ganttCiz() {
  const r = durum.sonuc;
  const [bas, son] = zamanAraligi();
  const yuzde = t => ((t - bas) / (son - bas)) * 100;
  const t = durum.t;

  // Bir blok çizer. Henüz gelinmemiş kısmı karartılır (oynatma sırasında).
  const blok = (p, etiket, sinif, stil = '') => {
    const genis = (p.bitis - p.baslangic) / (son - bas) > 0.04;
    const gelecek = p.baslangic >= t ? ' gelecek' : '';
    const perde = p.baslangic < t && t < p.bitis
      ? `<i class="perde" style="left:${((t - p.baslangic) / (p.bitis - p.baslangic)) * 100}%"></i>` : '';
    return `<div class="blok ${sinif}${gelecek}" style="left:${yuzde(p.baslangic)}%;width:${yuzde(p.bitis) - yuzde(p.baslangic)}%;${stil}" title="${kacis(etiket.baslik)}"><span>${genis ? kacis(etiket.kisa) : ''}</span>${perde}</div>`;
  };

  const adlar = [];
  const seritler = [];
  for (const s of r.surecler) {
    adlar.push(`<div class="serit-ad" title="${kacis(s.ad)}"><span class="renk" style="background:${renk(s.pid)}"></span><span>${kacis(s.ad)}</span></div>`);
    const bloklar = r.gantt.filter(p => p.tur === 'surec' && p.pid === s.pid).map(p =>
      blok(p, { kisa: `${p.baslangic}–${p.bitis}`, baslik: `${s.ad}: ${p.baslangic}–${p.bitis} ms (${p.bitis - p.baslangic} ms)` }, '', boya(s.pid)));
    seritler.push(`<div class="serit"><span class="varis-isaret" style="left:${yuzde(s.varis)}%" title="${kacis(s.ad)} ${s.varis} ms'de geldi"></span>${bloklar.join('')}</div>`);
  }

  // CPU şeridi: tüm parçalar tek çizgide
  adlar.push('<div class="serit-ad cpu"><span>CPU</span></div>');
  const cpu = r.gantt.map(p => {
    if (p.tur === 'bos') return blok(p, { kisa: 'boşta', baslik: `CPU boşta: ${p.baslangic}–${p.bitis} ms` }, 'bos');
    if (p.tur === 'gecis') return blok(p, { kisa: '', baslik: `Bağlam değişimi: ${p.baslangic}–${p.bitis} ms` }, 'gecis');
    const s = surecBul(p.pid);
    return blok(p, { kisa: kisaAd(s.ad), baslik: `${s.ad}: ${p.baslangic}–${p.bitis} ms` }, '', boya(p.pid));
  });
  seritler.push(`<div class="serit cpu">${cpu.join('')}</div>`);

  // Eksen ve ızgara
  const adim = adimSec(son - bas);
  let eksen = '', izgara = '';
  for (let x = Math.ceil(bas / adim) * adim; x <= son; x += adim) {
    eksen += `<span style="left:${yuzde(x)}%">${x}</span>`;
    izgara += `<div class="izgara" style="left:${yuzde(x)}%"></div>`;
  }

  $('gantt').innerHTML = `
    <div class="adlar">${adlar.join('')}<div class="eksen-bosluk"></div></div>
    <div class="seritler">${izgara}${seritler.join('')}
      <div class="eksen">${eksen}</div>
      <div class="imlec" style="left:${yuzde(t)}%"></div>
    </div>`;
  $('yontemAdi').textContent = r.yontem;
}

// ===== Hazır kuyruğu =====
function kuyrukCiz() {
  const r = durum.sonuc;
  const t = durum.t;

  // O anda CPU'da kim var? Gantt şemasından bulunur.
  const simdiki = r.gantt.find(p => p.baslangic <= t && t < p.bitis);
  let cpuIcerik = '<div class="jeton bos">boşta</div>';
  if (simdiki && simdiki.tur === 'surec') {
    const s = surecBul(simdiki.pid);
    cpuIcerik = `<div class="jeton" style="${boya(s.pid)}" title="${kacis(s.ad)}">${kacis(kisaAd(s.ad))}</div>`;
  } else if (simdiki && simdiki.tur === 'gecis') {
    cpuIcerik = '<div class="jeton bos">geçiş</div>';
  }
  const cpu = `<div class="cpu-kutu"><small>CPU</small>${cpuIcerik}</div><span class="ok">◀</span>`;

  // O andaki kuyruk: t'ye kadar çekilmiş son görüntü
  const g = r.goruntuler.filter(x => x.zaman <= t).pop();
  $('kuyrukAn').textContent = `t = ${yaz(t)} ms anındaki durum`;
  const heapMi = durum.yontem === 'oncelikli';
  $('kuyrukBaslik').innerHTML = `Hazır kuyruğu <span class="soluk">${heapMi ? 'Öncelik kuyruğu (min-heap)' : 'Dairesel kuyruk'}</span>`;

  if (!g || !g.yapi) {
    $('kuyrukGorunum').innerHTML = `<div class="kuyruk-alan">${cpu}<div class="bos-kuyruk">Henüz hiçbir uygulama gelmedi.</div></div>`;
    return;
  }
  const sirada = g.kuyruk.map(pid => `<b>${kacis(kisaAd(surecBul(pid).ad))}</b>`).join(', ') || 'kimse yok';

  if (g.yapi.tur === 'dairesel') {
    const y = g.yapi;
    const dolu = g.kuyruk.length > 0;
    const gostergeler = y.hucreler.map((_, i) => {
      const etiketler = [];
      if (dolu && i === y.bas) etiketler.push('<span class="gosterge bas">baş</span>');
      if (dolu && i === y.son) etiketler.push('<span class="gosterge son">son</span>');
      return `<div>${etiketler.join(' ')}</div>`;
    });
    const hucreler = y.hucreler.map(pid => pid === null
      ? '<div class="hucre bos">boş</div>'
      : `<div class="hucre" style="${boya(pid)};border-color:${renk(pid)}" title="${kacis(surecBul(pid).ad)}">${kacis(kisaAd(surecBul(pid).ad).slice(0, 7))}</div>`);
    const indeksler = y.hucreler.map((_, i) => `<span class="indeks">[${i}]</span>`);
    $('kuyrukGorunum').innerHTML = `
      <div class="kuyruk-alan">${cpu}
        <div class="hucreler" style="grid-template-columns:repeat(${y.kapasite}, 50px)">${gostergeler.join('')}${hucreler.join('')}${indeksler.join('')}</div>
      </div>
      <div class="kuyruk-bilgi">
        <span>bas = <b>${y.bas}</b></span><span>son = <b>${y.son}</b></span>
        <span>boyut = <b>${g.kuyruk.length}</b></span><span>kapasite = <b>${y.kapasite}</b></span>
        <span>Sıradakiler: ${sirada}</span>
        <code>son = (son + 1) % kapasite</code>
      </div>`;
    return;
  }

  // Heap: dizideki her eleman ağaçta bir düğüm
  const agac = g.yapi.agac;
  if (agac.length === 0) {
    $('kuyrukGorunum').innerHTML = `<div class="kuyruk-alan">${cpu}<div class="bos-kuyruk">Kuyruk boş.</div></div>`;
    return;
  }
  const konum = i => {
    const seviye = Math.floor(Math.log2(i + 1));
    const sira = i - (2 ** seviye - 1);
    return { x: ((sira + 0.5) / 2 ** seviye) * 100, y: 26 + seviye * 62 };
  };
  let cizgiler = '', dugumler = '';
  agac.forEach((d, i) => {
    const k = konum(i);
    if (i > 0) {
      const e = konum(Math.floor((i - 1) / 2));
      cizgiler += `<line x1="${e.x}%" y1="${e.y}" x2="${k.x}%" y2="${k.y}"/>`;
    }
    const s = surecBul(d.pid);
    dugumler += `<div class="dugum" style="left:${k.x}%;top:${k.y}px" title="${kacis(s.ad)}">
      <div class="jeton" style="${boya(d.pid)}">${kacis(kisaAd(s.ad).slice(0, 9))}<small>öncelik ${d.oncelik}</small></div>
      <span class="indeks">[${i}]</span></div>`;
  });
  const yukseklik = 26 + Math.floor(Math.log2(agac.length)) * 62 + 40;
  $('kuyrukGorunum').innerHTML = `
    <div class="kuyruk-alan">${cpu}
      <div class="agac" style="height:${yukseklik}px"><svg>${cizgiler}</svg>${dugumler}</div>
    </div>
    <div class="kuyruk-bilgi">
      <span>boyut = <b>${agac.length}</b></span>
      <span>Kökte en öncelikli: <b>${kacis(kisaAd(surecBul(agac[0].pid).ad))}</b></span>
      <span>Sıradakiler: ${sirada}</span>
      <code>ebeveyn = (i − 1) / 2</code>
    </div>`;
}

// ===== Olay günlüğü =====
function gunlukCiz() {
  const olaylar = durum.sonuc.olaylar;
  const t = durum.t;
  const gecmis = olaylar.filter(o => o.zaman <= t);
  const sonAn = gecmis.length ? gecmis[gecmis.length - 1].zaman : null;
  $('gunluk').innerHTML = olaylar.map(o => {
    const sinif = o.zaman > t ? 'gelecek' : (o.zaman === sonAn ? 'simdi' : '');
    return `<li class="${sinif}"><span class="t">${o.zaman} ms</span><span><i class="tip ${o.tip}"></i>${kacis(o.mesaj)}</span></li>`;
  }).join('');
  const gorunen = [...$('gunluk').querySelectorAll('li:not(.gelecek)')].pop();
  if (gorunen) $('gunluk').scrollTop = gorunen.offsetTop - $('gunluk').clientHeight + gorunen.clientHeight + 8;
}

// ===== Karşılaştırma: her yöntem kendi kutusunda, aynı ölçekte =====
function karsilastirmaCiz() {
  const k = durum.karsilastirma;
  const renkler = OLCU_RENK[tema()];
  const olcutler = [['bekleme', 'Bekleme'], ['yanit', 'Yanıt'], ['donus', 'Dönüş']];
  const enBuyuk = Math.max(...k.flatMap(r => olcutler.map(([a]) => r.ortalama[a])));
  const enIyi = Object.fromEntries(olcutler.map(([a]) => [a, Math.min(...k.map(r => r.ortalama[a]))]));

  const lejant = olcutler.map(([, ad], i) => `<span><i style="background:${renkler[i]}"></i>Ortalama ${ad.toLowerCase()}</span>`).join('');
  const sutunlar = k.map(r => {
    const [ad, ek] = r.yontem.split(' (');
    const satirlar = olcutler.map(([a, olcuAd], i) => {
      const deger = r.ortalama[a];
      return `<div class="olcu"><span>${olcuAd}</span><div class="cubuk-kap">
        <div class="cubuk" style="width:${(deger / enBuyuk) * 100}%;background:${renkler[i]}" title="${ad} · ortalama ${olcuAd.toLowerCase()}: ${yaz(deger)} ms">
        <span class="${deger === enIyi[a] ? 'en-iyi' : ''}">${yaz(deger)}</span></div></div></div>`;
    }).join('');
    return `<div class="yontem-sutun ${r.id === durum.yontem ? 'secili' : ''}">
      <h3>${ad}<small>${ek ? kacis(ek.slice(0, -1)) : 'ayar yok'}${r.id === durum.yontem ? ' · şu an seçili' : ''}</small></h3>${satirlar}</div>`;
  }).join('');
  $('karsilastirma').innerHTML = `<div class="lejant">${lejant}<span>✓ = o ölçütte en iyi</span></div><div class="grafik">${sutunlar}</div>`;
}

// ===== Oynatma =====
let sonKare = null;
function kare(zamanDamgasi) {
  if (!durum.oynuyor) return;
  const [, son] = zamanAraligi();
  const [bas] = zamanAraligi();
  if (sonKare !== null) {
    const hiz = (son - bas) / 9000;   // tüm simülasyon yaklaşık 9 saniyede oynar
    durum.t = Math.min(son, durum.t + (zamanDamgasi - sonKare) * hiz);
  }
  sonKare = zamanDamgasi;
  durum.t = Math.round(durum.t * 10) / 10;
  anCiz();
  if (durum.t >= son) return oynatDurdur();
  requestAnimationFrame(kare);
}

function oynat() {
  if (!durum.sonuc) return;
  if (durum.oynuyor) return oynatDurdur();
  const [bas, son] = zamanAraligi();
  if (durum.t >= son) durum.t = bas;
  durum.oynuyor = true;
  sonKare = null;
  $('oynat').textContent = '❚❚';
  requestAnimationFrame(kare);
}

function oynatDurdur() {
  durum.oynuyor = false;
  durum.t = Math.round(durum.t);
  $('oynat').textContent = '▶';
  anCiz();
}

// Olayların gerçekleştiği anlar arasında atlama
function olayaAtla(yon) {
  oynatDurdur();
  const anlar = [...new Set(durum.sonuc.olaylar.map(o => o.zaman))].sort((a, b) => a - b);
  anlar.push(zamanAraligi()[1]);
  const hedef = yon > 0 ? anlar.find(a => a > durum.t) : anlar.filter(a => a < durum.t).pop();
  if (hedef !== undefined) durum.t = hedef;
  anCiz();
}

// ===== İçe ve dışa aktarma =====
function disaAktar() {
  if (durum.surecler.length === 0) return hataGoster('Dışa aktarılacak süreç yok.');
  const veri = { surum: 1, yontem: durum.yontem, ayarlar: ayarlar(), surecler: durum.surecler };
  const baglanti = document.createElement('a');
  baglanti.href = URL.createObjectURL(new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' }));
  baglanti.download = 'surec-senaryosu.json';
  baglanti.click();
  URL.revokeObjectURL(baglanti.href);
}

async function iceAktar(dosya) {
  try {
    const veri = JSON.parse(await dosya.text());
    if (!Array.isArray(veri.surecler)) throw new Error();
    durum.surecler = veri.surecler.map(({ pid, ad, tur, varis, sure, oncelik }) => ({ pid, ad, tur, varis, sure, oncelik }));
    durum.sonuc = null;
    if (['fifo', 'rr', 'oncelikli'].includes(veri.yontem)) durum.yontem = veri.yontem;
    const a = veri.ayarlar || {};
    if (a.quantum) $('quantum').value = a.quantum;
    if (typeof a.kesintili === 'boolean') $('kesintili').checked = a.kesintili;
    if (a.yaslandirma !== undefined) $('yaslandirma').value = a.yaslandirma;
    if (a.gecis !== undefined) $('gecis').value = a.gecis;
    $('senaryoSec').value = '';
    $('senaryoKart').hidden = true;
    ayarGorunurlugu();
    surecListesiCiz();
    await calistir();
  } catch {
    hataGoster('Dosya okunamadı. Bu uygulamadan dışa aktarılmış bir .json dosyası seçmelisin.');
  }
}

// ===== Olay bağlantıları =====
$('senaryoSec').addEventListener('change', e => senaryoSec(e.target.value));
$('surecForm').addEventListener('submit', surecEkle);
$('fTur').addEventListener('change', e => { $('fOncelik').value = TURLER[e.target.value].oncelik; });
$('surecListesi').addEventListener('click', e => {
  const pid = Number(e.target.dataset.sil);
  if (!pid) return;
  durum.surecler = durum.surecler.filter(s => s.pid !== pid);
  if (durum.surecler.length === 0) return temizle();
  surecListesiCiz();
  degisiklikOldu();
});
function temizle() {
  durum.surecler = [];
  durum.sonuc = null;
  $('senaryoSec').value = '';
  $('senaryoKart').hidden = true;
  $('sonuclar').hidden = true;
  surecListesiCiz();
}
$('temizle').addEventListener('click', temizle);
document.querySelectorAll('.segment button').forEach(b => b.addEventListener('click', () => {
  durum.yontem = b.dataset.yontem;
  ayarGorunurlugu();
  degisiklikOldu();
}));

// Sayaçlar (− / +)
const ADIM = { quantum: 5, yaslandirma: 5, gecis: 1 };
document.querySelectorAll('[data-azalt],[data-arttir]').forEach(b => b.addEventListener('click', () => {
  const ad = b.dataset.azalt || b.dataset.arttir;
  const girdi = $(ad);
  const yeni = Number(girdi.value) + (b.dataset.azalt ? -ADIM[ad] : ADIM[ad]);
  girdi.value = Math.min(Number(girdi.max), Math.max(Number(girdi.min), yeni));
  degisiklikOldu();
}));
['quantum', 'yaslandirma', 'gecis', 'kesintili'].forEach(id => $(id).addEventListener('change', degisiklikOldu));

$('calistir').addEventListener('click', calistir);
$('temaDegistir').addEventListener('click', () => temaUygula(tema() === 'koyu' ? 'yumusak' : 'koyu'));
$('disaAktar').addEventListener('click', disaAktar);
$('iceAktarDosya').addEventListener('change', e => { if (e.target.files[0]) iceAktar(e.target.files[0]); e.target.value = ''; });
$('oynat').addEventListener('click', oynat);
$('basaDon').addEventListener('click', () => { oynatDurdur(); durum.t = zamanAraligi()[0]; anCiz(); });
$('oncekiOlay').addEventListener('click', () => olayaAtla(-1));
$('sonrakiOlay').addEventListener('click', () => olayaAtla(1));
$('zamanKaydirici').addEventListener('input', e => { oynatDurdur(); durum.t = Number(e.target.value); anCiz(); });

// Gantt üzerine tıklayınca o ana git
$('gantt').addEventListener('click', e => {
  const seritler = e.target.closest('.seritler');
  if (!seritler) return;
  const kutu = seritler.getBoundingClientRect();
  const [bas, son] = zamanAraligi();
  oynatDurdur();
  durum.t = Math.round(bas + ((e.clientX - kutu.left) / kutu.width) * (son - bas));
  anCiz();
});

// Başlangıç: kayıtlı tema varsa onu kullan
let kayitliTema = 'yumusak';
try { kayitliTema = localStorage.getItem('tema') || 'yumusak'; } catch { /* önemli değil */ }
temaUygula(kayitliTema === 'koyu' ? 'koyu' : 'yumusak');
ayarGorunurlugu();
senaryolariYukle();
