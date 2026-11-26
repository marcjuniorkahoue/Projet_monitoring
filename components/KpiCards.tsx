import { connection } from "next/server";
import { pool } from "@/lib/db";

export default async function KpiCards() {
  await connection(); // lit la base à chaque visite

  const [apps, servers] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'ok')::int AS ok,
             COUNT(*) FILTER (WHERE status = 'degraded')::int AS degraded,
             COUNT(*) FILTER (WHERE status = 'down')::int AS down,
             COUNT(*) FILTER (WHERE environment = 'production')::int AS prod,
             COUNT(*) FILTER (WHERE environment = 'homologation')::int AS hom
      FROM applications
      WHERE deleted_at IS NULL`),
    pool.query(`
      SELECT COUNT(*)::int AS bad
      FROM servers
      WHERE status <> 'ok' AND deleted_at IS NULL`),
  ]);

  const a = apps.rows[0];
  const bad: number = servers.rows[0].bad;

  return (
    <section className="kpis" aria-label="Indicateurs clés">
      <div className="card kpi"><span>Applications suivies</span><b>{a.total}</b></div>
      <div className="card kpi ok"><span>Fonctionnent</span><b>{a.ok}</b></div>
      <div className="card kpi wa"><span>Dégradées</span><b>{a.degraded}</b></div>
      <div className="card kpi ko"><span>En panne</span><b>{a.down}</b></div>
      <div className="card kpi"><span>Production / homologation</span><b>{a.prod} / {a.hom}</b></div>
      <div className={`card kpi ${bad > 0 ? "ko" : "ok"}`}><span>Serveurs en incident</span><b>{bad}</b></div>
    </section>
  );
}