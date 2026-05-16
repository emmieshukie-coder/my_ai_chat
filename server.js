import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

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
      padding: 16px;
      background: #007bff;
      color: white;
      text-align: center;
      flex-shrink: 0;
    }
    header h2 { font-size: 18px; font-weight: 600; }
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
  .user {
      background: #007bff;
      color: white;
      margin-left: auto;
    }
  .ai {
      background: #e9ecef;
      color: #333;
      margin-right: auto;
    }
  .error {
      background: #ffe6e6;
      color: #d00;
      margin-right: auto;
    }
 .input-area {
      display: flex;
      gap: 8px;
      padding: 12px;
      background: white;
      border-top: 1px solid #ddd;
      flex-shrink: 0;
    }
    input {
      flex: 1;
      padding: 12px;
      font-size: 16px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
    }
    input:focus { border-color: #007bff; }
    button {
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
    button:active { background: #0056b3; }
    button:disabled { background: #ccc; }
  </style>
</head>
<body>
  <header>
    <h2>🤖 My AI Chat</h2>
  </header>
  <div id="chat"></div>
  <div class="input-area">
    <input id="input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') send()">
    <button id="sendBtn" onclick="send()">Send</button>
  </div>

  <script>
    async function send() {
      const input = document.getElementById('input');
      const btn = document.getElementById('sendBtn');
      const msg = input.value.trim();
      if (!msg) return;

      addMsg('You', msg, 'user');
      input.value = '';
      btn.disabled = true;

      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg })
        });

        const data = await res.json();
        addMsg('AI', data.reply || 'No response', data.error? 'error' : 'ai');
      } catch (err) {
        addMsg('AI', 'Network error: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
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
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: req.body.message }],
        temperature: 0.7
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

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
