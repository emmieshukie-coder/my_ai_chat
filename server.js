import express from 'express';
import multer from 'multer';
import FormData from 'form-data';

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));

// Serve the chat page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>My AI Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 12px 16px;
      background: #007bff;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    header h2 { font-size: 18px; font-weight: 600; }
    header button {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 13px;
      cursor: pointer;
    }
    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      background: white;
    }
.msg {
      margin: 8px 0;
      padding: 10px 14px;
      border-radius: 18px;
      max-width: 85%;
      word-wrap: break-word;
      font-size: 15px;
      line-height: 1.4;
    }
.user { background: #007bff; color: white; margin-left: auto; }
.ai { background: #e9ecef; color: #333; margin-right: auto; }
.error { background: #ffe6e6; color: #d00; margin-right: auto; }
.msg img { max-width: 100%; border-radius: 12px; margin-top: 6px; }
.msg audio { width: 100%; margin-top: 6px; }

.input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #ddd;
      flex-shrink: 0;
      align-items: center;
    }
    input[type="text"] {
      flex: 1;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
    }
    input:focus { border-color: #007bff; }
    button.send {
      padding: 12px 20px;
      font-size: 15px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      font-weight: 600;
      flex-shrink: 0;
    }
    button.icon {
      padding: 10px;
      background: #e9ecef;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 18px;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    button.recording { background: #ff4444; color: white; }
    button:disabled { background: #ccc; }
    #fileInput { display: none; }
  </style>
</head>
<body>
  <header>
    <h2>⚽ My AI Chat</h2>
    <button onclick="clearChat()">Clear</button>
  </header>
  <div id="chat"></div>
  <div class="input-area">
    <input type="file" id="fileInput" accept="image/*;capture=camera">
    <button class="icon" onclick="document.getElementById('fileInput').click()">📷</button>
    <button class="icon" id="recordBtn">🎤</button>
    <input type="text" id="input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') send()">
    <button class="send" id="sendBtn" onclick="send()">Send</button>
  </div>

  <script>
    let history = [];
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    async function send() {
      const input = document.getElementById('input');
      const msg = input.value.trim();
      if (!msg) return;

      addMsg('You', msg, 'user');
      history.push({ role: 'user', content: [{ type: 'text', text: msg }] });
      input.value = '';
      await callAI();
    }

    async function sendImage(base64) {
      addMsg('You', '<img src="' + base64 + '">', 'user');
      history.push({
        role: 'user',
        content: [
          { type: 'text', text: 'What do you see in this image?' },
          { type: 'image_url', image_url: { url: base64 } }
        ]
      });
      await callAI();
    }

    async function callAI() {
      document.getElementById('sendBtn').disabled = true;
      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });

        const data = await res.json();
        const reply = data.reply || 'No response';
        addMsg('AI', reply, data.error? 'error' : 'ai');
        if (!data.error) history.push({ role: 'assistant', content: [{ type: 'text', text: reply }] });
      } catch (err) {
        addMsg('AI', 'Network error: ' + err.message, 'error');
      } finally {
        document.getElementById('sendBtn').disabled = false;
      }
    }

    function addMsg(who, text, cls) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = 'msg ' + cls;
      div.innerHTML = '<b>' + who + ':</b> ' + text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function clearChat() {
      if (confirm('Clear chat history?')) {
        document.getElementById('chat').innerHTML = '';
        history = [];
      }
    }

    document.getElementById('fileInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => sendImage(reader.result);
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    document.getElementById('recordBtn').addEventListener('click', async () => {
      if (!isRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', blob, 'voice.webm');

          addMsg('You', '<audio controls src="' + URL.createObjectURL(blob) + '"></audio>', 'user');

          const res = await fetch('/transcribe', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.text) {
            addMsg('You', data.text, 'user');
            history.push({ role: 'user', content: [{ type: 'text', text: data.text }] });
            await callAI();
          } else {
            addMsg('AI', 'Transcription failed: ' + data.error, 'error');
          }
        };
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('recordBtn').classList.add('recording');
      } else {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('recordBtn').classList.remove('recording');
      }
    });
  </script>
</body>
</html>
  `);
});

// Handle chat requests
app.post('/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.json({ reply: 'GROQ_API_KEY not set in Render', error: true });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: req.body.messages || [],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.json({ reply: 'GROQ error: ' + err, error: true });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Empty response';
    res.json({ reply });

  } catch (error) {
    res.json({ reply: 'Server error: ' + error.message, error: true });
  }
});

// Handle voice transcription with Whisper
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.json({ error: 'GROQ_API_KEY not set' });
    }

    const formData = new FormData();
    formData.append('file', req.file.buffer, { filename: 'audio.webm', contentType: 'audio/webm' });
    formData.append('model', 'whisper-large-v3');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + process.env.GROQ_API_KEY },
      body: formData
    });

    if (!response.ok) {
      const err = await response.text();
      return res.json({ error: err });
    }

    const data = await response.json();
    res.json({ text: data.text });

  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
