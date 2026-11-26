"use server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { exigerDroit } from "@/lib/auth";
import { journaliser } from "@/lib/audit";

export async function deconnecterSession(fd: FormData) {
  const moi = await exigerDroit("manage_users");
  const id = Number(fd.get("id"));
  if (!id) return;

  // On ne peut pas fermer ses propres sessions ici : il y a le bouton « Quitter »
  const res = await pool.query(
    "DELETE FROM sessions WHERE public_id = $1 AND user_id <> $2 RETURNING user_id",
    [id, moi.id]
  );
  if (!res.rowCount) return;

  const cible = await pool.query("SELECT email FROM users WHERE id = $1", [res.rows[0].user_id]);
  await journaliser({
    action: "session.fermee",
    utilisateur: moi,
    cible: { type: "compte", id: res.rows[0].user_id, libelle: cible.rows[0]?.email },
  });
  revalidatePath("/parametres");
}