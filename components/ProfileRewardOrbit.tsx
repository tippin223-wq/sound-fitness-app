"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import DashboardLightningBolt3D from "./dashboard/DashboardLightningBolt3D";
import { DashboardEmerald3D } from "./dashboard/DashboardTornadoEmeralds3D";
import { DashboardSpinningSoundCoin3D } from "./dashboard/DashboardTreasureChest3D";

type RewardItem = {
  id: "points" | "gems" | "coin";
  label: string;
  value: string;
  helper: string;
  accentClassName: string;
  glowClassName: string;
  shadeClassName: string;
};

const rewardItems: RewardItem[] = [
  {
    id: "points",
    label: "Sound Sparks",
    value: "1,240",
    helper: "Blue bolt progress currency",
    accentClassName: "from-sky-200 via-cyan-300 to-blue-500",
    glowClassName: "text-sky-100",
    shadeClassName:
      "bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.30),rgba(37,99,235,0.14)_50%,transparent_76%)]",
  },
  {
    id: "gems",
    label: "Gems",
    value: "6",
    helper: "For unique rewards",
    accentClassName: "from-emerald-100 via-teal-300 to-emerald-500",
    glowClassName: "text-emerald-100",
    shadeClassName:
      "bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.30),rgba(20,184,166,0.14)_50%,transparent_76%)]",
  },
  {
    id: "coin",
    label: "Treasure Tokens",
    value: "18",
    helper: "In-app purchase credit",
    accentClassName: "from-amber-100 via-yellow-300 to-amber-500",
    glowClassName: "text-amber-100",
    shadeClassName:
      "bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.34),rgba(217,119,6,0.16)_52%,transparent_78%)]",
  },
];

const positiveMod = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

const getOrbitDistance = (index: number, activeIndex: number) => {
  const rawDistance = positiveMod(index - activeIndex, rewardItems.length);

  return rawDistance > rewardItems.length / 2
    ? rawDistance - rewardItems.length
    : rawDistance;
};

const renderRewardIcon = (item: RewardItem, active: boolean) => {
  const className = "h-full w-full";

  if (item.id === "points") {
    return (
      <DashboardLightningBolt3D
        active={active}
        className={`${className} drop-shadow-[0_0_16px_rgba(56,189,248,0.48)]`}
        paused={!active}
      />
    );
  }

  if (item.id === "gems") {
    return (
      <DashboardEmerald3D
        className={`${className} drop-shadow-[0_0_16px_rgba(52,211,153,0.42)]`}
        paused={!active}
        tone="green"
      />
    );
  }

  return (
    <DashboardSpinningSoundCoin3D
      className={`${className} drop-shadow-[0_0_18px_rgba(250,204,21,0.5)]`}
      paused={!active}
    />
  );
};

export default function ProfileRewardOrbit() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartXRef = useRef<number | null>(null);

  const activeReward = rewardItems[activeIndex] ?? rewardItems[0];

  useEffect(() => {
    const rotationInterval = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        positiveMod(currentIndex + 1, rewardItems.length),
      );
    }, 5600);

    return () => window.clearInterval(rotationInterval);
  }, []);

  const rotate = (direction: -1 | 1) => {
    setActiveIndex((currentIndex) =>
      positiveMod(currentIndex + direction, rewardItems.length),
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = event.clientX;
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const pointerStartX = pointerStartXRef.current;
    pointerStartXRef.current = null;

    if (pointerStartX === null) {
      return;
    }

    const movement = event.clientX - pointerStartX;

    if (Math.abs(movement) > 30) {
      rotate(movement > 0 ? -1 : 1);
    }
  };

  return (
    <section
      aria-label="Profile reward currency orbit"
      className="mt-4 overflow-hidden"
    >
      <div className="min-w-0 px-2 text-center">
        <div className="mx-auto max-w-[18rem] text-balance text-[9.5px] font-black uppercase leading-[1.25] tracking-[0.1em] text-sky-50 drop-shadow-[0_0_12px_rgba(125,211,252,0.34)] [word-spacing:0.08em] min-[420px]:text-[10px] min-[420px]:tracking-[0.12em] sm:text-[10.5px] sm:tracking-[0.14em]">
          Earn rewards for your workouts
        </div>
        <div className="relative isolate mt-2 inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-2.5 gap-y-1 px-3 py-1.5">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-1 -inset-y-1 -z-10 blur-sm ${activeReward.shadeClassName}`}
          />
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-3 bottom-1 -z-10 h-px bg-gradient-to-r ${activeReward.accentClassName} opacity-70`}
          />
          <span
            className={`relative min-w-0 bg-gradient-to-r ${activeReward.accentClassName} bg-clip-text text-[11px] font-black uppercase tracking-[0.08em] text-transparent drop-shadow-[0_0_8px_rgba(224,242,254,0.34)] min-[420px]:text-xs`}
          >
            {activeReward.label}
          </span>
          <span
            className={`relative bg-gradient-to-br ${activeReward.accentClassName} bg-clip-text text-lg font-black leading-none text-transparent drop-shadow-[0_0_10px_rgba(224,242,254,0.32)]`}
          >
            {activeReward.value}
          </span>
        </div>
      </div>

      <div
        className="relative mt-4 h-24 cursor-grab [perspective:720px] active:cursor-grabbing"
        data-testid="profile-reward-webgl-orbit"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {rewardItems.map((item, index) => {
          const distance = getOrbitDistance(index, activeIndex);
          const active = distance === 0;
          const x = 44 + distance * 92;
          const z = active ? 48 : -82;
          const scale = active ? 1.04 : 0.76;
          const opacity = active ? 1 : 0.42;

          return (
            <button
              aria-label={`Show ${item.label}`}
              className="absolute left-1/2 top-1/2 h-[4.5rem] w-[4.5rem] -translate-x-1/2 -translate-y-1/2 p-0.5 transition-[opacity,transform,filter] duration-500 hover:drop-shadow-[0_0_22px_rgba(125,211,252,0.34)]"
              key={item.id}
              onClick={() => setActiveIndex(index)}
              style={{
                opacity,
                transform: `translate(-50%, calc(-50% + 12px)) translateX(${x}px) translateZ(${z}px) rotateY(${distance * -18}deg) scale(${scale})`,
                zIndex: active ? 3 : 2 - Math.abs(distance),
              }}
              type="button"
            >
              <span
                className={`block h-full w-full ${
                  item.id === "points" ? "" : "scale-[1.12]"
                }`}
              >
                {renderRewardIcon(item, active)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="-mt-3 text-center text-[8px] font-black uppercase tracking-[0.12em] text-sky-100/70 drop-shadow-[0_0_8px_rgba(125,211,252,0.18)]">
        {activeReward.helper}
      </div>
    </section>
  );
}
