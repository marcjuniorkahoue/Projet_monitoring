"use server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { exigerDroit } from "@/lib/auth";
import { hashPassword, genererMotDePasseProvisoire } from "@/lib/password";
import { journaliser, diff } from "@/lib/audit";

export type EtatCompte = { erreur?: string; email?: string; motDePasse?: string } | undefined;

const DROITS = ["apps_add", "apps_delete", "servers_add", "servers_delete", "manage_users"] as const;
const rafraichir = () => revalidatePath("/parametres");

// ---------- Comptes ----------

export async function creerUtilisateur(_etat: EtatCompte, fd: FormData): Promise<EtatCompte> {
  const moi = await exigerDroit("manage_users");

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const nom = String(fd.get("nom") ?? "").trim();
  const fonction = String(fd.get("fonction") ?? "").trim().slice(0, 100) || null;
  const roleId = Number(fd.get("role_id"));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Adresse e-mail invalide." };
  if (!nom || nom.length > 100) return { erreur: "Le nom est obligatoire (100 caractères maximum)." };
  const role = await pool.query("SELECT name FROM roles WHERE id = $1", [roleId]);
  if (!role.rowCount) return { erreur: "Rôle inconnu." };

  const motDePasse = genererMotDePasseProvisoire();
  const res = await pool.query(
    `INSERT INTO users (email, full_name, job_title, password_hash, role_id, must_change_password)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, nom, fonction, hashPassword(motDePasse), roleId]
  );
  if (!res.rowCount) return { erreur: "Un compte existe déjà avec cette adresse e-mail." };

  await journaliser({
    action: "compte.cree",
    utilisateur: moi,
    cible: { type: "compte", id: res.rows[0].id, libelle: email },
    details: { nom, fonction, role: role.rows[0].name },
  });
  rafraichir();
  return { email, motDePasse }; // affiché une seule fois à l'administrateur
}

export async function changerRoleUtilisateur(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  const roleId = Number(fd.get("role_id"));
  if (!id || !roleId || id === moi.id) return; // on ne modifie pas son propre compte

  const avant = await pool.query(
    "SELECT u.email, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1",
    [id]
  );
  const apres = await pool.query("SELECT name FROM roles WHERE id = $1", [roleId]);
  if (!avant.rowCount || !apres.rowCount) return;
  if (avant.rows[0].role === apres.rows[0].name) return; // rien ne change

  await pool.query("UPDATE users SET role_id = $1 WHERE id = $2", [roleId, id]);
  await journaliser({
    action: "compte.role",
    utilisateur: moi,
    cible: { type: "compte", id, libelle: avant.rows[0].email },
    details: { role: { avant: avant.rows[0].role, apres: apres.rows[0].name } },
  });
  rafraichir();
}

export async function basculerActif(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  const actif = fd.get("actif") === "true";
  if (!id || id === moi.id) return;

  const res = await pool.query("UPDATE users SET active = $1 WHERE id = $2 RETURNING email", [actif, id]);
  if (!res.rowCount) return;
  if (!actif) await pool.query("DELETE FROM sessions WHERE user_id = $1", [id]); // déconnexion immédiate

  await journaliser({
    action: actif ? "compte.reactive" : "compte.desactive",
    utilisateur: moi,
    cible: { type: "compte", id, libelle: res.rows[0].email },
  });
  rafraichir();
}

export async function reinitialiserMotDePasse(_etat: EtatCompte, fd: FormData): Promise<EtatCompte> {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  if (!id || id === moi.id) return { erreur: "Action impossible sur votre propre compte." };

  const motDePasse = genererMotDePasseProvisoire();
  const res = await pool.query(
    `UPDATE users SET password_hash = $1, must_change_password = true,
                      failed_attempts = 0, locked_until = NULL
     WHERE id = $2 RETURNING email`,
    [hashPassword(motDePasse), id]
  );
  if (!res.rowCount) return { erreur: "Compte introuvable." };

  await pool.query("DELETE FROM sessions WHERE user_id = $1", [id]); // ferme ses sessions en cours
  await journaliser({
    action: "compte.reinit",
    utilisateur: moi,
    cible: { type: "compte", id, libelle: res.rows[0].email },
  });
  rafraichir();
  return { email: res.rows[0].email, motDePasse };
}

// ---------- Rôles ----------

export async function creerRole(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const nom = String(fd.get("nom") ?? "").trim();
  if (!nom || nom.length > 50) return;

  const v = DROITS.map((d) => fd.get(d) === "on");
  const res = await pool.query(
    `INSERT INTO roles (name, apps_add, apps_delete, servers_add, servers_delete, manage_users)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name) DO NOTHING
     RETURNING id`,
    [nom, ...v]
  );
  if (res.rowCount) {
    await journaliser({
      action: "role.cree",
      utilisateur: moi,
      cible: { type: "rôle", id: res.rows[0].id, libelle: nom },
      details: { droits: DROITS.filter((_, i) => v[i]) },
    });
  }
  rafraichir();
}

export async function modifierRole(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  if (!id) return;

  const v = DROITS.map((d) => fd.get(d) === "on");

  // Protection : le rôle de l'administrateur connecté garde toujours le droit de gérer les comptes
  const { rows } = await pool.query("SELECT role_id FROM users WHERE id = $1", [moi.id]);
  if (rows[0]?.role_id === id) v[4] = true;

  const avant = await pool.query("SELECT * FROM roles WHERE id = $1", [id]);
  if (!avant.rowCount) return;

  await pool.query(
    `UPDATE roles SET apps_add = $1, apps_delete = $2, servers_add = $3,
                      servers_delete = $4, manage_users = $5
     WHERE id = $6`,
    [...v, id]
  );

  const droitsAvant = Object.fromEntries(DROITS.map((d) => [d, Boolean(avant.rows[0][d])]));
  const droitsApres = Object.fromEntries(DROITS.map((d, i) => [d, v[i]]));
  const changements = diff(droitsAvant, droitsApres);
  if (Object.keys(changements).length) {
    await journaliser({
      action: "role.modifie",
      utilisateur: moi,
      cible: { type: "rôle", id, libelle: avant.rows[0].name },
      details: changements,
    });
  }
  rafraichir();
}

export async function supprimerRole(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  if (!id) return;

  // Refusé si au moins une personne a encore ce rôle
  const res = await pool.query(
    "DELETE FROM roles WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM users WHERE role_id = $1) RETURNING name",
    [id]
  );
  if (res.rowCount) {
    await journaliser({
      action: "role.supprime",
      utilisateur: moi,
      cible: { type: "rôle", id, libelle: res.rows[0].name },
    });
  }
  rafraichir();
}
// ---------- Nom et fonction ----------

export type EtatIdentite = { erreur?: string; ok?: boolean } | undefined;

export async function modifierIdentite(_etat: EtatIdentite, fd: FormData): Promise<EtatIdentite> {
  const moi = await exigerDroit("manage_users"); // seul celui qui gère les comptes peut le faire

  const id = Number(fd.get("id"));
  const nom = String(fd.get("nom") ?? "").trim();
  const fonction = String(fd.get("fonction") ?? "").trim();

  if (!id) return { erreur: "Compte inconnu." };
  if (!nom || nom.length > 100) return { erreur: "Le nom est obligatoire (100 caractères maximum)." };
  if (fonction.length > 100) return { erreur: "La fonction ne peut pas dépasser 100 caractères." };

  const avant = await pool.query("SELECT email, full_name, job_title FROM users WHERE id = $1", [id]);
  if (!avant.rowCount) return { erreur: "Compte introuvable." };

  await pool.query("UPDATE users SET full_name = $1, job_title = $2 WHERE id = $3", [
    nom,
    fonction || null,
    id,
  ]);

  const changements = diff(
    { nom: avant.rows[0].full_name, fonction: avant.rows[0].job_title ?? "" },
    { nom, fonction }
  );
  if (Object.keys(changements).length) {
    await journaliser({
      action: "compte.identite",
      utilisateur: moi,
      cible: { type: "compte", id, libelle: avant.rows[0].email },
      details: changements,
    });
  }

  revalidatePath("/", "layout"); // le nom du menu se met à jour si l'administrateur s'est modifié lui-même
  return { ok: true };
}