const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set – running without database persistence.");
}

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

if (pool) {
  pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL client error:", err.message);
  });
}

module.exports = pool;
