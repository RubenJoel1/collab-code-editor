import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "axios";
import CodeEditor from "../components/CodeEditor";

const SERVER_URL = "http://localhost:3001";

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python",     value: "python"     },
  { label: "HTML",       value: "html"       },
  { label: "CSS",        value: "css"        },
  { label: "JSON",       value: "json"       },
  { label: "Markdown",   value: "markdown"   },
  { label: "Java",       value: "java"       },
  { label: "C++",        value: "cpp"        },
  { label: "C#",         value: "csharp"     },
  { label: "Go",         value: "go"         },
  { label: "Rust",       value: "rust"       },
  { label: "SQL",        value: "sql"        },
  { label: "YAML",       value: "yaml"       },
  { label: "Shell",      value: "shell"      },
  { label: "Ruby",       value: "ruby"       },
  { label: "PHP",        value: "php"        },
];

const THEMES = [
  { label: "Dark",         value: "vs-dark"  },
  { label: "Light",        value: "vs"       },
  { label: "High Contrast",value: "hc-black" },
];

const ROLE_LABELS = { owner: "Owner", editor: "Editor", viewer: "Viewer" };
const ROLE_COLORS = { owner: "#FBBF24", editor: "#34D399", viewer: "#9ca3af" };

// ─── shared button/select styles ──────────────────────────────────────────────
const selectStyle = {
  background: "#3c3c3c", color: "#cccccc", border: "1px solid #555",
  borderRadius: "3px", padding: "2px 6px", fontSize: "12px",
  cursor: "pointer", outline: "none",
};
const btnStyle = {
  background: "#3c3c3c", color: "#cccccc", border: "1px solid #555",
  borderRadius: "3px", padding: "2px 8px", fontSize: "12px",
  cursor: "pointer", lineHeight: "1.4",
};
const btnActiveStyle = { ...btnStyle, background: "#007ACC", borderColor: "#007ACC", color: "#fff" };

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ users, myUsername, myRole, versions, onSave, onRestore, onDelete, isSaving, saveMsg }) {
  const [tab, setTab] = useState("collaborators");

  const tabBtn = (id, label) => ({
    ...btnStyle,
    flex: 1,
    textAlign: "center",
    background: tab === id ? "#007ACC" : "#2d2d2d",
    borderColor: tab === id ? "#007ACC" : "#3c3c3c",
    color: tab === id ? "#fff" : "#888",
    borderRadius: 0,
    padding: "5px 0",
    fontSize: "11px",
  });

  const canWrite = myRole === "owner" || myRole === "editor";

  return (
    <aside
      style={{
        width: "200px",
        background: "#252526",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #3c3c3c",
        flexShrink: 0,
      }}
    >
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #3c3c3c", flexShrink: 0 }}>
        <button style={tabBtn("collaborators", "People")} onClick={() => setTab("collaborators")}>
          People
        </button>
        <button style={tabBtn("history", "History")} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>

        {/* ── Collaborators tab ── */}
        {tab === "collaborators" && (
          <>
            <p style={{ margin: "0 0 4px", fontSize: "10px", color: "#6a9955", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Room
            </p>
            <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#ccc", wordBreak: "break-all" }}>
              {window.location.pathname.split("/").pop()}
            </p>

            <div style={{ height: 1, background: "#3c3c3c", margin: "0 0 10px" }} />

            <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#6a9955", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Collaborators ({users.length})
            </p>
            {users.map((u) => (
              <div key={u.socketId} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: u.color, flexShrink: 0 }} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "12px", color: u.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.username}{u.username === myUsername ? " (you)" : ""}
                  </div>
                  <div style={{ fontSize: "10px", color: ROLE_COLORS[u.role] ?? "#888" }}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── History tab ── */}
        {tab === "history" && (
          <>
            {canWrite && (
              <div style={{ marginBottom: "12px" }}>
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  style={{
                    ...btnStyle,
                    width: "100%",
                    padding: "5px 0",
                    background: isSaving ? "#555" : "#2d7a2d",
                    borderColor: isSaving ? "#555" : "#3a9c3a",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {isSaving ? "Saving…" : "Save Snapshot"}
                </button>
                {saveMsg && (
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: saveMsg.ok ? "#34D399" : "#F87171", textAlign: "center" }}>
                    {saveMsg.text}
                  </p>
                )}
              </div>
            )}

            <p style={{ margin: "0 0 8px", fontSize: "10px", color: "#6a9955", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Saved versions ({versions.length})
            </p>

            {versions.length === 0 && (
              <p style={{ fontSize: "11px", color: "#555" }}>No snapshots yet.</p>
            )}

            {versions.map((v, i) => (
              <div
                key={v.version_id}
                style={{
                  marginBottom: "10px",
                  padding: "8px",
                  background: "#1e1e1e",
                  borderRadius: "4px",
                  border: "1px solid #3c3c3c",
                }}
              >
                <div style={{ fontSize: "11px", color: "#ccc", marginBottom: "2px" }}>
                  {i === 0 && <span style={{ color: "#007ACC", fontWeight: 600 }}>Latest  </span>}
                  {formatTime(v.created_at)}
                </div>
                {v.saved_by && (
                  <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>
                    by {v.saved_by}
                  </div>
                )}
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {canWrite && (
                    <button
                      onClick={() => onRestore(v)}
                      style={{ ...btnStyle, fontSize: "10px", padding: "2px 6px" }}
                    >
                      Restore
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(v.version_id)}
                    style={{ ...btnStyle, fontSize: "10px", padding: "2px 6px", color: "#F87171", borderColor: "#6b2b2b" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

// ─── EditorPage ───────────────────────────────────────────────────────────────
export default function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const requestedRole = location.state?.role ?? "editor";

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const pendingContent = useRef(null);
  const isRemoteChange = useRef(false);

  const [myRole, setMyRole] = useState(requestedRole);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [scrollTick, setScrollTick] = useState(0); // incremented on editor scroll to reposition overlays

  // IDE settings
  const [language, setLanguage] = useState("javascript");
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [minimap, setMinimap] = useState(false);
  const [wordWrap, setWordWrap] = useState("on");
  const [cursorPos, setCursorPos] = useState({ lineNumber: 1, column: 1 });
  const [copied, setCopied] = useState(false);

  // Version history
  const [versions, setVersions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Code execution
  const [isRunning, setIsRunning] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [runResult, setRunResult] = useState(null);

  const canWrite = myRole === "owner" || myRole === "editor";

  useEffect(() => {
    if (!username) navigate("/");
  }, [username, navigate]);

  const fetchVersions = useCallback(async () => {
    try {
      const { data } = await axios.get(`${SERVER_URL}/api/versions/${roomId}`);
      setVersions(data.versions ?? []);
    } catch {
      // DB may not be configured; silently ignore
    }
  }, [roomId]);

  useEffect(() => {
    if (!username) return;

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.emit("join", { roomId, username, role: requestedRole });

    socket.on("init-document", ({ content, language: lang, role }) => {
      if (role) setMyRole(role);
      if (lang) setLanguage(lang);
      if (editorRef.current) {
        isRemoteChange.current = true;
        editorRef.current.setValue(content);
      } else {
        pendingContent.current = content;
      }
    });

    socket.on("code-change", ({ delta }) => {
      if (editorRef.current) {
        isRemoteChange.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(delta);
        if (position) editorRef.current.setPosition(position);
      }
    });

    socket.on("language-change", ({ language: lang }) => setLanguage(lang));

    socket.on("cursor-move", ({ socketId, username: uname, color, position }) => {
      setCursors((prev) => ({ ...prev, [socketId]: { username: uname, color, position } }));
    });

    socket.on("user-left", ({ socketId }) => {
      setCursors((prev) => { const n = { ...prev }; delete n[socketId]; return n; });
    });

    socket.on("users-update", (userList) => setUsers(userList));

    socket.on("save-ack", ({ success, error }) => {
      setIsSaving(false);
      setSaveMsg({ ok: success, text: success ? "Saved!" : `Error: ${error}` });
      setTimeout(() => setSaveMsg(null), 3000);
      if (success) fetchVersions();
    });

    // Another user saved – refresh our version list
    socket.on("version-saved", fetchVersions);

    return () => socket.disconnect();
  }, [roomId, username, requestedRole, fetchVersions]);

  // Load version history on mount
  useEffect(() => {
    if (username) fetchVersions();
  }, [username, fetchVersions]);

  const handleCodeChange = useCallback(
    (value) => {
      if (isRemoteChange.current) { isRemoteChange.current = false; return; }
      socketRef.current?.emit("code-change", { roomId, delta: value });
    },
    [roomId]
  );

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
    if (pendingContent.current !== null) {
      editor.setValue(pendingContent.current);
      pendingContent.current = null;
    }
    // Re-render cursor overlays whenever the editor scrolls
    editor.onDidScrollChange(() => setScrollTick((t) => t + 1));
  }, []);

  const handleCursorChange = useCallback(
    (position) => {
      setCursorPos(position);
      socketRef.current?.emit("cursor-move", { roomId, position });
    },
    [roomId]
  );

  const handleLanguageChange = useCallback(
    (lang) => {
      setLanguage(lang);
      socketRef.current?.emit("language-change", { roomId, language: lang });
    },
    [roomId]
  );

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleSave = useCallback(() => {
    if (isSaving) return;
    setIsSaving(true);
    socketRef.current?.emit("save-document", { roomId });
  }, [isSaving, roomId]);

  const handleDelete = useCallback(
    async (versionId) => {
      try {
        await axios.delete(`${SERVER_URL}/api/versions/${versionId}`);
        setVersions((prev) => prev.filter((v) => v.version_id !== versionId));
      } catch (err) {
        console.error("Delete snapshot failed:", err.message);
      }
    },
    []
  );

  const handleRestore = useCallback(
    (version) => {
      if (!window.confirm(`Restore version saved at ${formatTime(version.created_at)}?`)) return;
      isRemoteChange.current = true;
      editorRef.current?.setValue(version.snapshot);
      if (version.language) setLanguage(version.language);
      socketRef.current?.emit("restore-version", {
        roomId,
        snapshot: version.snapshot,
        language: version.language,
      });
    },
    [roomId]
  );

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    const code = editorRef.current?.getValue() ?? "";
    setIsRunning(true);
    setOutputOpen(true);
    setRunResult(null);
    try {
      const { data } = await axios.post(`${SERVER_URL}/api/run`, { language, code });
      setRunResult(data);
    } catch (err) {
      setRunResult({ error: err.response?.data?.error ?? err.message });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, language]);

  const langLabel = LANGUAGES.find((l) => l.value === language)?.label ?? language;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1e1e1e", color: "#ccc" }}>

      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "0 12px", height: "36px",
          background: "#2d2d2d", borderBottom: "1px solid #3c3c3c", flexShrink: 0,
        }}
      >
        <label style={{ fontSize: "11px", color: "#888" }}>Language</label>
        <select
          style={selectStyle}
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          disabled={!canWrite}
        >
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>

        <div style={{ width: 1, height: 20, background: "#555", margin: "0 4px" }} />

        <label style={{ fontSize: "11px", color: "#888" }}>Theme</label>
        <select style={selectStyle} value={theme} onChange={(e) => setTheme(e.target.value)}>
          {THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div style={{ width: 1, height: 20, background: "#555", margin: "0 4px" }} />

        <label style={{ fontSize: "11px", color: "#888" }}>Font</label>
        <button style={btnStyle} onClick={() => setFontSize((s) => Math.max(8, s - 1))}>−</button>
        <span style={{ fontSize: "12px", minWidth: "24px", textAlign: "center" }}>{fontSize}</span>
        <button style={btnStyle} onClick={() => setFontSize((s) => Math.min(32, s + 1))}>+</button>

        <div style={{ width: 1, height: 20, background: "#555", margin: "0 4px" }} />

        <button style={minimap ? btnActiveStyle : btnStyle} onClick={() => setMinimap((m) => !m)}>
          Minimap
        </button>
        <button
          style={wordWrap === "on" ? btnActiveStyle : btnStyle}
          onClick={() => setWordWrap((w) => (w === "on" ? "off" : "on"))}
        >
          Wrap
        </button>

        <div style={{ flex: 1 }} />

        {/* Save button – only for owners/editors */}
        {canWrite && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              ...btnStyle,
              background: isSaving ? "#555" : "#1a4d6e",
              borderColor: isSaving ? "#555" : "#1e6a9a",
              color: "#fff",
              padding: "2px 12px",
            }}
            title="Save a version snapshot to the database"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        )}

        {/* Run button */}
        <button
          style={{
            ...btnStyle,
            background: isRunning ? "#555" : "#2d7a2d",
            borderColor: isRunning ? "#555" : "#3a9c3a",
            color: "#fff", fontWeight: 600, padding: "2px 14px",
          }}
          onClick={handleRun}
          disabled={isRunning}
          title="Run code (executes in a remote sandbox)"
        >
          {isRunning ? "Running…" : "▶ Run"}
        </button>

        <button style={copied ? btnActiveStyle : btnStyle} onClick={handleCopyLink}>
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>

      {/* ── Main row ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar (T9) */}
        <Sidebar
          users={users}
          myUsername={username}
          myRole={myRole}
          versions={versions}
          onSave={handleSave}
          onRestore={handleRestore}
          onDelete={handleDelete}
          isSaving={isSaving}
          saveMsg={saveMsg}
        />

        {/* Editor + Output column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            <CodeEditor
              onChange={handleCodeChange}
              onCursorChange={handleCursorChange}
              onMount={handleEditorMount}
              language={language}
              theme={theme}
              fontSize={fontSize}
              minimap={minimap}
              wordWrap={wordWrap}
              readOnly={!canWrite}
            />

            {/* Remote cursor overlays — positioned via Monaco's getScrolledVisiblePosition */}
            {/* scrollTick is read here only to re-render when the editor scrolls */}
            {scrollTick >= 0 && Object.entries(cursors).map(([id, { username: uname, color, position }]) => {
              if (!position || !editorRef.current) return null;
              const px = editorRef.current.getScrolledVisiblePosition(position);
              if (!px) return null; // line is scrolled out of view
              return (
                <div
                  key={id}
                  style={{
                    position: "absolute",
                    top: `${px.top}px`,
                    left: `${px.left}px`,
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  {/* Label sits above the cursor bar without pushing it down */}
                  <div style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 0,
                    background: color,
                    color: "#fff",
                    fontSize: "11px",
                    padding: "1px 4px",
                    borderRadius: "3px",
                    whiteSpace: "nowrap",
                    lineHeight: 1.4,
                  }}>
                    {uname}
                  </div>
                  <div style={{ width: 2, height: px.height, background: color }} />
                </div>
              );
            })}
          </div>

          {/* Output panel */}
          {outputOpen && (
            <div
              style={{
                height: "220px", background: "#0d1117",
                borderTop: "1px solid #3c3c3c",
                display: "flex", flexDirection: "column", flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "4px 12px", background: "#2d2d2d",
                  borderBottom: "1px solid #3c3c3c", flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#ccc" }}>Output</span>
                {isRunning && <span style={{ fontSize: "11px", color: "#888" }}>Running…</span>}
                {!isRunning && runResult && !runResult.error && (
                  <>
                    <span style={{ fontSize: "11px", padding: "1px 6px", borderRadius: "10px", background: runResult.exitCode === 0 ? "#2d7a2d" : "#8b1a1a", color: "#fff" }}>
                      exit {runResult.exitCode}
                    </span>
                    {runResult.version && (
                      <span style={{ fontSize: "11px", color: "#666" }}>{runResult.language} {runResult.version}</span>
                    )}
                  </>
                )}
                <div style={{ flex: 1 }} />
                <button style={{ ...btnStyle, fontSize: "11px" }} onClick={() => setRunResult(null)}>Clear</button>
                <button style={{ ...btnStyle, fontSize: "11px" }} onClick={() => setOutputOpen(false)}>✕</button>
              </div>
              <pre
                style={{
                  flex: 1, overflow: "auto", margin: 0, padding: "8px 12px",
                  fontFamily: "monospace", fontSize: "13px", color: "#d4d4d4",
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}
              >
                {isRunning && <span style={{ color: "#888" }}>Executing…</span>}
                {!isRunning && !runResult && <span style={{ color: "#555" }}>Press ▶ Run to execute your code.</span>}
                {runResult?.error && <span style={{ color: "#F87171" }}>{runResult.error}</span>}
                {runResult?.stdout && <span>{runResult.stdout}</span>}
                {runResult?.stderr && <span style={{ color: "#F87171" }}>{runResult.stderr}</span>}
                {!isRunning && runResult && !runResult.error && !runResult.stdout && !runResult.stderr && (
                  <span style={{ color: "#555" }}>No output.</span>
                )}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "22px", padding: "0 12px",
          background: "#007ACC", color: "#fff", fontSize: "12px", flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <span>Ln {cursorPos.lineNumber}, Col {cursorPos.column}</span>
          <span>{langLabel}</span>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ color: ROLE_COLORS[myRole] ?? "#fff", fontWeight: 600 }}>
            {ROLE_LABELS[myRole] ?? myRole}
          </span>
          <span>{users.length} user{users.length !== 1 ? "s" : ""}</span>
          <span>Room: {roomId}</span>
        </div>
      </div>
    </div>
  );
}
