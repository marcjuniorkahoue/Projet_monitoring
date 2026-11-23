import { connection } from "next/server";
import { pool } from "@/lib/db";
import AppsTableClient, { AppRow } from "./AppsTableClient";

export default async function AppsTable() {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query<AppRow>(`
    SELECT a.id, a.name, a.status, a.environment, a.response_ms,
           a.last_check::text AS last_check,
           s.name AS server, s.status AS server_status, s.incident_message
    FROM applications a
    JOIN servers s ON s.id = a.server_id
    ORDER BY a.name`);

  return <AppsTableClient rows={rows} />;
}