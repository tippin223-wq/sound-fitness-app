const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { test } = require('node:test');

// Execute the actual effect with controlled graphics readiness and time.
function mount() {
  let effect, mutation, clock = 0, ready = false, id = 0, scans = 0, disconnected = false;
  let avatarExpected = false, avatarReady = false, coverVisible = true;
  const frames = new Map(), timers = new Map();
  const document = {
    documentElement: { dataset: {} },
    querySelectorAll() { scans++; return ready ? [{ dataset: { webglReady: 'true' } }] : []; },
    querySelector(selector) {
      if (selector === '[data-dashboard-avatar-host]') return avatarExpected ? { querySelector: () => ({ dataset: { soundAvatarReady: String(avatarReady) } }) } : null;
      return ready ? {} : null;
    },
  };
  const window = {
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(key) { frames.delete(key); },
    requestIdleCallback() { return ++id; }, cancelIdleCallback() {},
  };
  const api = {};
  const compiled = ts.transpileModule(fs.readFileSync('components/dashboard/DashboardWebGlPreloader.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function('require', 'exports', 'document', 'window', 'performance', 'MutationObserver', 'setTimeout', 'clearTimeout', compiled)(
    name => name === 'react' ? { useEffect(fn) { effect = fn; }, useState: () => [true, value => { coverVisible = value; }] }
      : name === 'react/jsx-runtime' ? { jsx: () => null, jsxs: () => null }
      : name.endsWith('.module.css') ? { default: {} }
      : { preloadDashboardWebGlRuntime() {} },
    api, document, window, { now: () => clock },
    class { constructor(fn) { mutation = fn; } observe() {} disconnect() { disconnected = true; } },
    fn => { timers.set(++id, fn); return id; }, key => timers.delete(key),
  );
  api.default();
  const cleanup = effect();
  return {
    document, frames, timers, cleanup,
    drain() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
    deadline() { clock = 7001; const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); },
    mutate() { mutation([]); }, ready() { ready = true; },
    expectAvatar() { avatarExpected = true; }, avatarReady() { avatarReady = true; }, coverVisible: () => coverVisible,
    scans: () => scans, disconnected: () => disconnected,
  };
}

test('readiness waits without perpetual frame polling and accepts late widgets after fallback', () => {
  const app = mount();
  app.drain();
  assert.equal(app.document.documentElement.dataset.dashboardWebgl, 'warming');
  assert.equal(app.frames.size, 0);
  app.deadline();
  assert.equal(app.document.documentElement.dataset.dashboardWebgl, 'fallback');
  assert.equal(app.coverVisible(), false, 'timeout releases the page cover');
  assert.equal(app.frames.size, 0);
  app.ready(); app.mutate(); app.mutate();
  assert.equal(app.frames.size, 1, 'readiness changes coalesce into one scan');
  app.drain();
  assert.equal(app.document.documentElement.dataset.dashboardWebgl, 'ready');
  assert.equal(app.scans(), 3);
  assert.equal(app.disconnected(), true);
  app.cleanup();
});

test('the page cover waits for the avatar first frame even after header widgets are ready', () => {
  const app = mount();
  app.expectAvatar(); app.ready(); app.drain();
  assert.equal(app.document.documentElement.dataset.dashboardWebgl, 'ready');
  assert.equal(app.coverVisible(), true);
  assert.equal(app.disconnected(), false);
  app.avatarReady(); app.mutate(); app.drain();
  assert.equal(app.coverVisible(), false);
  assert.equal(app.disconnected(), true);
  app.cleanup();
});

test('unmount cancels pending readiness work and ignores later mutations', () => {
  const app = mount();
  app.cleanup(); app.mutate();
  assert.equal(app.frames.size, 0);
  assert.equal(app.timers.size, 0);
  assert.equal(app.disconnected(), true);
});
