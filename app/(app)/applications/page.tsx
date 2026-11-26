import { Suspense } from "react";
import { exigerUtilisateur } from "@/lib/auth";
import AppsAdmin from "@/components/AppsAdmin";

async function Contenu() {
  const u = await exigerUtilisateur();
  return <AppsAdmin peutAjouter={u.apps_add} peutSupprimer={u.apps_delete} />;
}

export default function ApplicationsPage() {
  return (
    <>
      <h1 className="title">Applications</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </>
  );
}