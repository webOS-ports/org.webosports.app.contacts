Tests
=====

    tools/run-tests.sh                 ES5/syntax check, eslint, unit tests, dev build, end-to-end tests
    tools/run-tests.sh --built         ... and the end-to-end tests again on the production build
    tools/run-tests.sh --screenshots   save a screenshot per step to test-output/shots/
    TEST_FILTER=edit tools/run-tests.sh

You need Node 22 or later (for its built-in `fetch` and `WebSocket`), a
Chromium, and enyo-dev for the build: by default the one the LuneOS build
stages (`nodejs-enyo-dev-native`), or set `ENYO_DEV=`. Nothing comes from npm.

What runs
---------

| File | What it covers | Needs |
|---|---|---|
| `unit-tests.js` | the pure helpers in `src/util/` | Node |
| `e2e-tests.js` | the built app in headless Chromium on the mock LuneOS bus | Node, Chromium |

The end-to-end tests are offline and deterministic. Every test also fails
when:
- the page throws an error or logs a `console.error`,
- the app calls a service the mock does not know,
- ls-hubd would refuse a call: `fixtures/acg/` holds the device's
  api-permissions tables, and the app is granted exactly the groups in
  `appinfo.json`'s `requiredPermissions`,
- markup from the hostile fixture contact (`c-hostile`) ran as script.

When a test fails, a screenshot of that moment is saved to
`test-output/shots/FAIL-<test>.png`.

The mock bus
------------

`mock/luna-bus.js` fakes PalmSystem and PalmServiceBridge, so the app runs
its device code paths: an in-memory db8 (kind inheritance, watches, paging
at 500, the person and contact schemas, and the app's kind permissions, so
deleting a person record is refused as on a device), the contacts linker
(a person is rebuilt from its contacts whenever one changes; manualLink,
manualUnlink, saveNewPersonAndContacts, deleteOrphanedPerson), sortKey
upkeep when the list order pref changes, the vCard methods, accounts,
the app manager and the activity manager. Its header documents the config.

The same file is the desktop runtime: `tools/build.sh` writes
`dist/debug.html`, which loads it before the libraries, with the people in
`mock/db8-data.json`. Serve the checkout (`python3 -m http.server`) and open
`dist/debug.html` in Chromium. It is a dev asset only: the production build
does not contain `mock/`.

The pieces
----------

- `lib/harness.js`, `lib/server.js`, `lib/browser.js` come from the weather
  app's tests: a minimal runner, a static server on a free port, and
  Chromium over the DevTools protocol (`tap`, `tapText`, `fill`, `eval`,
  `waitFor`, `screenshot`, ...).
- `fixtures/acg/` is a copy of the device's
  `/usr/share/luna-service2/api-permissions.d` files for the services the app
  calls.
