/*
	A minimal test runner shared by the unit and end-to-end tests: no
	dependencies beyond Node (22+), so it runs on any build host.

		var t = require("./lib/harness.js");
		t.test("name", function() { t.assert.strictEqual(1, 1); });
		t.test("async", async function() { ... });
		t.run();   // runs in order, prints ok/FAIL, exits non-zero on failure

	A test name filter can be given as TEST_FILTER=<regexp>.
*/
var assert = require("assert");

var tests = [];
var filter = process.env.TEST_FILTER ? new RegExp(process.env.TEST_FILTER) : null;

function test(inName, inFn) {
	tests.push({name: inName, fn: inFn});
}

async function run(inOptions) {
	inOptions = inOptions || {};
	var passed = 0, failed = 0, skipped = 0;
	for (var i = 0; i < tests.length; i++) {
		var t = tests[i];
		if (filter && !filter.test(t.name)) {
			skipped++;
			continue;
		}
		try {
			if (inOptions.beforeEach) {
				await inOptions.beforeEach(t);
			}
			await t.fn();
			// Part of the test: a check every test must pass, e.g. no page errors.
			if (inOptions.afterEach) {
				await inOptions.afterEach(t);
			}
			passed++;
			console.log("ok   " + t.name);
		} catch (e) {
			failed++;
			console.log("FAIL " + t.name + "\n     " + String(e && e.stack || e).split("\n").slice(0, process.env.TEST_VERBOSE ? undefined : 6).join("\n     "));
			if (inOptions.onFailure) {
				try {
					await inOptions.onFailure(t, e);
				} catch (e2) {}
			}
		}
	}
	if (inOptions.after) {
		await inOptions.after();
	}
	console.log("\n" + passed + " passed, " + failed + " failed" + (skipped ? ", " + skipped + " skipped" : ""));
	process.exitCode = failed ? 1 : 0;
	return failed;
}

module.exports = {test: test, run: run, assert: assert};
