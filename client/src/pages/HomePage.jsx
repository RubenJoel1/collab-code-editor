import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (!roomId.trim() || !username.trim()) {
      alert("Please enter both a username and a room ID.");
      return;
    }
    // Navigates to /room/:roomId and passes username via state
    navigate(`/room/${roomId}`, { state: { username } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <h1>Collaborative Code Editor</h1>
      <p>Enter a Room ID to create or join a session</p>

      <input
        type="text"
        placeholder="Your username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ marginBottom: "12px", padding: "8px", width: "300px" }}
      />

      <input
        type="text"
        placeholder="Room ID (e.g. room-123)"
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
        style={{ marginBottom: "12px", padding: "8px", width: "300px" }}
      />

      <button
        onClick={handleJoin}
        style={{ padding: "10px 24px", cursor: "pointer" }}
      >
        Join / Create Room
      </button>
    </div>
  );
}