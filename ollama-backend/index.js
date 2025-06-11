const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

app.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: "mistral",
      prompt: prompt,
      stream: false
    });

    res.json({ answer: response.data.response });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Erreur serveur Ollama');
  }
});

app.listen(3000, () => {
  console.log('Serveur Ollama connecté sur http://localhost:3000');
});
