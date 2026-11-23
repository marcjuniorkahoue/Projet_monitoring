"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type IncidentRow = {
  id: number;
  application: string | null;
  server: string;
  message: string;
  started_at: string;
  resolved_at: string | null;
  duration_s: number;
};

// 3725 secondes -> "1 h 02 min"
function duree(s: number) {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${String(m % 60).padStart(2, "0")} min`;
  return `${Math.floor(h / 24)} j ${h % 24} h`;
}

const date = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function IncidentsTableClient({ rows }: { rows: IncidentRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [etat, setEtat] = useState("all");

  // Relit la base toutes les 30 secondes
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);

  const enCours = rows.filter((r) => !r.resolved_at).length;

  const liste = useMemo(
    () =>
      rows.filter(
        (r) =>
          (etat === "all" || (etat === "open" ? !r.resolved_at : !!r.resolved_at)) &&
          `${r.application ?? ""} ${r.server} ${r.message}`.toLowerCase().includes(q.toLowerCase())
      ),
    [rows, q, etat]
  );

  return (
    <section className="card">
      <h2>
        Historique des incidents
        <span className="env"> : {enCours} en cours, {rows.length - enCours} résolu(s)</span>
      </h2>

      <div className="tools">
        <input
          type="search"
          placeholder="Rechercher une application, un serveur ou un message"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={etat} onChange={(e) => setEtat(e.target.value)} aria-label="Filtrer par état">
          <option value="all">Tous les incidents</option>
          <option value="open">En cours</option>
          <option value="closed">Résolus</option>
        </select>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <th>Application</th>
              <th>Serveur</th>
              <th>Message</th>
              <th>Début</th>
              <th>Fin</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={`tag ${r.resolved_at ? "t-ok" : "t-ko"}`}>
                    {r.resolved_at ? "Résolu" : "En cours"}
                  </span>
                </td>
                <td>{r.application ?? "—"}</td>
                <td>{r.server}</td>
                <td>{r.message}</td>
                <td suppressHydrationWarning>{date(r.started_at)}</td>
                <td suppressHydrationWarning>{r.resolved_at ? date(r.resolved_at) : "—"}</td>
                <td>{duree(r.duration_s)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="empty">Aucun incident ne correspond à ces filtres.</p>}
      </div>
    </section>
  );
}