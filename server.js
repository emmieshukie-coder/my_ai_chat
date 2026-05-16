import express from 'express';
import multer from 'multer';

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
    html, body { height: 100%; overflow: hidden; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff; display: flex; flex-direction: column; color: #111;
    }
    header { padding: 14px 16px; background: #111; color: white; }
    header h2 { font-size: 17px; font-weight: 600; }

    #chat { flex: 1; overflow-y: auto; padding: 16px; background: #fff; min-height: 0; }
.msg { margin: 12px 0; padding: 10px 14px; border-radius: 18px; max-width: 85%; word-wrap: break-word; font-size: 15px; line-height: 1.5; }
.user { background: #e8f0fe; margin-left: auto; }
.ai { background: #f7f7f7; margin-right: auto; }

.related-title { font-size: 13px; color: #666; margin: 10px 0 6px 4px; }
.related-item {
      background: #f0f0f0; border: 1px solid #ddd; border-radius: 16px;
      padding: 10px 12px; font-size: 14px; margin-bottom: 6px; cursor: pointer;
    }
.related-item:active { background: #e0e0e0; }

.input-area {
      padding: 10px 12px; background: #007bff; padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }
.input-box {
      display: flex; align-items: center; background: #fff; border-radius: 24px;
      padding: 6px 8px 6px 14px; gap: 6px;
    }
.input-box input { flex: 1; border: none; outline: none; font-size: 15px; }
.icon-btn {
      width: 40px; height: 40px; border: none; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      background: transparent; font-size: 20px; flex-shrink: 0;
    }
.send-btn {
      width: 48px; height: 48px; border: none; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      background: #007bff; color: white; font-size: 22px; flex-shrink: 0;
    }

    #fileInput, #docInput { display: none; }
  </style>
</head>
<body>
  <header><h2>My AI Chat</h2></header>
  <div id="chat"></div>

  <div class="input-area">
    <div class="input-box">
      <input id="input" placeholder="Message" onkeydown="if(event.key==='Enter') send()">
      <button class="icon-btn" onclick="document.getElementById('docInput').click()">📎</button>
      <button class="icon-btn" onclick="document.getElementById('fileInput').click()">📷</button>
      <input type="file" id="fileInput" accept="image/*" capture="camera">
      <input type="file" id="docInput" accept=".pdf,.txt,.doc,.docx,.csv,.json,.md">
      <button class="send-btn" onclick="send()">➤</button>
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
        if (data.error) {
          addMsg('Error: ' + data.reply, 'ai');
          return;
        }
        addMsg(data.answer, 'ai', data.related);
        history.push({ role: 'assistant', content: [{ type: 'text', text: data.answer }] });
      } catch (err) {
        addMsg('Network error: ' + err.message, 'ai');
      }
    }

    function addMsg(text, cls, related = []) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = 'msg ' + cls;

      let html = text;

      if (related && related.length > 0) {
        html += '<div class="related-title">Related questions</div>';
        related.forEach(q => {
          const safeQ = q.replace(/'/g, "\\\\'").replace(/"/g, '\\\\"');
          html += '<div class="related-item" onclick="sendRelated(\\'' + safeQ + '\\')">' + q + '</div>';
        });
      }

      div.innerHTML = html;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function sendRelated(q) {
      document.getElementById('input').value = q;
      send();
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
            { type: 'text', text: 'Describe this image' },
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
      addMsg('📄 ' + file.name, 'user');
      const formData = new FormData();
      formData.append('document', file);
      const res = await fetch('/document', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        history.push({ role: 'user', content: [{ type: 'text', text: 'Document: ' + data.text }] });
        await callAI();
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
      return res.json({ reply: 'GROQ_API_KEY not set in Render environment variables', error: true });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant. Give complete answers in 2-4 sentences.
        After your answer, add a new line with exactly: RELATED_QUESTIONS:
        Then list 3 short follow-up questions, each on a new line starting with 1. 2. 3.`
      },
  ...req.body.messages
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.json({ reply: 'GROQ error: ' + err, error: true });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'No response';

    let answer = reply;
    let related = [];

    if (reply.includes('RELATED_QUESTIONS:')) {
      const parts = reply.split('RELATED_QUESTIONS:');
      answer = parts[0].trim();
      const qBlock = parts[1].trim();
      related = qBlock.split(/\\n/)
   .map(line => line.replace(/^\\d+\\.\\s*/, '').trim())
   .filter(line => line.length > 0)
   .slice(0, 3);
    }

    res.json({ answer, related });

  } catch (error) {
    res.json({ reply: 'Server error: ' + error.message, error: true });
  }
});

app.post('/document', upload.single('document'), async (req, res) => {
  try {
    const text = req.file.buffer.toString('utf-8');
    res.json({ text });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
