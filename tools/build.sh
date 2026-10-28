#!/bin/sh
# Builds the app with enyo-dev, the way the Yocto recipe does
# (webos_enyodev_application.bbclass).
#
#   tools/build.sh                development build in dist/, plus
#                                 dist/debug.html: the app on the mock
#                                 LuneOS bus (mock/luna-bus.js), for a
#                                 desktop Chromium
#   tools/build.sh --production   minified build in deploy/com.palm.app.contacts,
#                                 what the ipk ships (no mock/ in it)
#
# ENYO_DEV=<dir> picks the enyo-dev checkout; by default the one staged by
# the LuneOS build (nodejs-enyo-dev-native), then `enyo` on PATH. enyo-dev
# needs its own old node (0.12), which it ships in node_binaries/.
set -e
cd "$(dirname "$0")/.."

ENYO_DEV=${ENYO_DEV:-/media/herrie/LuneOS/wrynose/webos-ports/tmp/sysroots-components/x86_64/nodejs-enyo-dev-native/opt/enyo-dev}
if [ -x "$ENYO_DEV/node_binaries/x86_64/node" ]; then
	enyo() { "$ENYO_DEV/node_binaries/x86_64/node" "$ENYO_DEV/bin/enyo.js" "$@"; }
elif ! command -v enyo >/dev/null 2>&1; then
	echo "enyo-dev not found: set ENYO_DEV=<enyo-dev dir>" >&2
	exit 1
fi

# enyo-dev rewrites .enyoconfig on every run; keep the checked-in one.
cp .enyoconfig .enyoconfig.build-backup
trap 'mv -f .enyoconfig.build-backup .enyoconfig' EXIT

[ -d lib/enyo ] || enyo init

if [ "$1" = "--production" ]; then
	rm -rf deploy
	enyo pack --production --clean -d deploy/com.palm.app.contacts
	if [ -e deploy/com.palm.app.contacts/mock ]; then
		echo "the production build must not contain mock/" >&2
		exit 1
	fi
else
	enyo pack --clean
	# The mock bus has to be in place before webos-lib looks for PalmSystem.
	sed 's|<script src="enyo.js"></script>|<script src="mock/luna-bus.js"></script>\n    &|' dist/index.html > dist/debug.html
	grep -q 'mock/luna-bus.js' dist/debug.html
fi
