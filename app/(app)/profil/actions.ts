"use server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/auth";
import { journaliser, diff } from "@/lib/audit";

export type EtatProfil = { erreur?: string; ok?: boolean } | undefined;

export async function modifierProfil(_etat: EtatProfil, fd: FormData): Promise<EtatProfil> {
  const u = await exigerUtilisateur(); // on ne modifie que SON propre profil

  const nom = String(fd.get("nom") ?? "").trim();
  const fonction = String(fd.get("fonction") ?? "").trim();

  if (!nom || nom.length > 100) return { erreur: "Le nom est obligatoire (100 caractères maximum)." };
  if (fonction.length > 100) return { erreur: "La fonction ne peut pas dépasser 100 caractères." };

  await pool.query("UPDATE users SET full_name = $1, job_title = $2 WHERE id = $3", [
    nom,
    fonction || null,
    u.id,
  ]);

  const changements = diff(
    { nom: u.full_name, fonction: u.job_title ?? "" },
    { nom, fonction }
  );
  if (Object.keys(changements).length) {
    await journaliser({
      action: "profil.modifie",
      utilisateur: u,
      cible: { type: "compte", id: u.id, libelle: u.email },
      details: changements,
    });
  }

  revalidatePath("/", "layout"); // le nom affiché dans le menu se met à jour partout
  return { ok: true };
}