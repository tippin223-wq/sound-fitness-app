export function dialAngle(x: number, y: number) {
  return (Math.atan2(y, x) * 180 / Math.PI + 450) % 360;
}

export function dialAngleDelta(previous: number, current: number) {
  return ((current - previous + 540) % 360) - 180;
}

export function dialDragValue(start: number, delta: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(start + delta / (360 / (max - min + 1)))));
}

export function dialPointValue(angle: number, min: number, max: number) {
  return Math.max(min, Math.min(max, min + Math.floor(angle / (360 / (max - min + 1)))));
}
