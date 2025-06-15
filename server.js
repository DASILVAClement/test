const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(express.static("public"));
app.use(express.json());

// Charge le contexte JSON (déjà poussé !)
function loadContext(name) {
  const file = path.join(__dirname, "memory", "contexts", `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { context: "", ideas: [] };
  }
}

// Gère la POST /ask
app.post("/ask", (req, res) => {
  const { prompt, contextName } = req.body;
  const ctxData = loadContext(contextName);
  const ctx = ctxData.context;

  // Fichier mémoire qui conserve les sessions
  const memFile = path.join(__dirname, "memory", `${contextName}.json`);
  let memory = [];
  try {
    memory = JSON.parse(fs.readFileSync(memFile, "utf8"));
  } catch {
    // initialise si pas encore créé
  }

  memory.push({ role: "user", content: prompt });

  // Préparation du prompt complet
  const fullPrompt = [
    { role: "system", content: ctx },
    ...memory
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: m.content,
      })),
    { role: "assistant", content: "" },
  ];

  const cmd = spawn("ollama", ["run", "llama3"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });
  let output = "";

  cmd.stdout.on("data", (d) => (output += d.toString()));
  cmd.stderr.on("data", (d) => console.error("stderr:", d.toString()));

  cmd.on("close", () => {
    const resp = output.trim();
    memory.push({ role: "assistant", content: resp });
    fs.writeFileSync(memFile, JSON.stringify(memory, null, 2));
    res.json({ answer: resp });
  });

  // Envoie les messages en texte pour Ollama
  fullPrompt.forEach((m) =>
    cmd.stdin.write(
      `${
        m.role === "system"
          ? ""
          : m.role === "user"
          ? "Utilisateur"
          : "Assistant"
      }: ${m.content}\n`
    )
  );
  cmd.stdin.end();
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
