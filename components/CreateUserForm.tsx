"use client";
import { useActionState } from "react";
import { creerUtilisateur } from "@/app/(app)/parametres/actions";

export default function CreateUserForm({ roles }: { roles: { id: number; name: string }[] }) {
  const [etat, action, enCours] = useActionState(creerUtilisateur, undefined);

  return (
    <>
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}

      {etat?.motDePasse && (
        <div className="pwbox" role="status">
          <p>
            Compte créé pour <b>{etat.email}</b>. Transmettez-lui ce mot de passe provisoire, il
            ne sera <b>plus jamais affiché</b> :
          </p>
          <code>{etat.motDePasse}</code>
          <p>La personne devra choisir son propre mot de passe à sa première connexion.</p>
        </div>
      )}

      <form action={action} className="form">
        <div>
          <label htmlFor="nom">Nom complet</label>
          <input id="nom" name="nom" required maxLength={100} placeholder="Prénom Nom" />
        </div>
        <div>
          <label htmlFor="fonction">Fonction</label>
          <input id="fonction" name="fonction" maxLength={100} placeholder="Ex. Analyste exploitation" />
        </div>
        <div>
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" required placeholder="prenom.nom@exemple.com" />
        </div>
        <div>
          <label htmlFor="role_id">Rôle</label>
          <select id="role_id" name="role_id" required>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" className="btn" disabled={enCours}>
            {enCours ? "Création…" : "Créer le compte"}
          </button>
        </div>
      </form>
    </>
  );
}