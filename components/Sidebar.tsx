"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "Accueil"],
  ["/applications", "Applications"],
  ["/serveurs", "Serveurs"],
  ["/incidents", "Incidents"],
  ["/parametres", "Paramètres"],
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <nav className="side" aria-label="Navigation principale">
      <div className="logo">BGFIBank<small>[LOGO À INSÉRER]</small></div>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={path === href ? "on" : ""}>{label}</Link>
      ))}
      <button className="exit" type="button">Quitter</button>
    </nav>
  );
}