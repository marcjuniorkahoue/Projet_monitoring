"use server";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { creerSession, terminerSession, utilisateurCourant } from "@/lib/auth";
import { journaliser } from "@/lib/audit";

type Etat = { erreur?: string } | undefined;

// Empreinte factice : même temps de calcul si l'e-mail n'existe pas
const FAUSSE_EMPREINTE = hashPassword("mot-de-passe-factice");
const MESSAGE = "Identifiant ou mot de passe incorrect.";

export async function connexion(_etat: Etat, formData: FormData): Promise<Etat> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(formData.get("password") ?? "");

  const { rows } = await pool.query(
    `SELECT id, email, password_hash, active, must_change_password, locked_until
     FROM users WHERE email = $1`,
    [email]
  );
  const u = rows[0];
  const valide = verifyPassword(motDePasse, u?.password_hash ?? FAUSSE_EMPREINTE);
  const cible = u ? { type: "compte", id: u.id as number, libelle: u.email as string } : undefined;

  if (u?.locked_until && new Date(u.locked_until) > new Date()) {
    await journaliser({ action: "connexion.echec", emailTente: email, cible, details: { motif: "compte verrouillé" } });
    return { erreur: "Compte temporairement verrouillé. Réessayez dans quelques minutes." };
  }

  if (!u || !u.active || !valide) {
    let verrouille = false;
    if (u) {
      // 5 échecs : verrouillage de 15 minutes
      const r = await pool.query(
        `UPDATE users SET
           failed_attempts = CASE WHEN failed_attempts + 1 >= 5 THEN 0 ELSE failed_attempts + 1 END,
           locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
         WHERE id = $1
         RETURNING (locked_until IS NOT NULL AND locked_until > now()) AS verrouille`,
        [u.id]
      );
      verrouille = r.rows[0].verrouille;
    }
    const motif = !u ? "e-mail inconnu" : !u.active ? "compte désactivé" : "mot de passe incorrect";
    await journaliser({ action: "connexion.echec", emailTente: email, cible, details: { motif } });
    if (verrouille) {
      await journaliser({ action: "connexion.verrouillage", emailTente: email, cible, details: { duree: "15 minutes" } });
    }
    return { erreur: MESSAGE };
  }

  await pool.query(
    "UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1",
    [u.id]
  );
  await creerSession(u.id);
  await journaliser({ action: "connexion.reussie", utilisateur: { id: u.id, email: u.email } });
  redirect(u.must_change_password ? "/mot-de-passe" : "/");
}

export async function deconnexion() {
  const u = await utilisateurCourant(); // à lire AVANT de fermer la session
  await terminerSession();
  if (u) await journaliser({ action: "deconnexion", utilisateur: u });
  redirect("/connexion");
}

export async function changerMotDePasse(_etat: Etat, formData: FormData): Promise<Etat> {
  const u = await utilisateurCourant();
  if (!u) redirect("/connexion");

  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [u.id]);
  if (!verifyPassword(actuel, rows[0].password_hash)) {
    await journaliser({ action: "mot_de_passe.echec", utilisateur: u, details: { motif: "mot de passe actuel incorrect" } });
    return { erreur: "Le mot de passe actuel est incorrect." };
  }
  if (nouveau.length < 12) return { erreur: "Le nouveau mot de passe doit contenir au moins 12 caractères." };
  if (nouveau === actuel) return { erreur: "Le nouveau mot de passe doit être différent de l'actuel." };
  if (nouveau !== confirmation) return { erreur: "Les deux saisies du nouveau mot de passe ne correspondent pas." };

  await pool.query(
    "UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2",
    [hashPassword(nouveau), u.id]
  );
  // Par précaution : on ferme toutes les sessions existantes, puis on en ouvre une nouvelle
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [u.id]);
  await creerSession(u.id);
  await journaliser({ action: "mot_de_passe.change", utilisateur: u });
  redirect("/");
}