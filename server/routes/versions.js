const express = require("express");
const router = express.Router();
const { getVersions: getVersionsFromDB, deleteVersion: deleteVersionFromDB } = require("../db/queries");
const { getVersions: getVersionsFromMemory, removeVersion: removeVersionFromMemory } = require("../store");

// GET /api/versions/:roomId
// Returns DB versions when available, falls back to in-memory history for the current session.
router.get("/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const dbVersions = await getVersionsFromDB(roomId);
    if (dbVersions.length > 0) {
      return res.json({ versions: dbVersions });
    }
  } catch (err) {
    console.error("getVersions DB error:", err.message);
  }

  res.json({ versions: getVersionsFromMemory(roomId) });
});

// DELETE /api/versions/:versionId
router.delete("/:versionId", async (req, res) => {
  const { versionId } = req.params;
  try {
    await deleteVersionFromDB(versionId);
  } catch (err) {
    console.error("deleteVersion DB error:", err.message);
  }
  removeVersionFromMemory(versionId);
  res.json({ success: true });
});

module.exports = router;
