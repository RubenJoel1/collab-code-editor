const { sessionTokens, rooms } = require("../store");

function requireAuth(req, res, next) {
  const header = req.headers["authorization"] ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const session = sessionTokens.get(token);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  // Role is always derived live from the room so promotions take effect immediately
  const room = rooms.get(session.roomId);
  const user = room?.users.get(session.socketId);
  if (!user) return res.status(401).json({ error: "Session expired" });

  req.roomSession = { roomId: session.roomId, socketId: session.socketId, role: user.role };
  next();
}

function requireWriteAuth(req, res, next) {
  requireAuth(req, res, () => {
    if (req.roomSession.role === "viewer") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

module.exports = { requireAuth, requireWriteAuth };
