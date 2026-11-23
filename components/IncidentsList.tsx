import { connection } from "next/server";
import { pool } from "@/lib/db";
import IncidentsTableClient, { IncidentRow } from "./IncidentsTableClient";

export default async function IncidentsList() {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query<IncidentRow>(`
    SELECT i.id,
           a.name AS application,
           s.name AS server,
           i.message,
           i.started_at::text AS started_at,
           i.resolved_at::text AS resolved_at,
           EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, now()) - i.started_at))::int AS duration_s
    FROM incidents i
    JOIN servers s ON s.id = i.server_id
    LEFT JOIN applications a ON a.id = i.application_id
    ORDER BY i.started_at DESC
    LIMIT 200`);

  return <IncidentsTableClient rows={rows} />;
}