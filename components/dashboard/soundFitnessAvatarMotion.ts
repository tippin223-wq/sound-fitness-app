/** Small, deterministic idle movements, in radians/model units. No React updates. */
export function soundFitnessAvatarIdleMotion(seconds: number, enabled: boolean) {
  const t = enabled ? Math.max(0, seconds) : 0;
  // A quick close and slower opening, followed occasionally by a second blink.
  const blinkAt = (start: number) => {
    const phase = t % 11.7 - start;
    if (!enabled || phase < 0 || phase > 0.24) return 0;
    return phase < 0.075 ? phase / 0.075 : 1 - (phase - 0.075) / 0.165;
  };
  const motion = enabled ? 1 : 0;
  return {
    breath: Math.sin(t * 1.32) * motion,
    weightShift: Math.sin(t * 0.47) * 0.012 * motion,
    headPitch: Math.sin(t * 0.83) * 0.014 * motion,
    headYaw: (Math.sin(t * 0.41) * 0.025 + Math.sin(t * 0.91) * 0.008) * motion,
    headRoll: Math.sin(t * 0.53) * 0.012 * motion,
    armSwing: Math.sin(t * 0.77) * 0.018 * motion,
    gaze: Math.sin(t * 0.41 + 0.4) * 0.002 * motion,
    brow: Math.sin(t * 0.63) * 0.001 * motion,
    blink: Math.max(blinkAt(3.1), blinkAt(7.4), blinkAt(7.76)),
  };
}
