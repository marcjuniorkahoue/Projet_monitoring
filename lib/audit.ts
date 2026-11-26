import { headers } from "next/headers";
import { pool } from "@/lib/db";

type Cible = { type: string; id?: number | null; libelle?: string | null };

type Evenement = {
  action: string;                                    // ex. "application.corbeille"
  utilisateur?: { id: number; email: string } | null; // qui a agi
  emailTente?: string;                                // pour une connexion échouée : l'e-mail saisi
  cible?: Cible;                                      // sur quoi
  details?: Record<string, unknown>;                  // informations complémentaires (avant/après)
};

export async function journaliser(e: Evenement) {
  try {
    // L'adresse IP vient des en-têtes envoyés par le navigateur ou le reverse proxy
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;

    await pool.query(
      `INSERT INTO audit_log (user_id, user_email, action, target_type, target_id, target_label, details, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        e.utilisateur?.id ?? null,
        (e.utilisateur?.email ?? e.emailTente ?? null)?.slice(0, 200) ?? null, // on borne la taille
        e.action,
        e.cible?.type ?? null,
        e.cible?.id ?? null,
        e.cible?.libelle?.slice(0, 200) ?? null,
        e.details ?? null,
        ip,
      ]
    );
  } catch (err) {
    // Une panne du journal ne doit pas bloquer le travail des utilisateurs
    console.error("Échec d'écriture dans le journal d'audit :", err);
  }
}

// Compare deux objets et ne garde que ce qui a changé : { champ: { avant, apres } }
export function diff(avant: Record<string, unknown>, apres: Record<string, unknown>) {
  const changements: Record<string, { avant: unknown; apres: unknown }> = {};
  for (const k of Object.keys(apres)) {
    if (avant[k] !== apres[k]) changements[k] = { avant: avant[k], apres: apres[k] };
  }
  return changements;
}