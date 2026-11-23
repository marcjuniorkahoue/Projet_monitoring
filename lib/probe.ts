import { pool } from "@/lib/db";

type Etat = "ok" | "degraded" | "down";

// Visite une adresse et décide de son état
async function tester(url: string): Promise<{ etat: Etat; ms: number | null }> {
  const debut = Date.now();
  try {
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(8000), // abandon après 8 secondes
      headers: { "user-agent": "Mozilla/5.0 (compatible; MonitoringBot/1.0)" },
    });
    const ms = Date.now() - debut;
    if (res.status >= 500) return { etat: "down", ms };
    if (ms > 3000) return { etat: "degraded", ms };
    return { etat: "ok", ms };
  } catch {
    return { etat: "down", ms: null };
  }
}

export async function lancerTests() {
  // On lit aussi l'état précédent, pour repérer les changements
  const { rows } = await pool.query(
    "SELECT id, name, url, status, server_id FROM applications WHERE url IS NOT NULL"
  );

  const resultats = await Promise.all(
    rows.map(async (r) => ({
      id: r.id as number,
      nom: r.name as string,
      serverId: r.server_id as number,
      avant: r.status as Etat,
      ...(await tester(r.url)),
    }))
  );

  for (const r of resultats) {
    await pool.query(
      "UPDATE applications SET status = $1, response_ms = $2, last_check = now() WHERE id = $3",
      [r.etat, r.ms, r.id]
    );

    // Passage en panne : on ouvre un incident (sauf s'il y en a déjà un d'ouvert)
    if (r.etat === "down" && r.avant !== "down") {
      await pool.query(
        `INSERT INTO incidents (server_id, application_id, message)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (
           SELECT 1 FROM incidents WHERE application_id = $2 AND resolved_at IS NULL
         )`,
        [r.serverId, r.id, `${r.nom} ne répond plus`]
      );
    }

    // Retour à la normale : on ferme l'incident ouvert
    if (r.etat !== "down" && r.avant === "down") {
      await pool.query(
        "UPDATE incidents SET resolved_at = now() WHERE application_id = $1 AND resolved_at IS NULL",
        [r.id]
      );
    }
  }

  // L'état de chaque serveur est déduit de celui de ses applications
  await pool.query(`
    UPDATE servers s SET
      status = CASE
        WHEN t.total > 0 AND t.down = t.total THEN 'incident'
        WHEN t.down > 0 OR t.degraded > 0 THEN 'warning'
        ELSE 'ok' END,
      incident_message = CASE
        WHEN t.total > 0 AND t.down = t.total THEN 'Toutes les applications sont en panne'
        WHEN t.down > 0 THEN t.down || ' application(s) en panne'
        WHEN t.degraded > 0 THEN t.degraded || ' application(s) dégradée(s)'
        ELSE NULL END,
      updated_at = now()
    FROM (
      SELECT server_id,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'down')::int AS down,
             COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded
      FROM applications GROUP BY server_id
    ) t
    WHERE t.server_id = s.id`);

  return resultats.map(({ id, nom, etat, ms }) => ({ id, nom, etat, ms }));
}