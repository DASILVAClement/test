const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());

const memoryDir = path.join(__dirname, "memory");
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir, { recursive: true });

function getMemPath(name) {
  return path.join(memoryDir, `${name}.json`);
}
function readMem(name) {
  const file = getMemPath(name);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function writeMem(name, mem) {
  fs.writeFileSync(getMemPath(name), JSON.stringify(mem, null, 2));
}

app.get("/memories", (req, res) => {
  const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith(".json"));
  res.json(files.map((f) => f.replace(".json", "")));
});

app.get("/memories/:name", (req, res) => {
  res.json(readMem(req.params.name));
});

app.post("/ask", (req, res) => {
  const systemPrompt = `Tu es une intelligence artificielle assistante. Voici l'historique de la conversation entre toi et l'utilisateur. Tu dois répondre de manière cohérente, logique, et concise en français, en tenant compte de ce qui a déjà été dit.\n\n`;

  const fullPrompt =
    systemPrompt +
    mem
      .map(
        (m) =>
          `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`
      )
      .join("\n") +
    "\nAssistant :";

  const { prompt, memoryName } = req.body;
  const memName = memoryName || "default";
  const mem = readMem(memName);
  mem.push({ role: "user", content: prompt });

  const messages = mem
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  const ollamaPrompt = `${messages}\nAssistant:`;

  const child = spawn("ollama", ["run", "mistral"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });
  let out = "";

  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => console.error("stderr:", d.toString()));

  child.on("close", (code) => {
    const resp = out.trim();
    mem.push({ role: "assistant", content: resp });
    writeMem(memName, mem);
    res.json({ answer: resp });
  });

  child.stdin.write(fullPrompt);
  child.stdin.end();
});

app.listen(PORT, () => console.log(`🌐 Servir sur http://localhost:${PORT}`));
