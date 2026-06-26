/**
 * Room (polygon) detection from a set of straight wall segments.
 *
 * Algorithm: planar graph half-edge face tracing.
 *   1. Snap endpoints that are within SNAP_EPS pixels of each other → graph nodes.
 *   2. Build directed half-edges: every wall contributes two directed edges (u→v) and (v→u).
 *   3. For each directed edge u→v, the "twin" is v→u and the "next" is the half-edge that
 *      leaves v making the smallest left-turn from the direction (u→v).
 *   4. Tracing each half-edge cycle gives one face of the planar graph.
 *   5. Discard the outer (infinite) face — it has negative signed area (CW winding).
 *   6. Each remaining face is a detected room polygon.
 */

export interface Pt { x: number; y: number }

export interface DetectedRoom {
  id: string;
  polygon: Pt[];   // ordered vertices (CCW)
  area: number;    // m²
  centroid: Pt;    // for label placement (in 2D pixel space)
}

const SNAP_EPS   = 14;            // px — two endpoints this close are merged
const PPM        = 100;           // pixels per metre

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function dist2(a: Pt, b: Pt) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }

/** Signed area via shoelace (positive = CCW, negative = CW) */
function signedArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const j = (i + 1) % n;
    s += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return s / 2;
}

/** Polygon centroid */
function centroid(poly: Pt[]): Pt {
  let cx = 0, cy = 0, area = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const j = (i + 1) % n;
    const cross = poly[i].x * poly[j].y - poly[j].x * poly[i].y;
    cx += (poly[i].x + poly[j].x) * cross;
    cy += (poly[i].y + poly[j].y) * cross;
    area += cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-6) {
    const mx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const my = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    return { x: mx, y: my };
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

// ─── Node snapping ───────────────────────────────────────────────────────────

function snapNodes(rawPoints: Pt[]): { nodes: Pt[]; nodeIndex: (p: Pt) => number } {
  const nodes: Pt[] = [];
  const indices: number[] = [];

  for (const p of rawPoints) {
    let found = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (dist2(p, nodes[i]) <= SNAP_EPS * SNAP_EPS) { found = i; break; }
    }
    if (found === -1) { found = nodes.length; nodes.push({ ...p }); }
    indices.push(found);
  }

  let idx = 0;
  const nodeIndex = (_p: Pt) => indices[idx++];
  return { nodes, nodeIndex };
}

// ─── Half-edge face tracing ──────────────────────────────────────────────────

interface HalfEdge {
  from: number;
  to: number;
  angle: number;  // direction from→to in radians
  used: boolean;
}

function detectRoomsFromGraph(nodes: Pt[], edges: [number, number][]): Pt[][] {
  // Build half-edges
  const halfEdges: HalfEdge[] = [];
  for (const [u, v] of edges) {
    const dx = nodes[v].x - nodes[u].x;
    const dy = nodes[v].y - nodes[u].y;
    const angle = Math.atan2(dy, dx);
    halfEdges.push({ from: u, to: v, angle,     used: false });
    halfEdges.push({ from: v, to: u, angle: angle + Math.PI, used: false });
  }

  // For each node, sort outgoing half-edges by angle
  const outgoing = new Map<number, HalfEdge[]>();
  for (const he of halfEdges) {
    if (!outgoing.has(he.from)) outgoing.set(he.from, []);
    outgoing.get(he.from)!.push(he);
  }
  for (const arr of outgoing.values()) {
    arr.sort((a, b) => a.angle - b.angle);
  }

  // For a half-edge u→v, the next half-edge is the one leaving v that turns
  // most clockwise relative to (v→u) direction.
  function nextHalfEdge(he: HalfEdge): HalfEdge | null {
    const reverseAngle = he.angle + Math.PI;
    const leaving = outgoing.get(he.to);
    if (!leaving || leaving.length === 0) return null;
    // Find leaving edge with smallest positive clockwise turn from reverseAngle
    let best: HalfEdge | null = null;
    let bestDelta = Infinity;
    for (const candidate of leaving) {
      if (candidate.to === he.from && leaving.length > 1) continue; // avoid u-turn if alternatives exist
      let delta = candidate.angle - reverseAngle;
      // Normalise to [0, 2π) — clockwise turn
      while (delta <= 0) delta += 2 * Math.PI;
      while (delta > 2 * Math.PI) delta -= 2 * Math.PI;
      if (delta < bestDelta) { bestDelta = delta; best = candidate; }
    }
    return best;
  }

  const faces: Pt[][] = [];

  for (const startHe of halfEdges) {
    if (startHe.used) continue;
    const face: Pt[] = [];
    let he: HalfEdge | null = startHe;
    let guard = 0;
    while (he && !he.used && guard++ < 200) {
      he.used = true;
      face.push(nodes[he.from]);
      he = nextHalfEdge(he);
      if (he === startHe) break;
    }
    if (face.length >= 3) faces.push(face);
  }

  return faces;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface WallSeg { start: Pt; end: Pt }

let _uid = 0;

export function detectRooms(walls: WallSeg[]): DetectedRoom[] {
  if (walls.length < 3) return [];

  // Collect all endpoints
  const rawPoints = walls.flatMap(w => [w.start, w.end]);
  const { nodes, nodeIndex } = snapNodes(rawPoints);

  // Build edge list using snapped node indices
  const edges: [number, number][] = [];
  let idx = 0;
  for (const _w of walls) {
    const u = nodeIndex(rawPoints[idx++]);
    const v = nodeIndex(rawPoints[idx++]);
    if (u !== v) edges.push([u, v]);
  }

  // Detect faces
  const faces = detectRoomsFromGraph(nodes, edges);

  // Keep only CCW (positive area) faces — these are interior rooms
  const rooms: DetectedRoom[] = [];
  for (const poly of faces) {
    const area = signedArea(poly);
    if (area <= 0) continue;      // CW = outer face
    const areaM2 = area / (PPM * PPM);
    if (areaM2 < 0.5) continue;  // ignore tiny slivers < 0.5 m²
    rooms.push({
      id: `room_${++_uid}`,
      polygon: poly,
      area: +areaM2.toFixed(2),
      centroid: centroid(poly),
    });
  }

  return rooms;
}
