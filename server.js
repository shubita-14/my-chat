const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
// სტატიკური ფაილების (CSS, JS) სერვისი იმავე საქაღალდიდან
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SQLite ბაზა
const db = new sqlite3.Database('./messenger.db', (err) => {
    if (err) console.error('DB Error:', err);
    else console.log('✅ SQLite ბაზა მიერთებულია');
});

// ცხრილის ავტომატურად შექმნა
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
});

// 🟢 რეგისტრაციის როუტი
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'სერვერის შეცდომა' });
        }
        
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) {
                return res.status(400).json({ success: false, message: 'მომხმარებელი უკვე არსებობს' });
            }
            res.json({ success: true, message: 'რეგისტრაცია წარმატებულია!' });
        });
    });
});

// 🟢 შესვლის (ლოგინის) როუტი
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) {
            return res.status(400).json({ success: false, message: 'არასწორი სახელი ან პაროლი' });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (result) {
                res.json({ success: true, message: 'შესვლა წარმატებულია!' });
            } else {
                res.status(400).json({ success: false, message: 'არასწორი სახელი ან პაროლი' });
            }
        });
    });
});

// სოკეტების კავშირი
io.on('connection', (socket) => {
    console.log('მომხმარებელი დაუკავშირდა');

    socket.on('disconnect', () => {
        console.log('მომხმარებელი გავიდა');
    });
});

// სერვერის გაშვება
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
