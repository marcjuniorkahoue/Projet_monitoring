import { Suspense } from "react";
import { exigerDroit } from "@/lib/auth";
import JournalList from "@/components/JournalList";

async function Contenu() {
  await exigerDroit("manage_users"); // réservé à ceux qui gèrent les comptes
  return <JournalList />;
}

export default function JournalPage() {
  return (
    <>
      <h1 className="title">Journal d'audit</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <Contenu />
      </Suspense>
    </>
  );
}