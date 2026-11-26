"use client";
import { useActionState } from "react";
import { modifierProfil } from "@/app/(app)/profil/actions";

export default function ProfileForm({ nom, fonction }: { nom: string; fonction: string }) {
  const [etat, action, enCours] = useActionState(modifierProfil, undefined);

  return (
    <>
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}
      {etat?.ok && <div className="okmsg" role="status">Profil enregistré.</div>}

      <form action={action} className="form">
        <div>
          <label htmlFor="nom">Nom complet</label>
          <input id="nom" name="nom" required maxLength={100} defaultValue={nom} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="fonction">Fonction</label>
          <input id="fonction" name="fonction" maxLength={100} defaultValue={fonction} placeholder="Ex. Responsable exploitation" />
        </div>
        <div>
          <button type="submit" className="btn" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </>
  );
}