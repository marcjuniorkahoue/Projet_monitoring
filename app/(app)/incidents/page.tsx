import { Suspense } from "react";
import IncidentsList from "@/components/IncidentsList";

export default function IncidentsPage() {
  return (
    <>
      <h1 className="title">Incidents</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <IncidentsList />
      </Suspense>
    </>
  );
}