import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static('public'));

// Serve the chat page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My AI Chat</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: #f5f5f5; 
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
   .container {
      width: 100%;
      max-width: 700px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      height: 90vh;
    }
    header {
      padding: 20px;
      border-bottom: 1px solid #eee;
      background: #007bff;
      color: white;
      border-radius: 12px 12px 0 0;
    }
    header h2 { font-weight: 600; }
    #chat { 
      flex: 1;
      overflow-y: auto; 
      padding: 20px;
    }
   .msg { 
      margin: 12px 0; 
      padding: 12px 16px;
      border-radius: 8px;
      max-width: 80%;
      word-wrap: break-word;
    }
   .user { 
      background: #007bff; 
      color: white; 
      margin-left: auto;
      text-align: right;
    }
   .ai { 
      background: #e9ecef; 
      color: #333; 
      margin-right: auto;
    }
   .input-area {
      display: flex;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #eee;
    }
    input { 
      flex: 1;
      padding: 12px; 
      font-size: 16px; 
      border: 1px solid #ddd; 
      border-radius: 8px;
      outline: none;
    }
    input:focus { border-color: #007bff; }
    button { 
      padding: 12px 24px; 
      font-size: 16px; 
      background: #007bff; 
      color: white; 
      border: none; 
      border-radius: 8px; 
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: #0056b3; }
    button:disabled { background: #ccc; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h2>🤖 My AI Chat</h2>
    </header>
    <div id="chat"></div>
    <div class="input-area">
      <input id="input" placeholder="Type your message..." onkeydown="if(event.key==='Enter') send()">
      <button id="sendBtn" onclick="send()">Send</button>
    </div>
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
        addMsg('AI', data.reply || 'Error getting response', 'ai');
      } catch (err) {
        addMsg('AI', 'Sorry, something went wrong.', 'ai');
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
    const userMessage = req.body.message;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';
    res.json({ reply });
    
  } catch (error) {
    console.error('Error:', error);
    res.json({ reply: 'Error: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
