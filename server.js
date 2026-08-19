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

db.serialize(() => {
    // აქ შეგიძლია გქონდეს შენი ცხრილების შექმნის ლოგიკა
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
