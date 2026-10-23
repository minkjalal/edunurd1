/**
 * EduNerd - Rich Notes Editor & Export View
 * =========================================
 * Clean digital notebook:
 * - Color highlighting toolbar (Yellow, Green, Pink, Blue)
 * - Typography formatting (Bold, Clear format)
 * - Automatic debounced saving to state
 * - HTML document export via downloads bridge
 */

import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

export default function NotesView({ embedded = false }) {
  const { progress, saveProgress, showToast } = useApp();
  const [saveStatus, setSaveStatus] = useState("");
  const editorRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync initial notes content
  useEffect(() => {
    if (editorRef.current && progress.notes != null) {
      if (editorRef.current.innerHTML !== progress.notes) {
        editorRef.current.innerHTML = progress.notes;
      }
    }
  }, []);

  const handleInput = () => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (editorRef.current) {
        const content = editorRef.current.innerHTML;
        saveProgress({ notes: content });
        setSaveStatus("Saved ✓");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    }, 1200);
  };

  const applyHighlight = color => {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("hiliteColor", false, color);
    document.execCommand("foreColor", false, "#111");
    if (editorRef.current) {
      saveProgress({ notes: editorRef.current.innerHTML });
    }
  };

  const applyFormat = cmd => {
    document.execCommand(cmd, false, null);
    if (editorRef.current) {
      saveProgress({ notes: editorRef.current.innerHTML });
    }
  };

  const handleExplicitSave = () => {
    if (editorRef.current) {
      saveProgress({ notes: editorRef.current.innerHTML });
      setSaveStatus("Saved ✓");
      showToast("Notes saved ✓");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleDownload = async () => {
    try {
      if (window.claude) {
        const downloadSvc = await window.claude.use("downloads");
        if (downloadSvc && editorRef.current) {
          await downloadSvc.save({
            filename: "edunerd-notes.html",
            data: `<meta charset="utf-8"><h1>EduNerd Study Notes</h1>${editorRef.current.innerHTML}`
          });
          showToast("Notes exported successfully 💾");
          return;
        }
      }
    } catch {}

    // Fallback native browser blob download
    if (editorRef.current) {
      const blob = new Blob(
        [`<meta charset="utf-8"><h1>EduNerd Study Notes</h1>${editorRef.current.innerHTML}`],
        { type: "text/html" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "edunerd-notes.html";
      document.body.append(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
      showToast("Notes exported 💾");
    }
  };

  return (
    <div className={embedded ? "" : "pg"}>
      <h1>Notes</h1>
      <p className="mu">Select text, then tap a highlight pen to mark formulas and definitions.</p>

      {/* Toolbar */}
      <div
        className="tb row"
        style={{ flexWrap: "wrap", marginBottom: "8px" }}
        onMouseDown={e => e.preventDefault()}
      >
        {[
          ["#fde047", "🟡"],
          ["#86efac", "🟢"],
          ["#f9a8d4", "🌸"],
          ["#7dd3fc", "🔵"]
        ].map(([color, label]) => (
          <button
            key={color}
            className="alt"
            onClick={() => applyHighlight(color)}
          >
            🖍️{label}
          </button>
        ))}
        <button className="alt" onClick={() => applyFormat("bold")}>B</button>
        <button className="alt" onClick={() => applyFormat("removeFormat")}>🧹</button>
        <button id="sn" onClick={handleExplicitSave}>💾 Save</button>
        <button className="alt" id="dn" onClick={handleDownload}>⬇️ Download</button>
      </div>

      {/* Editable Canvas */}
      <div
        id="nt"
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
      />

      <div className="mu" style={{ marginTop: "6px" }}>{saveStatus}</div>
    </div>
  );
}
