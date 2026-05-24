const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const GROQ_KEY = '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';
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_KEY;

async function db(method, path, body) {
  const r = await fetch(SUPA_URL + '/rest/v1/' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return r.json();
}

app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Dados incompletos' });
  const existe = await db('GET', 'usuarios?email=eq.' + encodeURIComponent(email));
  if (Array.isArray(existe) && existe.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });
  const user = await db('POST', 'usuarios', { nome, email, senha, plano: 'gratis', roteiros_mes: 0, mes_atual: new Date().getMonth() });
  res.json({ user: Array.isArray(user) ? user[0] : user });
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const users = await db('GET', 'usuarios?email=eq.' + encodeURIComponent(email) + '&senha=eq.' + encodeURIComponent(senha));
  if (!Array.isArray(users) || !users.length) return res.status(401).json({ error: 'Email ou senha incorretos' });
  res.json({ user: users[0] });
});

app.get('/usuario/:email', async (req, res) => {
  const users = await db('GET', 'usuarios?email=eq.' + encodeURIComponent(req.params.email));
  if (!Array.isArray(users) || !users.length) return res.status(404).json({ error: 'Não encontrado' });
  res.json({ user: users[0] });
});

app.get('/usuarios', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'roteiro@admin2024') return res.status(401).json({ error: 'Sem permissão' });
  const users = await db('GET', 'usuarios?order=criado_em.desc');
  res.json({ users: Array.isArray(users) ? users : [] });
});

app.post('/uso', async (req, res) => {
  const { email, roteiros_mes, mes_atual } = req.body;
  await db('PATCH', 'usuarios?email=eq.' + encodeURIComponent(email), { roteiros_mes, mes_atual });
  res.json({ ok: true });
});

app.post('/ativar', async (req, res) => {
  const { email, plano, senha_admin } = req.body;
  if (senha_admin !== 'roteiro@admin2024') return res.status(401).json({ error: 'Sem permissão' });
  await db('PATCH', 'usuarios?email=eq.' + encodeURIComponent(email), { plano });
  res.json({ ok: true });
});

app.post('/gerar', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Sem prompt' });
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    res.json({ resultado: d.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Porta ' + PORT));
