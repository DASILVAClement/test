const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());

const memoryDir = path.join(__dirname, "memory");
if (!fs.existsSync(memoryDir)) fs.mkdirSync(memoryDir);

function memPath(name) {
  return path.join(memoryDir, `${name}.json`);
}
function loadMem(name = "default") {
  try {
    const content = fs.readFileSync(memPath(name), "utf8");
    const data = JSON.parse(content);
    // Vérifie que c’est bien un tableau
    return Array.isArray(data) ? data : [];
  } catch {
    return [
      {
        role: "system",
        content: "Tu es un assistant utile et tu réponds en français.",
      },
    ];
  }
}

function saveMem(name, mem) {
  fs.writeFileSync(memPath(name), JSON.stringify(mem, null, 2));
}

app.get("/memories", (req, res) => {
  const names = fs
    .readdirSync(memoryDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
  res.json(names);
});

app.get("/memories/:name", (req, res) => {
  res.json(loadMem(req.params.name));
});

app.post("/ask", (req, res) => {
  const { prompt, memoryName = "default" } = req.body;
  const mem = loadMem(memoryName);
  mem.push({ role: "user", content: prompt });

  const fullPrompt =
    mem
      .map((m) =>
        m.role === "system"
          ? ""
          : `${m.role === "user" ? "Utilisateur" : "Assistant"} : ${m.content}`
      )
      .filter(Boolean)
      .join("\n") + "\nAssistant :";

  const child = spawn("ollama", ["run", "llama3"], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
  });

  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => console.error("stderr:", d.toString()));

  child.on("close", () => {
    const ans = out.trim();
    mem.push({ role: "assistant", content: ans });
    saveMem(memoryName, mem);
    res.json({ answer: ans });
  });

  child.stdin.write(fullPrompt + "\n");
  child.stdin.end();
});

app.listen(PORT, () => console.log(`Server running: http://localhost:${PORT}`));
