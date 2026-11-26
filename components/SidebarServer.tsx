import { utilisateurCourant } from "@/lib/auth";
import Sidebar from "./Sidebar";

export default async function SidebarServer() {
  const u = await utilisateurCourant();
  return (
    <Sidebar
      peutGerer={Boolean(u?.manage_users)}
      nom={u?.full_name ?? ""}
      fonction={u?.job_title ?? ""}
      role={u?.role ?? ""}
    />
  );
}