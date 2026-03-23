import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import CodeEditor from "../components/CodeEditor";

const SERVER_URL = "http://localhost:3001";

export default function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;

  const socketRef = useRef(null);
  const editorRef = useRef(null);       // Monaco editor instance
  const pendingContent = useRef(null);  // content that arrived before editor mounted
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({}); // { socketId: { username, color, position } }
  const isRemoteChange = useRef(false);

  // Redirect to home if username is missing
  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [username, navigate]);

  useEffect(() => {
    if (!username) return;

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    // T3 – Join room
    socket.emit("join", { roomId, username });

    // Receive initial document state on join
    socket.on("init-document", ({ content }) => {
      if (editorRef.current) {
        isRemoteChange.current = true;
        editorRef.current.setValue(content);
      } else {
        pendingContent.current = content;
      }
    });

    // T4 – Receive code changes from other clients
    socket.on("code-change", ({ delta }) => {
      if (editorRef.current) {
        isRemoteChange.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(delta);
        if (position) editorRef.current.setPosition(position);
      }
    });

    // T5 – Receive cursor positions from other clients
    socket.on("cursor-move", ({ socketId, username: uname, color, position }) => {
      setCursors((prev) => ({
        ...prev,
        [socketId]: { username: uname, color, position },
      }));
    });

    // Remove cursor overlay when a user leaves
    socket.on("user-left", ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    // Keep collaborator sidebar in sync
    socket.on("users-update", (userList) => {
      setUsers(userList);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, username]);

  // T4 – Send code changes to server
  const handleCodeChange = useCallback(
    (value) => {
      if (isRemoteChange.current) {
        isRemoteChange.current = false;
        return;
      }
      socketRef.current?.emit("code-change", { roomId, delta: value });
    },
    [roomId]
  );

  // Store editor instance; apply any content that arrived before it mounted
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    if (pendingContent.current !== null) {
      editor.setValue(pendingContent.current);
      pendingContent.current = null;
    }
  }, []);

  // T5 – Send cursor position to server
  const handleCursorChange = useCallback(
    (position) => {
      socketRef.current?.emit("cursor-move", { roomId, position });
    },
    [roomId]
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#1e1e1e", color: "#ccc" }}>
      {/* Sidebar – collaborator list */}
      <aside
        style={{
          width: "200px",
          background: "#252526",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          borderRight: "1px solid #3c3c3c",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "13px", color: "#9cdcfe", textTransform: "uppercase" }}>
          Room: {roomId}
        </h3>
        <p style={{ margin: 0, fontSize: "12px", color: "#6a9955" }}>Collaborators</p>
        {users.map((u) => (
          <div key={u.socketId} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: u.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "13px", color: u.color }}>
              {u.username}
              {u.username === username ? " (you)" : ""}
            </span>
          </div>
        ))}
      </aside>

      {/* Editor area */}
      <div style={{ flex: 1, position: "relative" }}>
        <CodeEditor
          onChange={handleCodeChange}
          onCursorChange={handleCursorChange}
          onMount={handleEditorMount}
          language="javascript"
        />

        {/* T5 – Cursor overlays for remote users */}
        {Object.entries(cursors).map(([id, { username: uname, color, position }]) =>
          position ? (
            <div
              key={id}
              style={{
                position: "absolute",
                top: `${(position.lineNumber - 1) * 19 + 4}px`,
                left: `${position.column * 7.2 + 60}px`,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  background: color,
                  color: "#fff",
                  fontSize: "11px",
                  padding: "1px 4px",
                  borderRadius: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                {uname}
              </div>
              <div style={{ width: 2, height: 18, background: color }} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
