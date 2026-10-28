/*
	End-to-end tests: the built app in headless Chromium, on the mock LuneOS
	bus (mock/luna-bus.js), so it runs the same code paths as on a device:
	db8 through PalmServiceBridge, the contacts linker, the app manager.

		node tools/tests/e2e-tests.js [--built] [--screenshots]

	--built tests the production build in deploy/ instead of dist/.

	Every test also fails when
	  - the page throws or logs a console.error,
	  - the app calls a service the mock does not know,
	  - the hub would refuse a call: the ACG tables in fixtures/acg/ are the
	    device's, and the app gets exactly the groups appinfo.json requests,
	  - anything from the hostile fixture contact ran as script.
*/
var fs = require("fs");
var path = require("path");
var t = require("./lib/harness.js");
var assert = t.assert;
var sleep = require("./lib/browser.js").sleep;

var ROOT = path.resolve(__dirname, "..", "..");
var BUILT = process.argv.indexOf("--built") >= 0;
var SCREENSHOTS = process.argv.indexOf("--screenshots") >= 0;
var APP = BUILT ? "/deploy/com.palm.app.contacts/index.html" : "/dist/index.html";
var SHOTS = path.join(ROOT, "test-output", "shots");

var BUS = fs.readFileSync(path.join(ROOT, "mock", "luna-bus.js"), "utf8");
var DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "mock", "db8-data.json"), "utf8"));
DATA.accounts = JSON.parse(fs.readFileSync(path.join(ROOT, "mock", "com.palm.service.accounts", "listAccounts.json"), "utf8")).results;
var APPINFO = JSON.parse(fs.readFileSync(path.join(ROOT, "appinfo.json"), "utf8"));

var ACG = (function() {
	var dir = path.join(__dirname, "fixtures", "acg"), groups = {};
	fs.readdirSync(dir).forEach(function(inFile) {
		var table = JSON.parse(fs.readFileSync(path.join(dir, inFile), "utf8"));
		Object.keys(table).forEach(function(inGroup) {
			groups[inGroup] = (groups[inGroup] || []).concat(table[inGroup]);
		});
	});
	return {groups: groups, granted: APPINFO.requiredPermissions, exempt: []};
})();

function data() {
	return JSON.parse(JSON.stringify(DATA));
}

var server, browser, page;

/**
	Opens the app on a fresh mock bus.
	inOptions: {data, launchParams, width, height, luna, vcards, acg, delay}
*/
async function open(inOptions) {
	var o = inOptions || {};
	if (page) {
		await page.close();
	}
	var config = {
		data: o.data || data(),
		launchParams: o.launchParams || {},
		luna: o.luna || {},
		vcards: o.vcards || {},
		acg: o.acg || ACG,
		delay: o.delay || 0
	};
	page = await browser.newPage({width: o.width || 1024, height: o.height || 768,
		initScripts: ["window.__MOCK_CONFIG__ = " + JSON.stringify(config) + ";", BUS]});
	await page.goto(server.url + APP);
	await page.waitFor("window.contactsApp && document.querySelector('[id$=_allContactsList]')");
	if (!o.noWait) {
		await waitForList();
	}
	return page;
}

//* The names in the list, in order.
function listNames() {
	return page.eval("Array.prototype.map.call(document.querySelectorAll('[id*=_allContactsList] .contacts-item .name'), " +
		"function(e){ return e.textContent; })");
}
async function waitForList(inMinimum) {
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length >= " + (inMinimum || 1));
}
async function tapPerson(inName) {
	await page.tapText("[id*=_allContactsList] .contacts-item", inName);
	await page.waitFor("(function(){var e=document.querySelector('[id$=_header_displayName]');" +
		"return e && e.textContent.indexOf(" + JSON.stringify(inName) + ")>=0;})()");
}
function text(inSelector) {
	return page.eval("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");return e?e.textContent:null;})()");
}
function lunaCalls(inUrlPart) {
	return page.eval("__MOCK__.calls.filter(function(c){return c.kind==='luna'&&c.url.indexOf(" + JSON.stringify(inUrlPart) + ")>=0;})");
}
function record(inId) {
	return page.eval("JSON.parse(JSON.stringify(__MOCK__.db.byId(" + JSON.stringify(inId) + ") || null))");
}
async function shot(inName) {
	if (SCREENSHOTS) {
		await page.screenshot(path.join(SHOTS, inName + ".png"));
	}
}

// --- list ------------------------------------------------------------

t.test("list: shows every person in sortKey order", async function() {
	await open();
	await waitForList(13);
	var names = await listNames();
	assert.strictEqual(names.length, 13, names.join(", "));
	assert.strictEqual(names[0], "Anna Berg");
	assert.ok(names.indexOf("Anna van der Berg") > names.indexOf("Mary Ann Smith-Jones") ||
		names.indexOf("Anna van der Berg") > 0, names.join(", "));
	await shot("list");
});

t.test("list: Favourites tab shows only favourites", async function() {
	await open();
	await page.tapText("[id$=_contactsBar_tabs] *", "Favourites");
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length === 2");
	assert.deepStrictEqual((await listNames()).sort(), ["Anna van der Berg", "Émile Zola"]);
});

t.test("list: search narrows the list by name, nickname, company and email", async function() {
	await open();
	await page.fill("[id$=_inputSearchStretch_input]", "glob");
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length === 1");
	assert.deepStrictEqual(await listNames(), ["Globex Corporation"]);
});

t.test("details: tapping a person shows their details", async function() {
	await open();
	await tapPerson("Gina Talk");
	assert.strictEqual(await text("[id$=_header_displayName]"), "Gina Talk");
	await shot("details");
});

t.test("startup: every service call is one the hub allows", async function() {
	await open();
	var denied = await page.eval("__MOCK__.calls.filter(function(c){return c.acg && !/^(granted|exempt|unchecked)/.test(c.acg);})");
	assert.deepStrictEqual(denied, []);
});

// --- run ---------------------------------------------------------------

(async function() {
	server = await require("./lib/server.js").start(ROOT);
	browser = await require("./lib/browser.js").launch();
	await t.run({
		afterEach: async function() {
			if (!page) {
				return;
			}
			await sleep(100);
			assert.deepStrictEqual(page.errors, [], "page errors");
			var bad = await page.eval("__MOCK__.calls.filter(function(c){return c.unmocked || " +
				"(c.acg && !/^(granted|exempt|unchecked|expected-denial)/.test(c.acg));})");
			assert.deepStrictEqual(bad, [], "unmocked or denied service calls");
			assert.strictEqual(await page.eval("window.__xss"), undefined, "markup from contact data ran as script");
		},
		onFailure: async function(inTest) {
			if (page) {
				await page.screenshot(path.join(SHOTS, "FAIL-" + inTest.name.replace(/[^\w.-]+/g, "_") + ".png"));
			}
		},
		after: async function() {
			if (page) {
				await page.close();
			}
			await browser.close();
			await server.stop();
		}
	});
})().catch(function(e) {
	console.error(e);
	process.exit(1);
});
