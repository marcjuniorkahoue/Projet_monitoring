"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { deconnexion } from "@/app/(auth)/actions";

// Le 3e élément indique si le lien est réservé à ceux qui gèrent les comptes
const LINKS: [string, string, boolean][] = [
  ["/", "Accueil", false],
  ["/applications", "Applications", false],
  ["/serveurs", "Serveurs", false],
  ["/incidents", "Incidents", false],
  ["/journal", "Journal d'audit", true],
  ["/parametres", "Paramètres", true],
];

// "Jean Dupont" -> "JD"
const initiales = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join("") || "?";

type Props = { peutGerer: boolean; nom: string; fonction: string; role: string };

export default function Sidebar({ peutGerer, nom, fonction, role }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false); // tiroir ouvert sur téléphone

  // Le tiroir se ferme quand on change de page
  useEffect(() => setOpen(false), [path]);

  // ... et avec la touche Échap
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [open]);

  return (
    <>
      {/* Barre du haut : visible seulement sur téléphone */}
      <header className="topbar">
        <span className="brand-side">BGFIBank</span>
        <button
          type="button"
          className="burger"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          aria-controls="menu-principal"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <nav id="menu-principal" className={`side${open ? " open" : ""}`} aria-label="Navigation principale">
        <div className="brand-side">BGFIBank</div>

        {LINKS.filter(([, , reserve]) => !reserve || peutGerer).map(([href, label]) => (
          <Link key={href} href={href} prefetch={false} className={path === href ? "on" : ""}>{label}</Link>
        ))}

        <Link href="/profil" prefetch={false} className={`me${path === "/profil" ? " here" : ""}`}>
          <span className="avatar" aria-hidden="true">{initiales(nom)}</span>
          <span className="me-txt">
            <b>{nom || "Mon profil"}</b>
            <small>{[fonction, role].filter(Boolean).join(" · ")}</small>
          </span>
        </Link>

        <form action={deconnexion}>
          <button className="exit" type="submit">Quitter</button>
        </form>
      </nav>
    </>
  );
}