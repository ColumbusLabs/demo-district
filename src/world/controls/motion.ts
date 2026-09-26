/** Pure, meter/second-based navigation math. No renderer, DOM, or scene imports. */
/** Solid footprint on the ground plane: an oriented box (half extents, yaw in radians) or a circle. */
export type Blocker =
  | { x: number; z: number; halfWidth: number; halfDepth: number; angle?: number }
  | { x: number; z: number; radius: number };
export interface MovementConfig {
  speed: number;
  acceleration: number;
  deceleration: number;
  eyeHeight: number;
  radius: number;
  sensitivity: number;
  touchSensitivity: number;
  keyboardLookSpeed: number;
  maxPitch: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number; pitch: number };
  blockers: readonly Blocker[];
}
export interface MotionState { x: number; z: number; vx: number; vz: number; yaw: number; pitch: number }
export interface MovementInput { forward: number; right: number; yaw: number; pitch: number }
/** Knob offset (x/y, unit disc, screen axes) and dead-zone-rescaled walking input. */
export interface StickInput { x: number; y: number; right: number; forward: number }

export function movementConfig(overrides: Partial<MovementConfig> = {}): MovementConfig {
  const config: MovementConfig = {
    speed: 6.4, acceleration: 12, deceleration: 18, eyeHeight: 1.7, radius: 0.3,
    sensitivity: 0.0025, touchSensitivity: 0.006, keyboardLookSpeed: 1.5, maxPitch: Math.PI * 0.47,
    ...overrides,
    bounds: { minX: -35, maxX: 35, minZ: -35, maxZ: 35, ...overrides.bounds },
    spawn: { x: 0, z: 6, yaw: 0, pitch: -0.08, ...overrides.spawn },
    blockers: (overrides.blockers ?? []).map((blocker) => ({ ...blocker })),
  };
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
      throw new RangeError(`Invalid movement setting: ${key}`);
    }
  }
  if (config.speed < 0.5 || config.speed > 10 || config.maxPitch >= Math.PI / 2) {
    throw new RangeError('Speed must be 0.5–10 m/s and pitch must remain below vertical.');
  }
  if (!Object.values(config.bounds).every(Number.isFinite) ||
      !Object.values(config.spawn).every(Number.isFinite) ||
      config.bounds.maxX - config.bounds.minX <= 2 * config.radius ||
      config.bounds.maxZ - config.bounds.minZ <= 2 * config.radius) {
    throw new RangeError('Navigation bounds and spawn must be finite and usable.');
  }
  for (const blocker of config.blockers) {
    const sizes = 'radius' in blocker ? [blocker.radius] : [blocker.halfWidth, blocker.halfDepth];
    if (![blocker.x, blocker.z, ...sizes, 'angle' in blocker ? blocker.angle ?? 0 : 0].every(Number.isFinite) || sizes.some((size) => size <= 0)) {
      throw new RangeError('Navigation blockers must be finite with positive size.');
    }
  }
  return config;
}
const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));
const axis = (value: number): number => Number.isFinite(value) ? clamp(value, -1, 1) : 0;

export function rotateView(state: MotionState, yawDelta: number, pitchDelta: number, config: MovementConfig): void {
  if (Number.isFinite(yawDelta)) {
    const angle = state.yaw + yawDelta;
    state.yaw = Math.atan2(Math.sin(angle), Math.cos(angle));
  }
  if (Number.isFinite(pitchDelta)) state.pitch = clamp(state.pitch + pitchDelta, -config.maxPitch, config.maxPitch);
}
export function resetMotion(state: MotionState): void { state.vx = 0; state.vz = 0; }
/** Push the footprint circle out of one blocker and cancel velocity into it. Returns whether it moved. */
function resolveBlocker(state: MotionState, blocker: Blocker, radius: number): boolean {
  let nx: number; let nz: number; let depth: number;
  if ('radius' in blocker) {
    const dx = state.x - blocker.x; const dz = state.z - blocker.z;
    const distance = Math.hypot(dx, dz); const reach = radius + blocker.radius;
    if (distance >= reach) return false;
    [nx, nz] = distance > 1e-9 ? [dx / distance, dz / distance] : [0, 1];
    depth = reach - distance;
  } else {
    const angle = blocker.angle ?? 0; const cos = Math.cos(angle); const sin = Math.sin(angle);
    // Into box space: rotate the offset by -angle about Y (Three.js yaw convention).
    const ox = state.x - blocker.x; const oz = state.z - blocker.z;
    const lx = ox * cos - oz * sin; const lz = ox * sin + oz * cos;
    const cx = clamp(lx, -blocker.halfWidth, blocker.halfWidth); const cz = clamp(lz, -blocker.halfDepth, blocker.halfDepth);
    let px = lx - cx; let pz = lz - cz; const distance = Math.hypot(px, pz);
    if (distance >= radius) return false;
    if (distance > 1e-9) { px /= distance; pz /= distance; depth = radius - distance; }
    else {
      // Center inside the box: leave through the nearest face.
      const outX = blocker.halfWidth - Math.abs(lx); const outZ = blocker.halfDepth - Math.abs(lz);
      if (outX < outZ) { px = Math.sign(lx) || 1; pz = 0; depth = outX + radius; }
      else { px = 0; pz = Math.sign(lz) || 1; depth = outZ + radius; }
    }
    nx = px * cos + pz * sin; nz = -px * sin + pz * cos;
  }
  state.x += nx * depth; state.z += nz * depth;
  const into = state.vx * nx + state.vz * nz;
  if (into < 0) { state.vx -= into * nx; state.vz -= into * nz; }
  return true;
}
export function constrainMotion(state: MotionState, config: MovementConfig): void {
  // A few passes settle corners where two blockers meet; each pass only removes penetration.
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const blocker of config.blockers) moved = resolveBlocker(state, blocker, config.radius) || moved;
    if (!moved) break;
  }
  const { bounds, radius } = config;
  const x = clamp(state.x, bounds.minX + radius, bounds.maxX - radius);
  const z = clamp(state.z, bounds.minZ + radius, bounds.maxZ - radius);
  if (x !== state.x) state.vx = 0;
  if (z !== state.z) state.vz = 0;
  state.x = x;
  state.z = z;
}
export function initialMotion(config: MovementConfig): MotionState {
  const state = { ...config.spawn, vx: 0, vz: 0 };
  rotateView(state, 0, 0, config);
  constrainMotion(state, config);
  return state;
}
export function hasMomentum(state: MotionState): boolean { return state.vx !== 0 || state.vz !== 0; }

/** Exact exponential integration for constant input; no frame-rate-dependent lerp. */
export function advanceMotion(state: MotionState, input: MovementInput, seconds: number, config: MovementConfig): void {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const dt = Math.min(seconds, 0.05);
  rotateView(state, axis(input.yaw) * config.keyboardLookSpeed * dt, axis(input.pitch) * config.keyboardLookSpeed * dt, config);
  let forward = axis(input.forward);
  let right = axis(input.right);
  const length = Math.hypot(forward, right);
  if (length > 1) { forward /= length; right /= length; }
  const sin = Math.sin(state.yaw);
  const cos = Math.cos(state.yaw);
  // Pitch never affects walking height or horizontal speed.
  const targetX = (right * cos - forward * sin) * config.speed;
  const targetZ = (-right * sin - forward * cos) * config.speed;
  const rate = length > 0 ? config.acceleration : config.deceleration;
  const decay = Math.exp(-rate * dt);
  const integral = (1 - decay) / rate;
  state.x += targetX * dt + (state.vx - targetX) * integral;
  state.z += targetZ * dt + (state.vz - targetZ) * integral;
  state.vx = targetX + (state.vx - targetX) * decay;
  state.vz = targetZ + (state.vz - targetZ) * decay;
  if (length === 0 && Math.hypot(state.vx, state.vz) < 0.001) resetMotion(state);
  constrainMotion(state, config);
}

/** Map a thumb offset from the stick center to a unit-disc knob position and analog walking input. */
export function stickInput(dx: number, dy: number, travel: number, deadZone = 0.15): StickInput {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !(travel > 0)) return { x: 0, y: 0, right: 0, forward: 0 };
  const length = Math.hypot(dx, dy) / travel;
  const scale = length > 1 ? 1 / length : 1;
  const x = (dx / travel) * scale;
  const y = (dy / travel) * scale;
  const magnitude = Math.min(length, 1);
  if (magnitude <= deadZone) return { x, y, right: 0, forward: 0 };
  // Rescale so walking starts from zero at the dead-zone edge instead of jumping to 15% speed.
  const gain = (magnitude - deadZone) / (1 - deadZone) / magnitude;
  return { x, y, right: x * gain, forward: 0 - y * gain };
}
