import { connection } from "next/server";
import { pool } from "@/lib/db";

export default async function Repartition() {
  await connection(); // lit la base à chaque visite

  const { rows } = await pool.query(`
    SELECT COUNT(*) FILTER (WHERE environment = 'production')::int AS prod,
           COUNT(*) FILTER (WHERE environment = 'homologation')::int AS hom
    FROM applications`);

  const { prod, hom } = rows[0];
  const total = prod + hom;
  const pctProd = total ? Math.round((prod / total) * 100) : 0;

  return (
    <section className="card">
      <h2>Répartition</h2>
      <p>En production : {prod} application(s)</p>
      <div className="meter"><div style={{ width: `${pctProd}%`, background: "#0f4a8a" }} /></div>
      <p>En homologation : {hom} application(s)</p>
      <div className="meter"><div style={{ width: `${total ? 100 - pctProd : 0}%`, background: "#3d8bd9" }} /></div>
    </section>
  );
}