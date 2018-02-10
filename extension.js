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
                f("test", 0, ["test"]);
                lastText = uinput;
                update(f);
            }
            catch (e) {}
        });
    });
    
    context.subscriptions.push(disposable);
}
exports.activate = activate;

function update(f) {
    let editor = vscode.window.activeTextEditor;
    let document = editor.document;
    
    let selections = editor.selections;
    let content = [];
    
    for (let index in selections) {
        let selection = selections[index];
        let range = new vscode.Range(selection.start.line, selection.start.character, selection.end.line, selection.end.character);
        let text = document.getText(range);
        
        content.push([index, text, selection.start.line, selection.start.character, selection.end.line, selection.end.character]);
    }
    
    if (content.length == editor.selections.length) {
        content.sort(function(b, a) {
            return a[4] < b[4] || (a[4] == b[4] && a[5] < b[5]);
        });
        let raw = content.map(stuff => stuff[1]);
        let i = 0;
        
        editor.edit(function(edit) {
            content.forEach(info => {
                let range = new vscode.Selection(info[2], info[3], info[4], info[5]);
                let replacement = f(info[1], i, raw) + "";
                edit.replace(range, replacement);
                
                i++;
            });
        });
    }
}

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;