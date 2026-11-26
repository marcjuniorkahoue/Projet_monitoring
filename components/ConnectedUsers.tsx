import { connection } from "next/server";
import { pool } from "@/lib/db";
import { deconnecterSession } from "@/app/(app)/parametres/sessions";
import AutoRefresh from "./AutoRefresh";
import ConfirmButton from "./ConfirmButton";

// "Mozilla/5.0 (Windows NT 10.0…) Edg/120" -> "Edge sur Windows"
function appareil(ua: string | null) {
  if (!ua) return "—";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${nav} sur ${os}` : nav;
}

function depuis(s: number) {
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)} h`;
}

export default async function ConnectedUsers({ moiId }: { moiId: number }) {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query(`
    SELECT s.public_id, u.id AS user_id, u.full_name, u.job_title, u.email, r.name AS role,
           s.created_at::text AS created_at, s.ip, s.user_agent,
           EXTRACT(EPOCH FROM (now() - s.last_seen_at))::int AS inactif_s,
           (s.last_seen_at > now() - interval '5 minutes') AS en_ligne
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE s.expires_at > now() AND u.active
    ORDER BY s.last_seen_at DESC`);

  const enLigne = rows.filter((r) => r.en_ligne).length;

  return (
    <section className="card">
      <AutoRefresh />
      <h2>Personnes connectées <span className="env">: {enLigne} en ligne, {rows.length} session(s) ouverte(s)</span></h2>
      <p className="note">
        « En ligne » signifie une activité dans les 5 dernières minutes. Vérifiez que l'appareil et
        l'adresse IP correspondent bien à la personne.
      </p>

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Statut</th><th>Personne</th><th>Rôle</th><th>Connectée depuis</th>
              <th>Dernière activité</th><th>Appareil et adresse IP</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.public_id}>
                <td>
                  <span className={`dot${r.en_ligne ? "" : " off"}`} aria-hidden="true" />
                  {r.en_ligne ? "En ligne" : "Inactif"}
                </td>
                <td>
                  {r.full_name}{r.user_id === moiId && <span className="env"> (vous)</span>}
                  <div className="env">{r.job_title || "Fonction non renseignée"}</div>
                  <div className="env">{r.email}</div>
                </td>
                <td>{r.role}</td>
                <td>{new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{depuis(r.inactif_s)}</td>
                <td>
                  {appareil(r.user_agent)}
                  <div className="env">{r.ip ?? "adresse inconnue"}</div>
                </td>
                <td>
                  {r.user_id !== moiId && (
                    <form action={deconnecterSession}>
                      <input type="hidden" name="id" value={r.public_id} />
                      <ConfirmButton message={`Déconnecter ${r.full_name} ? Sa session sera fermée immédiatement.`}>
                        Déconnecter
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}