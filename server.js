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
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + KEY,
        'HTTP-Referer': 'https://willowy-meerkat-68f4b0.netlify.app',
        'X-Title': 'RoteiroViral'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
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
