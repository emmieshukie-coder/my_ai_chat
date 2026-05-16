import express from 'express';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: '10mb' }));

let users = {};
let userCVs = {};

const ADZUNA_APP_ID = 'cd82aca8';
const ADZUNA_APP_KEY = '39952eab2d2de243ff1ceffc7dc36478';

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JobAI Uganda</title>
  <script src="https://js.paystack.co/v1/inline.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; display: flex; flex-direction: column; color: #111; }
    header { padding: 14px 16px; background: #111; color: white; display: flex; align-items: center; justify-content: space-between; }
   .tabs { display: flex; background: #111; border-top: 1px solid #333; }
   .tab { flex: 1; padding: 10px; text-align: center; color: #aaa; cursor: pointer; font-size: 14px; }
   .tab.active { color: #007bff; border-bottom: 2px solid #007bff; }
    #chat, #jobs, #profile, #auth { flex: 1; overflow-y: auto; padding: 16px; display: none; }
    #chat.active, #jobs.active, #profile.active, #auth.active { display: block; }
   .msg { margin: 12px 0; padding: 10px 14px; border-radius: 18px; max-width: 85%; word-wrap: break-word; font-size: 15px; line-height: 1.5; }
   .user { background: #e8f0fe; margin-left: auto; }
   .ai { background: #f7f7f7; margin-right: auto; }
   .job-card,.cv-card { background: #f7f7f7; padding: 12px; border-radius: 12px; margin-bottom: 10px; }
   .apply-btn,.pay-btn,.auth-btn,.save-btn { margin-top: 8px; padding: 10px; background: #007bff; color: white; border: none; border-radius: 8px; width: 100%; cursor: pointer; font-size: 15px; }
   .pay-btn { background: #28a745; }
   .auth-btn { background: #111; }
   .save-btn { background: #6c757d; }
   .input-area { padding: 10px 12px; background: #007bff; }
   .input-box { display: flex; align-items: center; background: #fff; border-radius: 24px; padding: 6px 8px; gap: 6px; }
   .input-box input { flex: 1; border: none; outline: none; font-size: 15px; }
   .send-btn { width: 48px; height: 48px; border: none; border-radius: 50%; background: #007bff; color: white; font-size: 22px; }
    input[type="email"], input[type="password"] { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 8px; }
   .loading { text-align: center; color: #666; padding: 20px; }
  </style>
</head>
<body>
  <header><h2>JobAI Uganda</h2><span id="userEmail"></span></header>
  <div class="tabs">
    <div class="tab active" onclick="switchTab('chat')">AI Coach</div>
    <div class="tab" onclick="switchTab('jobs')">Jobs</div>
    <div class="tab" onclick="switchTab('profile')">Profile</div>
  </div>
  <div id="auth" class="active">
    <h3>Login to Save Your CV</h3>
    <input type="email" id="email" placeholder="Email">
    <input type="password" id="password" placeholder="Password">
    <button class="auth-btn" onclick="login()">Login / Register</button>
  </div>
  <div id="chat"></div>
  <div id="jobs"><div class="loading" id="jobsLoading">Loading jobs in Uganda...</div><div id="jobsList"></div></div>
  <div id="profile">
    <h3 id="profileEmail">Not logged in</h3>
    <button class="pay-btn" onclick="payWithPaystack()">Upgrade to Pro - 2999 UGX/week</button>
    <h4 style="margin-top:20px;">Saved CVs</h4>
    <div id="savedCVs" class="loading">Loading...</div>
    <button class="apply-btn" style="background:#dc3545; margin-top:20px;" onclick="logout()">Logout</button>
  </div>
  <div class="input-area">
    <div class="input-box">
      <input id="input" placeholder="Ask AI to rewrite CV, prep interview..." onkeydown="if(event.key==='Enter') send()">
      <button class="send-btn" onclick="send()">➤</button>
    </div>
  </div>

<script>
let history = [];
let currentUser = localStorage.getItem('jobai_email');
let token = localStorage.getItem('jobai_token');
let lastAIMessage = '';

window.onload = () => {
  if (currentUser) {
    showLoggedIn();
    loadJobs();
    loadCVs();
  } else {
    switchTab('auth');
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#chat, #jobs, #profile, #auth').forEach(s => s.classList.remove('active'));
  if (tab!== 'auth') {
    document.querySelector('.tab[onclick*="' + tab + '"]').classList.add('active');
  }
  document.getElementById(tab).classList.add('active');
}

function showLoggedIn() {
  document.getElementById('userEmail').innerText = currentUser;
  document.getElementById('profileEmail').innerText = currentUser;
  switchTab('chat');
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  if (!email ||!password) return alert('Fill both fields');
  const res = await fetch('/auth', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password})
  });
  const data = await res.json();
  if (data.token) {
    currentUser = email;
    token = data.token;
    localStorage.setItem('jobai_email', email);
    localStorage.setItem('jobai_token', data.token);
    showLoggedIn();
    loadJobs();
    loadCVs();
  } else {
    alert(data.error);
  }
}

function logout() {
  localStorage.clear();
  location.reload();
}

async function loadJobs() {
  const res = await fetch('/jobs');
  const jobs = await res.json();
  document.getElementById('jobsLoading').style.display = 'none';
  const html = jobs.map(j => `
    <div class="job-card">
      <h4>${j.title}</h4>
      <p>${j.location} • ${j.salary} • ${j.company}</p>
      <button class="apply-btn" onclick="askAI('Rewrite my CV for ${j.title} at ${j.company}')">AI Apply</button>
    </div>
  `).join('');
  document.getElementById('jobsList').innerHTML = html;
}

async function loadCVs() {
  const res = await fetch('/get-cvs', { headers: { 'Authorization': 'Bearer ' + token } });
  const cvs = await res.json();
  if (cvs.length === 0) {
    document.getElementById('savedCVs').innerHTML = '<p>No saved CVs yet</p>';
    return;
  }
  const html = cvs.map((cv, i) => `
    <div class="cv-card">
      <h4>${cv.title}</h4>
      <p>${cv.date}</p>
      <button class="save-btn" onclick="loadCV(${i})">Load</button>
    </div>
  `).join('');
  document.getElementById('savedCVs').innerHTML = html;
  window.savedCVs = cvs;
}

function loadCV(i) {
  switchTab('chat');
  document.getElementById('input').value = 'Use this CV: ' + window.savedCVs[i].content;
  send();
}

async function send() {
  const input = document.getElementById('input');
  const msg = input.value.trim();
  if (!msg) return;
  addMsg(msg, 'user');
  history.push({ role: 'user', content: [{ type: 'text', text: msg }] });
  input.value = '';
  await callAI();
}

function askAI(q) {
  switchTab('chat');
  document.getElementById('input').value = q;
  send();
}

async function callAI() {
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ messages: history })
  });
  const data = await res.json();
  lastAIMessage = data.answer;
  addMsg(data.answer, 'ai', data.related);
  history.push({ role: 'assistant', content: [{ type: 'text', text: data.answer }] });
}

function addMsg(text, cls, related = []) {
  const chat = document.getElementById('chat');
  const div = document.createElement('div');
  div.className = 'msg ' + cls;
  let html = text;
  if (related && related.length > 0) {
    html += '<div style="margin-top:10px; font-size:13px; color:#666;">Related:</div>';
    related.forEach(q => {
      const safeQ = q.replace(/'/g, "\\'");
      html += `<div style="background:#f0f0f0; padding:8px; margin-top:5px; border-radius:8px; cursor:pointer;" onclick="askAI('${safeQ}')">${q}</div>`;
    });
  }
  div.innerHTML = html;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function payWithPaystack() {
  let handler = PaystackPop.setup({
    key: 'pk_test_YOUR_PAYSTACK_PUBLIC_KEY',
    email: currentUser,
    amount: 299900,
    currency: 'UGX',
    callback: function(response) { alert('Payment successful! Ref: ' + response.reference); },
    onClose: function() { alert('Payment cancelled'); }
  });
  handler.openIframe();
}
</script>
</body></html>
  `);
});

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const email = Buffer.from(token, 'base64').toString();
    if (!users[email]) return res.status(401).json({ error: 'Invalid token' });
    req.userEmail = email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/auth', (req, res) => {
  const { email, password } = req.body;
  if (!email ||!password) return res.json({ error: 'Email and password required' });
  if (!users[email]) {
    users[email] = { password };
    userCVs[email] = [];
  } else if (users[email].password!== password) {
    return res.json({ error: 'Wrong password' });
  }
  const token = Buffer.from(email).toString('base64');
  res.json({ token });
});

app.post('/save-cv', auth, (req, res) => {
  const { title, content } = req.body;
  userCVs[req.userEmail].unshift({ title, content, date: new Date().toLocaleDateString() });
  res.json({ message: 'CV saved successfully' });
});

app.get('/get-cvs', auth, (req, res) => {
  res.json(userCVs[req.userEmail] || []);
});

app.get('/jobs', async (req, res) => {
  try {
    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/ug/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=10`);
    const data = await response.json();
    const jobs = (data.results || []).map(j => ({
      title: j.title,
      company: j.company.display_name,
      location: j.location.display_name,
      salary: j.salary_min? `UGX ${Math.round(j.salary_min * 3700).toLocaleString()}` : 'Negotiable'
    }));
    res.json(jobs);
  } catch (err) {
    res.json([{ title: 'Error loading jobs', company: err.message, location: '', salary: '' }]);
  }
});

app.post('/chat', async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.json({ answer: 'GROQ_API_KEY not set', related: [] });
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{ role: 'system', content: 'You are JobAI. End with RELATED_QUESTIONS: and 3 questions.' },...req.body.messages],
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || 'No response';
    let answer = reply;
    let related = [];
    if (reply.includes('RELATED_QUESTIONS:')) {
      const parts = reply.split('RELATED_QUESTIONS:');
      answer = parts[0].trim();
      related = parts[1].trim().split(/\n/).map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 3);
    }
    res.json({ answer, related });
  } catch (error) {
    res.json({ answer: 'Server error: ' + error.message, related: [] });
  }
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
