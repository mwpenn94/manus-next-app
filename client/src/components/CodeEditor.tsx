/**
 * CodeEditor — CodeMirror-based editor with syntax highlighting, language detection, and dark theme.
 * Used in GitHubPage for viewing/editing files and in WebAppProjectPage code panel.
 */
import { useMemo, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import type { Extension } from "@codemirror/state";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  filename?: string;
  readOnly?: boolean;
  height?: string;
  className?: string;
}

function getLanguageExtension(filename: string): Extension | null {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return javascript({ jsx: true });
    case "ts":
    case "tsx":
    case "mts":
    case "cts":
      return javascript({ jsx: true, typescript: true });
    case "html":
    case "htm":
    case "svelte":
    case "vue":
      return html();
    case "css":
    case "scss":
    case "less":
      return css();
    case "json":
    case "jsonc":
      return json();
    case "md":
    case "mdx":
    case "markdown":
      return markdown();
    case "py":
    case "pyw":
      return python();
    default:
      return null;
  }
}

export default function CodeEditor({
  value,
  onChange,
  filename = "",
  readOnly = false,
  height = "500px",
  className,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [];
    const lang = getLanguageExtension(filename);
    if (lang) exts.push(lang);
    return exts;
  }, [filename]);

  const handleChange = useCallback(
    (val: string) => {
      if (onChange) onChange(val);
    },
    [onChange]
  );

  return (
    <div className={className}>
      <CodeMirror
        value={value}
        height={height}
        theme={oneDark}
        extensions={extensions}
        onChange={handleChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: !readOnly,
          indentOnInput: !readOnly,
        }}
      />
    </div>
  );
}
