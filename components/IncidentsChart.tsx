import { connection } from "next/server";
import { pool } from "@/lib/db";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export default async function IncidentsChart() {
  await connection(); // lit la base à chaque visite

  // Nombre d'incidents par mois, depuis le 1er janvier de l'année en cours
  const { rows } = await pool.query<{ m: number; n: number }>(`
    SELECT EXTRACT(MONTH FROM started_at)::int AS m, COUNT(*)::int AS n
    FROM incidents
    WHERE started_at >= date_trunc('year', now())
    GROUP BY m`);

  // Tableau de 12 valeurs : 0 pour les mois sans incident
  const parMois = Array.from({ length: 12 }, (_, i) => rows.find((r) => r.m === i + 1)?.n ?? 0);
  const max = Math.max(1, ...parMois);
  const points = parMois.map((v, i) => `${30 + i * 60},${150 - (v / max) * 120}`).join(" ");

  return (
    <section className="card big">
      <h2>Incidents par mois</h2>
      <svg viewBox="0 0 720 180" width="100%" role="img" aria-label="Nombre d'incidents par mois depuis janvier">
        <g stroke="#d5e0ee">
          <line x1="30" y1="30" x2="710" y2="30" />
          <line x1="30" y1="90" x2="710" y2="90" />
          <line x1="30" y1="150" x2="710" y2="150" />
        </g>
        <polyline fill="none" stroke="#1f6fc4" strokeWidth="3" points={points} />
        <g fill="#42597a" fontSize="11">
          {MOIS.map((m, i) => (
            <text key={m} x={18 + i * 60} y="172">{m}</text>
          ))}
        </g>
      </svg>
    </section>
  );
}