"use client";
import Link from "next/link";
import { useActionState } from "react";
import { modifierServeur } from "@/app/(app)/serveurs/actions";

export default function EditServerForm({ serveur }: { serveur: { id: number; name: string } }) {
  const [etat, action, enCours] = useActionState(modifierServeur, undefined);

  return (
    <section className="card">
      <h2>Modifier « {serveur.name} »</h2>
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}
      <form action={action} className="form">
        <input type="hidden" name="id" value={serveur.id} />
        <div>
          <label htmlFor="name">Nom du serveur</label>
          <input id="name" name="name" required maxLength={100} defaultValue={serveur.name} />
        </div>
        <div className="actions-row">
          <button type="submit" className="btn" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link href="/serveurs" className="btn-small">Annuler</Link>
        </div>
      </form>
    </section>
  );
}