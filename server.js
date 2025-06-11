const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const port = 3000;

// Sert les fichiers HTML statiques depuis le dossier "public"
app.use(express.static("public"));
app.use(bodyParser.json());

// Route principale pour afficher le dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// API POST /ask -> envoie la question à Ollama
app.post("/ask", (req, res) => {
  const prompt = req.body.prompt;

  const ollama = spawn("ollama", ["run", "mistral"]);

  let output = "";
  ollama.stdout.on("data", (data) => {
    output += data.toString();
  });

  ollama.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  ollama.on("close", (code) => {
    const lastBrace = output.lastIndexOf("}");
    const jsonText = output.substring(0, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonText);
      res.json({ answer: parsed.response || "Aucune réponse." });
    } catch (e) {
      res.json({ answer: "Erreur de parsing de la réponse Ollama." });
    }
  });

  // On envoie le prompt à Ollama via stdin
  ollama.stdin.write(prompt + "\n");
  ollama.stdin.end();
});

app.listen(port, () => {
  console.log(`Serveur en ligne sur http://localhost:${port}`);
});
