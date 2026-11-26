import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

// Transforme un mot de passe en empreinte, au format "scrypt$sel$empreinte"
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

// Vérifie qu'un mot de passe tapé correspond à l'empreinte enregistrée
export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const attendu = Buffer.from(hash, "hex");
  const calcule = scryptSync(password, salt, attendu.length);
  return timingSafeEqual(attendu, calcule); // comparaison à durée constante
}
// Génère un mot de passe provisoire lisible, du type "k7Rm-Xp3Q-9tHv-2nWd"
// On retire les caractères qui se ressemblent (I, l, 1, O, 0, o) pour éviter les erreurs de recopie
export function genererMotDePasseProvisoire() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const groupes: string[] = [];
  for (let g = 0; g < 4; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += alphabet[randomInt(alphabet.length)]; // tirage aléatoire sécurisé
    groupes.push(s);
  }
  return groupes.join("-");
}