"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { exigerDroit } from "@/lib/auth";
import { journaliser, diff } from "@/lib/audit";

export type EtatForm = { erreur?: string } | undefined;

const rafraichir = () => {
  revalidatePath("/serveurs");
  revalidatePath("/applications");
  revalidatePath("/");
};

export async function ajouterServeur(fd: FormData) {
  const moi = await exigerDroit("servers_add");
  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length > 100) return;

  const res = await pool.query(
    "INSERT INTO servers (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id",
    [name]
  );
  if (res.rowCount) {
    await journaliser({
      action: "serveur.ajoute",
      utilisateur: moi,
      cible: { type: "serveur", id: res.rows[0].id, libelle: name },
    });
  }
  rafraichir();
}

export async function modifierServeur(_etat: EtatForm, fd: FormData): Promise<EtatForm> {
  const moi = await exigerDroit("servers_add");
  const id = Number(fd.get("id"));
  const name = String(fd.get("name") ?? "").trim();
  if (!id) return { erreur: "Serveur inconnu." };
  if (!name || name.length > 100) return { erreur: "Le nom est obligatoire (100 caractères maximum)." };

  const avant = await pool.query("SELECT name AS nom FROM servers WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (!avant.rowCount) return { erreur: "Serveur introuvable." };

  try {
    await pool.query("UPDATE servers SET name = $1 WHERE id = $2 AND deleted_at IS NULL", [name, id]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return { erreur: "Un serveur porte déjà ce nom (il est peut-être dans la corbeille)." };
    throw e;
  }

  const changements = diff(avant.rows[0], { nom: name });
  if (Object.keys(changements).length) {
    await journaliser({
      action: "serveur.modifie",
      utilisateur: moi,
      cible: { type: "serveur", id, libelle: name },
      details: changements,
    });
  }
  rafraichir();
  redirect("/serveurs");
}

export async function mettreServeurALaCorbeille(fd: FormData) {
  const moi = await exigerDroit("servers_delete");
  const id = Number(fd.get("id"));
  if (!id) return;

  // Refusé tant que des applications actives sont hébergées sur ce serveur
  const res = await pool.query(
    `UPDATE servers SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM applications WHERE server_id = $1 AND deleted_at IS NULL)
     RETURNING name`,
    [id]
  );
  if (res.rowCount) {
    await journaliser({
      action: "serveur.corbeille",
      utilisateur: moi,
      cible: { type: "serveur", id, libelle: res.rows[0].name },
    });
  }
  rafraichir();
}

export async function restaurerServeur(fd: FormData) {
  const moi = await exigerDroit("servers_delete");
  const id = Number(fd.get("id"));
  if (!id) return;

  const res = await pool.query(
    `UPDATE servers SET deleted_at = NULL, status = 'ok', incident_message = NULL
     WHERE id = $1 AND deleted_at IS NOT NULL RETURNING name`,
    [id]
  );
  if (res.rowCount) {
    await journaliser({
      action: "serveur.restaure",
      utilisateur: moi,
      cible: { type: "serveur", id, libelle: res.rows[0].name },
    });
  }
  rafraichir();
}