/**
 * @name Functional Cursors
 * @author Steven O'Riley
 * @desc Change the content under every cursor with a JavaScript function
 */

const vscode = require('vscode');
const { compile, applyToSelections } = require('./lib/apply');

let helpers = {};
let lastText = "(e, i) => ";

function readConfig() {
    helpers = vscode.workspace.getConfiguration("functional-cursors").get("functions", {}) || {};
}

function activate(context) {
    readConfig();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (!e || e.affectsConfiguration("functional-cursors")) readConfig();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("extension.jsCursors", run));
}

async function run() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("Functional Cursors: open a text editor first.");
        return;
    }

    const uinput = await vscode.window.showInputBox({
        prompt: "Function applied at every cursor: (e, i, values) => text",
        value: lastText,
        valueSelection: [lastText.length, lastText.length],
        validateInput: text => {
            try { compile(text, helpers); return null; }
            catch (e) { return e.message; }
        }
    });
    if (uinput === undefined) return;

    let fn;
    try {
        fn = compile(uinput, helpers);
    } catch (e) {
        vscode.window.showErrorMessage(`Functional Cursors: ${e.message}`);
        return;
    }
    lastText = uinput;

    // Copy before sorting: editor.selections is owned by the editor.
    const selections = editor.selections.slice().sort((a, b) => a.start.compareTo(b.start));
    const document = editor.document;
    const values = selections.map(sel => document.getText(sel));

    let replacements;
    try {
        replacements = applyToSelections(fn, values);
    } catch (e) {
        vscode.window.showErrorMessage(`Functional Cursors: ${e.message}`);
        return;
    }

    const ok = await editor.edit(edit => {
        selections.forEach((sel, i) => edit.replace(sel, replacements[i]));
    });
    if (!ok) {
        vscode.window.showErrorMessage("Functional Cursors: the editor rejected the edit (did the document change?).");
    }
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;
