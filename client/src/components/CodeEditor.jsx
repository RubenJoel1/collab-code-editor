import Editor from "@monaco-editor/react";

export default function CodeEditor({ onChange, onCursorChange, language, onMount }) {
  function handleEditorDidMount(editor) {
    onMount?.(editor);
    // T5 – emit cursor position whenever the selection/cursor changes
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
  }

  return (
    <Editor
      height="100vh"
      language={language || "javascript"}
      defaultValue=""
      onChange={onChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: "on",
      }}
    />
  );
}
