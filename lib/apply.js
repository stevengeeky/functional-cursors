/**
 * Pure logic for Functional Cursors: compile the user's function and apply it
 * to N selections. No dependency on the vscode module so it can be unit tested
 * with plain node.
 */

const IDENT = /^[A-Za-z_$][\w$]*$/;

/**
 * Turn user source (an expression such as `(e, i) => i`) into a callable.
 * `helpers` is the `functional-cursors.functions` map: name -> source.
 * Throws an Error with a readable message when anything fails to parse.
 */
function compile(source, helpers) {
    let expr = String(source == null ? '' : source).trim();
    while (expr.endsWith(';')) expr = expr.slice(0, -1).trim();
    if (!expr) throw new Error('No function given.');

    let prelude = '';
    for (const name of Object.keys(helpers || {})) {
        if (!IDENT.test(name)) {
            throw new Error(`functional-cursors.functions: "${name}" is not a valid JavaScript identifier.`);
        }
        const body = String(helpers[name]).trim().replace(/;+$/, '');
        try {
            // eslint-disable-next-line no-new-func
            new Function(`return (${body});`);
        } catch (e) {
            throw new Error(`functional-cursors.functions.${name} does not parse: ${e.message}`);
        }
        prelude += `const ${name} = (${body});\n`;
    }

    let factory;
    try {
        // eslint-disable-next-line no-new-func
        factory = new Function(`"use strict";\n${prelude}return (${expr});`);
    } catch (e) {
        throw new Error(`Could not parse "${expr}": ${e.message}`);
    }

    let fn;
    try {
        fn = factory();
    } catch (e) {
        throw new Error(`Evaluating "${expr}" threw: ${e.message}`);
    }
    if (typeof fn !== 'function') {
        throw new Error(`"${expr}" is ${describe(fn)}, not a function. Write something like (e, i) => i`);
    }
    return fn;
}

/** Coerce a single return value to the text that goes into the document. */
function toText(value, index) {
    switch (typeof value) {
        case 'string': return value;
        case 'number':
        case 'boolean':
        case 'bigint': return String(value);
        default:
            throw new Error(`Cursor ${index}: the function returned ${describe(value)}. Return a string or a number.`);
    }
}

/**
 * Apply `fn(e, i, values)` to every selection's text.
 * `values` is the array of currently selected strings, in document order.
 * Returns an array of replacement strings of the same length.
 *
 * If a call returns an array, that array is taken as the new contents for all
 * cursors (element i % length goes to cursor i), which is what lets
 * `(e, i, v) => v.slice().sort()` sort the selections in place.
 */
function applyToSelections(fn, values) {
    const out = [];
    for (let i = 0; i < values.length; i++) {
        let result;
        try {
            result = fn(values[i], i, values.slice());
        } catch (e) {
            throw new Error(`Cursor ${i}: ${e && e.message ? e.message : e}`);
        }
        if (Array.isArray(result)) {
            if (result.length === 0) throw new Error(`Cursor ${i}: the function returned an empty array.`);
            out.push(toText(result[i % result.length], i));
        } else {
            out.push(toText(result, i));
        }
    }
    return out;
}

function describe(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (Array.isArray(v)) return 'an array';
    if (typeof v === 'object') return 'an object';
    if (typeof v === 'function') return 'a function';
    return `a ${typeof v}`;
}

module.exports = { compile, applyToSelections, toText };
