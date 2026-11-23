import { connection } from "next/server";
import { pool } from "@/lib/db";
import { ajouterApplication, supprimerApplication } from "@/app/applications/actions";
import ConfirmButton from "./ConfirmButton";

const ETAT = { ok: "Fonctionne", degraded: "Dégradée", down: "En panne" } as const;
const couleur = (s: string) => (s === "ok" ? "t-ok" : s === "down" ? "t-ko" : "t-wa");

export default async function AppsAdmin() {
  await connection(); // lit la base à chaque visite

  const [servers, apps] = await Promise.all([
    pool.query("SELECT id, name FROM servers ORDER BY name"),
    pool.query(`
      SELECT a.id, a.name, a.url, a.status, a.environment, s.name AS server
      FROM applications a JOIN servers s ON s.id = a.server_id
      ORDER BY a.name`),
  ]);

  return (
    <div className="stack">
      <section className="card">
        <h2>Ajouter une application</h2>
        <form action={ajouterApplication} className="form">
          <div>
            <label htmlFor="name">Nom</label>
            <input id="name" name="name" required placeholder="Ex. Portail RH" />
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

      <section className="card">
        <h2>Applications ({apps.rows.length})</h2>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Nom</th><th>Adresse</th><th>État</th><th>Environnement</th><th>Serveur</th><th></th>
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
                  <td>
                    <form action={supprimerApplication}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton message={`Supprimer « ${a.name} » et son historique d'incidents ?`}>
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}