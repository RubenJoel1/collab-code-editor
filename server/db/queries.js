const pool = require("./pool");

async function ensureRoom(roomId) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO rooms (room_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [roomId]
  );
  await pool.query(
    `INSERT INTO documents (room_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [roomId]
  );
}

async function getDocument(roomId) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT content, language FROM documents WHERE room_id = $1`,
    [roomId]
  );
  return rows[0] ?? null;
}

async function saveVersion(roomId, content, language, savedBy) {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT doc_id FROM documents WHERE room_id = $1`,
    [roomId]
  );
  if (!rows.length) return null;
  const docId = rows[0].doc_id;

  await pool.query(
    `UPDATE documents SET content = $1, language = $2, updated_at = NOW() WHERE doc_id = $3`,
    [content, language, docId]
  );

  const { rows: ver } = await pool.query(
    `INSERT INTO versions (doc_id, snapshot, language, saved_by)
     VALUES ($1, $2, $3, $4)
     RETURNING version_id, created_at`,
    [docId, content, language, savedBy]
  );
  return ver[0];
}

async function getVersions(roomId) {
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT v.version_id, v.snapshot, v.language, v.saved_by, v.created_at
     FROM versions v
     JOIN documents d ON d.doc_id = v.doc_id
     WHERE d.room_id = $1
     ORDER BY v.created_at DESC`,
    [roomId]
  );
  return rows;
}

async function deleteVersion(versionId) {
  if (!pool) return false;
  const { rowCount } = await pool.query(
    `DELETE FROM versions WHERE version_id = $1`,
    [versionId]
  );
  return rowCount > 0;
}

module.exports = { ensureRoom, getDocument, saveVersion, getVersions, deleteVersion };
