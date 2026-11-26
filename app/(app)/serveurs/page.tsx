import { Suspense } from "react";
import { exigerUtilisateur } from "@/lib/auth";
import ServersAdmin from "@/components/ServersAdmin";

async function Contenu() {
  const u = await exigerUtilisateur();
  return <ServersAdmin peutAjouter={u.servers_add} peutSupprimer={u.servers_delete} />;
}

export default function ServeursPage() {
  return (
    <>
      <h1 className="title">Serveurs</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </>
  );
}