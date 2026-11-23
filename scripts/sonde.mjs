import { readFileSync } from "node:fs";

// Lit la clé API dans .env.local (sinon valeur par défaut)
let key = "changez-moi";
try {
  const m = readFileSync(".env.local", "utf8").match(/^API_KEY=(.*)$/m);
  if (m) key = m[1].trim();
} catch {}

const url = `http://localhost:3000/api/check?key=${encodeURIComponent(key)}`;

async function lancer() {
  try {
    const res = await fetch(url);
    const data = await res.json();
    const ok = data.resultats.filter((r) => r.etat === "ok").length;
    console.log(new Date().toLocaleTimeString("fr-FR"), `: ${ok}/${data.resultats.length} applications fonctionnent`);
  } catch (e) {
    console.log("Échec du test :", e.message);
  }
}

lancer();
setInterval(lancer, 60000); // puis toutes les 60 secondes