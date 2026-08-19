const socket = io();
let currentUser = '';
let mediaRecorder;
let audioChunks = [];

// რეგისტრაცია
async function register() {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    
    if (!u || !p) return alert('შეავსეთ ყველა ველი!');

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            alert('✅ წარმატებით დარეგისტრირდით! ახლა დააჭირეთ "შესვლა"-ს.');
        } else {
            alert('❌ შეცდომა: ' + (data.message || 'ვერ დარეგისტრირდა'));
        }
    } catch (err) {
        alert('❌ რეგისტრაციის შეცდომა: ' + err.message);
    }
}

// შესვლა
async function login() {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    
    if (!u || !p) return alert('შეავსეთ ყველა ველი!');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            currentUser = u;
            
            const userDisplay = document.getElementById('current-user-display');
            if (userDisplay) {
                userDisplay.innerText = currentUser;
            }

            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('chat-screen').style.display = 'flex';
        } else {
            alert('❌ შესვლის შეცდომა: ' + (data.message || 'არასწორი მონაცემები'));
        }
    } catch (err) {
        alert('❌ შესვლის შეცდომა: ' + err.message);
    }
}

// შეტყობინების გაგზავნა
function sendMessage() {
    const input = document.getElementById('message-input');
    if (!input.value.trim()) return;
    socket.emit('send_message', { username: currentUser, message: input.value, type: 'text' });
    input.value = '';
}

// ფოტოს ატვირთვა
document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
            socket.emit('send_message', { username: currentUser, message: data.url, type: 'image' });
        }
    } catch (err) {
        alert('ფოტოს ატვირთვა ვერ მოხერხდა');
    }
});

// ვოისის ჩაწერა
const voiceBtn = document.getElementById('voice-btn');
voiceBtn.addEventListener('click', async () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('file', audioBlob, 'voice.webm');

                const res = await fetch('/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    socket.emit('send_message', { username: currentUser, message: data.url, type: 'audio' });
                }
            };

            mediaRecorder.start();
            voiceBtn.classList.add('recording');
        } catch (err) {
            alert('მიკროფონზე წვდომა უარყოფილია!');
        }
    } else {
        mediaRecorder.stop();
        voiceBtn.classList.remove('recording');
    }
});

// Socket.io მოვლენები
socket.on('new_message', (data) => {
    appendMessage(data);
});

socket.on('load_history', (messages) => {
    document.getElementById('messages').innerHTML = '';
    messages.forEach(appendMessage);
});

function appendMessage(data) {
    const box = document.getElementById('messages');
    const wrapper = document.createElement('div');
    const isMe = data.username === currentUser;
    
    wrapper.className = `msg-wrapper ${isMe ? 'my-msg' : 'other-msg'}`;
    
    let body = '';
    if (data.type === 'image') {
        body = `<img src="${data.message}">`;
    } else if (data.type === 'audio') {
        body = `<audio controls src="${data.message}"></audio>`;
    } else {
        body = data.message;
    }

    wrapper.innerHTML = `
        ${!isMe ? `<span class="sender-name">${data.username}</span>` : ''}
        <div class="msg-bubble">${body}</div>
    `;

    box.appendChild(wrapper);
    box.scrollTop = box.scrollHeight;
}
