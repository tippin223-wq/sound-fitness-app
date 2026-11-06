"use client";

import { useId } from "react";
import styles from "./MemberLevelPopup.module.css";

function romanLevel(level: number) {
  const numerals: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = "";
  for (const [value, numeral] of numerals) {
    while (level >= value) { result += numeral; level -= value; }
  }
  return result;
}

/** No selected program/verified level means a dash and no emblem. This SVG
 * supplies a metallic, extruded numeral without another animated WebGL scene. */
export default function MemberLevelReadout({ level, compact = false }: { level: number | null; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const hasLevel = level !== null && Number.isInteger(level) && level >= 0 && level <= 3999;
  const numeral = hasLevel && level > 0 ? romanLevel(level) : "";
  const width = Math.max(64, numeral.length * 23 + 16);
  return <span className={styles.levelReadout} data-compact={compact || undefined}>
    <span className={compact ? undefined : "dashboard-page-level-meter-explainer__level-number"}>LV {hasLevel ? level : "—"}</span>
    {numeral && <svg className={styles.levelEmblem} viewBox={`0 0 ${width} 76`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="#f0fdff" /><stop offset=".34" stopColor="#7dd3fc" /><stop offset=".49" stopColor="#e0f2fe" /><stop offset=".54" stopColor="#0284c7" /><stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <path d={`M12 65 H${width - 12} M18 70 H${width - 18}`} fill="none" stroke="#38bdf8" strokeWidth="1.4" opacity=".65" />
      {[5, 4, 3, 2, 1].map(depth => <text key={depth} x={width / 2 + depth} y={55 + depth} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="48" fill="#082f49" stroke="#075985" strokeWidth="1">{numeral}</text>)}
      <text x={width / 2} y="55" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="48" fill={`url(#${id}-metal)`} stroke="#bae6fd" strokeWidth=".7" paintOrder="stroke">{numeral}</text>
    </svg>}
  </span>;
}
