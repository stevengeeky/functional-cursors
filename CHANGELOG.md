# Change Log

## 0.1.0

- Fixes #1 ("Does nothing"). Every failure used to be swallowed by an empty `catch`, so a
  function that did not parse, threw, returned something that is not text, or ran with no
  text editor focused all looked the same: nothing happened. Each of those now shows an
  error message naming the cursor and the reason, and the input box validates the
  expression while you type.
- Numbers and booleans returned by the function are written as text, so `(e, i) => i` works.
- Arrays returned by the function are recognised again (the old `vm` sandbox created them in
  another realm, where `instanceof Array` is false).
- `safe-eval` dropped; the expression is compiled with `new Function` in strict mode with
  `this` undefined. It is still plain JavaScript running inside the extension host, so only
  run expressions you wrote yourself.
- Requires VS Code 1.75 or later; activates on the command instead of on startup.
- Unit tests for the pure "apply function to N selections" logic run with `npm test` (node only).

## 0.0.6

- Returning an array is interpreted as the new set of selections' content.

## 0.0.1

- Initial release
