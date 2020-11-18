import { MathUtils } from "three";


export function smoothstep(edge0: number, edge1: number, x: number) {
  // Scale, bias and saturate x to 0..1 range
  x = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  // Evaluate polynomial
  return x * x * (3 - 2 * x);
}
