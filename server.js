const app = require('./src/app');

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`⚙️  Süreç Zamanlayıcı http://localhost:${PORT} adresinde çalışıyor.`);
});