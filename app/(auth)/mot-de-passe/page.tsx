import { Suspense } from "react";
import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import ChangePasswordForm from "@/components/ChangePasswordForm";

async function Contenu() {
  const u = await utilisateurCourant();
  if (!u) redirect("/connexion");

  return (
    <>
      <p className="sub">
        {u.must_change_password
          ? "Pour des raisons de sécurité, vous devez choisir votre propre mot de passe avant de continuer."
          : "Choisissez un nouveau mot de passe."}
      </p>
      <ChangePasswordForm />
    </>
  );
}

export default function MotDePassePage() {
  return (
    <AuthCard titre="Nouveau mot de passe">
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </AuthCard>
  );
}