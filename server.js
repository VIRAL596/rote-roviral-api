const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/gerar', async (req, res) => {
  const API_KEY = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Chave de API não configurada no servidor' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt obrigatório' });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY.trim(),
        'HTTP-Referer': 'https://roteíroviral.netlify.app',
        'X-Title': 'RoteiroViral'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 1500,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Erro da API' });
    }

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'Resposta inválida da API' });
    }

    res.json({ resultado: data.choices[0].message.content });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao conectar: ' + err.message });
  }
});

app.get('/', (req, res) => {
  const KEY = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
  res.json({ 
    status: 'RoteiroViral API rodando ✓',
    api_configurada: KEY ? 'sim' : 'NAO'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
