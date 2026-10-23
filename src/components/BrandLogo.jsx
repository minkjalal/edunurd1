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
