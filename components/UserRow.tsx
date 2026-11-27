"use client";
import { useActionState } from "react";
import {
  changerRoleUtilisateur,
  basculerActif,
  reinitialiserMotDePasse,
  modifierIdentite,
} from "@/app/(app)/parametres/actions";
import ConfirmButton from "./ConfirmButton";

export type UserItem = {
  id: number;
  email: string;
  full_name: string;
  job_title: string | null;
  role_id: number;
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
};

export default function UserRow({
  u, roles, moiId,
}: { u: UserItem; roles: { id: number; name: string }[]; moiId: number }) {
  const [reset, resetAction] = useActionState(reinitialiserMotDePasse, undefined);
  const [identite, identiteAction, enCours] = useActionState(modifierIdentite, undefined);
  const estMoi = u.id === moiId;

  return (
    <tr>
      <td>
        <form action={identiteAction} className="ident">
          <input type="hidden" name="id" value={u.id} />
          <label htmlFor={`nom-${u.id}`} className="sr-only">Nom de {u.email}</label>
          <input id={`nom-${u.id}`} name="nom" defaultValue={u.full_name} required maxLength={100} placeholder="Nom complet" />
          <label htmlFor={`fonction-${u.id}`} className="sr-only">Fonction de {u.email}</label>
          <input id={`fonction-${u.id}`} name="fonction" defaultValue={u.job_title ?? ""} maxLength={100} placeholder="Fonction" />
          <div className="env">{u.email}{estMoi && " (vous)"}</div>
          <button type="submit" className="btn-small" disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          {identite?.erreur && <div className="err">{identite.erreur}</div>}
          {identite?.ok && <div className="okmsg" role="status">Enregistré.</div>}
        </form>
      </td>

      <td>
        {estMoi ? (
          <span className="env">{roles.find((r) => r.id === u.role_id)?.name}</span>
        ) : (
          <form action={changerRoleUtilisateur} className="inline">
            <input type="hidden" name="id" value={u.id} />
            <select name="role_id" defaultValue={u.role_id} aria-label={`Rôle de ${u.full_name}`}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button type="submit" className="btn-small">Enregistrer</button>
          </form>
        )}
      </td>

      <td>
        <span className={`tag ${u.active ? "t-ok" : "t-ko"}`}>{u.active ? "Actif" : "Désactivé"}</span>
        {u.must_change_password && <div className="env">Mot de passe provisoire</div>}
      </td>

      <td className="env" suppressHydrationWarning>
        {u.last_login_at
          ? new Date(u.last_login_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
          : "Jamais"}
      </td>

      <td>
        {estMoi ? (
          <span className="env">—</span>
        ) : (
          <div className="actions">
            <form action={basculerActif}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="actif" value={String(!u.active)} />
              {u.active ? (
                <ConfirmButton message={`Désactiver le compte de ${u.full_name} ? Il sera déconnecté immédiatement.`}>
                  Désactiver
                </ConfirmButton>
              ) : (
                <button type="submit" className="btn-small">Réactiver</button>
              )}
            </form>

            <form action={resetAction}>
              <input type="hidden" name="id" value={u.id} />
              <ConfirmButton message={`Réinitialiser le mot de passe de ${u.full_name} ?`}>
                Réinitialiser le mot de passe
              </ConfirmButton>
            </form>

            {reset?.erreur && <div className="err">{reset.erreur}</div>}
            {reset?.motDePasse && (
              <div className="pwbox">
                <p>Nouveau mot de passe provisoire (affiché une seule fois) :</p>
                <code>{reset.motDePasse}</code>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}