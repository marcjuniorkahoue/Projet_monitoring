export default function AuthCard({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="glass">
      <div className="glass-head">
        <h1>{titre}</h1>
      </div>
      <div className="glass-body">{children}</div>
    </div>
  );
}