"use client";
import { useActionState } from "react";
import { changerMotDePasse } from "@/app/(auth)/actions";

export default function ChangePasswordForm() {
  const [etat, action, enCours] = useActionState(changerMotDePasse, undefined);

  return (
    <form action={action} className="form one">
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}
      <div>
        <label htmlFor="actuel">Mot de passe actuel (celui reçu de l'administrateur)</label>
        <input id="actuel" name="actuel" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <label htmlFor="nouveau">Nouveau mot de passe (12 caractères minimum)</label>
        <input id="nouveau" name="nouveau" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <div>
        <label htmlFor="confirmation">Confirmer le nouveau mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" required minLength={12} autoComplete="new-password" />
      </div>
      <button type="submit" className="btn" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer mon mot de passe"}
      </button>
    </form>
  );
}