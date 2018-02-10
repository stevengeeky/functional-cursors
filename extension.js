/**
 * @name Functional Cursors
 * @author Steven O'Riley
 * @desc Automatically replaces patterns at the cursor with specified symbols
 */

const vscode = require('vscode');
const safeEval = require('safe-eval')

let fs = [];
let lastText = "(e, i) => ";

function activate(context) {
    let config = vscode.workspace.getConfiguration("functional-cursors");
    fs = config.get("functions");
    vscode.workspace.onDidChangeConfiguration(() => {
        let config = vscode.workspace.getConfiguration("functional-cursors");
        fs = config.get("functions");
    });
    
    var disposable = vscode.commands.registerCommand("extension.jsCursors", function() {
        vscode.window.showInputBox({ "value": lastText, "valueSelection": [lastText.length, lastText.length] })
        .then(uinput => {
            if (!uinput) return;
            
            let code = '(function(){\n';
            for (let i in fs) code += `let ${i}=(${fs[i]})\n`;
            if (uinput.endsWith(";")) uinput = uinput.substring(0, uinput.length - 1);
            code += `return (${uinput})})();`;
            
            try {
                let f = safeEval(code);
                let test = f("", 0, [""]);
                
                lastText = uinput;
                update(f, test);
            }
            catch (e) {}
        });
    });
    
    context.subscriptions.push(disposable);
}
exports.activate = activate;

function update(f, testResult) {
    let editor = vscode.window.activeTextEditor;
    let document = editor.document;
    
    let selections = editor.selections;
    selections.sort(function(a, b) {
        return a.start.compareTo(b.start);
    });
    let content = [];
    
    for (let index in selections) {
        let selection = selections[index];
        let range = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
        let text = document.getText(range);
        
        content.push([index, text, selection.start.line, selection.start.character, selection.end.line, selection.end.character]);
    }
    
    if (content.length == editor.selections.length) {
        let replacements;
        let raw = content.map(stuff => stuff[1]);
        
        if (testResult instanceof Array) {
            replacements = f("", 0, raw);
            editor.edit(function(edit) {
                content.forEach((info, i) => {
                    let range = new vscode.Selection(info[2], info[3], info[4], info[5]);
                    let replacement = replacements[i % replacements.length] + "";
                    
                    edit.replace(range, replacement);
                });
            });
        }
        else {
            editor.edit(function(edit) {
                content.forEach((info, i) => {
                    let range = new vscode.Selection(info[2], info[3], info[4], info[5]);
                    let replacement = f(info[1], i, raw) + "";
                    
                    edit.replace(range, replacement);
                });
            });
        }
    }
}

function sorted(l, c) {
    for (var i = 0; i < l.length - 1; i++) {
        if (!c(l[i], l[i + 1])) return false;
    }
    return true;
}

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;