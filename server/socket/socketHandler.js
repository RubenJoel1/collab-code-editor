const crypto = require("crypto");
const { ensureRoom, getDocument, saveVersion: saveVersionToDB } = require("../db/queries");
const { rooms, addVersion, sessionTokens } = require("../store");

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
  return user !== undefined && user.role !== "viewer";
}

module.exports = function (io) {
  io.on("connection", (socket) => {

    // socket.once prevents duplicate handler registration if join fires more than once
    socket.once("join", async ({ roomId, username, requestedRole }) => {
      socket.join(roomId);
      socket.data.roomId = roomId;

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

      const isFirstUser = room.users.size === 0;
      const role = isFirstUser ? "owner" : (requestedRole === "editor" ? "editor" : "viewer");

      // Issue a server-generated session token used to authenticate REST calls
      const token = crypto.randomBytes(32).toString("hex");
      sessionTokens.set(token, { roomId, socketId: socket.id });
      socket.data.sessionToken = token;

      room.users.set(socket.id, { username, color: nextColor(), role });

      socket.emit("init-document", {
        content: room.document,
        language: room.language,
        role,
        sessionToken: token,
      });
      io.to(roomId).emit("users-update", buildUserList(room));
    });

    // Returns the room only if the socket actually joined it — prevents cross-room spoofing
    function getJoinedRoom(rid) {
      if (!socket.data.roomId || socket.data.roomId !== rid) return null;
      return rooms.get(rid) ?? null;
    }

    socket.on("code-change", ({ roomId: rid, delta }) => {
      const r = getJoinedRoom(rid);
      if (!r || !canWrite(r, socket.id)) return;
      r.document = delta;
      socket.to(rid).emit("code-change", { delta });
    });

    socket.on("language-change", ({ roomId: rid, language }) => {
      const r = getJoinedRoom(rid);
      if (!r || !canWrite(r, socket.id)) return;
      r.language = language;
      socket.to(rid).emit("language-change", { language });
    });

    socket.on("cursor-move", ({ roomId: rid, position }) => {
      const r = getJoinedRoom(rid);
      if (!r) return;
      const user = r.users.get(socket.id);
      socket.to(rid).emit("cursor-move", {
        socketId: socket.id,
        username: user?.username,
        color: user?.color,
        position,
      });
    });

    socket.on("save-document", async ({ roomId: rid }) => {
      const r = getJoinedRoom(rid);
      if (!r || !canWrite(r, socket.id)) return;
      const user = r.users.get(socket.id);

      addVersion(rid, r.document, r.language, user?.username);

      try {
        await saveVersionToDB(rid, r.document, r.language, user?.username);
      } catch (err) {
        console.error("DB save error (in-memory snapshot still saved):", err.message);
      }

      socket.emit("save-ack", { success: true });
      io.to(rid).emit("version-saved");
    });

    socket.on("restore-version", ({ roomId: rid, snapshot, language }) => {
      const r = getJoinedRoom(rid);
      if (!r || !canWrite(r, socket.id)) return;
      r.document = snapshot;
      if (language) r.language = language;
      io.to(rid).emit("code-change", { delta: snapshot });
      if (language) io.to(rid).emit("language-change", { language });
    });

    // Only the room owner can promote or demote other users
    socket.on("set-user-role", ({ roomId: rid, targetSocketId, newRole }) => {
      const r = getJoinedRoom(rid);
      if (!r) return;
      const me = r.users.get(socket.id);
      if (me?.role !== "owner") return;
      if (newRole !== "editor" && newRole !== "viewer") return;
      const target = r.users.get(targetSocketId);
      if (!target) return;
      target.role = newRole;
      io.to(rid).emit("users-update", buildUserList(r));
      // Notify the affected user so their UI updates immediately
      io.to(targetSocketId).emit("role-changed", { role: newRole });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      if (socket.data.sessionToken) sessionTokens.delete(socket.data.sessionToken);
      const r = rooms.get(roomId);
      if (!r) return;
      r.users.delete(socket.id);
      io.to(roomId).emit("user-left", { socketId: socket.id });
      io.to(roomId).emit("users-update", buildUserList(r));
      if (r.users.size === 0) rooms.delete(roomId);
    });
  });
};
