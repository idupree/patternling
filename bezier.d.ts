
// TODO figure out how to distinguish 2d and 3d?
interface BezierPoint {
  x: number,
  y: number,
  z?: number
}
interface BezierBBoxDim {
  min: number,
  mid: number,
  max: number,
  size: number
}
interface BezierBBox {
  x: BezierBBoxDim,
  y: BezierBBoxDim,
  z?: BezierBBoxDim
}

declare class Bezier {
  constructor(coords: BezierPoint[]);
  getLUT(steps: number): BezierPoint[];
  length(): number;
  get(t: number): BezierPoint;
  compute(t: number): BezierPoint;
  derivative(t: number): BezierPoint;
  normal(t: number): BezierPoint;
  split(t: number): {left: Bezier, right: Bezier};
  split(t1: number, t2: number): Bezier;
  inflections(): { x: number[], y: number[], z: number[], values: number[] };
  bbox(): BezierBBox;
  offset(d: number): Bezier;
  offset(t: number, d: number): BezierPoint;
  reduce(): Bezier[];
  arcs(threshold?: number): {x: number, y: number, s: number, e: number, r: number}[]; // what do those mean?
  scale(d: number): Bezier; // docs are wrong, it does take an argument
  outline(d: number): PolyBezier;
  outline(d1: number, d2: number): PolyBezier;
  outline(d1: number, d2: number, d3: number, d4: number): PolyBezier;
  intersects(): string[]; // "x/y" strings
  intersects(line: {p1: BezierPoint; p2: BezierPoint}): number[];
  intersects(curve: Bezier): string[]; // "t1/t2" strings
}
declare class PolyBezier {
  constructor(curves: Bezier[]);
  curves: Bezier[];
  length(): number;
  bbox(): BezierBBox;
  offset(d: number): PolyBezier;
}

