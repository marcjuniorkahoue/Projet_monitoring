"use client";
import Link from "next/link";
import { useActionState } from "react";
import { modifierApplication } from "@/app/(app)/applications/actions";

type Props = {
  app: { id: number; name: string; url: string; environment: string; server_id: number };
  servers: { id: number; name: string }[];
};

export default function EditApplicationForm({ app, servers }: Props) {
  const [etat, action, enCours] = useActionState(modifierApplication, undefined);

  return (
    <section className="card">
      <h2>Modifier « {app.name} »</h2>
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}
      <form action={action} className="form">
        <input type="hidden" name="id" value={app.id} />
        <div>
          <label htmlFor="name">Nom</label>
          <input id="name" name="name" required maxLength={100} defaultValue={app.name} />
        </div>
        <div>
          <label htmlFor="url">Adresse (URL)</label>
          <input id="url" name="url" type="url" required defaultValue={app.url} />
        </div>
        <div>
          <label htmlFor="environment">Environnement</label>
          <select id="environment" name="environment" defaultValue={app.environment}>
            <option value="production">Production</option>
            <option value="homologation">Homologation</option>
          </select>
        </div>
        <div>
          <label htmlFor="server_id">Serveur</label>
          <select id="server_id" name="server_id" defaultValue={app.server_id}>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="actions-row">
          <button type="submit" className="btn" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link href="/applications" className="btn-small">Annuler</Link>
        </div>
      </form>
    </section>
  );
}