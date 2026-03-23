const express = require("express");
const router = express.Router();

// Placeholder – will be wired to PostgreSQL in Milestone 2 (T6, T7, T8)
router.get("/:roomId", (req, res) => {
  res.json({ versions: [], message: "Version history coming in Milestone 2." });
});

module.exports = router;
