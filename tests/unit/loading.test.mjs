import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLoading } from '../../src/ui/loading.ts';

function fixture(reduced = false) {
  class Element {
    attrs = new Map(); hidden = false; inert = false; textContent = ''; innerHTML = '';
    style = { setProperty: (name, value) => this.attrs.set(name, value) };
    setAttribute(name, value) { this.attrs.set(name, value); }
    removeAttribute(name) { this.attrs.delete(name); }
    hasAttribute(name) { return this.attrs.has(name); }
    toggleAttribute(name, value) { if (value) this.attrs.set(name, ''); else this.attrs.delete(name); }
    querySelectorAll() { return []; }
  }
  const selectors = ['#loading', '#loading-bar', '#loading-text', '#loading-percent', '#loading-tip', '.hud', '#world-canvas'];
  const elements = new Map(selectors.map((selector) => [selector, new Element()]));
  const events = new Map();
  const doc = {
    querySelector: (selector) => elements.get(selector),
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: (name) => events.delete(name),
    documentElement: { dataset: { input: 'touch' } },
    defaultView: { matchMedia: () => ({ matches: reduced }) },
    hidden: false,
  };
  return { doc, elements, events, get: (selector) => elements.get(selector) };
}

test('arrival reports monotonic asset progress and waits for actual readiness before 100%', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const f = fixture(); const arrival = createLoading(f.doc);
  try {
    assert.equal(f.get('.hud').inert, true);
    arrival.setProgress(.5, 'Lighting up the storefronts…');
    assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '48');
    arrival.setProgress(.2); arrival.setProgress(NaN);
    assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '48');
    arrival.setProgress(1);
    assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '96');
    assert.equal(arrival.isActive(), true);
    arrival.finish();
    assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '100');
    assert.equal(f.get('#loading').attrs.get('aria-busy'), 'false');
    assert.equal(f.get('.hud').inert, true);
    assert.equal(f.get('#world-canvas').inert, true);
    t.mock.timers.tick(3999);
    assert.equal(f.get('#loading').hasAttribute('data-done'), false);
    t.mock.timers.tick(1);
    assert.equal(f.get('.hud').inert, false);
    assert.equal(f.get('#world-canvas').inert, false);
    assert.ok(f.get('#loading').hasAttribute('data-done'));
    assert.equal(f.get('#loading-text').textContent, 'Welcome to Demo District.');
    assert.match(f.get('#loading-tip').textContent, /thumbstick/);
    arrival.setProgress(.1, 'Stale callback'); arrival.finish();
    assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '100');
  } finally { arrival.destroy(); }
});

test('arrival suspends decoration in hidden tabs and supports a clean remount', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const f = fixture(); const arrival = createLoading(f.doc);
  f.doc.hidden = true; f.events.get('visibilitychange')();
  assert.ok(f.get('#loading').hasAttribute('data-paused'));
  const oldTip = f.get('#loading-tip').textContent;
  t.mock.timers.tick(6000);
  assert.equal(f.get('#loading-tip').textContent, oldTip);
  arrival.finish(); arrival.destroy();
  const next = createLoading(f.doc);
  t.mock.timers.tick(700);
  assert.equal(f.get('#loading').hidden, false, 'old dismissal must not hide the new load');
  assert.equal(f.get('#loading-bar').attrs.get('aria-valuenow'), '0');
  next.destroy();
  assert.equal(f.events.size, 0);
});

test('reduced-motion entrance keeps the four-second hold but uses a short fade', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const f = fixture(true); const arrival = createLoading(f.doc);
  arrival.finish();
  assert.equal(arrival.isActive(), true);
  t.mock.timers.tick(4000);
  assert.equal(arrival.isActive(), false);
  t.mock.timers.tick(150);
  assert.equal(f.get('#loading').hidden, true);
  const text = f.get('#loading-tip').textContent;
  t.mock.timers.tick(20000);
  assert.equal(f.get('#loading-tip').textContent, text);
  arrival.destroy();
});

test('an engine failure stops the loading presentation without hiding the recovery status', () => {
  const f = fixture(); const arrival = createLoading(f.doc);
  try {
    arrival.error(true);
    assert.ok(f.get('#loading').hasAttribute('data-error'));
    assert.equal(f.get('#loading').hidden, false);
    arrival.error(false);
    assert.equal(f.get('#loading').hasAttribute('data-error'), false);
  } finally { arrival.destroy(); }
});

test('a slow world stays covered after four seconds and reveals as soon as it is ready', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const f = fixture(); const arrival = createLoading(f.doc);
  t.mock.timers.tick(6500);
  assert.equal(arrival.isActive(), true);
  assert.equal(f.get('#loading').hasAttribute('data-done'), false);
  arrival.finish();
  assert.equal(arrival.isActive(), false);
  assert.ok(f.get('#loading').hasAttribute('data-done'));
  arrival.destroy();
});
