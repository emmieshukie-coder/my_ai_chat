const express = require('express');
const app = express();
app.use(express.json());
app.use(express.static('.'));

const META_API_KEY = process.env.META_API_KEY;

app.post('/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch('https://api.llama.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant. Be concise and friendly.' },
          { role: 'user', content: message }
        ],
        max_tokens: 500
      })
    });

    const data = await response.json();
    res.json({ reply: data.completion_message.content.text });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>My AI</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        #chat { background: white; height: 400px; overflow-y: auto; padding: 15px; border-radius: 10px; margin-bottom: 10px; }
        .msg { margin: 10px 0; }
        .user { text-align: right; color: #007bff; }
        .ai { text-align: left; color: #333; }
        input, button { padding: 10px; font-size: 16px; }
        input { width: 75%; border: 1px solid #ccc; border-radius: 5px; }
        button { width: 20%; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h2>🤖 My AI Chat</h2>
      <div id="chat"></div>
      <input id="input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') send()">
      <button onclick="send()">Send</button>
      
      <script>
        async function send() {
          const input = document.getElementById('input');
          const msg = input.value.trim();
          if (!msg) return;
          
          addMsg('You', msg, 'user');
          input.value = '';
          
          const res = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: msg})
          });
          
          const data = await res.json();
          addMsg('AI', data.reply || data.error, 'ai');
        }
        
        function addMsg(sender, text, cls) {
          const chat = document.getElementById('chat');
          chat.innerHTML += `<div class="msg ${cls}"><b>${sender}:</b> ${text}</div>`;
          chat.scrollTop = chat.scrollHeight;
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI running on port ${PORT}`));
