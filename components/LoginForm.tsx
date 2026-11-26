"use client";
import { useActionState } from "react";
import { connexion } from "@/app/(auth)/actions";

export default function LoginForm() {
  const [etat, action, enCours] = useActionState(connexion, undefined);

  return (
    <form action={action}>
      {etat?.erreur && <div className="err" role="alert">{etat.erreur}</div>}

      <div className="field">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
        <label htmlFor="email" className="sr-only">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="username" placeholder="Adresse e-mail" />
      </div>

      <div className="field">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        <label htmlFor="password" className="sr-only">Mot de passe</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Mot de passe" />
      </div>

      <button type="submit" className="btn login-btn" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
      <p className="hint">Mot de passe oublié ? Contactez votre administrateur.</p>
    </form>
  );
}