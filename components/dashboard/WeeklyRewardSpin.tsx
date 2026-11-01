"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { publishWeeklyRewards } from "@/lib/planning/weeklyRewardBalances";
import { supabase } from "@/lib/supabaseClient";
import styles from "./HeroMeterCards.module.css";
import { REWARD_RARITIES, WEEKLY_REWARDS, weeklyRarityOdds, weeklyRewardAward } from "@/lib/weeklyRewardRarity";

const REWARD_LABELS = WEEKLY_REWARDS.map(reward => reward.label);
const REWARD_IDS = WEEKLY_REWARDS.map(reward => reward.id);

function RewardArtwork({ id, gemType }: { id: string; gemType?: string }) {
  if (id === "sound-points") return <Image className={`${styles.rewardArtwork} ${styles.rewardCoinArtwork}`} src="/sound-coins/sound-coin-gold.png" width={80} height={80} alt="" />;
  if (id === "recovery-credit") return <svg className={styles.rewardArtwork} viewBox="0 0 80 80" aria-hidden="true">
    <path d="M46 5 17 43h18l-9 32 38-43H46Z" fill="#0369a1" stroke="#7dd3fc" strokeWidth="2" strokeLinejoin="round" />
    <path d="M43 9 20 40h20L30 67l29-32H42Z" fill="#38bdf8" />
    <path d="m43 9-3 31H20Z" fill="#bae6fd" /><path d="M40 40 30 67l16-32Z" fill="#0ea5e9" />
  </svg>;
  if (id === "emerald") return <svg className={styles.rewardArtwork} viewBox="0 0 96 80" aria-hidden="true">
    {[{ x: 4, y: 24, type: "sapphire", color: "#38bdf8", light: "#bae6fd", dark: "#075985" }, { x: 48, y: 24, type: "topaz", color: "#fbbf24", light: "#fef3c7", dark: "#92400e" }, { x: 26, y: 5, type: "emerald", color: "#34d399", light: "#a7f3d0", dark: "#065f46" }, { x: 26, y: 40, type: "ruby", color: "#f43f5e", light: "#fecdd3", dark: "#881337" }].filter(gem => !gemType || gem.type === gemType).map(gem => <g key={gem.color} transform={gemType ? "translate(17 12) scale(1.55)" : `translate(${gem.x} ${gem.y})`}>
      <path d="m8 0 24 0 8 11-20 25L0 11Z" fill={gem.color} stroke={gem.light} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="m8 0 3 11H0Zm24 0 8 11H29Z" fill={gem.light} /><path d="m11 11 9 25L0 11Zm18 0-9 25 20-25Z" fill={gem.dark} /><path d="m11 11 9 25 9-25Z" fill={gem.color} /><path d="m8 0 3 11h18l3-11Z" fill={gem.light} opacity=".65" />
    </g>)}
  </svg>;
  return <span className="dashboard-hero-space-needle-meter__roulette-slot" data-reward-id={id}><span className="dashboard-hero-space-needle-meter__roulette-slot-icon" /></span>;
}

function RewardAmounts({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); if (dialog.current) dialog.current.scrollTop = 0; }, []);
  return createPortal(<dialog ref={dialog} className={styles.rewardDialog} data-dashboard-orbiter-local-scroll="true" onClose={onClose} aria-labelledby="reward-amounts-title">
    <button className={styles.rewardClose} type="button" aria-label="Close prize amounts" onClick={() => dialog.current?.close()}>×</button>
    <h2 id="reward-amounts-title">Prize amounts</h2><p>Higher rarity increases currency amounts or the grade of your avatar item.</p>
    {WEEKLY_REWARDS.map((reward, result) => <section key={reward.id} style={{ marginTop: 20 }}><h3 style={{ fontWeight: 800, color: "#99f6e4" }}>{reward.label}{reward.minimum > 0 && !["emerald", "rare-crate"].includes(reward.id) ? " · Coming soon" : ""}</h3><dl>{REWARD_RARITIES.map((tier, index) => index < reward.minimum || ("maximum" in reward && index > reward.maximum) ? null : <div key={tier.id}><dt style={{ color: tier.color }}>{tier.label}</dt><dd>{weeklyRewardAward(result, index).amount}</dd></div>)}</dl></section>)}
    <p className={styles.rewardNote}>Currency prizes are credited immediately. Clothing, accessories, effects, streak shields and bonus challenges stay locked until their fulfillment is ready.</p><button type="button" onClick={() => dialog.current?.close()}>Close</button>
  </dialog>, document.body);
}

function RarityGuide({ days, onClose }: { days: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); if (dialog.current) dialog.current.scrollTop = 0; }, []);
  return createPortal(<dialog ref={dialog} className={styles.rewardDialog} data-dashboard-orbiter-local-scroll="true" onClose={onClose} aria-labelledby="rarity-title">
    <button className={styles.rewardClose} type="button" aria-label="Close rarity guide" onClick={() => dialog.current?.close()}>×</button>
    <h2 id="rarity-title">Weekly rarity</h2><p>One spin for any week with at least one completed workout day. Multiple workouts on the same day count once.</p>
    <div className={styles.rarityTable}><table><caption>Prize rarity chances (%)</caption><thead><tr><th>Days</th>{REWARD_RARITIES.map(tier => <th key={tier.id} style={{ color: tier.color }}>{tier.label}</th>)}</tr></thead><tbody>{Array.from({ length: 7 }, (_, i) => <tr key={i} data-current={days === i + 1}><th>{i + 1}</th>{weeklyRarityOdds(i + 1).map((chance, j) => <td key={j}>{chance}%</td>)}</tr>)}</tbody></table></div>
    <p>Unlocks: Common 1 day · Uncommon 2 · Rare 3 · Epic 4 · Legendary 5. Days 6–7 improve odds further.</p><p>Higher rarity increases currency quantities or awards a higher-grade avatar item.</p><p className={styles.rewardNote}>Rest days matter. Follow your training plan; seven days is a cap, not a target. Each saved spin uses its own week’s attendance.</p>
    <button type="button" autoFocus onClick={() => dialog.current?.close()}>Close</button>
  </dialog>, document.body);
}

function RewardReveal({ prize, onClose }: { prize: ClaimedReward; onClose: () => void }) {
  const result = WEEKLY_REWARDS.findIndex(reward => reward.id === prize.rewardId);
  const tier = prize.tier;
  const dialog = useRef<HTMLDialogElement>(null);
  const award = prize;
  useEffect(() => { dialog.current?.showModal(); }, []);
  return createPortal(<dialog ref={dialog} className={styles.rewardDialog} style={{ "--reward-rarity": REWARD_RARITIES[tier].color } as React.CSSProperties} data-dashboard-orbiter-local-scroll="true" onClose={onClose} aria-labelledby="weekly-reward-title">
    <button className={styles.rewardClose} type="button" aria-label="Close reward" onClick={() => dialog.current?.close()}>×</button>
    <div className={styles.rewardConfetti} aria-hidden="true">{Array.from({ length: 42 }, (_, i) => {
      const angle = (i * 137.5) * Math.PI / 180;
      return <span key={i} style={{
        "--confetti-x": `${Math.cos(angle) * (70 + i % 5 * 22)}px`,
        "--confetti-y": `${-65 - i % 7 * 18}px`,
        "--confetti-turn": `${(i % 2 ? 1 : -1) * (180 + i * 29)}deg`,
        "--confetti-delay": `${i % 6 * 22}ms`,
        "--confetti-duration": `${1200 + i % 5 * 130}ms`,
      } as React.CSSProperties} />;
    })}</div>
    <p className={styles.rewardEyebrow}>Reward · landed!</p>
    <div className={styles.rewardIcon} aria-hidden="true"><RewardArtwork id={REWARD_IDS[result]} gemType={prize.gemType} /></div>
    <h2 id="weekly-reward-title">{REWARD_LABELS[result]}</h2>
    <p className={styles.rarityPill} style={{ color: REWARD_RARITIES[tier].color, borderColor: REWARD_RARITIES[tier].color }}>{REWARD_RARITIES[tier].label}</p>
    <p>You landed on the {REWARD_LABELS[result].toLowerCase()} icon.</p>
    <dl><div><dt>Reward total</dt><dd>{award.amount}</dd></div></dl>
    <p className={styles.rewardNote}>{award.detail}</p>
    <button type="button" autoFocus onClick={() => dialog.current?.close()}>Continue</button>
  </dialog>, document.body);
}

type ClaimedReward = { weekStart: string; rewardId: string; tier: number; amount: string; detail: string; credits: Record<string, number>; gemType?: string };
type SpinStatus = { weekStart: string | null; daysTrained: number; currentDays: number; availableSpins: number; unlocksAt: string;
  rewardsReady?: boolean; balances: Record<string, number>; pendingReveal?: ClaimedReward | null };

export default function WeeklyRewardSpin() {
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [prize, setPrize] = useState<ClaimedReward | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rarityOpen, setRarityOpen] = useState(false);
  const [amountsOpen, setAmountsOpen] = useState(false);
  const control = useRef<HTMLElement>(null);
  const reelAnimation = useRef<Animation | null>(null);
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const [requestWeek, setRequestWeek] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const version = generation.current;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (version !== generation.current) return;
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      if (!auth.user) {
        setStatus(null); setSignedOut(true); setError(""); publishWeeklyRewards(null, null); return;
      }
      setSignedOut(false);
      const { data, error: failure } = await supabase.rpc("weekly_reward_spin_status");
      if (version !== generation.current) return;
      if (failure) throw failure;
      const next = data as SpinStatus;
      setStatus(next); setError("");
      publishWeeklyRewards(auth.user?.id ?? null, next.balances);
      if (next.pendingReveal && !pending.current) {
        setRequestWeek(null);
        setPrize(next.pendingReveal); setRevealed(true);
      }
    } catch {
      if (version === generation.current) { setStatus(null); setError("Rewards could not connect. Retry."); }
    }
  }, []);
  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => { if (!document.hidden && !pending.current) void refresh(); }, 60000);
    const { data: listener } = supabase.auth.onAuthStateChange(event => {
      if (event === "TOKEN_REFRESHED") return;
      generation.current++; pending.current = false; setRequestWeek(null);
      setStatus(null); setBusy(false); setPrize(null); setRevealed(false);
      publishWeeklyRewards(null, null); reelAnimation.current?.cancel();
      setRarityOpen(false); setAmountsOpen(false);
      if (spinTimer.current) clearTimeout(spinTimer.current);
      window.setTimeout(() => void refresh(), 0);
    });
    return () => { generation.current++; reelAnimation.current?.cancel(); if (spinTimer.current) clearTimeout(spinTimer.current); window.clearTimeout(initialRefresh); window.clearInterval(timer); listener.subscription.unsubscribe(); };
  }, [refresh]);

  const spin = async () => {
    if (pending.current || (!requestWeek && (!status?.weekStart || !status.rewardsReady))) return;
    const week = requestWeek ?? status!.weekStart!;
    setRequestWeek(week);
    pending.current = true; setBusy(true); setError(""); setRevealed(false); setPrize(null);
    const version = generation.current;
    try {
      const { data, error: failure } = await supabase.rpc("claim_weekly_reward_spin", { requested_week: week });
      if (version !== generation.current) return;
      if (failure) {
        if (failure.code === "22023") { setRequestWeek(null); pending.current = false; await refresh(); return; }
        throw failure;
      }
      const claimed = data as ClaimedReward;
      const result = WEEKLY_REWARDS.findIndex(reward => reward.id === claimed.rewardId);
      if (result < 0 || !Number.isInteger(claimed.tier) || claimed.tier < 0 || claimed.tier > 4 || !claimed.amount) throw new Error("Invalid award response");
      const track = control.current?.parentElement?.querySelector<HTMLElement>(".dashboard-hero-space-needle-meter__roulette-track");
      const windowElement = track?.parentElement;
      const endSlot = track?.children[5 * WEEKLY_REWARDS.length + result] as HTMLElement | undefined;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (track && windowElement && endSlot) {
        const position = windowElement.clientWidth / 2 - endSlot.offsetLeft - endSlot.offsetWidth / 2;
        const start = getComputedStyle(track).transform;
        reelAnimation.current?.cancel();
        const animation = track.animate([{ transform: start === "none" ? "translateX(0)" : start }, { transform: `translateX(${position}px)` }], {
          duration: reduced ? 180 : 4400, easing: "cubic-bezier(.08,.72,.08,1)", fill: "forwards",
        });
        reelAnimation.current = animation;
        try { await animation.finished; } catch { /* A saved prize remains recoverable after animation cancellation. */ }
        if (version !== generation.current) return;
        track.style.transform = `translateX(${position}px)`;
        animation.cancel(); reelAnimation.current = null;
      }
      setPrize(claimed); setRequestWeek(null);
      spinTimer.current = setTimeout(() => setRevealed(true), reduced ? 0 : 450);
      await refresh();
    } catch {
      if (version === generation.current) setError("Spin wasn’t confirmed. Retry safely; the same week can only award once.");
    } finally {
      if (version === generation.current) { pending.current = false; setBusy(false); }
    }
  };
  const closeReward = async () => {
    if (!prize) return;
    const version = generation.current;
    const { error: failure } = await supabase.rpc("acknowledge_weekly_reward", { requested_week: prize.weekStart });
    if (version !== generation.current) return;
    setRevealed(false); setPrize(null);
    if (failure) setError("Your prize is saved. Its receipt will be shown again when you reconnect.");
    const track = control.current?.parentElement?.querySelector<HTMLElement>(".dashboard-hero-space-needle-meter__roulette-track");
    track?.style.removeProperty("transform");
    if (!failure) await refresh();
  };
  const days = status?.weekStart ? status.daysTrained : status?.currentDays ?? 0;
  const unlockedTier = REWARD_RARITIES.reduce((highest, tier, i) => days >= tier.unlockDays ? i : highest, -1);
  const result = prize ? WEEKLY_REWARDS.findIndex(reward => reward.id === prize.rewardId) : -1;
  return <aside ref={control} className={styles.spinControl} data-live-prizes="currencies" data-unlocked-tier={unlockedTier} data-rarity={prize ? REWARD_RARITIES[prize.tier].id : undefined} data-spinning={busy} data-spin-result={result >= 0 ? result : undefined} aria-label="Weekly reward spin">
    <button type="button" disabled={busy || !!prize || (!requestWeek && (!status?.weekStart || !status.rewardsReady))} onClick={() => void spin()} aria-label={busy ? "Spinning" : requestWeek ? "Retry saved weekly spin" : status?.weekStart ? `Spin. ${status.availableSpins} saved spins` : "Weekly spin locked"}>
      {!!status?.availableSpins && <span className={styles.spinBadge}>{status.availableSpins}</span>}
      <span aria-hidden="true">▶</span><strong>{busy ? "Spin…" : requestWeek ? "Retry" : status?.weekStart ? "Spin" : status ? "Locked" : "—"}</strong>
    </button>
    <p>{signedOut ? "Sign in to earn weekly spins" : !status ? error ? "Connect to check spins" : "Checking spins…" : status.weekStart ? `${days} workout days · spin ready` : days ? `${days} / 7 days · unlocks Monday` : "Train at least one day per week to earn a spin"}</p>
    {signedOut && <Link className={styles.rarityLink} href="/login">Sign in</Link>}
    <div role="status" aria-live="polite">{error ? <><p>{error}</p><button type="button" onClick={() => void (requestWeek ? spin() : refresh())}>Retry connection</button></> : null}</div>
    <button className={styles.rarityLink} type="button" onClick={() => setRarityOpen(true)}>Rarity & odds</button>
    <button className={styles.rarityLink} type="button" onClick={() => setAmountsOpen(true)}>Prize amounts</button>
    {amountsOpen && <RewardAmounts onClose={() => setAmountsOpen(false)} />}
    {rarityOpen && <RarityGuide days={days} onClose={() => setRarityOpen(false)} />}
    {revealed && prize && <RewardReveal prize={prize} onClose={() => void closeReward()} />}
    <span className={styles.spinRules}>One spin per week. More days improve rarity. Resets Monday, Pacific time.</span>
  </aside>;
}
