import { Suspense } from "react";
import { notFound } from "next/navigation";
import { exigerDroit } from "@/lib/auth";
import { pool } from "@/lib/db";
import EditServerForm from "@/components/EditServerForm";

async function Contenu({ params }: { params: Promise<{ id: string }> }) {
  await exigerDroit("servers_add");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const { rows } = await pool.query(
    "SELECT id, name FROM servers WHERE id = $1 AND deleted_at IS NULL",
    [id]
  );
  if (!rows.length) notFound();

  return <EditServerForm serveur={rows[0]} />;
}

export default function ModifierServeurPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <h1 className="title">Modifier le serveur</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </>
  );
}