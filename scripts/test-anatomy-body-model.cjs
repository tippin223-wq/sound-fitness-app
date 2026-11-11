const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const output = ts.transpileModule(fs.readFileSync('lib/anatomy/bodyModel.ts', 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS},
}).outputText;
vm.runInNewContext(output, {exports: exportsObject, require: () => ({asRecord: value => value && typeof value === 'object' ? value : {}})});
const {getBodyModelFromProfile} = exportsObject;

test('profile gender wins over conflicting cosmetic avatar and legacy anatomy values', () => {
  for (const [gender, other] of [['male', 'female'], ['female', 'male']]) {
    const profile = {gender, bodyModel: other, avatar: {gender: other}, avatarAppearance: {gender: other}};
    const before = JSON.stringify(profile);
    assert.equal(getBodyModelFromProfile(profile), gender);
    assert.equal(JSON.stringify(profile), before);
  }
});

test('legacy anatomy remains supported without deriving anatomy from an avatar', () => {
  assert.equal(getBodyModelFromProfile({bodyModel: 'female'}), 'female');
  assert.equal(getBodyModelFromProfile({anatomyBodyModel: 'female'}), 'female');
  assert.equal(getBodyModelFromProfile({avatar: {gender: 'female'}}), 'male');
  assert.equal(getBodyModelFromProfile(null), 'male');
});
