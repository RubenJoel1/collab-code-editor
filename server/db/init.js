const fs = require("fs");
const path = require("path");
const pool = require("./pool");

async function initSchema() {
  if (!pool) return;
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(sql);
  console.log("Database schema ready.");
}

module.exports = initSchema;
