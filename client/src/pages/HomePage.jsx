import { useState } from "react";
import { useNavigate } from "react-router-dom";

const inputStyle = {
  marginBottom: "12px",
  padding: "8px 12px",
  width: "300px",
  background: "#2d2d2d",
  color: "#ccc",
  border: "1px solid #555",
  borderRadius: "4px",
  fontSize: "14px",
  outline: "none",
};

const selectStyle = {
  ...inputStyle,
  cursor: "pointer",
};

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("editor");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId.trim() || !username.trim()) {
      alert("Please enter both a username and a room ID.");
      return;
    }
    navigate(`/room/${roomId.trim()}`, { state: { username: username.trim(), role } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleJoin();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1e1e1e",
        color: "#ccc",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ color: "#9cdcfe", marginBottom: "8px" }}>Collaborative Code Editor</h1>
      <p style={{ color: "#888", marginBottom: "28px" }}>
        Enter a Room ID to create or join a session
      </p>

      <input
        type="text"
        placeholder="Your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        style={inputStyle}
        autoFocus
      />

      <input
        type="text"
        placeholder="Room ID (e.g. room-123)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        onKeyDown={handleKeyDown}
        style={inputStyle}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={selectStyle}
        title="Choose your role in the room"
      >
        <option value="editor">Editor – can write and edit code</option>
        <option value="viewer">Viewer – read-only access</option>
      </select>

      <p style={{ fontSize: "12px", color: "#666", marginTop: "-4px", marginBottom: "20px", width: "300px" }}>
        The first person to join a room automatically becomes the Owner.
      </p>

      <button
        onClick={handleJoin}
        style={{
          padding: "10px 32px",
          background: "#007ACC",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          width: "324px",
        }}
      >
        Join / Create Room
      </button>
    </div>
  );
}
