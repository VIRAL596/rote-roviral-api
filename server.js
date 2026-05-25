const express = require('express');
const https = require('https');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-admin-key');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

app.use(express.json());

const GROQ_KEY = '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';
const SUPA_URL = process.env.SUPABASE_URL || 'https://gkscxmeuestmcqicppan.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_nFPrpeOKDm-I8O3atuuOfw_Do44JGvg';

function supaFetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPA_URL + '/rest/v1/' + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + SUPA_KEY,
        'Prefer': method === 'POST' ? 'return=representation' : ''
      }
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(body); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

app.post('/cadastro', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Dados incompletos' });
    const existe = await supaFetch('GET', 'usuarios?email=eq.' + encodeURIComponent(email));
    if (Array.isArray(existe) && existe.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });
    const user = await supaFetch('POST', 'usuarios', { nome, email, senha, plano: 'gratis', roteiros_mes: 0, mes_atual: new Date().getMonth() });
    res.json({ user: Array.isArray(user) ? user[0] : user });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const users = await supaFetch('GET', 'usuarios?email=eq.' + encodeURIComponent(email) + '&senha=eq.' + encodeURIComponent(senha));
    if (!Array.isArray(users) || !users.length) return res.status(401).json({ error: 'Email ou senha incorretos' });
    res.json({ user: users[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/usuario/:email', async (req, res) => {
  try {
    const users = await supaFetch('GET', 'usuarios?email=eq.' + encodeURIComponent(req.params.email));
    if (!Array.isArray(users) || !users.length) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ user: users[0] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/usuarios', async (req, res) => {
  try {
    const key = req.headers['x-admin-key'];
    if (key !== 'roteiro@admin2024') return res.status(401).json({ error: 'Sem permissão' });
    const users = await supaFetch('GET', 'usuarios?order=criado_em.desc');
    res.json({ users: Array.isArray(users) ? users : [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/uso', async (req, res) => {
  try {
    const { email, roteiros_mes, mes_atual } = req.body;
    await supaFetch('PATCH', 'usuarios?email=eq.' + encodeURIComponent(email), { roteiros_mes, mes_atual });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/ativar', async (req, res) => {
  try {
    const { email, plano, senha_admin } = req.body;
    if (senha_admin !== 'roteiro@admin2024') return res.status(401).json({ error: 'Sem permissão' });
    await supaFetch('PATCH', 'usuarios?email=eq.' + encodeURIComponent(email), { plano });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/gerar', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Sem prompt' });
    const data = JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 800, messages: [{ role: 'user', content: prompt }] });
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Length': Buffer.byteLength(data) }
      };
      const r = https.request(options, (resp) => {
        let body = '';
        resp.on('data', chunk => body += chunk);
        resp.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(body); } });
      });
      r.on('error', reject);
      r.write(data);
      r.end();
    });
    if (result.error) return res.status(500).json({ error: result.error.message });
    res.json({ resultado: result.choices[0].message.content });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.json({ 
  status: 'ok',
  supa_url: SUPA_URL ? 'configurada' : 'AUSENTE',
  supa_key: SUPA_KEY ? 'configurada' : 'AUSENTE'
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Porta ' + PORT));
