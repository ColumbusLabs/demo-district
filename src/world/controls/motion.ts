/** Pure, meter/second-based navigation math. No renderer, DOM, or scene imports. */
export interface MovementConfig {
  speed: number;
  acceleration: number;
  deceleration: number;
  eyeHeight: number;
  radius: number;
  sensitivity: number;
  keyboardLookSpeed: number;
  maxPitch: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  spawn: { x: number; z: number; yaw: number; pitch: number };
}
export interface MotionState { x: number; z: number; vx: number; vz: number; yaw: number; pitch: number }
export interface MovementInput { forward: number; right: number; yaw: number; pitch: number }

export function movementConfig(overrides: Partial<MovementConfig> = {}): MovementConfig {
  const config: MovementConfig = {
    speed: 3.2, acceleration: 12, deceleration: 18, eyeHeight: 1.7, radius: 0.3,
    sensitivity: 0.0025, keyboardLookSpeed: 1.5, maxPitch: Math.PI * 0.47,
    ...overrides,
    bounds: { minX: -35, maxX: 35, minZ: -35, maxZ: 35, ...overrides.bounds },
    spawn: { x: 0, z: 6, yaw: 0, pitch: -0.08, ...overrides.spawn },
  };
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) {
      throw new RangeError(`Invalid movement setting: ${key}`);
    }
  }
  if (config.speed < 0.5 || config.speed > 8 || config.maxPitch >= Math.PI / 2) {
    throw new RangeError('Speed must be 0.5–8 m/s and pitch must remain below vertical.');
  }
  if (!Object.values(config.bounds).every(Number.isFinite) ||
      !Object.values(config.spawn).every(Number.isFinite) ||
      config.bounds.maxX - config.bounds.minX <= 2 * config.radius ||
      config.bounds.maxZ - config.bounds.minZ <= 2 * config.radius) {
    throw new RangeError('Navigation bounds and spawn must be finite and usable.');
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
export function constrainMotion(state: MotionState, config: MovementConfig): void {
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
