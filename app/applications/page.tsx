import { Suspense } from "react";
import AppsAdmin from "@/components/AppsAdmin";

export default function ApplicationsPage() {
  return (
    <>
      <h1 className="title">Applications</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <AppsAdmin />
      </Suspense>
    </>
  );
}