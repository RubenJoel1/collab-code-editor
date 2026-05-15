const express = require("express");
const router = express.Router();
const { getVersions: getVersionsFromDB, deleteVersion: deleteVersionFromDB } = require("../db/queries");
const { getVersions: getVersionsFromMemory, removeVersion: removeVersionFromMemory } = require("../store");
const { requireAuth, requireWriteAuth } = require("../middleware/auth");

// GET /api/versions/:roomId — authenticated, room-scoped
router.get("/:roomId", requireAuth, async (req, res) => {
  const { roomId } = req.params;
  if (req.roomSession.roomId !== roomId) {
    return res.status(403).json({ error: "Forbidden" });
  }
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

// DELETE /api/versions/:versionId — authenticated, write access required
router.delete("/:versionId", requireWriteAuth, async (req, res) => {
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
