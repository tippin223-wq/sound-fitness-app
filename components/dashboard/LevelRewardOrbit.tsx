"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./MemberLevelPopup.module.css";

export default function LevelRewardOrbit({ rewards }: { rewards: { label: string; detail: string; icon: ReactNode }[] }) {
  const [selected, setSelected] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null), dragged = useRef(false), wheelAt = useRef(0);
  const move = (direction: number) => setSelected(index => (index + direction + rewards.length) % rewards.length);
  if (!rewards.length) return null;
  return <section className={styles.orbitSection} aria-label="Level reward previews" data-dashboard-orbiter-local-scroll="true">
    <div className={styles.orbitHeader}><button type="button" aria-label="Previous level reward" onClick={() => move(-1)}>‹</button><h3>Level rewards</h3><button type="button" aria-label="Next level reward" onClick={() => move(1)}>›</button></div>
    <div className={styles.orbit} tabIndex={0} role="region" aria-label="Browse level rewards with arrows, swiping, or scrolling" onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); event.stopPropagation(); move(event.key === "ArrowRight" ? 1 : -1); } }}
      onWheel={event => { event.stopPropagation(); const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY; if (Math.abs(delta) > 8 && Date.now() - wheelAt.current > 240) { wheelAt.current = Date.now(); move(delta > 0 ? 1 : -1); } }}
      onPointerDown={event => { event.stopPropagation(); start.current = event.clientX; dragged.current = false; }}
      onPointerMove={event => { if (start.current === null) return; const delta = event.clientX - start.current; if (Math.abs(delta) > 8) { dragged.current = true; event.currentTarget.setPointerCapture(event.pointerId); } setDrag(Math.max(-36, Math.min(36, delta))); }}
      onPointerUp={event => { if (start.current !== null && Math.abs(event.clientX - start.current) > 24) move(event.clientX < start.current ? 1 : -1); start.current = null; setDrag(0); }}
      onPointerCancel={() => { start.current = null; setDrag(0); }}
      onClickCapture={event => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
      {rewards.map((reward, index) => {
        const raw = (index - selected + rewards.length) % rewards.length;
        const offset = raw > rewards.length / 2 ? raw - rewards.length : raw;
        return <button type="button" key={reward.label} aria-pressed={index === selected} aria-label={`${reward.label}. ${reward.detail}`} className={styles.rewardCard} data-active={index === selected} style={{ "--reward-offset": offset, "--reward-drag": `${drag}px` } as CSSProperties} onClick={() => setSelected(index)}>
          <span className={styles.rewardArt} aria-hidden="true">{reward.icon}</span><span>{reward.label}</span>
        </button>;
      })}
    </div>
    <div aria-live="polite" className={styles.rewardDetail}><strong>{rewards[selected].label}</strong><span>{rewards[selected].detail}</span><small>{selected + 1} / {rewards.length}</small></div>
  </section>;
}
