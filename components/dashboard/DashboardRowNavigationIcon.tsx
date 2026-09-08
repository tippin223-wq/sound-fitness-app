"use client";

import { useId, type ReactNode } from "react";

type IconPalette = [highlight: string, face: string, shade: string, side: string];

const palettes: Record<string, IconPalette> = {
  snapshot: ["#fff5ab", "#ffd74c", "#ed9518", "#935007"],
  wrench: ["#d8ffff", "#62deef", "#2297bc", "#105270"],
  stats: ["#efe2ff", "#bf93ff", "#7f4bdd", "#402278"],
  dashboard: ["#ffe7b6", "#ffbd69", "#e27532", "#85361d"],
  calendar: ["#e1fff8", "#70e7d0", "#27a6a0", "#15596a"],
  sound: ["#e1faff", "#81d7f5", "#398bb9", "#123e63"],
  settings: ["#f0edff", "#bcb8df", "#797397", "#413a5c"],
  plan: ["#e5ffca", "#a6e86a", "#54a940", "#28512a"],
  packages: ["#ffe7bf", "#f9bb76", "#cb7c43", "#734129"],
  messages: ["#e0f4ff", "#82c9ff", "#448bd6", "#214878"],
  soundworld: ["#e1ffef", "#73dfac", "#29947d", "#185249"],
  feed: ["#ffe3f1", "#f3a0c8", "#cb5f99", "#742e5a"],
};

// Centres of the complete sculpted silhouettes (including extruded sides),
// excluding the floor shadow. Keep every object centred in its 40-unit frame.
const artworkCenters: Record<string, readonly [number, number]> = {
  snapshot: [19.5, 19.35],
  wrench: [19.607, 19.844],
  stats: [18.5, 19.35],
  dashboard: [19, 19.35],
  calendar: [19.5, 19.6],
  sound: [18.75, 19.6],
  settings: [19.5, 20.85],
  plan: [19.5, 20.35],
  packages: [19, 21.35],
  messages: [19.5, 21.85],
  soundworld: [19, 19.35],
  feed: [19.5, 20.85],
};

/** Small sculpted objects: offset solids supply depth even without hover or glow. */
export default function DashboardRowNavigationIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const [highlight, face, shade, side] = palettes[name] ?? palettes.dashboard;
  const [centerX, centerY] = artworkCenters[name] ?? artworkCenters.dashboard;
  const front = `url(#${id}-front)`;
  const round = `url(#${id}-round)`;
  const paper = `url(#${id}-paper)`;

  const solid = (shape: ReactNode, fill = front) => (
    <>
      <g transform="translate(2 2.7)" fill={side} stroke={side} strokeWidth="1.1" strokeLinejoin="round">
        {shape}
      </g>
      <g fill={fill} stroke={highlight} strokeWidth="0.8" strokeLinejoin="round">
        {shape}
      </g>
    </>
  );

  let artwork: ReactNode;
  switch (name) {
    case "snapshot":
      artwork = (
        <>
          {solid(<circle cx="18.5" cy="18" r="15.5" />, round)}
          <path d="M7 13C9 7 15 4 21 5" fill="none" stroke="#fffbd2" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
          <ellipse cx="13" cy="16" rx="1.6" ry="2.3" fill="#664013" />
          <ellipse cx="24" cy="16" rx="1.6" ry="2.3" fill="#664013" />
          <path d="M11 23C15 29 23 29 27 22" fill="none" stroke="#6e3c0d" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12 22.5C16 27 22 27 26 22" fill="none" stroke="#fff0a2" strokeWidth="0.8" strokeLinecap="round" />
        </>
      );
      break;
    case "wrench":
      artwork = (
        <>
          {solid(<path d="M26 3C18 1 12 9 16 16L4.7 27.3a4.1 4.1 0 0 0 5.8 5.8L22 21.8C29 25 36 18 33 10l-6 6-6-6Z" />)}
          <path d="M18 18L7 29" stroke="#e4ffff" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="30" r="1.6" fill={side} />
          <path d="M17 11C17 7 20 5 23 5" fill="none" stroke="#f0ffff" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
      break;
    case "stats":
      artwork = (
        <>
          {solid(<><rect x="3" y="23" width="7" height="10" rx="1.3" /><rect x="14" y="16" width="7" height="17" rx="1.3" /><rect x="25" y="6" width="7" height="27" rx="1.3" /></>)}
          <path d="M5 25V31M16 18V31M27 8V31" stroke="#f6eaff" strokeWidth="1.3" strokeLinecap="round" opacity="0.9" />
          <path d="M4 16L13 10L19 12L27 3" fill="none" stroke="#e8d5ff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 3H27V8" fill="none" stroke="#e8d5ff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case "calendar":
      artwork = (
        <>
          {solid(<rect x="3" y="7" width="31" height="26" rx="4" />)}
          <rect x="5" y="15" width="27" height="15.5" rx="2" fill={paper} />
          <path d="M11 4V10M26 4V10" stroke={side} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M10.5 3.5V9M25.5 3.5V9" stroke="#e1ffff" strokeWidth="1.7" strokeLinecap="round" />
          <g fill="#367a83"><rect x="8" y="18" width="4" height="3" rx="0.8" /><rect x="16" y="18" width="4" height="3" rx="0.8" /><rect x="24" y="18" width="4" height="3" rx="0.8" /><rect x="8" y="25" width="4" height="3" rx="0.8" /><rect x="16" y="25" width="4" height="3" rx="0.8" /></g>
          <rect x="23" y="23" width="6" height="6" rx="1.5" fill="#22aaa8" />
          <path d="M6 12H30" stroke="#c5fff1" strokeWidth="1" opacity="0.75" />
        </>
      );
      break;
    case "sound":
      artwork = (
        <>
          {solid(<path d="M19 2C14 6 9 7 4 7V21C4 29 11 33 19 36C27 33 34 29 34 21V7C29 7 24 6 19 2Z" />)}
          <path d="M19 5C15 8 10 9 7 9V21C7 27 12 30 19 33C26 30 31 27 31 21V9C27 9 23 8 19 5Z" fill="#061b30" />
          <image href="/sound-crest-avatar.png" x="0.5" y="0.5" width="36.5" height="36.5" preserveAspectRatio="xMidYMid meet" />
          <path d="M5 18V8C10 8 15 6 19 3" fill="none" stroke="#f0ffff" strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
      break;
    case "settings":
      artwork = (
        <>
          {solid(<path d="M15 3H23L24 8L28 10L32 8L36 15L32 18V22L35 25L31 32L26 30L23 32L22 36H14L13 31L10 29L5 31L1 24L5 21V17L2 14L6 7L11 9L14 7Z" />)}
          <circle cx="18.5" cy="19.5" r="9" fill={side} />
          <circle cx="18" cy="18" r="8" fill={paper} stroke="#e9e7ff" strokeWidth="0.6" />
          <circle cx="18" cy="18" r="4.5" fill="#302d49" />
          <path d="M16 5H21M7 10L5 13" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
      break;
    case "plan":
      artwork = (
        <>
          {solid(<rect x="5" y="5" width="27" height="30" rx="3" />)}
          <rect x="8" y="9" width="21" height="23" rx="1.6" fill={paper} />
          {solid(<path d="M14 3H23V6H26V11H11V6H14Z" />)}
          <path d="M11 18L13 20L16 16M11 26L13 28L16 24" fill="none" stroke="#448435" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 18H26M20 26H26" stroke="#869c7a" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
      break;
    case "packages":
      artwork = (
        <>
          {solid(<path d="M3 12L18 4L33 12V29L18 36L3 28Z" />)}
          <path d="M18 20L33 12V29L18 36Z" fill={shade} />
          <path d="M3 12L18 20L33 12L18 4Z" fill={highlight} />
          <path d="M11 8L26 16V24L22 26V18L7 10Z" fill="#b97f43" />
          <path d="M5 16V26L15 31" fill="none" stroke="#ffe7b5" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
      break;
    case "messages":
      artwork = (
        <>
          {solid(<path d="M7 5H30C33 5 35 7 35 10V25C35 28 33 30 30 30H17L7 36V30C4 30 2 28 2 25V10C2 7 4 5 7 5Z" />)}
          <path d="M7 9H29" stroke="#e4f6ff" strokeWidth="1.3" strokeLinecap="round" />
          <g fill="#19507e"><circle cx="10" cy="18" r="2" /><circle cx="18.5" cy="18" r="2" /><circle cx="27" cy="18" r="2" /></g>
        </>
      );
      break;
    case "soundworld":
      artwork = (
        <>
          {solid(<circle cx="18" cy="18" r="16" />, round)}
          <path d="M5 10L13 7L18 11L14 16L7 17L4 14ZM17 19L24 17L31 21L26 25L25 31L21 33L19 27L15 24Z" fill="#e0ffe6" opacity="0.9" />
          <path d="M8 6C13 3 20 2 25 6" fill="none" stroke="#eefff6" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M27 7C35 18 27 30 22 32" fill="none" stroke="#176954" strokeWidth="1.1" opacity="0.5" />
        </>
      );
      break;
    case "feed":
      artwork = (
        <>
          {solid(<rect x="4" y="4" width="29" height="31" rx="3" />)}
          <rect x="7" y="8" width="23" height="11" rx="1.5" fill="#8c365f" />
          <path d="M9 17L15 11L20 16L24 13L28 17Z" fill="#ffd7e9" />
          <path d="M9 23H27M9 28H23" stroke="#fff0f7" strokeWidth="2.3" strokeLinecap="round" />
        </>
      );
      break;
    default:
      artwork = (
        <>
          {solid(<circle cx="18" cy="18" r="16" />, round)}
          <circle cx="18" cy="18" r="12" fill="#593626" stroke="#ffe7b3" strokeWidth="0.8" />
          <path d="M18 7V10M18 26V29M7 18H10M26 18H29" stroke="#ffd5a4" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M25 10L21 21L10 25L14 14Z" fill="#fff4d8" />
          <path d="M25 10L21 21L18 18Z" fill="#ed954c" />
          <path d="M10 25L14 14L18 18Z" fill="#b6aa99" />
          <circle cx="18" cy="18" r="1.8" fill="#713d29" />
          <path d="M6 10C9 5 15 3 21 4" fill="none" stroke="#fff5d9" strokeWidth="1.5" strokeLinecap="round" />
        </>
      );
  }

  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id={`${id}-front`} x1="4" y1="2" x2="31" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor={highlight} /><stop offset="0.3" stopColor={face} /><stop offset="1" stopColor={shade} />
        </linearGradient>
        <radialGradient id={`${id}-round`} cx="0" cy="0" r="1" gradientTransform="translate(12 10) rotate(48) scale(31)" gradientUnits="userSpaceOnUse">
          <stop stopColor={highlight} /><stop offset="0.42" stopColor={face} /><stop offset="0.85" stopColor={shade} /><stop offset="1" stopColor={side} />
        </radialGradient>
        <linearGradient id={`${id}-paper`} x1="8" y1="9" x2="31" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" /><stop offset="1" stopColor="#c4d1da" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="36.5" rx="15" ry="2.4" fill="#020617" opacity="0.6" />
      <g data-row-icon-artwork="true" transform={`translate(${20 - centerX} ${20 - centerY})`}>
        {artwork}
      </g>
    </svg>
  );
}
