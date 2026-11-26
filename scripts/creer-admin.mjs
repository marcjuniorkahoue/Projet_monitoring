import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

// Lit l'adresse de la base dans .env.local
const env = readFileSync(".env.local", "utf8");
const dbUrl = env.match(/^DATABASE_URL=(.*)$/m)?.[1].trim();

const [email, nom, motDePasse] = process.argv.slice(2);

if (!dbUrl || !email || !nom || !motDePasse) {
  console.log('Usage : node scripts/creer-admin.mjs email "Prénom Nom" "MotDePasse"');
  process.exit(1);
}
if (motDePasse.length < 12) {
  console.log("Le mot de passe doit contenir au moins 12 caractères.");
  process.exit(1);
}

// Même format que lib/password.ts : scrypt$sel$empreinte
const sel = randomBytes(16).toString("hex");
const empreinte = scryptSync(motDePasse, sel, 64).toString("hex");

const pool = new pg.Pool({ connectionString: dbUrl });
const res = await pool.query(
  `INSERT INTO users (email, full_name, password_hash, role_id, must_change_password)
   SELECT $1, $2, $3, id, false FROM roles WHERE name = 'Administrateur'
   ON CONFLICT (email) DO NOTHING
   RETURNING id`,
  [email.trim().toLowerCase(), nom.trim(), `scrypt$${sel}$${empreinte}`]
);

console.log(res.rowCount ? "Administrateur créé." : "Ce compte existe déjà : rien n'a été modifié.");
await pool.end();