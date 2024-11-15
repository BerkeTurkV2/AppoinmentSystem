const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require("fs");
const path = require('path');

const app = express();
const port = 8080;

// Body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: 'randevu-secret-key',
    resave: false,
    saveUninitialized: false, // Burası true olabilir test edicem
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 gün
        httpOnly: true
    }
}));

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
        req.session.username = username; // Oturumu başlat
        res.json({ message: `Hoş geldin, ${user.firstName}!` });
    } else {
        return res.status(401).json({ error: "Kullanıcı adı veya şifre hatalı!" });
    }
});

const appointmentsFile = path.join(__dirname, "data", "appointments.json");

// Randevularımı göster sayfası
app.get('/randevular', (req, res) => {
    if (!req.session.username) {
        return res.status(401).json({ error: "Lütfen giriş yapın!" });
    }

    if (fs.existsSync(appointmentsFile)) {
        const appointments = JSON.parse(fs.readFileSync(appointmentsFile, "utf-8"));
        const userAppointments = appointments.filter(a => a.username === req.session.username);
        res.json(userAppointments);
    } else {
        res.json([]);
    }
});

// Yeni randevu kaydetme
app.post('/randevu', (req, res) => {
    console.log('Session:', req.session); // Oturum detaylarını logla
    if (!req.session.username) {
        return res.status(401).json({ error: "Lütfen giriş yapın!" });
    }

    const { name, surname, date, time, description } = req.body;
    const id = Date.now().toString(); // Randevuya benzersiz bir ID veriyoruz.
    const username = req.session.username;
    const newAppointment = { id, name, surname, date, time, description, username };

    let appointments = [];
    if (fs.existsSync(appointmentsFile)) {
        appointments = JSON.parse(fs.readFileSync(appointmentsFile, "utf-8"));
    }
    appointments.push(newAppointment);
    fs.writeFileSync(appointmentsFile, JSON.stringify(appointments, null, 2));

    res.json({ message: "Başarılı" });
});

// Randevu silme
app.delete('/randevu/:id', (req, res) => {
    const id = req.params.id;
    if (!fs.existsSync(appointmentsFile)) return res.status(404).send('Randevu bulunamadı');

    let appointments = JSON.parse(fs.readFileSync(appointmentsFile, "utf-8"));
    const initialLength = appointments.length;
    appointments = appointments.filter(appointment => appointment.id !== id);

    if (appointments.length < initialLength) {
        fs.writeFileSync(appointmentsFile, JSON.stringify(appointments, null, 2));
        res.sendStatus(200);
    } else {
        res.status(404).send('Randevu bulunamadı');
    }
});

// Kullanıcı oturumdan cıkınca bunu yap -- bu kodu çıkış yap diye bir yere bağla !!
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Oturum sonlandırılamadı!" });
        }
        res.json({ message: "Başarıyla çıkış yaptınız!" });
    });
});

// Sunucu başlatma
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});