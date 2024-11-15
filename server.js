const express = require('express');
const bodyParser = require('body-parser');
const fs = require("fs");
const path = require('path');

const app = express();
const port = 8080;

// Body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Geçici kullanıcı veritabanı
const usersFile = path.join(__dirname, "data", "users.json");

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "public", 'Login.html'));
});

// Kayıt Ol
app.post("/register", (req, res) => {
    const { firstName, lastName, username, password } = req.body;

    console.log(req.body);

    if (!firstName || !lastName || !username || !password) {
        return res.status(400).json({ error: "Tüm alanları doldurun!" });
    }

    const users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));

    // Kullanıcı adı kontrolü
    if (users.some(user => user.username === username)) {
        return res.status(400).json({ error: "Bu kullanıcı adı zaten mevcut!" });
    }

    // Yeni kullanıcı ekleme
    users.push({ firstName, lastName, username, password });
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

    res.redirect("/Login.html");
});

// Giriş Yap
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Kullanıcı adı ve şifre gerekli!" });
    }

    const users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));

    // Kullanıcı doğrulama
    const user = users.find(user => user.username === username && user.password === password);

    if (user) {
        res.send(`Hoş geldin, ${user.firstName}!`);
    } else {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı!" });
    }
});

// Randevu formu verilerini tutacak dizi
let randevular = [];

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