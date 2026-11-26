"use client";
import { useMemo, useState } from "react";

export type JournalRow = {
  id: number;
  occurred_at: string;
  user_email: string | null;
  action: string;
  target_type: string | null;
  target_label: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
};

const LIBELLES: Record<string, string> = {
  "connexion.reussie": "Connexion",
  "connexion.echec": "Échec de connexion",
  "connexion.verrouillage": "Compte verrouillé",
  "deconnexion": "Déconnexion",
  "mot_de_passe.change": "Mot de passe changé",
  "mot_de_passe.echec": "Échec du changement de mot de passe",
  "compte.cree": "Compte créé",
  "compte.role": "Rôle d'un compte modifié",
  "compte.desactive": "Compte désactivé",
  "compte.reactive": "Compte réactivé",
  "compte.reinit": "Mot de passe réinitialisé",
  "role.cree": "Rôle créé",
  "role.modifie": "Droits d'un rôle modifiés",
  "role.supprime": "Rôle supprimé",
  "application.ajoutee": "Application ajoutée",
  "application.modifiee": "Application modifiée",
  "application.corbeille": "Application mise à la corbeille",
  "application.restauree": "Application restaurée",
  "serveur.ajoute": "Serveur ajouté",
  "serveur.modifie": "Serveur modifié",
  "serveur.corbeille": "Serveur mis à la corbeille",
  "serveur.restaure": "Serveur restauré",
    "profil.modifie": "Profil modifié",
  "session.fermee": "Session fermée par un administrateur",
};

const categorie = (a: string) => {
  const d = a.split(".")[0];
  if (["connexion", "deconnexion", "mot_de_passe"].includes(d)) return "connexions";
  if (["compte", "role", "profil", "session"].includes(d)) return "comptes";
  return d === "application" ? "applications" : "serveurs";
};

// Rouge = alerte ou suppression, orange = modification, vert = le reste
const couleur = (a: string) =>
 /echec|verrouillage|desactive|corbeille|supprime|fermee/.test(a)
    ? "t-ko"
    : /modifi|role|reinit|change/.test(a)
    ? "t-wa"
    : "t-ok";

const fmt = (v: unknown) => (typeof v === "boolean" ? (v ? "oui" : "non") : String(v ?? "—"));

// Transforme les détails en phrases lisibles
function resume(d: Record<string, unknown> | null): string[] {
  if (!d) return [];
  return Object.entries(d).map(([k, v]) => {
    if (v && typeof v === "object" && "avant" in v && "apres" in v) {
      const c = v as { avant: unknown; apres: unknown };
      return `${k} : ${fmt(c.avant)} → ${fmt(c.apres)}`;
    }
    return `${k} : ${Array.isArray(v) ? v.join(", ") || "aucun" : fmt(v)}`;
  });
}

export default function JournalTableClient({ rows }: { rows: JournalRow[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const liste = useMemo(
    () =>
      rows.filter(
        (r) =>
          (cat === "all" || categorie(r.action) === cat) &&
          `${r.user_email ?? ""} ${r.target_label ?? ""} ${LIBELLES[r.action] ?? r.action} ${r.ip ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase())
      ),
    [rows, q, cat]
  );

  return (
    <section className="card">
      <h2>Journal d'audit <span className="env">: {rows.length} derniers événements</span></h2>

      <div className="tools">
        <input
          type="search"
          placeholder="Rechercher une personne, une cible ou une action"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filtrer par catégorie">
          <option value="all">Toutes les catégories</option>
          <option value="connexions">Connexions</option>
          <option value="comptes">Comptes et rôles</option>
          <option value="applications">Applications</option>
          <option value="serveurs">Serveurs</option>
        </select>
      </div>

      <div className="tw">
        <table>
          <thead>
            <tr><th>Date</th><th>Personne</th><th>Action</th><th>Cible</th><th>Détails</th><th>Adresse IP</th></tr>
          </thead>
          <tbody>
            {liste.map((r) => (
              <tr key={r.id}>
                <td suppressHydrationWarning>
                  {new Date(r.occurred_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                </td>
                <td>{r.user_email ?? "—"}</td>
                <td><span className={`tag ${couleur(r.action)}`}>{LIBELLES[r.action] ?? r.action}</span></td>
                <td>
                  {r.target_label ?? "—"}
                  {r.target_type && <div className="env">{r.target_type}</div>}
                </td>
                <td>
                  {resume(r.details).map((l) => (
                    <div key={l} className="diff">{l}</div>
                  ))}
                </td>
                <td className="env">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="empty">Aucun événement ne correspond à ces filtres.</p>}
      </div>
    </section>
  );
}