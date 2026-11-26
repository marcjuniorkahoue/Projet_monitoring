"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { exigerDroit } from "@/lib/auth";
import { journaliser, diff } from "@/lib/audit";

export type EtatForm = { erreur?: string } | undefined;

const rafraichir = () => {
  revalidatePath("/applications");
  revalidatePath("/");
};

type Champs = { name: string; url: string; environment: string; serverId: number };

function lireChamps(fd: FormData): Champs {
  return {
    name: String(fd.get("name") ?? "").trim(),
    url: String(fd.get("url") ?? "").trim(),
    environment: String(fd.get("environment") ?? ""),
    serverId: Number(fd.get("server_id")),
  };
}

function verifier(c: Champs): string | null {
  if (!c.name || c.name.length > 100) return "Le nom est obligatoire (100 caractères maximum).";
  if (!/^https?:\/\//.test(c.url)) return "L'adresse doit commencer par http:// ou https://.";
  if (!["production", "homologation"].includes(c.environment)) return "Environnement invalide.";
  if (!c.serverId) return "Choisissez un serveur.";
  return null;
}

export async function ajouterApplication(fd: FormData) {
  const moi = await exigerDroit("apps_add");
  const c = lireChamps(fd);
  if (verifier(c)) return;

  const res = await pool.query(
    `INSERT INTO applications (name, url, environment, server_id)
     SELECT $1, $2, $3, s.id FROM servers s WHERE s.id = $4 AND s.deleted_at IS NULL
     ON CONFLICT (name) DO NOTHING
     RETURNING id`,
    [c.name, c.url, c.environment, c.serverId]
  );
  if (res.rowCount) {
    const srv = await pool.query("SELECT name FROM servers WHERE id = $1", [c.serverId]);
    await journaliser({
      action: "application.ajoutee",
      utilisateur: moi,
      cible: { type: "application", id: res.rows[0].id, libelle: c.name },
      details: { adresse: c.url, environnement: c.environment, serveur: srv.rows[0]?.name },
    });
  }
  rafraichir();
}

export async function modifierApplication(_etat: EtatForm, fd: FormData): Promise<EtatForm> {
  const moi = await exigerDroit("apps_add");
  const id = Number(fd.get("id"));
  const c = lireChamps(fd);
  const erreur = verifier(c);
  if (!id || erreur) return { erreur: erreur ?? "Application inconnue." };

  const avant = await pool.query(
    `SELECT a.name AS nom, a.url AS adresse, a.environment AS environnement, s.name AS serveur
     FROM applications a JOIN servers s ON s.id = a.server_id
     WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [id]
  );
  if (!avant.rowCount) return { erreur: "Application introuvable." };

  try {
    const res = await pool.query(
      `UPDATE applications SET name = $1, url = $2, environment = $3, server_id = $4
       WHERE id = $5 AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM servers WHERE id = $4 AND deleted_at IS NULL)`,
      [c.name, c.url, c.environment, c.serverId, id]
    );
    if (!res.rowCount) return { erreur: "Modification impossible : application ou serveur introuvable." };
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return { erreur: "Une application porte déjà ce nom (elle est peut-être dans la corbeille)." };
    throw e;
  }

  const srv = await pool.query("SELECT name FROM servers WHERE id = $1", [c.serverId]);
  const changements = diff(avant.rows[0], {
    nom: c.name,
    adresse: c.url,
    environnement: c.environment,
    serveur: srv.rows[0]?.name,
  });
  if (Object.keys(changements).length) {
    await journaliser({
      action: "application.modifiee",
      utilisateur: moi,
      cible: { type: "application", id, libelle: c.name },
      details: changements,
    });
  }
  rafraichir();
  redirect("/applications");
}

export async function mettreApplicationALaCorbeille(fd: FormData) {
  const moi = await exigerDroit("apps_delete");
  const id = Number(fd.get("id"));
  if (!id) return;

  const res = await pool.query(
    "UPDATE applications SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING name",
    [id]
  );
  if (!res.rowCount) return;

  // On clôture ses incidents ouverts : la sonde ne la testera plus
  await pool.query("UPDATE incidents SET resolved_at = now() WHERE application_id = $1 AND resolved_at IS NULL", [id]);
  await journaliser({
    action: "application.corbeille",
    utilisateur: moi,
    cible: { type: "application", id, libelle: res.rows[0].name },
  });
  rafraichir();
}

export async function restaurerApplication(fd: FormData) {
  const moi = await exigerDroit("apps_delete");
  const id = Number(fd.get("id"));
  if (!id) return;

  const res = await pool.query(
    `UPDATE applications a SET deleted_at = NULL, status = 'ok'
     WHERE a.id = $1 AND a.deleted_at IS NOT NULL
       AND EXISTS (SELECT 1 FROM servers s WHERE s.id = a.server_id AND s.deleted_at IS NULL)
     RETURNING a.name`,
    [id]
  );
  if (res.rowCount) {
    await journaliser({
      action: "application.restauree",
      utilisateur: moi,
      cible: { type: "application", id, libelle: res.rows[0].name },
    });
  }
  rafraichir();
}