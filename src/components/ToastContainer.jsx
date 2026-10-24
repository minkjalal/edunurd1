// Connection: src/components/ToastContainer.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Displays transient status and success messages from AppContext.
/**
 * EduNerd - Toast Notification Container
 * =======================================
 * Renders stacked animated toast popups at the top-center of the viewport.
 */

import React from "react";
import { useApp } from "../context/AppContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (!toasts.length) return null;

  return (
    <div id="tst">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast"
          onClick={() => removeToast(toast.id)}
        >
          {/^(🔔|🏅|🎉|🌟)/.test(toast.text) ? toast.text : "⭐ " + toast.text}
        </div>
      ))}
    </div>
  );
}
