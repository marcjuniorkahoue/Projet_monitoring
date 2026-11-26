import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/db";

const COOKIE = "session";
const DUREE_SECONDES = 8 * 60 * 60; // une session dure 8 heures

// On ne stocke jamais le jeton lui-même, seulement son empreinte
const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

export type Utilisateur = {
  id: number;
  email: string;
  full_name: string;
  job_title: string | null;
  must_change_password: boolean;
  role: string;
  apps_add: boolean;
  apps_delete: boolean;
  servers_add: boolean;
  servers_delete: boolean;
  manage_users: boolean;
};

// Ouvre une session : jeton aléatoire dans un cookie, empreinte dans la base
export async function creerSession(userId: number) {
  const jeton = randomBytes(32).toString("hex");

  // On note d'où la personne se connecte : utile à l'administrateur
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
  const appareil = h.get("user-agent")?.slice(0, 300) ?? null;

  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at, ip, user_agent)
     VALUES ($1, $2, now() + make_interval(secs => $3), $4, $5)`,
    [empreinte(jeton), userId, DUREE_SECONDES, ip, appareil]
  );
  (await cookies()).set(COOKIE, jeton, {
    httpOnly: true,                                  // illisible par le JavaScript de la page
    sameSite: "lax",                                 // limite les requêtes envoyées depuis un autre site
    secure: process.env.NODE_ENV === "production",   // HTTPS obligatoire en production
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

// Qui est connecté ? Renvoie null si personne, si la session a expiré ou si le compte est désactivé
export const utilisateurCourant = cache(async (): Promise<Utilisateur | null> => {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;
  const id = empreinte(jeton);

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.job_title, u.must_change_password,
            r.name AS role, r.apps_add, r.apps_delete, r.servers_add, r.servers_delete, r.manage_users
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN roles r ON r.id = u.role_id
     WHERE s.id = $1 AND s.expires_at > now() AND u.active`,
    [id]
  );
  if (!rows[0]) return null;

  // Marque la session comme active, au plus une fois par minute
  await pool.query(
    "UPDATE sessions SET last_seen_at = now() WHERE id = $1 AND last_seen_at < now() - interval '1 minute'",
    [id]
  );
  return rows[0];
});

// À appeler dans toute page ou action protégée.
// Renvoie l'utilisateur, ou redirige : non connecté -> connexion ; mot de passe provisoire -> changement
export async function exigerUtilisateur() {
  const u = await utilisateurCourant();
  if (!u) redirect("/connexion");
  if (u.must_change_password) redirect("/mot-de-passe");
  return u;
}

export async function terminerSession() {
  const jar = await cookies();
  const jeton = jar.get(COOKIE)?.value;
  if (jeton) await pool.query("DELETE FROM sessions WHERE id = $1", [empreinte(jeton)]);
  jar.delete(COOKIE);
}

export type Droit = "apps_add" | "apps_delete" | "servers_add" | "servers_delete" | "manage_users";

// À appeler au début de toute page ou action réservée.
// Redirige vers l'accueil si la personne n'a pas ce droit.
export async function exigerDroit(droit: Droit) {
  const u = await exigerUtilisateur();
  if (!u[droit]) redirect("/");
  return u;
}