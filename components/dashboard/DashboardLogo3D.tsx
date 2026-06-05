"use client";

import Image from "next/image";

export default function DashboardLogo3D({
  className = "",
  heroActive = false,
  paused = false,
  sizeRem,
}: {
  className?: string;
  heroActive?: boolean;
  paused?: boolean;
  sizeRem?: number;
}) {
  const logoSize = sizeRem ?? (heroActive ? 4.75 : 3.65);

  return (
    <span
      aria-hidden="true"
      className={`dashboard-header-logo-3d ${className}`}
      data-logo-hero-active={heroActive ? "true" : "false"}
      data-logo-paused={paused ? "true" : "false"}
      data-logo-renderer="css-image"
      style={{
        height: `${logoSize}rem`,
        width: `${logoSize}rem`,
      }}
    >
      <span className="dashboard-header-logo-3d__depth dashboard-header-logo-3d__depth--back" />
      <span className="dashboard-header-logo-3d__depth dashboard-header-logo-3d__depth--mid" />
      <Image
        alt=""
        className="dashboard-header-logo-3d__image"
        draggable={false}
        height={96}
        priority={heroActive}
        src="/sound-fitness-logo.png"
        width={96}
      />
      <span className="dashboard-header-logo-3d__sheen" />
    </span>
  );
}
