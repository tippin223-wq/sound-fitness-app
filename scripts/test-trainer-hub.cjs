const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const filename = require('node:path').resolve(__dirname, '../lib/trainer-hub/model.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const { emptyHub, previewHub, hubDocumentIssue, hubStats } = loaded.exports;

test('empty and preview workspaces validate; metrics use saved active records', () => {
  assert.equal(hubDocumentIssue(emptyHub()), null);
  const doc = previewHub();
  assert.equal(hubDocumentIssue(doc), null);
  assert.equal(hubStats(doc).monthlyServiceValue, 550);
  doc.clients[0].status = 'archived';
  assert.equal(hubStats(doc).activeClients, 2);
  assert.equal(hubStats(doc).monthlyServiceValue, 350);
  assert.equal(hubStats(doc).clientsWithoutProgram.length, 2);
});

test('invalid originals and unsupported progress are rejected without mutation', () => {
  for (const change of [
    d => { d.clients[0].monthlyRate = NaN; },
    d => { d.clients[0].monthlyRate = -20; },
    d => { d.clients[0].monthlyRate = 10.123; },
    d => { d.clients[0].email = 'not-an-email'; },
    d => { d.clients.push({ ...d.clients[0] }); },
    d => { d.programs[0].movements[0].sets = 0; },
    d => { d.programs[0].movements[0].reps = ''; },
    d => { d.assignments[0].clientId = 'missing-client'; },
    d => { d.assignments.push({ ...d.assignments[0], id: 'duplicate-pair' }); },
    d => { d.completedLessons.push('unrecognized-lesson'); },
    d => { d.checkIns.push({ id: 'bad-date', clientId: d.clients[0].id, date: '2026-02-30', summary: 'A report', nextAction: '' }); },
  ]) {
    const doc = previewHub(); change(doc);
    const original = structuredClone(doc);
    assert.ok(hubDocumentIssue(doc));
    assert.deepEqual(doc, original);
  }
});

test('program assignments remain valid after client archival and program edits', () => {
  const doc = previewHub();
  doc.clients[0].status = 'archived';
  doc.programs[0].title = 'Updated template';
  doc.checkIns.push({ id: 'feedback', clientId: doc.clients[0].id, date: '2026-10-12', summary: 'Client reported a scheduling conflict.', nextAction: 'Review available days together.' });
  assert.equal(hubDocumentIssue(doc), null);
  assert.equal(doc.assignments.length, 1);
});

test('only coach/admin login destinations allow the Trainer Hub workspace', () => {
  const routesFile = require('node:path').resolve(__dirname, '../lib/routes.ts');
  const routesModule = new Module(routesFile, module);
  routesModule._compile(ts.transpileModule(fs.readFileSync(routesFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, routesFile);
  const authFile = require('node:path').resolve(__dirname, '../lib/authRedirects.ts');
  const authModule = new Module(authFile, module);
  authModule.require = name => name === '@/lib/routes' ? routesModule.exports : require(name);
  authModule._compile(ts.transpileModule(fs.readFileSync(authFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, authFile);
  const { getPostLoginRedirectPath, getDefaultPostLoginPath } = authModule.exports;
  for (const role of ['coach', 'admin']) {
    assert.equal(getPostLoginRedirectPath(role, '/trainer-hub/workspace?from=login'), '/trainer-hub/workspace?from=login');
    for (const path of ['//evil.example/trainer-hub/workspace', 'https://evil.example', '/trainer-hub/workspace-other']) assert.equal(getPostLoginRedirectPath(role, path), getDefaultPostLoginPath(role));
  }
  assert.equal(getPostLoginRedirectPath('member', '/trainer-hub/workspace'), getDefaultPostLoginPath('member'));
});
