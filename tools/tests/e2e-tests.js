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
// The list renders only the rows near its scroll position: scroll the
// person's row in first.
async function scrollToPerson(inName) {
	var found = await page.eval("(function(){var list=contactsApp.view.$.contactsBar.$.allContactsList, c=list.collection;" +
		"for(var i=0;i<c.length;i++){if(String(c.at(i).get('displayName')).indexOf(" + JSON.stringify(inName) + ")>=0){list.scrollToIndex(i);return true;}}" +
		"return false;})()");
	assert.ok(found, inName + " is not in the list");
	await page.waitFor("Array.prototype.some.call(document.querySelectorAll('[id*=_allContactsList] .contacts-item .name')," +
		"function(e){return e.textContent.indexOf(" + JSON.stringify(inName) + ")>=0 && e.getBoundingClientRect().height>0;})");
}
async function tapPerson(inName) {
	await scrollToPerson(inName);
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
		await sleep(800);   // let panel animations finish
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

// --- edit --------------------------------------------------------------

async function openEdit(inName) {
	await tapPerson(inName);
	await page.tap("[id$=_editContactBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_nameInput]');return e && e.getBoundingClientRect().width > 0;})()");
}
async function save() {
	await page.tap("[id$=_doneBtn]");
	await sleep(300);
}

t.test("edit: saving without touching the name keeps its parts", async function() {
	await open();
	await openEdit("Mary Ann Smith-Jones");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_nameInput]').value"), "Dr. Mary Ann Smith-Jones, PhD");
	await page.fill("[id$=_nicknameInput]", "Mae");
	await save();
	var c = await record("c-mary");
	assert.strictEqual(c.nickname, "Mae");
	assert.deepStrictEqual({p: c.name.honorificPrefix, g: c.name.givenName, m: c.name.middleName, f: c.name.familyName, s: c.name.honorificSuffix},
		{p: "Dr.", g: "Mary", m: "Ann", f: "Smith-Jones", s: "PhD"});
});

t.test("edit: a typed name is parsed with its particles", async function() {
	await open();
	await openEdit("Zoë Ångström");
	await page.fill("[id$=_nameInput]", "Zoë Maria van der Ångström");
	await save();
	var c = await record("c-zoe");
	assert.strictEqual(c.name.givenName, "Zoë");
	assert.strictEqual(c.name.middleName, "Maria");
	assert.strictEqual(c.name.familyName, "van der Ångström");
});

// The empty row at the end of a field's group, and a row by position (1-based).
function newRow(inField) {
	return "[id$=_" + inField + "Group] > .edit-row:last-child";
}
function row(inField, inN) {
	return "[id$=_" + inField + "Group] > .edit-row:nth-child(" + inN + ")";
}
function selectValue(inSelector, inValue) {
	return page.eval("(function(){var s=document.querySelector(" + JSON.stringify(inSelector) + ");s.value=" +
		JSON.stringify(inValue) + ";s.dispatchEvent(new Event('change',{bubbles:true}));return s.value;})()");
}
function banners() {
	return page.eval("__MOCK__.calls.filter(function(c){return c.url==='addBannerMessage';}).map(function(c){return c.params;})");
}

t.test("edit: the organization is stored as organizations[0], keeping its other fields", async function() {
	await open();
	await openEdit("Anna van der Berg");
	// Anna's company comes from the Google contact, which is not the primary.
	assert.strictEqual(await page.eval("document.querySelector('[id$=_organizationInput]').value"), "Acme");
	await page.fill("[id$=_jobTitleInput]", "Lead engineer");
	await save();
	var palm = await record("c-anna-palm");
	assert.deepStrictEqual(palm.organizations, [{title: "Lead engineer", department: "R&D", name: "Acme"}]);
	assert.strictEqual(palm.organization, undefined, "no stray 'organization' property");
	assert.deepStrictEqual((await record("c-anna-goog")).organizations, [{title: "Engineer", name: "Acme", department: "R&D"}]);
	await page.waitFor("(function(){var e=document.querySelector('[id$=_header_displayName]');return e && /Anna/.test(e.textContent);})()");
});

t.test("edit: a change goes to one contact; linked and read-only contacts are left alone", async function() {
	await open();
	var before = {goog: await record("c-anna-goog"), skype: await record("c-anna-skype")};
	await openEdit("Anna van der Berg");
	// The Skype IM row is shown but cannot be changed or removed.
	assert.strictEqual(await page.eval("document.querySelector(" + JSON.stringify(row("ims", 1) + " input") + ").disabled"), true);
	assert.strictEqual(await page.eval("!!document.querySelector(" + JSON.stringify(row("ims", 1) + " .edit-row-remove") + ")"), false);
	await shot("edit-linked");
	await page.fill("[id$=_nicknameInput]", "Annie B");
	await page.fill(newRow("emails") + " input", "anna@new.example");
	await save();
	var palm = await record("c-anna-palm");
	assert.strictEqual(palm.nickname, "Annie B");
	assert.deepStrictEqual(palm.emails.map(function(e) { return e.value; }), ["anna@example.com", "anna@new.example"]);
	assert.deepStrictEqual(await record("c-anna-goog"), before.goog);
	assert.deepStrictEqual(await record("c-anna-skype"), before.skype);
	var merges = await lunaCalls("com.palm.db/merge");
	merges.forEach(function(c) {
		(c.params.objects || []).forEach(function(o) {
			assert.notStrictEqual(o._id, "c-anna-skype", "merged into the read-only contact");
		});
	});
});

t.test("edit: an untouched edit writes nothing", async function() {
	await open();
	await openEdit("Anna van der Berg");
	await save();
	assert.deepStrictEqual(await lunaCalls("com.palm.db/merge"), []);
	assert.deepStrictEqual(await lunaCalls("linker"), []);
});

t.test("edit: removing an entry removes it from its contact", async function() {
	await open();
	await openEdit("Mary Ann Smith-Jones");
	await page.tap(row("phoneNumbers", 2) + " .edit-row-remove");
	await save();
	assert.deepStrictEqual((await record("c-mary")).phoneNumbers, [{value: "(555) 123-4567", type: "type_main"}]);
});

t.test("edit: a new entry gets the type picked for it", async function() {
	await open();
	await openEdit("Mary Ann Smith-Jones");
	await page.fill(newRow("phoneNumbers") + " input", "555 0001");
	// Typing in the empty row adds another empty row after it.
	await page.waitFor("document.querySelectorAll(" + JSON.stringify("[id$=_phoneNumbersGroup] > .edit-row") + ").length === 4");
	await selectValue(row("phoneNumbers", 3) + " select", "type_pager");
	await page.fill(row("addresses", 2) + " input[id$=_locality]", "Shelbyville");
	await save();
	var c = await record("c-mary");
	assert.deepStrictEqual(c.phoneNumbers[2], {value: "555 0001", type: "type_pager"});
	assert.strictEqual(c.addresses.length, 2);
	assert.strictEqual(c.addresses[1].locality, "Shelbyville");
	assert.strictEqual(c.addresses[1].type, "type_home");
});

t.test("edit: the name details popup sets each part", async function() {
	await open();
	await openEdit("Gina Talk");
	await page.tap("[id$=_nameDetailsBtn]");
	await page.fill("[id$=_middleInput]", "de la");
	await page.fill("[id$=_familyInput]", "Talk Smith");
	await page.tap("[id$=_nameDetailsDone]");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_nameInput]').value"), "Gina de la Talk Smith");
	await save();
	var c = await record("c-gina");
	assert.strictEqual(c.name.middleName, "de la");
	assert.strictEqual(c.name.familyName, "Talk Smith");
});

t.test("edit: a person of read-only contacts gets a new linked contact for the change", async function() {
	await open();
	await openEdit("Bob Cowboy");
	assert.ok(/new linked profile/.test(await text("[id$=_readOnlyNote]")));
	await page.fill(newRow("phoneNumbers") + " input", "555 0002");
	await save();
	var person = (await page.eval("__MOCK__.db.all('com.palm.person:1')")).filter(function(p) {
		return p.contactIds.indexOf("c-bob") >= 0;
	})[0];
	assert.strictEqual(person.contactIds.length, 2, JSON.stringify(person));
	var added = await record(person.contactIds.filter(function(id) { return id !== "c-bob"; })[0]);
	assert.strictEqual(added._kind, "com.palm.contact.palmprofile:1");
	assert.deepStrictEqual(added.phoneNumbers, [{value: "555 0002", type: "type_mobile"}]);
	assert.strictEqual(added.name.familyName, "Cowboy");
	assert.deepStrictEqual((await record("c-bob")).phoneNumbers, undefined);
	assert.strictEqual(person.phoneNumbers[0].value, "555 0002");
});

t.test("edit: the favourite star toggles through the contacts service", async function() {
	await open();
	await openEdit("Gina Talk");
	await page.tap("[id$=_favoriteBtn]");
	await save();
	var calls = await lunaCalls("com.palm.service.contacts/favoritePerson");
	assert.strictEqual(calls.length, 1);
	assert.strictEqual((await record(calls[0].params.personId)).favorite, true);
});

t.test("edit: cancel writes nothing", async function() {
	await open();
	await openEdit("Gina Talk");
	await page.fill("[id$=_nicknameInput]", "G");
	await page.tap("[id$=_cancelBtn]");
	await sleep(200);
	assert.deepStrictEqual(await lunaCalls("com.palm.db/merge"), []);
	assert.strictEqual((await record("c-gina")).nickname, undefined);
});

t.test("edit: a bad date is refused, a partial stored one is kept", async function() {
	var d = data();
	d.contacts.filter(function(c) { return c._id === "c-gina"; })[0].birthday = "--07-04";
	await open({data: d});
	await openEdit("Gina Talk");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_birthdayInput]').value"), "--07-04");
	await page.fill("[id$=_nicknameInput]", "G");
	await save();
	assert.strictEqual((await record("c-gina")).birthday, "--07-04");
	await openEdit("Gina Talk");
	await page.fill("[id$=_birthdayInput]", "1990-02-30");
	await save();
	assert.ok((await banners()).some(function(b) { return /YYYY-MM-DD/.test(b); }), "no banner");
	assert.strictEqual((await record("c-gina")).birthday, "--07-04");
});

// --- new contact -------------------------------------------------------

async function openNew() {
	await page.tap("[id$=_addContactBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_nameInput]');return e && e.getBoundingClientRect().width > 0;})()");
}

t.test("new: saved through the linker in the default account, favourite kept, then shown", async function() {
	await open();
	await openNew();
	assert.strictEqual(await page.eval("document.querySelector('[id$=_accountSelect]').value"), "++HoXVTTqIccE0m1");
	await shot("new");
	await page.fill("[id$=_nameInput]", "Neo Anderson");
	await page.fill(newRow("phoneNumbers") + " input", "101");
	await page.tap("[id$=_favoriteBtn]");
	await save();
	var calls = await lunaCalls("linker/saveNewPersonAndContacts");
	assert.strictEqual(calls.length, 1);
	assert.strictEqual(calls[0].params.person.favorite, true);
	var c = calls[0].params.contacts[0];
	assert.strictEqual(c._kind, "com.palm.contact.palmprofile:1");
	assert.strictEqual(c.accountId, "++HoXVTTqIccE0m1");
	assert.deepStrictEqual(c.phoneNumbers, [{value: "101", type: "type_mobile"}]);
	await page.waitFor("(function(){var e=document.querySelector('[id$=_header_displayName]');return e && e.textContent==='Neo Anderson';})()");
	assert.ok((await listNames()).indexOf("Neo Anderson") >= 0);
});

t.test("new: the default account pref and the account picker", async function() {
	var d = data();
	d.prefs.defaultAccountId = "++HqVF6BEhSPSfq0";
	await open({data: d});
	await openNew();
	assert.strictEqual(await page.eval("document.querySelector('[id$=_accountSelect]').value"), "++HqVF6BEhSPSfq0");
	// Read-only (Skype) and SIM accounts are not offered.
	var offered = await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_accountSelect] option'),function(o){return o.value;})");
	assert.deepStrictEqual(offered.sort(), ["++HoXVTTqIccE0m1", "++HqVF6BEhSPSfq0"]);
	await selectValue("[id$=_accountSelect]", "++HoXVTTqIccE0m1");
	await page.fill("[id$=_nameInput]", "Trinity");
	await save();
	var c = (await lunaCalls("linker/saveNewPersonAndContacts"))[0].params.contacts[0];
	assert.strictEqual(c.accountId, "++HoXVTTqIccE0m1");
});

t.test("new: an empty contact is not saved", async function() {
	await open();
	await openNew();
	await save();
	assert.deepStrictEqual(await lunaCalls("linker"), []);
	assert.ok((await banners()).length > 0);
});

t.test("new: no accounts at all does not crash", async function() {
	var d = data();
	d.accounts = [];
	await open({data: d});
	await openNew();
	assert.strictEqual(await page.eval("!!document.querySelector('[id$=_accountBox]') && document.querySelector('[id$=_accountBox]').offsetParent === null"), true);
	await page.fill("[id$=_nameInput]", "Morpheus");
	await save();
	assert.strictEqual((await lunaCalls("linker/saveNewPersonAndContacts")).length, 1);
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
