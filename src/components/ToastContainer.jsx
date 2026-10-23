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
