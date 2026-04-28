const { ensureRoom, getDocument, saveVersion: saveVersionToDB, getVersions: getVersionsFromDB } = require("../db/queries");
const { rooms, addVersion, getVersions } = require("../store");

const COLORS = [
  "#F87171", "#60A5FA", "#34D399", "#FBBF24",
  "#A78BFA", "#F472B6", "#38BDF8", "#4ADE80",
];
let colorIndex = 0;
function nextColor() {
  return COLORS[colorIndex++ % COLORS.length];
}

function buildUserList(room) {
  return Array.from(room.users.entries()).map(([id, u]) => ({
    socketId: id,
    username: u.username,
    color: u.color,
    role: u.role,
  }));
}

function canWrite(room, socketId) {
  const user = room.users.get(socketId);
  return user?.role !== "viewer";
}

module.exports = function (io) {
  io.on("connection", (socket) => {

    // T3 – Join Room
    socket.on("join", async ({ roomId, username, role: requestedRole }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { document: "", language: "javascript", users: new Map() });
        try {
          await ensureRoom(roomId);
          const doc = await getDocument(roomId);
          if (doc) {
            const room = rooms.get(roomId);
            room.document = doc.content;
            room.language = doc.language;
          }
        } catch (err) {
          console.error("DB init error:", err.message);
        }
      }

      const room = rooms.get(roomId);

      // First joiner becomes owner; others use their requested role (default: editor)
      const isFirstUser = room.users.size === 0;
      const role = isFirstUser ? "owner" : (requestedRole === "viewer" ? "viewer" : "editor");

      room.users.set(socket.id, { username, color: nextColor(), role });

      socket.emit("init-document", {
        content: room.document,
        language: room.language,
        role,
      });
      io.to(roomId).emit("users-update", buildUserList(room));

      // T4 – Code change (T10: viewers are silently rejected)
      socket.on("code-change", ({ roomId: rid, delta }) => {
        const r = rooms.get(rid);
        if (!r || !canWrite(r, socket.id)) return;
        r.document = delta;
        socket.to(rid).emit("code-change", { delta });
      });

      // Language change
      socket.on("language-change", ({ roomId: rid, language }) => {
        const r = rooms.get(rid);
        if (!r || !canWrite(r, socket.id)) return;
        r.language = language;
        socket.to(rid).emit("language-change", { language });
      });

      // T5 – Cursor presence
      socket.on("cursor-move", ({ roomId: rid, position }) => {
        const r = rooms.get(rid);
        if (!r) return;
        const user = r.users.get(socket.id);
        socket.to(rid).emit("cursor-move", {
          socketId: socket.id,
          username: user?.username,
          color: user?.color,
          position,
        });
      });

      // T7 – Save document snapshot
      socket.on("save-document", async ({ roomId: rid }) => {
        const r = rooms.get(rid);
        if (!r || !canWrite(r, socket.id)) return;
        const user = r.users.get(socket.id);

        // Always save in-memory so history works without a DB
        addVersion(rid, r.document, r.language, user?.username);

        // Also persist to PostgreSQL when available
        try {
          await saveVersionToDB(rid, r.document, r.language, user?.username);
        } catch (err) {
          console.error("DB save error (in-memory snapshot still saved):", err.message);
        }

        socket.emit("save-ack", { success: true });
        io.to(rid).emit("version-saved");
      });

      // T8 – Restore a saved version and broadcast to room
      socket.on("restore-version", ({ roomId: rid, snapshot, language }) => {
        const r = rooms.get(rid);
        if (!r || !canWrite(r, socket.id)) return;
        r.document = snapshot;
        if (language) r.language = language;
        io.to(rid).emit("code-change", { delta: snapshot });
        if (language) io.to(rid).emit("language-change", { language });
      });

      // Disconnect cleanup
      socket.on("disconnect", () => {
        const r = rooms.get(roomId);
        if (!r) return;
        r.users.delete(socket.id);
        io.to(roomId).emit("user-left", { socketId: socket.id });
        io.to(roomId).emit("users-update", buildUserList(r));
        if (r.users.size === 0) rooms.delete(roomId);
      });
    });
  });
};
