const path = require('path');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SQLite ბაზა
const db = new sqlite3.Database('./messenger.db', (err) => {
    if (err) console.error('DB Error:', err);
    else console.log('✅ SQLite ბაზა მიერთებულია');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        message TEXT,
        type TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Multer ფაილებისთვის
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// რეგისტრაცია
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'შეავსეთ ყველა ველი' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                return res.status(400).json({ error: 'მომხმარებელი უკვე არსებობს!' });
            }
            res.json({ success: true });
        });
    } catch (e) {
        res.status(500).json({ error: 'სერვერის შეცდომა' });
    }
});

// შესვლა
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'შეავსეთ ყველა ველი' });

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'მომხმარებელი ვერ მოიძებნა!' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'პაროლი არასწორია!' });
        }

        res.json({ success: true, username: user.username });
    });
});

// ფაილის ატვირთვა
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ფაილი არ აიტვირთა' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// Socket.io
io.on('connection', (socket) => {
    db.all('SELECT username, message, type FROM messages ORDER BY id ASC LIMIT 50', [], (err, rows) => {
        if (!err) socket.emit('load_history', rows);
    });

    socket.on('send_message', (data) => {
        db.run('INSERT INTO messages (username, message, type) VALUES (?, ?, ?)', 
            [data.username, data.message, data.type], 
            function(err) {
                if (!err) io.emit('new_message', data);
            }
        );
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
