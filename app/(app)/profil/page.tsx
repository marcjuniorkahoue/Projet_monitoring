import { Suspense } from "react";
import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";

const DROITS = [
  ["apps_add", "Ajouter et modifier des applications"],
  ["apps_delete", "Supprimer et restaurer des applications"],
  ["servers_add", "Ajouter et modifier des serveurs"],
  ["servers_delete", "Supprimer et restaurer des serveurs"],
  ["manage_users", "Gérer les comptes et les rôles"],
] as const;

async function Contenu() {
  const u = await exigerUtilisateur();

  return (
    <div className="stack">
      <section className="card">
        <h2>Mes informations</h2>
        <ProfileForm nom={u.full_name} fonction={u.job_title ?? ""} />
      </section>

      <section className="card">
        <h2>Mon compte</h2>
        <p>Adresse e-mail : <b>{u.email}</b></p>
        <p>Rôle : <b>{u.role}</b></p>
        <p className="note">L'adresse e-mail et le rôle sont définis par l'administrateur.</p>

        <div className="checks">
          {DROITS.map(([cle, libelle]) => (
            <div key={cle}>
              <span className={`tag ${u[cle] ? "t-ok" : "t-ko"}`}>{u[cle] ? "Autorisé" : "Non autorisé"}</span>{" "}
              {libelle}
            </div>
          ))}
        </div>

        <Link href="/mot-de-passe" className="btn-small">Changer mon mot de passe</Link>
      </section>
    </div>
  );
}

export default function ProfilPage() {
  return (
    <>
      <h1 className="title">Mon profil</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </>
  );
}