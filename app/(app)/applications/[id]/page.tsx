import { Suspense } from "react";
import { notFound } from "next/navigation";
import { exigerDroit } from "@/lib/auth";
import { pool } from "@/lib/db";
import EditApplicationForm from "@/components/EditApplicationForm";

async function Contenu({ params }: { params: Promise<{ id: string }> }) {
  await exigerDroit("apps_add"); // sans ce droit : retour à l'accueil
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [app, servers] = await Promise.all([
    pool.query(
      "SELECT id, name, url, environment, server_id FROM applications WHERE id = $1 AND deleted_at IS NULL",
      [id]
    ),
    pool.query("SELECT id, name FROM servers WHERE deleted_at IS NULL ORDER BY name"),
  ]);
  if (!app.rowCount) notFound();

  return <EditApplicationForm app={app.rows[0]} servers={servers.rows} />;
}

export default function ModifierApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <h1 className="title">Modifier l'application</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </>
  );
}