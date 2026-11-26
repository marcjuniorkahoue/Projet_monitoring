import { connection } from "next/server";
import { pool } from "@/lib/db";
import JournalTableClient, { JournalRow } from "./JournalTableClient";

export default async function JournalList() {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query<JournalRow>(`
    SELECT id, occurred_at::text AS occurred_at, user_email, action,
           target_type, target_label, details, ip
    FROM audit_log
    ORDER BY occurred_at DESC, id DESC
    LIMIT 500`);

  return <JournalTableClient rows={rows} />;
}