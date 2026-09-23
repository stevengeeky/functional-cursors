const test = require('node:test');
const assert = require('node:assert/strict');
const { compile, applyToSelections } = require('../lib/apply');

test('(e, i) => i numbers each cursor (numbers coerced to strings)', () => {
    const fn = compile('(e, i) => i');
    assert.deepEqual(applyToSelections(fn, ['a', 'b', 'c']), ['0', '1', '2']);
});

test('a trailing semicolon and whitespace are tolerated', () => {
    const fn = compile('  (e, i) => e.toUpperCase(); ');
    assert.deepEqual(applyToSelections(fn, ['x', 'y']), ['X', 'Y']);
});

test('third argument is the list of all values, in order', () => {
    const fn = compile('(e, i, v) => v[v.length - 1 - i]');
    assert.deepEqual(applyToSelections(fn, ['1', '2', '3']), ['3', '2', '1']);
});

test('returning an array sets every cursor from it', () => {
    const fn = compile('(e, i, v) => v.slice().sort((a, b) => a - b)');
    assert.deepEqual(applyToSelections(fn, ['3', '1', '2']), ['1', '2', '3']);
    const cycle = compile('() => ["a", "b"]');
    assert.deepEqual(applyToSelections(cycle, ['', '', '']), ['a', 'b', 'a']);
});

test('helpers from functional-cursors.functions are in scope', () => {
    const fn = compile('(e, i) => getDOW(i)', {
        getDOW: "i => ['Mon','Tue','Wed'][i % 3]"
    });
    assert.deepEqual(applyToSelections(fn, ['', '', '', '']), ['Mon', 'Tue', 'Wed', 'Mon']);
});

test('a syntax error is a readable Error, not silence', () => {
    assert.throws(() => compile('(e, i) => {'), /Could not parse/);
    assert.throws(() => compile(''), /No function given/);
    assert.throws(() => compile('42'), /not a function/);
    assert.throws(() => compile('(e) => e', { 'bad name': 'x => x' }), /not a valid JavaScript identifier/);
    assert.throws(() => compile('(e) => e', { broken: 'x => {' }), /functions\.broken does not parse/);
});

test('a function that throws or returns a non-string is reported with the cursor index', () => {
    const boom = compile('(e, i) => { if (i === 1) throw new Error("nope"); return e; }');
    assert.throws(() => applyToSelections(boom, ['a', 'b']), /Cursor 1: nope/);
    const obj = compile('(e, i) => ({})');
    assert.throws(() => applyToSelections(obj, ['a']), /Cursor 0: the function returned an object/);
    const undef = compile('(e, i) => {}');
    assert.throws(() => applyToSelections(undef, ['a']), /returned undefined/);
});

test('mutating the values argument does not leak into the next cursor', () => {
    const fn = compile('(e, i, v) => { v.push("z"); return v.length; }');
    assert.deepEqual(applyToSelections(fn, ['a', 'b']), ['3', '3']);
});
