// In-memory room state: roomId -> { document: string, users: Map<socketId, {username, color}> }
const rooms = new Map();

// Assign a distinct color to each collaborator
const COLORS = [
  "#F87171", "#60A5FA", "#34D399", "#FBBF24",
  "#A78BFA", "#F472B6", "#38BDF8", "#4ADE80",
];
let colorIndex = 0;
function nextColor() {
  return COLORS[colorIndex++ % COLORS.length];
}

module.exports = function (io) {
  io.on("connection", (socket) => {
    // T3 – Join Room
    socket.on("join", ({ roomId, username }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, { document: "", users: new Map() });
      }

      const room = rooms.get(roomId);
      const color = nextColor();
      room.users.set(socket.id, { username, color });

      // Send current document state back to the joining client
      socket.emit("init-document", { content: room.document });

      // Notify everyone in the room about the updated user list
      io.to(roomId).emit("users-update", buildUserList(room));

      // T4 – Code change
      socket.on("code-change", ({ roomId: rid, delta }) => {
        const r = rooms.get(rid);
        if (!r) return;
        r.document = delta; // store latest full content for new joiners
        // Broadcast delta to everyone else in the room
        socket.to(rid).emit("code-change", { delta });
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

      // Disconnect cleanup
      socket.on("disconnect", () => {
        const r = rooms.get(roomId);
        if (!r) return;
        r.users.delete(socket.id);
        // Tell remaining clients to remove this cursor overlay
        io.to(roomId).emit("user-left", { socketId: socket.id });
        io.to(roomId).emit("users-update", buildUserList(r));
        // Clean up empty rooms
        if (r.users.size === 0) rooms.delete(roomId);
      });
    });
  });
};

function buildUserList(room) {
  return Array.from(room.users.entries()).map(([id, u]) => ({
    socketId: id,
    username: u.username,
    color: u.color,
  }));
}
