"use server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

export async function ajouterApplication(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const environment = String(formData.get("environment") ?? "");
  const serverId = Number(formData.get("server_id"));

  // Vérifications : on ignore les données invalides
  if (!name || !/^https?:\/\//.test(url)) return;
  if (!["production", "homologation"].includes(environment) || !serverId) return;

  await pool.query(
    `INSERT INTO applications (name, url, environment, server_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO NOTHING`,
    [name, url, environment, serverId]
  );
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function supprimerApplication(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!id) return;
  await pool.query("DELETE FROM applications WHERE id = $1", [id]);
  revalidatePath("/applications");
  revalidatePath("/");
}