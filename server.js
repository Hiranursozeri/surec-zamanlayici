const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Sunucunun çalıştığını test etmek için
app.get('/api/durum', (req, res) => {
  res.json({ mesaj: 'Süreç Zamanlayıcı API çalışıyor' });
});

app.listen(PORT, () => {
  console.log(`⚙️  Süreç Zamanlayıcı http://localhost:${PORT} adresinde çalışıyor.`);
});