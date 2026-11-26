import { Suspense } from "react";
import KpiCards from "@/components/KpiCards";
import AppsTable from "@/components/AppsTable";
import ServersList from "@/components/ServersList";
import IncidentsChart from "@/components/IncidentsChart";
import Repartition from "@/components/Repartition";

export default function Page() {
  return (
    <>
      <h1 className="title">Supervision des applications</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <KpiCards />
      </Suspense>
      <div className="row">
        <Suspense fallback={<p>Chargement…</p>}>
          <AppsTable />
        </Suspense>
        <Suspense fallback={<p>Chargement…</p>}>
          <ServersList />
        </Suspense>
      </div>
      <div className="row">
        <Suspense fallback={<p>Chargement…</p>}>
          <IncidentsChart />
        </Suspense>
        <Suspense fallback={<p>Chargement…</p>}>
          <Repartition />
        </Suspense>
      </div>
    </>
  );
}