//region 🌈 SOUND FITNESS HEAT COLOR SYSTEM

export type HeatStatus = "low" | "moderate" | "high" | "overloaded";

export function getHeatStatus(value: number): HeatStatus {
  if (value >= 85) return "overloaded";
  if (value >= 65) return "high";
  if (value >= 40) return "moderate";
  return "low";
}

export function getHeatColor(value: number) {
  const status = getHeatStatus(value);

  if (status === "overloaded") return "#ff3b5c";
  if (status === "high") return "#f97316";
  if (status === "moderate") return "#facc15";
  return "#22c55e";
}

export function getHeatGlow(value: number) {
  const status = getHeatStatus(value);

  if (status === "overloaded")
    return "drop-shadow(0 0 16px rgba(255,59,92,0.72))";
  if (status === "high") return "drop-shadow(0 0 14px rgba(249,115,22,0.62))";
  if (status === "moderate")
    return "drop-shadow(0 0 12px rgba(250,204,21,0.52))";
  return "drop-shadow(0 0 12px rgba(34,197,94,0.48))";
}

export function getHeatText(value: number) {
  const status = getHeatStatus(value);

  if (status === "overloaded") return "Overloaded";
  if (status === "high") return "High";
  if (status === "moderate") return "Moderate";
  return "Low";
}

//endregion
