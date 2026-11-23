"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AppRow = {
  id: number;
  name: string;
  status: "ok" | "degraded" | "down";
  environment: "homologation" | "production";
  response_ms: number | null;
  last_check: string;
  server: string;
  server_status: "ok" | "warning" | "incident";
  incident_message: string | null;
};

const ETAT_APP = { ok: "Fonctionne", degraded: "Dégradée", down: "En panne" };
const ETAT_SRV = { ok: "Sain", warning: "Surveillé", incident: "Incident" };
const couleur = (s: string) => (s === "ok" ? "t-ok" : s === "down" || s === "incident" ? "t-ko" : "t-wa");

export default function AppsTableClient({ rows }: { rows: AppRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [etat, setEtat] = useState("all");
  const [env, setEnv] = useState("all");

  // Relit la base toutes les 30 secondes
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000);
    return () => clearInterval(t);
  }, [router]);

  const liste = useMemo(
    () =>
      rows.filter(
        (r) =>
          (etat === "all" || r.status === etat) &&
          (env === "all" || r.environment === env) &&
          `${r.name} ${r.server}`.toLowerCase().includes(q.toLowerCase())
      ),
    [rows, q, etat, env]
  );

  return (
    <section className="card big">
      <h2>Applications</h2>

      <div className="tools">
        <input
          type="search"
          placeholder="Rechercher une application ou un serveur"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={etat} onChange={(e) => setEtat(e.target.value)} aria-label="Filtrer par état">
          <option value="all">Tous les états</option>
          <option value="ok">Fonctionne</option>
          <option value="degraded">Dégradée</option>
          <option value="down">En panne</option>
        </select>
        <select value={env} onChange={(e) => setEnv(e.target.value)} aria-label="Filtrer par environnement">
          <option value="all">Tous les environnements</option>
          <option value="production">Production</option>
          <option value="homologation">Homologation</option>
        </select>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Application</th>
              <th>État</th>
              <th>Réponse</th>
              <th>Environnement</th>
              <th>Serveur</th>
              <th>État du serveur</th>
              <th>Dernier contrôle</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td><span className={`tag ${couleur(r.status)}`}>{ETAT_APP[r.status]}</span></td>
                <td>{r.response_ms !== null ? `${r.response_ms} ms` : "—"}</td>
                <td className="env">{r.environment === "production" ? "Production" : "Homologation"}</td>
                <td>{r.server}</td>
                <td>
                  <span className={`tag ${couleur(r.server_status)}`}>{ETAT_SRV[r.server_status]}</span>
                  {r.incident_message && <div className="env">{r.incident_message}</div>}
                </td>
                <td suppressHydrationWarning>
                  {new Date(r.last_check).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="empty">Aucune application ne correspond à ces filtres.</p>}
      </div>
    </section>
  );
}