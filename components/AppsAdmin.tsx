import Link from "next/link";
import { connection } from "next/server";
import { pool } from "@/lib/db";
import {
  ajouterApplication,
  mettreApplicationALaCorbeille,
  restaurerApplication,
} from "@/app/(app)/applications/actions";
import ConfirmButton from "./ConfirmButton";

const ETAT = { ok: "Fonctionne", degraded: "Dégradée", down: "En panne" } as const;
const couleur = (s: string) => (s === "ok" ? "t-ok" : s === "down" ? "t-ko" : "t-wa");

type Props = { peutAjouter: boolean; peutSupprimer: boolean };

export default async function AppsAdmin({ peutAjouter, peutSupprimer }: Props) {
  await connection(); // lit la base à chaque visite

  const [servers, apps, corbeille] = await Promise.all([
    pool.query("SELECT id, name FROM servers WHERE deleted_at IS NULL ORDER BY name"),
    pool.query(`
      SELECT a.id, a.name, a.url, a.status, a.environment, s.name AS server
      FROM applications a JOIN servers s ON s.id = a.server_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.name`),
    // La corbeille n'est lue que par ceux qui ont le droit de restaurer
    peutSupprimer
      ? pool.query(`
          SELECT a.id, a.name, a.url, a.deleted_at::text AS deleted_at,
                 s.name AS server, (s.deleted_at IS NOT NULL) AS server_supprime
          FROM applications a JOIN servers s ON s.id = a.server_id
          WHERE a.deleted_at IS NOT NULL
          ORDER BY a.deleted_at DESC`)
      : Promise.resolve({ rows: [] as Record<string, string | boolean | number>[] }),
  ]);

  return (
    <div className="stack">
      {peutAjouter && (
        <section className="card">
          <h2>Ajouter une application</h2>
          <form action={ajouterApplication} className="form">
            <div>
              <label htmlFor="name">Nom</label>
              <input id="name" name="name" required maxLength={100} placeholder="Ex. Portail RH" />
            </div>
            <div>
              <label htmlFor="url">Adresse (URL)</label>
              <input id="url" name="url" type="url" required placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="environment">Environnement</label>
              <select id="environment" name="environment" defaultValue="production">
                <option value="production">Production</option>
                <option value="homologation">Homologation</option>
              </select>
            </div>
            <div>
              <label htmlFor="server_id">Serveur</label>
              <select id="server_id" name="server_id" required>
                {servers.rows.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <button type="submit" className="btn">Ajouter</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <h2>Applications ({apps.rows.length})</h2>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Nom</th><th>Adresse</th><th>État</th><th>Environnement</th><th>Serveur</th>
                {(peutAjouter || peutSupprimer) && <th></th>}
              </tr>
            </thead>
            <tbody>
              {apps.rows.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="env">{a.url}</td>
                  <td><span className={`tag ${couleur(a.status)}`}>{ETAT[a.status as keyof typeof ETAT]}</span></td>
                  <td className="env">{a.environment === "production" ? "Production" : "Homologation"}</td>
                  <td>{a.server}</td>
                  {(peutAjouter || peutSupprimer) && (
                    <td>
                      <div className="actions-row">
                        {peutAjouter && <Link href={`/applications/${a.id}`} className="btn-small">Modifier</Link>}
                        {peutSupprimer && (
                          <form action={mettreApplicationALaCorbeille}>
                            <input type="hidden" name="id" value={a.id} />
                            <ConfirmButton message={`Mettre « ${a.name} » à la corbeille ? Vous pourrez la restaurer.`}>
                              Mettre à la corbeille
                            </ConfirmButton>
                          </form>
                        )}
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
          <p className="note">Ces applications ne sont plus testées ni affichées. Vous pouvez les restaurer.</p>
          <div className="tw">
            <table>
              <thead>
                <tr><th>Nom</th><th>Adresse</th><th>Serveur</th><th>Supprimée le</th><th></th></tr>
              </thead>
              <tbody>
                {corbeille.rows.map((a) => (
                  <tr key={a.id as number}>
                    <td>{a.name}</td>
                    <td className="env">{a.url}</td>
                    <td>{a.server}</td>
                    <td className="env">
                      {new Date(a.deleted_at as string).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td>
                      {a.server_supprime ? (
                        <span className="env">Restaurez d'abord le serveur « {a.server} »</span>
                      ) : (
                        <form action={restaurerApplication}>
                          <input type="hidden" name="id" value={a.id as number} />
                          <button type="submit" className="btn-small">Restaurer</button>
                        </form>
                      )}
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