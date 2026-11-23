"use client";

export default function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="btn-danger"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault(); // annule l'envoi si on clique sur "Annuler"
      }}
    >
      {children}
    </button>
  );
}