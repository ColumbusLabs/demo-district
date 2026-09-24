import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseQuality } from '../../src/world/district/quality.ts';

const renderer = (gpu, touch = false) => ({
  getContext: () => ({
    RENDERER: 1, getParameter: (p) => (p === 99 ? gpu : 'WebKit WebGL'),
    getExtension: (name) => (name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 99 } : null),
  }),
  domElement: { ownerDocument: { defaultView: { matchMedia: () => ({ matches: touch }) } } },
});

test('desktop GPUs get the full tier, touch-primary devices medium, software renderers low', () => {
  assert.equal(chooseQuality(renderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M5)'), '').tier, 'high');
  assert.equal(chooseQuality(renderer('Apple GPU', true), '').tier, 'medium');
  for (const gpu of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver']) {
    assert.equal(chooseQuality(renderer(gpu), '').tier, 'low', gpu);
  }
});

test('lower tiers only ever reduce cost, and ?quality= overrides detection', () => {
  const [high, medium, low] = ['high', 'medium', 'low'].map((q) => chooseQuality(renderer('SwiftShader'), `?quality=${q}`));
  assert.equal(high.tier, 'high'); assert.equal(low.tier, 'low');
  assert.ok(high.pixelBudget >= medium.pixelBudget && medium.pixelBudget >= low.pixelBudget);
  assert.ok(high.shadowMapSize >= medium.shadowMapSize && high.samples >= medium.samples);
  assert.equal(low.shadows, false); assert.equal(low.post, false);
  assert.equal(chooseQuality(renderer('Apple M5'), '?quality=ultra').tier, 'high');
});
