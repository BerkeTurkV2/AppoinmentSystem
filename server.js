const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = 8080;

// Body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Randevu formu verilerini tutacak dizi
let randevular = [];

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Main.html'));
});

// Randevularımı göster sayfası
app.get('/randevular', (req, res) => {
    res.json(randevular);  // Randevular verisini JSON formatında gönder
});

// Yeni randevu kaydetme
app.post('/randevu', (req, res) => {
    const { name, surname, date, time, description } = req.body;
    const id = Date.now().toString(); // Randevuya benzersiz bir ID veriyoruz.
    randevular.push({ id, name, surname, date, time, description });
    res.json({ message: "Başarılı" }); // JSON formatında yanıt
});

// Randevu silme
app.delete('/randevu/:id', (req, res) => {
    const id = req.params.id;
    const initialLength = randevular.length;
    
    // Randevular listesinden belirtilen ID'yi bulup silin
    randevular = randevular.filter(appointment => appointment.id !== id);
    
    if (randevular.length < initialLength) {
        res.sendStatus(200);  // Başarılı yanıt gönder
    } else {
        res.status(404).send('Randevu bulunamadı');  // Randevu bulunamadığında hata yanıtı gönder
    }
});


// Sunucu başlatma
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});