const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const db = require('./config/database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = 'your-secret-key'; 

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(express.static('public'));

// Ana sayfa - Login.html'i göster
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Login.html'));
});

// JWT token doğrulama middleware'i
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Yetkilendirme gerekli' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Geçersiz token' });
    }
};

// Kullanıcı Kaydı
app.post('/api/register', async (req, res) => {
    try {
        const { name, surname, username, password } = req.body;
        
        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Kullanıcıyı veritabanına ekle
        const [result] = await db.execute(
            'INSERT INTO users (name, surname, username, password) VALUES (?, ?, ?, ?)',
            [name, surname, username, hashedPassword]
        );
        
        res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
        res.status(500).json({ message: 'Kullanıcı kaydı sırasında hata oluştu' });
    }
});

// Kullanıcı Girişi
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Kullanıcıyı bul
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
        }
        
        // Token oluştur
        const token = jwt.sign(
            { userId: user.id, username: user.username, name: user.name, surname: user.surname },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Token'ı cookie olarak kaydet
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 saat
        });
        
        res.json({ 
            message: 'Giriş başarılı',
            user: {
                name: user.name,
                surname: user.surname
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Giriş sırasında hata oluştu' });
    }
});

// Randevu Oluştur
app.post('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const { name, surname, date, time, description } = req.body;
        
        const [result] = await db.execute(
            'INSERT INTO appointments (name, surname, date, time, description, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, surname, date, time, description, req.user.userId]
        );
        
        res.status(201).json({ message: 'Randevu başarıyla oluşturuldu' });
    } catch (error) {
        res.status(500).json({ message: 'Randevu oluşturulurken hata oluştu' });
    }
});

// Randevuları Listele
app.get('/api/appointments', authenticateToken, async (req, res) => {
    try {
        const [appointments] = await db.execute(
            'SELECT * FROM appointments WHERE user_id = ?',
            [req.user.userId]
        );
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Randevular getirilirken hata oluştu' });
    }
});

// Randevu Sil
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
    try {
        // Önce randevunun bu kullanıcıya ait olduğunu kontrol et
        const [appointment] = await db.execute(
            'SELECT * FROM appointments WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );

        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Randevu bulunamadı veya bu işlem için yetkiniz yok' });
        }

        const [result] = await db.execute(
            'DELETE FROM appointments WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.userId]
        );
        
        res.json({ message: 'Randevu başarıyla silindi' });
    } catch (error) {
        res.status(500).json({ message: 'Randevu silinirken bir hata oluştu' });
    }
});

// Çıkış Yap
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Başarıyla çıkış yapıldı' });
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});