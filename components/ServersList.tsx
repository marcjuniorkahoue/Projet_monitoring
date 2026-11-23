import { connection } from "next/server";
import { pool } from "@/lib/db";

const ETAT_SRV: Record<string, string> = { ok: "Sain", warning: "Surveillé", incident: "Incident" };
const couleur = (s: string) => (s === "ok" ? "t-ok" : s === "incident" ? "t-ko" : "t-wa");

export default async function ServersList() {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query(`
    SELECT s.id, s.name, s.status, s.incident_message, COUNT(a.id)::int AS app_count
    FROM servers s
    LEFT JOIN applications a ON a.server_id = s.id
    GROUP BY s.id
    ORDER BY s.name`);

  return (
    <section className="card">
      <h2>Serveurs</h2>
      {rows.map((s) => (
        <div key={s.id} className="sv">
          <div>
            {s.name}
            <br />
            <span className="env">{s.app_count} application(s)</span>
            {s.incident_message && <small>{s.incident_message}</small>}
          </div>
          <span className={`tag ${couleur(s.status)}`}>{ETAT_SRV[s.status]}</span>
        </div>
      ))}
    </section>
  );
}