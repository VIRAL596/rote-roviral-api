const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/gerar', async (req, res) => {
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'Chave Groq não configurada no servidor' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt obrigatório' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY.trim()
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1500,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Erro da API Groq' });
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
  const GROQ_KEY = process.env.GROQ_API_KEY;
  res.json({ 
    status: 'RoteiroViral API rodando',
    groq_configurado: GROQ_KEY ? 'sim' : 'NAO'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
