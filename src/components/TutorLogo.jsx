/**
 * Shared Study Ingenia tutor mark used by the tutor launch surfaces.
 * Keeping this in one component prevents the dashboard, study tabs, and
 * navigation drawer from drifting to different icons.
 */
import React from "react";

export default function TutorLogo({ size = 40, style, className }) {
  return (
    <img
      src="/study-ingenia-logo.png"
      alt="Study Ingenia tutor"
      width={size}
      height={size}
      className={className}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: "14px",
        ...style
      }}
    />
  );
}
