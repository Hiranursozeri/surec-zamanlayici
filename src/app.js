/**
 * Express uygulaması: API uç noktaları
 *
 *  GET  /api/durum            Sunucu çalışıyor mu?
 *  GET  /api/senaryolar       Hazır senaryoların listesi
 *  GET  /api/senaryolar/:id   Bir senaryonun süreçleri
 *  POST /api/simule           Tek yöntemle simülasyon
 *  POST /api/karsilastir      Üç yöntemi aynı süreçlerle karşılaştırma
 *
 * Uygulama burada kurulur, server.js sadece onu başlatır.
 * Böylece testler sunucuyu istedikleri portta açıp kapatabilir.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { senaryoListesi, senaryoYukle } = require('./senaryolar');
const { simule, karsilastir, GirisHatasi } = require('./servis');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/durum', (req, res) => {
  res.json({ mesaj: 'Süreç Zamanlayıcı API çalışıyor' });
});

app.get('/api/senaryolar', (req, res) => {
  res.json(senaryoListesi());
});

app.get('/api/senaryolar/:id', (req, res) => {
  const ozet = senaryoListesi().find(s => s.id === req.params.id);
  if (!ozet) {
    return res.status(404).json({ hata: `Böyle bir senaryo yok: ${req.params.id}` });
  }
  res.json({ ...ozet, surecler: senaryoYukle(ozet.id).map(s => s.jsonHali()) });
});

app.post('/api/simule', (req, res) => {
  res.json(simule(req.body));
});

app.post('/api/karsilastir', (req, res) => {
  res.json(karsilastir(req.body));
});

// Tanımsız API adresleri
app.use('/api', (req, res) => {
  res.status(404).json({ hata: 'Böyle bir API adresi yok' });
});

// Hata yakalayıcı: Kullanıcı hataları 400, beklenmeyen hatalar 500 döner.
// Express'te 4 parametreli fonksiyon hata yakalayıcı olarak çalışır.
app.use((hata, req, res, next) => {
  if (hata instanceof GirisHatasi) {
    return res.status(400).json({ hata: hata.message });
  }
  if (hata.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'Gönderilen veri geçerli bir JSON değil' });
  }
  console.error(hata);
  res.status(500).json({ hata: 'Sunucuda beklenmeyen bir hata oluştu' });
});

module.exports = app;