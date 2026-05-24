const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const KEY = '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';
app.post('/gerar', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Sem prompt' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY.trim(),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message });
    res.json({ resultado: d.content[0].text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get('/', (req, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Porta ' + PORT));
