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
    header {
      padding: 14px 16px; background: #111; color: white; display: flex;
      align-items: center; gap: 12px; flex-shrink: 0;
    }
    header h2 { font-size: 17px; font-weight: 600; flex: 1; }

    #chat { flex: 1; overflow-y: auto; padding: 16px; background: #fff; min-height: 0; }
  .msg { margin: 12px 0; padding: 10px 14px; border-radius: 18px; max-width: 85%; word-wrap: break-word; font-size: 15px; line-height: 1.5; }
  .user { background: #e8f0fe; color: #111; margin-left: auto; }
  .ai { background: #f7f7f7; color: #111; margin-right: auto; }
  .error { background: #ffe6e6; color: #d00; margin-right: auto; }
  .msg img { max-width: 100%; border-radius: 12px; margin-top: 6px; }

  .related-wrap { margin-top: 10px; }
  .related-title { font-size: 13px; color: #666; margin-bottom: 6px; }
  .related-list { display: flex; flex-direction: column; gap: 6px; }
  .related-item {
      background: #f0f0f0; border: 1px solid #ddd; border-radius: 16px;
      padding: 10px 12px; font-size: 14px; text-align: left; cursor: pointer;
      color: #111;
    }
  .related-item:active { background: #e0e0e0; }

  .input-area {
      padding: 10px 12px; background: #007bff; border-top: 1px solid #0056b3;
      flex-shrink: 0; padding-bottom: calc(10px + env(safe-area-inset-bottom));
    }
  .input-box {
      display: flex; align-items: center; background: #fff; border-radius: 24px;
      padding: 6px 8px 6px 14px; gap: 4px;
    }
  .input-box input {
      flex: 1; border: none; background: transparent; font-size: 15px;
      outline: none; color: #111; min-width: 0;
    }

  .icon-group { display: flex; align-items: center; gap: 2px; }
  .icon-btn {
      width: 36px; height: 36px; border-radius: 50%; border: none; background: transparent;
      font-size: 20px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #555; flex-shrink: 0;
    }
  .send-btn {
      width: 40px; height: 40px; border-radius: 50%; border: none; background: #007bff;
      color: white; font-size: 18px; cursor: pointer; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* Camera modal */
    #cameraModal {
      display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: black; z-index: 1000; flex-direction: column;
    }
    #cameraVideo { flex: 1; width: 100%; object-fit: cover; }
    #cameraControls {
      padding: 20px; display: flex; justify-content: center; gap: 20px; background: black;
    }
    #cameraControls button {
      width: 60px; height: 60px; border-radius: 50%; border: 3px solid white;
      background: transparent; color: white; font-size: 24px;
    }
    #captureBtn { background: white; color: black; }
    #docInput { display: none; }
  </style>
</head>
<body>
  <header>
    <h2>My AI Chat</h2>
  </header>

  <div id="chat"></div>

  <div class="input-area">
    <div class="input-box">
      <input id="input" placeholder="Message" onkeydown="if(event.key==='Enter') send()">
      <div class="icon-group">
        <button class="icon-btn" onclick="document.getElementById('docInput').click()">📎</button>
        <button class="icon-btn" onclick="openCamera()">📷</button>
        <input type="file" id="docInput" accept=".pdf,.txt,.doc,.docx,.csv,.json,.md">
        <button class="send-btn" onclick="send()">➤</button>
      </div>
    </div>
  </div>

  <!-- Camera Modal -->
  <div id="cameraModal">
    <video id="cameraVideo" autoplay playsinline></video>
    <div id="cameraControls">
      <button onclick="closeCamera()">✕</button>
      <button id="captureBtn" onclick="takePhoto()">●</button>
      <button onclick="switchCamera()">↻</button>
    </div>
  </div>

  <script>
    let history = [];
    let stream = null;
    let currentFacingMode = 'environment';

    async function openCamera() {
      document.getElementById('cameraModal').style.display = 'flex';
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode },
          audio: false
        });
        document.getElementById('cameraVideo').srcObject = stream;
      } catch (err) {
        alert('Camera access denied. Open in Chrome browser.');
        closeCamera();
      }
    }

    function closeCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }
      document.getElementById('cameraModal').style.display = 'none';
    }

    function takePhoto() {
      const video = document.getElementById('cameraVideo');
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);

      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      addMsg('<img src="' + base64 + '">', 'user');
      history.push({
        role: 'user',
        content: 'What do you see in this image? [Image data: ' + base64 + ']'
      });

      closeCamera();
      callAI();
    }

    function switchCamera() {
      currentFacingMode = currentFacingMode === 'environment'? 'user' : 'environment';
      closeCamera();
      openCamera();
    }

    async function send() {
      const input = document.getElementById('input');
      const msg = input.value.trim();
      if (!msg) return;
      addMsg(msg, 'user');
      history.push({ role: 'user', content: msg });
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
          addMsg(data.reply, 'error');
          return;
        }

        addMsg(data.answer, 'ai', data.related);
        history.push({ role: 'assistant', content: data.answer });
      } catch (err) {
        addMsg('Network error: ' + err.message, 'error');
      }
    }

    function addMsg(text, cls, related = []) {
      const chat = document.getElementById('chat');
      const div = document.createElement('div');
      div.className = 'msg ' + cls;

      let html = text;

      if (related && related.length > 0) {
        html += '<div class="related-wrap"><div class="related-title">Related questions</div><div class="related-list">';
        related.forEach(q => {
          html += '<div class="related-item" onclick="sendRelated(\\'' + q.replace(/'/g, "\\\\'") + '\\')">' + q + '</div>';
        });
        html += '</div></div>';
      }

      div.innerHTML = html;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    function sendRelated(q) {
      document.getElementById('input').value = q;
      send();
    }

    document.getElementById('docInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      addMsg('<div>📄 <span>' + file.name + '</span></div>', 'user');
      const formData = new FormData();
      formData.append('document', file);
      const res = await fetch('/document', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.text) {
        history.push({ role: 'user', content: 'Document: ' + file.name + '\\n\\nContent:\\n' + data.text });
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
      return res.json({ reply: 'GROQ_API_KEY not set', error: true });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant. Answer clearly.
        At the end, provide exactly 3 short related follow-up questions.
        Format EXACTLY like this:

        [Your answer here]

        RELATED_QUESTIONS:
        1. First question
        2. Second question
        3. Third question`
      },
    ...req.body.messages.map(m => ({ role: m.role, content: m.content }))
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
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.json({ reply: 'GROQ error: ' + err, error: true });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'Empty response';

    let answer = reply;
    let related = [];

    if (reply.includes('RELATED_QUESTIONS:')) {
      const parts = reply.split('RELATED_QUESTIONS:');
      answer = parts[0].trim();
      const qText = parts[1].trim();
      related = qText.split('\\n')
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
    const file = req.file;
    let text = file.buffer.toString('utf-8');
    res.json({ text });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
