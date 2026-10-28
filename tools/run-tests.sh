#!/bin/sh
# Runs the whole test suite:
#   1. syntax, ES5 and lint check of the app's sources with eslint
#      (.eslintrc.json); the device's WebKit and enyo-dev's uglify-js take
#      ES5 only
#   2. unit tests of the pure helpers       tools/tests/unit-tests.js
#   3. development build, then end-to-end tests in headless Chromium on the
#      mock LuneOS bus                      tools/tests/e2e-tests.js
#   4. with --built: production build (what the ipk ships) and step 3 again
#      on it
#
#   tools/run-tests.sh [--built] [--screenshots]
#   TEST_FILTER=<regexp> tools/run-tests.sh      only matching tests
#   CHROME=/path/to/chromium tools/run-tests.sh
#   ENYO_DEV=/path/to/enyo-dev tools/run-tests.sh
set -e
cd "$(dirname "$0")/.."
BUILT=0
E2E_ARGS=""
for a in "$@"; do
	case "$a" in
		--built) BUILT=1 ;;
		--screenshots) E2E_ARGS="--screenshots" ;;
		*) echo "unknown option: $a" >&2; exit 2 ;;
	esac
done

SOURCES="index.js $(find src -name '*.js' | sort) mock/luna-bus.js"

echo "== syntax / ES5"
for f in $SOURCES; do node --check "$f"; done
if command -v eslint >/dev/null 2>&1; then
	# eslint parses as ES5 (.eslintrc.json), so ES2015+ syntax is a parse
	# error there, and it runs the lint rules too.
	eslint --no-eslintrc -c .eslintrc.json $SOURCES
else
	echo "eslint not installed: rough ES5 check only"
	if grep -nE '^\s*(let|const) |^\s*class |\) => |for \(\s*(var|let|const) [A-Za-z_$]+ of ' $SOURCES; then
		echo "ES2015+ syntax (see above)" >&2
		exit 1
	fi
fi
echo "ok"

echo "== unit tests"
node tools/tests/unit-tests.js

echo "== development build"
tools/build.sh
echo "== end-to-end tests (mock bus)"
node tools/tests/e2e-tests.js $E2E_ARGS

if [ "$BUILT" = 1 ]; then
	echo "== production build"
	tools/build.sh --production
	echo "== end-to-end tests on the production build"
	node tools/tests/e2e-tests.js --built $E2E_ARGS
fi
