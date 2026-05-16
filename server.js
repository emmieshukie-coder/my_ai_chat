import express from 'express';
import multer from 'multer';
import FormData from 'form-data';

const app = express();
const PORT = process.env.PORT || 10000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>My AI Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%;
      overflow: hidden;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
      display: flex;
      flex-direction: column;
      color: #111;
    }
    header {
      padding: 14px 16px;
      background: #111;
      color: white;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    header.back { font-size: 22px; }
    header h2 {
      font-size: 17px;
      font-weight: 600;
      flex: 1;
    }
    header.menu { font-size: 22px; opacity: 0.8; }

    #chat {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #fff;
      min-height: 0;
    }
.msg {
      margin: 12px 0;
      padding: 10px 14px;
      border-radius: 18px;
      max-width: 85%;
      word-wrap: break-word;
      font-size: 15px;
      line-height: 1.5;
    }
.user {
      background: #e8f0fe;
      color: #111;
      margin-left: auto;
    }
.ai {
      background: #f7f7f7;
      color: #111;
      margin-right: auto;
    }
.error {
      background: #ffe6e6;
      color: #d00;
      margin-right: auto;
    }
.msg img { max-width: 100%; border-radius: 12px; margin-top: 6px; }
.file-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
.file-msg span {
      background: #e0e0e0;
      padding: 6px 10px;
      border-radius: 12px;
    }

.input-area {
      padding: 10px 12px;
      background: #007bff;
      border-top: 1px solid #0056b3;
      flex-shrink: 0;
      padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }
.input-box {
      display: flex;
      align-items: center;
      background: #fff;
      border-radius: 24px;
      padding: 6px 8px 6px 14px;
      gap: 4px;
    }
.input-box input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 15px;
      outline: none;
      color: #111;
      min-width: 0;
    }
.input-box input::placeholder { color: #888; }

.icon-group {
      display: flex;
      align-items: center;
      gap: 2px;
   }

.icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
      flex-shrink: 0;
    }
.icon-btn:active { background: #e0e0e0; }

.send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #007bff;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
.send-btn:active { background: #0056b3; }
    #fileInput, #docInput { display: none; }
  </style>
</head>
<body>
  <header>
    <div class="back">←</div>
    <h2>My AI Chat</h2>
    <div class="menu" onclick="clearChat()">⋮</div>
  </header>

  <div id="chat"></div>

  <div class="input-area">
    <div class="input-box">
      <input id="input" placeholder="Message" onkeydown="if(event.key==='Enter') send()">
      <div class="icon-group">
        <button class="icon-btn" onclick="document.getElementById('docInput').click()">📎</button>
        <button class="icon-btn" onclick="document.getElementById('fileInput').click()">📷</button>
        <input type="file" id="fileInput" accept="image/*" capture="environment">
        <input type="file" id="docInput" accept=".pdf,.txt,.doc,.docx,.csv,.json,.md">
        <button class="send-btn" onclick="send()">➤</button>
      </div>
    </div>
  </div>

  <script>
    let history = [];

    async function send() {
      const input = document.getElementById('input');
      const msg = input.value.trim();
      if (!msg) return;

      addMsg(msg, 'user');
      history.push({ role: 'user', content: [{ type: 'text', text: msg }] });
      input.value = '';
      await callAI();
    }

    async function callAI() {
      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });

        const data = await res.json();
        addMsg(data.reply || 'No response', data.error? 'error' : 'ai');
        if (!data.error) history.push({ role: 'assistant', content: [{ type: 'text', text: data.reply }] });
      } catch (err) {
        addMsg('Network error: ' + err.message, 'error');
      }
    }

    function addMsg(text, cls) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = 'msg ' + cls;
      div.innerHTML = text;
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
      reader.onload = () => {
        const base64 = reader.result;
        addMsg('<img src="' + base64 + '">', 'user');
        history.push({
          role: 'user',
          content: [
            { type: 'text', text: 'What do you see in this image?' },
            { type: 'image_url', image_url: { url: base64 } }
          ]
        });
        callAI();
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    document.getElementById('docInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      addMsg('<div class="file-msg">📄 <span>' + file.name + '</span></div>', 'user');

      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch('/document', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.text) {
        history.push({
          role: 'user',
          content: [{ type: 'text', text: 'Document: ' + file.name + '\\n\\nContent:\\n' + data.text }]
        });
        await callAI();
      } else {
        addMsg('Failed to read document: ' + data.error, 'error');
      }
      e.target.value = '';
    });
  </script>
</body>
</html>
  `);
});

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

app.post('/document', upload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    let text = '';

    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt') || file.originalname.endsWith('.md')) {
      text = file.buffer.toString('utf-8');
    } else if (file.mimetype === 'application/json') {
      text = file.buffer.toString('utf-8');
    } else if (file.mimetype === 'text/csv') {
      text = file.buffer.toString('utf-8');
    } else {
      text = '[File uploaded: ' + file.originalname + ']. For PDFs and DOCX, text extraction needs extra libraries. For now, I can see the file name and size: ' + (file.size / 1024).toFixed(1) + ' KB.';
    }

    res.json({ text });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
