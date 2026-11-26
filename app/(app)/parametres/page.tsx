import { Suspense } from "react";
import { exigerDroit } from "@/lib/auth";
import SettingsAdmin from "@/components/SettingsAdmin";

async function Contenu() {
  const u = await exigerDroit("manage_users"); // renvoie vers l'accueil sans ce droit
  return <SettingsAdmin moiId={u.id} />;
}

export default function ParametresPage() {
  return (
    <>
      <h1 className="title">Paramètres</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </>
  );
}