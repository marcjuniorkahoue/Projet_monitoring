import { connection } from "next/server";
import { pool } from "@/lib/db";
import { creerRole, modifierRole, supprimerRole } from "@/app/(app)/parametres/actions";
import CreateUserForm from "./CreateUserForm";
import UserRow, { UserItem } from "./UserRow";
import ConfirmButton from "./ConfirmButton";
import ConnectedUsers from "./ConnectedUsers";        

const DROITS: [string, string][] = [
  ["apps_add", "Ajouter des applications"],
  ["apps_delete", "Supprimer des applications"],
  ["servers_add", "Ajouter des serveurs"],
  ["servers_delete", "Supprimer des serveurs"],
  ["manage_users", "Gérer les comptes et les rôles"],
];

export default async function SettingsAdmin({ moiId }: { moiId: number }) {
  await connection(); // lit la base à chaque visite

  const [rolesRes, usersRes] = await Promise.all([
    pool.query(`
      SELECT r.*, COUNT(u.id)::int AS nb
      FROM roles r LEFT JOIN users u ON u.role_id = r.id
      GROUP BY r.id ORDER BY r.id`),
    pool.query<UserItem>(`
            SELECT id, email, full_name, job_title, role_id, active, must_change_password,
             last_login_at::text AS last_login_at
      FROM users ORDER BY full_name`),
  ]);
  const roles = rolesRes.rows as Record<string, string | number | boolean>[];
  const liste = roles.map((r) => ({ id: r.id as number, name: r.name as string }));

  return (
    <div className="stack">
      <section className="card">
              <ConnectedUsers moiId={moiId} />
        <h2>Créer un compte</h2>
        <CreateUserForm roles={liste} />
      </section>

      <section className="card">
        <h2>Comptes ({usersRes.rows.length})</h2>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Personne</th><th>Rôle</th><th>Statut</th><th>Dernière connexion</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {usersRes.rows.map((u) => (
                <UserRow key={u.id} u={u} roles={liste} moiId={moiId} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Rôles et droits</h2>
        <p className="note">
          Tout le monde peut consulter les pages une fois connecté. Les cases ci-dessous donnent
          des droits supplémentaires.
        </p>

        {roles.map((r) => (
          <div key={r.id as number} className="role">
            <form action={modifierRole}>
              <input type="hidden" name="id" value={r.id as number} />
              <h3>{r.name} <span className="env">({r.nb as number} personne(s))</span></h3>
              <div className="checks">
                {DROITS.map(([cle, libelle]) => (
                  <label key={cle}>
                    <input type="checkbox" name={cle} defaultChecked={Boolean(r[cle])} /> {libelle}
                  </label>
                ))}
              </div>
              <button type="submit" className="btn-small">Enregistrer les droits</button>
            </form>

            {(r.nb as number) === 0 && (
              <form action={supprimerRole}>
                <input type="hidden" name="id" value={r.id as number} />
                <ConfirmButton message={`Supprimer le rôle « ${r.name} » ?`}>Supprimer ce rôle</ConfirmButton>
              </form>
            )}
          </div>
        ))}

        <div className="role">
          <form action={creerRole}>
            <h3>Nouveau rôle</h3>
            <div className="form">
              <div>
                <label htmlFor="nom_role">Nom du rôle</label>
                <input id="nom_role" name="nom" required maxLength={50} placeholder="Ex. Support niveau 1" />
              </div>
            </div>
            <div className="checks">
              {DROITS.map(([cle, libelle]) => (
                <label key={cle}>
                  <input type="checkbox" name={cle} /> {libelle}
                </label>
              ))}
            </div>
            <button type="submit" className="btn">Créer le rôle</button>
          </form>
        </div>
      </section>
    </div>
  );
}