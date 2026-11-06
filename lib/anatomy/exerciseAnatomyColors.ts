// Shared anatomy colors for the exercise library and 3D muscle selections.
export const exerciseAnatomyRegionVisuals: Record<
  string,
  {
    baseFill: string;
    contextFill: string;
    selectedFill: string;
    stroke: string;
    glow: string;
  }
> = {
  "Neck/Traps": {
    baseFill: "rgba(76, 29, 149, 0.40)",
    contextFill: "rgba(139, 92, 246, 0.44)",
    selectedFill: "rgba(196, 181, 253, 0.9)",
    stroke: "rgba(221, 214, 254, 0.76)",
    glow: "rgba(167, 139, 250, 0.30)",
  },
  Chest: {
    baseFill: "rgba(159, 18, 57, 0.36)",
    contextFill: "rgba(244, 63, 94, 0.42)",
    selectedFill: "rgba(251, 113, 133, 0.9)",
    stroke: "rgba(253, 164, 175, 0.76)",
    glow: "rgba(251, 113, 133, 0.30)",
  },
  Shoulders: {
    baseFill: "rgba(120, 53, 15, 0.36)",
    contextFill: "rgba(245, 158, 11, 0.42)",
    selectedFill: "rgba(251, 191, 36, 0.9)",
    stroke: "rgba(253, 224, 71, 0.76)",
    glow: "rgba(251, 191, 36, 0.30)",
  },
  Back: {
    baseFill: "rgba(30, 64, 175, 0.36)",
    contextFill: "rgba(59, 130, 246, 0.42)",
    selectedFill: "rgba(96, 165, 250, 0.9)",
    stroke: "rgba(191, 219, 254, 0.76)",
    glow: "rgba(59, 130, 246, 0.30)",
  },
  Arms: {
    baseFill: "rgba(88, 28, 135, 0.36)",
    contextFill: "rgba(168, 85, 247, 0.42)",
    selectedFill: "rgba(216, 180, 254, 0.9)",
    stroke: "rgba(233, 213, 255, 0.76)",
    glow: "rgba(168, 85, 247, 0.30)",
  },
  "Glutes/Hips": {
    baseFill: "rgba(6, 78, 59, 0.36)",
    contextFill: "rgba(16, 185, 129, 0.44)",
    selectedFill: "rgba(52, 211, 153, 0.9)",
    stroke: "rgba(110, 231, 183, 0.76)",
    glow: "rgba(16, 185, 129, 0.30)",
  },
  Quads: {
    baseFill: "rgba(113, 63, 18, 0.36)",
    contextFill: "rgba(234, 179, 8, 0.44)",
    selectedFill: "rgba(250, 204, 21, 0.9)",
    stroke: "rgba(254, 240, 138, 0.76)",
    glow: "rgba(250, 204, 21, 0.30)",
  },
  Hamstrings: {
    baseFill: "rgba(6, 95, 70, 0.36)",
    contextFill: "rgba(5, 150, 105, 0.44)",
    selectedFill: "rgba(110, 231, 183, 0.9)",
    stroke: "rgba(167, 243, 208, 0.76)",
    glow: "rgba(16, 185, 129, 0.30)",
  },
  "Calves/Tibialis": {
    baseFill: "rgba(8, 47, 73, 0.38)",
    contextFill: "rgba(34, 211, 238, 0.42)",
    selectedFill: "rgba(103, 232, 249, 0.9)",
    stroke: "rgba(165, 243, 252, 0.76)",
    glow: "rgba(34, 211, 238, 0.30)",
  },
  Athletic: {
    baseFill: "rgba(124, 45, 18, 0.36)",
    contextFill: "rgba(249, 115, 22, 0.42)",
    selectedFill: "rgba(251, 146, 60, 0.9)",
    stroke: "rgba(254, 215, 170, 0.76)",
    glow: "rgba(249, 115, 22, 0.30)",
  },
  "Lower Body Compound": {
    baseFill: "rgba(6, 78, 59, 0.36)",
    contextFill: "rgba(16, 185, 129, 0.42)",
    selectedFill: "rgba(52, 211, 153, 0.88)",
    stroke: "rgba(110, 231, 183, 0.72)",
    glow: "rgba(16, 185, 129, 0.28)",
  },
  "Lower Body Isolation": {
    baseFill: "rgba(63, 98, 18, 0.36)",
    contextFill: "rgba(132, 204, 22, 0.40)",
    selectedFill: "rgba(190, 242, 100, 0.86)",
    stroke: "rgba(217, 249, 157, 0.72)",
    glow: "rgba(190, 242, 100, 0.24)",
  },
  "Upper Push": {
    baseFill: "rgba(8, 47, 73, 0.38)",
    contextFill: "rgba(34, 211, 238, 0.40)",
    selectedFill: "rgba(103, 232, 249, 0.88)",
    stroke: "rgba(165, 243, 252, 0.72)",
    glow: "rgba(34, 211, 238, 0.28)",
  },
  "Upper Pull": {
    baseFill: "rgba(76, 29, 149, 0.36)",
    contextFill: "rgba(139, 92, 246, 0.40)",
    selectedFill: "rgba(196, 181, 253, 0.88)",
    stroke: "rgba(221, 214, 254, 0.72)",
    glow: "rgba(167, 139, 250, 0.28)",
  },
  "Arm Isolation": {
    baseFill: "rgba(113, 63, 18, 0.34)",
    contextFill: "rgba(245, 158, 11, 0.40)",
    selectedFill: "rgba(251, 191, 36, 0.88)",
    stroke: "rgba(253, 224, 71, 0.70)",
    glow: "rgba(251, 191, 36, 0.26)",
  },
  Core: {
    baseFill: "rgba(159, 18, 57, 0.32)",
    contextFill: "rgba(244, 63, 94, 0.40)",
    selectedFill: "rgba(251, 113, 133, 0.88)",
    stroke: "rgba(253, 164, 175, 0.72)",
    glow: "rgba(251, 113, 133, 0.28)",
  },
};
