// Connection: src/components/BrandLogo.jsx is part of the runtime flow documented in CODEBASE_GUIDE.md.
// Function: Displays the primary EduNurd brand image with consistent sizing.
/**
 * EduNurd brand mark.
 */

import React from "react";

export default function BrandLogo({ size = 32 }) {
  return (
    <img
      src="/logo-edunerd.png"
      alt="Edunurd"
      width={size}
      height={size}
      style={{ verticalAlign: "middle", objectFit: "contain" }}
    />
  );
}
