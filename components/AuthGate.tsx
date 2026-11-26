import { exigerUtilisateur } from "@/lib/auth";

export default async function AuthGate({ children }: { children: React.ReactNode }) {
  await exigerUtilisateur(); // redirige si pas connecté, ou si le mot de passe provisoire n'a pas été changé
  return <>{children}</>;
}