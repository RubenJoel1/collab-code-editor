import Editor from "@monaco-editor/react";

export default function CodeEditor({
  onChange,
  onCursorChange,
  onMount,
  language,
  theme,
  fontSize,
  minimap,
  wordWrap,
  readOnly,
}) {
  function handleEditorDidMount(editor) {
    onMount?.(editor);
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
  }

  return (
    <Editor
      height="100%"
      language={language || "javascript"}
      onChange={onChange}
      onMount={handleEditorDidMount}
      theme={theme || "vs-dark"}
      options={{
        fontSize: fontSize || 14,
        minimap: { enabled: minimap ?? false },
        wordWrap: wordWrap || "on",
        readOnly: readOnly ?? false,
      }}
    />
  );
}
