import { Suspense } from "react";
import SidebarServer from "@/components/SidebarServer";
import AuthGate from "@/components/AuthGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Suspense fallback={<nav className="side" aria-label="Navigation principale" />}>
        <SidebarServer />
      </Suspense>
      <div className="main">
        <Suspense fallback={<p>Chargement…</p>}>
          <AuthGate>{children}</AuthGate>
        </Suspense>
      </div>
    </div>
  );
}