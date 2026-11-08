const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const testing = require('next/experimental/testing/server');
const doesProxyMatch = testing.unstable_doesProxyMatch ?? testing.unstable_doesMiddlewareMatch;

function load(file, overrides = {}) {
  const source = readFileSync(join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText;
  const result = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    name => overrides[name] ?? require(name), result, result.exports);
  return result.exports;
}

test('public media bypasses proxy; all private page trees still require it', () => {
  const { config } = load('proxy.ts');
  for (const url of ['/', '/login', '/models/avatar.glb', '/clip.mp4', '/runtime.wasm', '/model.task', '/api/content?bank=news', '/_next/static/a.js']) {
    assert.equal(doesProxyMatch({ config, url }), false, url);
  }
  for (const root of ['/admin', '/coach', '/dashboard', '/member', '/performance', '/recovery']) {
    for (const url of [root, root + '/private', root + '/private.json']) {
      assert.equal(doesProxyMatch({ config, url }), true, url);
    }
  }
});

test('anonymous private navigation and prefetch both redirect without exposing a page', async () => {
  const { proxy } = load('proxy.ts', { '@supabase/ssr': { createServerClient: () => ({ auth: {
    getUser: async () => ({ data: { user: null } }),
  }}) }});
  for (const headers of [{}, { 'next-router-prefetch': '1', RSC: '1' }]) {
    const response = await proxy(new NextRequest('https://thesoundfitness.app/dashboard/profile', { headers }));
    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location')).pathname, '/');
  }
});

test('dense menu links prefetch on intent only and preserve caller behavior', () => {
  let intent = false;
  const { default: Link } = load('components/IntentLink.tsx', {
    react: { useState: () => [intent, value => { intent = value; }] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/link': { __esModule: true, default: 'NextLink' },
  });
  let calls = 0;
  let link = Link({ href: '/dashboard/profile', onMouseEnter: () => { calls++; } });
  assert.equal(link.props.prefetch, false);
  link.props.onMouseEnter({ defaultPrevented: false });
  assert.equal(calls, 1);
  assert.equal(Link({ href: '/dashboard/profile' }).props.prefetch, null);
  assert.equal(Link({ href: '/dashboard/profile', prefetch: false }).props.prefetch, false);
  intent = false;
  Link({ href: '/dashboard/profile' }).props.onFocus({ defaultPrevented: false });
  assert.equal(intent, true);
  intent = false;
  Link({ href: '/dashboard/profile' }).props.onFocus({ defaultPrevented: true });
  assert.equal(intent, false);
});
