import Link from "next/link";
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ajouterServeur,
  mettreServeurALaCorbeille,
  restaurerServeur,
} from "@/app/(app)/serveurs/actions";
import ConfirmButton from "./ConfirmButton";

const ETAT = { ok: "fonctionel", warning: "Surveillé", incident: "Incident" } as const;
const couleur = (s: string) => (s === "ok" ? "t-ok" : s === "incident" ? "t-ko" : "t-wa");

type Props = { peutAjouter: boolean; peutSupprimer: boolean };

export default async function ServersAdmin({ peutAjouter, peutSupprimer }: Props) {
  await connection(); // lit la base à chaque visite

  const [actifs, corbeille] = await Promise.all([
    pool.query(`
      SELECT s.id, s.name, s.status, s.incident_message, s.updated_at::text AS updated_at,
             COUNT(a.id)::int AS app_count
      FROM servers s
      LEFT JOIN applications a ON a.server_id = s.id AND a.deleted_at IS NULL
      WHERE s.deleted_at IS NULL
      GROUP BY s.id
      ORDER BY s.name`),
    peutSupprimer
      ? pool.query(`
          SELECT id, name, deleted_at::text AS deleted_at
          FROM servers WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`)
      : Promise.resolve({ rows: [] as { id: number; name: string; deleted_at: string }[] }),
  ]);

  return (
    <div className="stack">
      {peutAjouter && (
        <section className="card">
          <h2>Ajouter un serveur</h2>
          <form action={ajouterServeur} className="form">
            <div>
              <label htmlFor="name">Nom du serveur</label>
              <input id="name" name="name" required maxLength={100} placeholder="Ex. SRV-PROD-03" />
            </div>
            <div>
              <button type="submit" className="btn">Ajouter</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Serveurs ({actifs.rows.length})</h2>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Nom</th><th>État</th><th>Applications</th><th>Dernière mise à jour</th>
                {(peutAjouter || peutSupprimer) && <th></th>}
              </tr>
            </thead>
            <tbody>
              {actifs.rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <span className={`tag ${couleur(s.status)}`}>{ETAT[s.status as keyof typeof ETAT]}</span>
                    {s.incident_message && <div className="env">{s.incident_message}</div>}
                  </td>
                  <td>{s.app_count}</td>
                  <td className="env" suppressHydrationWarning>
                    {new Date(s.updated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  {(peutAjouter || peutSupprimer) && (
                    <td>
                      <div className="actions-row">
                        {peutAjouter && <Link href={`/serveurs/${s.id}`} className="btn-small">Modifier</Link>}
                        {peutSupprimer &&
                          (s.app_count === 0 ? (
                            <form action={mettreServeurALaCorbeille}>
                              <input type="hidden" name="id" value={s.id} />
                              <ConfirmButton message={`Mettre le serveur « ${s.name} » à la corbeille ?`}>
                                Mettre à la corbeille
                              </ConfirmButton>
                            </form>
                          ) : (
                            <span className="env">Utilisé par {s.app_count} application(s)</span>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {peutSupprimer && corbeille.rows.length > 0 && (
        <section className="card">
          <h2>Corbeille ({corbeille.rows.length})</h2>
          <p className="note">Ces serveurs ne sont plus affichés. Vous pouvez les restaurer.</p>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Nom</th><th>Supprimé le</th><th></th></tr>
              </thead>
              <tbody>
                {corbeille.rows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td className="env">
                      {new Date(s.deleted_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td>
                      <form action={restaurerServeur}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" className="btn-small">Restaurer</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}