import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Deliberately do not seed fictional products, prices, reviews, customer counts,
// business identity or delivery promises. Those are commercial facts and must
// be entered by an authorized operator from approved source information.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    await pool.query("select 1");
    const [settings, products] = await Promise.all([
      pool.query("select count(*)::int as count from public.shop_settings"),
      pool.query("select count(*)::int as count from public.products"),
    ]);
    console.log("Database connection verified.");
    console.log(`Configured shop settings: ${settings.rows[0].count}`);
    console.log(`Configured catalogue products: ${products.rows[0].count}`);
    console.log("No demo or unapproved business data was inserted.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database verification failed:", error);
  process.exitCode = 1;
});
