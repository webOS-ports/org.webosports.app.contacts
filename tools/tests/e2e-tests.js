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
	// db8 collates the sortKey index ("secondary"): Ångström is an A.
	assert.strictEqual(names[0], "Zoë Ångström", names.join(", "));
	assert.strictEqual(names[1], "Anna Berg", names.join(", "));
	assert.ok(names.indexOf("Anna van der Berg") > names.indexOf("Mary Ann Smith-Jones") ||
		names.indexOf("Anna van der Berg") > 0, names.join(", "));
	await shot("list");
});

t.test("list: more persons than one db8 page (500) are all listed", async function() {
	var d = data();
	for (var i = 0; i < 1200; i++) {
		var n = ("000" + i).slice(-4);
		d.contacts.push({_id: "c-many-" + n, _kind: "com.palm.contact.palmprofile:1", accountId: "++HoXVTTqIccE0m1",
			name: {givenName: "Many", familyName: "Zz" + n}});
		d.persons.push({_id: "p-many-" + n, favorite: false, contactIds: ["c-many-" + n]});
	}
	await open({data: d});
	await page.waitFor("contactsApp.view.globalPersonCollection.length === 1213", 15000);
	var pages = (await lunaCalls("com.palm.db/find")).filter(function(c) { return c.params.query.from === "com.palm.person:1"; });
	assert.ok(pages.length >= 3, "followed the next keys: " + pages.length);
	await tapPerson("Many Zz1199");
});

t.test("list: a change made elsewhere shows", async function() {
	await open();
	await page.eval("__MOCK__.editContact('c-oscar', {name: {givenName: 'Oskar', familyName: 'Other'}})");
	await page.waitFor("Array.prototype.some.call(document.querySelectorAll('[id*=_allContactsList] .contacts-item .name')," +
		"function(e){return e.textContent==='Oskar Other';})");
	assert.ok((await listNames()).indexOf("Oscar Other") < 0);
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

//* [name, divider or ""] of every person in the list collection, in order.
function listGroups() {
	return page.eval("(function(){var c=contactsApp.view.$.contactsBar.$.allContactsList.collection, out=[];" +
		"for(var i=0;i<c.length;i++){out.push([c.at(i).get('displayName'), c.dividers[c.at(i).euid]||'']);}return out;})()");
}
async function search(inQuery, inCount) {
	await page.fill("[id$=_inputSearchStretch_input]", inQuery);
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length === " + inCount);
	return (await listNames()).sort();
}
function listMessage() {
	return page.eval("(function(){var e=document.querySelector('.contacts-list-message');" +
		"return e && e.getBoundingClientRect().height>0 ? e.textContent : '';})()");
}
function waitForMessage() {
	return page.waitFor("(function(){var e=document.querySelector('.contacts-list-message');" +
		"return e && e.getBoundingClientRect().height>0;})()");
}

t.test("list: a letter divider heads each group, accents folded, '#' for no name", async function() {
	await open();
	await waitForList(13);
	var groups = await listGroups(), all = JSON.stringify(groups);
	var dividers = groups.filter(function(g) { return g[1]; }).map(function(g) { return g[1]; });
	// Each group once.
	assert.strictEqual(dividers.length, dividers.filter(function(d, i) { return dividers.indexOf(d) === i; }).length, all);
	var under = {}, current = "";
	groups.forEach(function(g) { current = g[1] || current; under[g[0]] = current; });
	// LAST_FIRST: Zoë Ångström sorts with the A's (collation), Émile Zola under Z.
	assert.strictEqual(under["Zoë Ångström"], "A", all);
	assert.strictEqual(under["Émile Zola"], "Z", all);
	assert.strictEqual(under["Anna Berg"], "B", all);
	assert.strictEqual(under["李小龙"], "李", all);
	assert.ok(groups[0][1], "the first row has a divider: " + all);
	// The rendered row shows its divider.
	await page.waitFor("Array.prototype.some.call(document.querySelectorAll('[id*=_allContactsList] .list-divider')," +
		"function(e){return e.textContent==='A' && e.getBoundingClientRect().height>0;})");
	await shot("list-dividers");
});

t.test("list: a person with no name is listed as [No Name Available], last, under '#'", async function() {
	var d = data();
	d.contacts.push({_id: "c-noname", _kind: "com.palm.contact.palmprofile:1", accountId: "++HoXVTTqIccE0m1"});
	d.persons.push({_id: "p-noname", favorite: false, contactIds: ["c-noname"]});
	await open({data: d});
	await waitForList(14);
	var groups = await listGroups(), last = groups[groups.length - 1];
	assert.deepStrictEqual(last, ["[No Name Available]", "#"], JSON.stringify(groups));
	assert.ok(groups.some(function(g) { return g[0] === "李小龙"; }), JSON.stringify(groups));
});

t.test("list: search ignores accents and case, matches every word, finds phone digits", async function() {
	await open();
	await waitForList(13);
	assert.deepStrictEqual(await search("zoe", 1), ["Zoë Ångström"]);
	assert.deepStrictEqual(await search("EMILE", 1), ["Émile Zola"]);
	assert.deepStrictEqual(await search("anna berg", 2), ["Anna Berg", "Anna van der Berg"]);
	assert.deepStrictEqual(await search("123-4567", 1), ["Dr. Mary Ann Smith-Jones, PhD"]);
	assert.deepStrictEqual(await search("李", 1), ["李小龙"]);
	await search("anna smith", 0);
});

t.test("list: messages for no search results, no favourites and no contacts", async function() {
	await open();
	await waitForList(13);
	assert.strictEqual(await listMessage(), "");
	await search("qqqqq", 0);
	await waitForMessage();
	assert.strictEqual(await listMessage(), "No search results found");

	var d = data();
	d.persons.forEach(function(p) { p.favorite = false; });
	await open({data: d});
	await page.tapText("[id$=_contactsBar_tabs] *", "Favourites");
	await waitForMessage();
	assert.strictEqual(await listMessage(), "No favorites yet");

	d.contacts = [];
	d.persons = [];
	await open({data: d, noWait: true});
	await waitForMessage();
	assert.strictEqual(await listMessage(), "No contacts yet. Tap + to add one.");
	await shot("list-empty");
});

t.test("details: tapping a person shows their details", async function() {
	await open();
	await tapPerson("Gina Talk");
	assert.strictEqual(await text("[id$=_header_displayName]"), "Gina Talk");
	await shot("details");
});

// The detail rows as [label, value] pairs, as shown.
function detailRows() {
	return page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_contactDetails] .contacts-item')," +
		"function(e){var l=e.querySelector('.label'),v=e.querySelector('.value');" +
		"return [l?l.textContent:'', v?v.innerText:''];})");
}
async function tapDetail(inValue) {
	await page.tapText("[id$=_contactDetails] .contacts-item .value", inValue);
}
function opened() {
	return page.eval("__MOCK__.calls.filter(function(c){return c.kind==='luna'&&/applicationManager\\/(open|launch)$/.test(c.url);})" +
		".map(function(c){return c.params.target||c.params.id;})");
}

t.test("details: markup in contact data is shown as text, never run", async function() {
	await open();
	await tapPerson("Hacker");
	var rows = await detailRows();
	assert.ok(rows.some(function(r) { return r[1] === "<script>window.__xss=2</script>\nsecond line"; }), JSON.stringify(rows));
	assert.ok(rows.some(function(r) { return r[1] === "<b>bold</b> street\n<i>town</i>"; }), JSON.stringify(rows));
	assert.ok(/<img src=x/.test(await text("[id$=_header_displayName]")));
	assert.strictEqual(await page.eval("document.querySelectorAll('[id$=_contactDetails] .value b, [id$=_contactDetails] .value i, " +
		"[id$=_contactDetails] .value script, [id$=_contactDetails] img[src=x]').length"), 0);
	// A javascript: web address is shown but opens nothing.
	await tapDetail("javascript:window.__xss=3");
	await sleep(100);
	assert.deepStrictEqual(await opened(), []);
	await shot("details-hostile");
});

t.test("details: labels, addresses and dates read properly", async function() {
	await open();
	await tapPerson("Mary Ann Smith-Jones");
	var rows = await detailRows();
	var labelsShown = rows.map(function(r) { return r[0]; });
	["Main", "Work fax", "Home", "Other", "Anniversary"].forEach(function(l) {
		assert.ok(labelsShown.indexOf(l) >= 0, l + " not in " + JSON.stringify(labelsShown));
	});
	assert.ok(rows.some(function(r) { return r[1] === "1 Main St.\n62701 Springfield\nIL\nUSA"; }), JSON.stringify(rows));
	assert.ok(!rows.some(function(r) { return /undefined|<br/.test(r[1]); }), JSON.stringify(rows));
	await tapPerson("Oscar Other");
	rows = await detailRows();
	assert.deepStrictEqual(rows.filter(function(r) { return r[1] === "Utrecht" || r[1] === "3511"; }).map(function(r) { return r[0]; }),
		["Other", "Home"]);
	await tapPerson("Anna van der Berg");
	assert.ok((await detailRows()).some(function(r) { return r[0] === "Birthday" && r[1] === "March 14, 1980"; }));
});

t.test("details: taps open the right app through a URL, never the telephony service", async function() {
	await open();
	await tapPerson("Mary Ann Smith-Jones");
	await tapDetail("(555) 123-4567");
	await tapDetail("www.example.org");
	await tapDetail("1 Main St.");
	assert.deepStrictEqual(await opened(), ["tel:5551234567", "http://www.example.org",
		"maploc:1%20Main%20St.%2C%2062701%20Springfield%2C%20IL%2C%20USA"]);
	assert.deepStrictEqual(await lunaCalls("com.palm.telephony"), []);
	// Text messages: on the main number, not on the fax.
	var sms = await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_contactDetails] .contacts-item'),function(e){" +
		"var b=e.querySelector('[id$=_smsBtn]');return e.querySelector('.value').textContent+':'+(!!b&&b.getBoundingClientRect().width>0);})");
	assert.ok(sms.indexOf("(555) 123-4567:true") >= 0 && sms.indexOf("555 123 4568:false") >= 0, JSON.stringify(sms));
	await page.tap("[id$=_contactDetails] .contacts-item [id$=_smsBtn]");
	assert.strictEqual((await opened())[3], "sms:5551234567?personId=p-mary");
	await tapPerson("Anna van der Berg");
	await tapDetail("anna@example.com");
	assert.strictEqual((await opened())[4], "mailto:anna@example.com");
});

t.test("details: an IM address an account can call offers chat and a call", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	await tapDetail("anna.vdberg");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_imPopup]');return e && e.getBoundingClientRect().width>0;})()");
	assert.strictEqual(await visible("[id$=_imVoiceBtn]"), true);
	assert.strictEqual(await visible("[id$=_imVideoBtn]"), false, "the Skype provider declares no video");
	await shot("details-im-popup");
	await page.tap("[id$=_imVoiceBtn]");
	var launches = await page.eval("__MOCK__.calls.filter(function(c){return /applicationManager\\/launch$/.test(c.url);}).map(function(c){return c.params;})");
	assert.deepStrictEqual(launches, [{id: "com.palm.app.phone", params: {address: "anna.vdberg", transport: "com.palm.skype"}}]);
	assert.strictEqual(await visible("[id$=_imPopup]"), false);
	await tapDetail("anna.vdberg");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_imChatBtn]');return e && e.getBoundingClientRect().width>0;})()");
	await page.tap("[id$=_imChatBtn]");
	assert.deepStrictEqual(await opened(), ["com.palm.app.phone", "im:anna.vdberg?personId=p-anna&type=skype"]);
});

t.test("details: an IM address only Messaging handles opens a chat at once", async function() {
	await open();
	await tapPerson("Gina Talk");
	var rows = await detailRows();
	var gtalk = rows.filter(function(r) { return r[0] === "Google Talk"; })[0];
	assert.ok(gtalk, JSON.stringify(rows));
	await tapDetail(gtalk[1]);
	await sleep(100);
	assert.strictEqual(await visible("[id$=_imPopup]"), false);
	assert.ok(/^im:.*&type=gtalk$/.test((await opened())[0]), JSON.stringify(await opened()));
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
	// The list and the details show the new name, not a cached old one.
	await page.waitFor("(function(){var e=document.querySelector('[id$=_header_displayName]');" +
		"return e && e.textContent==='Zoë Maria van der Ångström';})()");
	await scrollToPerson("Zoë Maria van der Ångström");
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

// --- launch ------------------------------------------------------------

async function waitForDetails(inName) {
	await page.waitFor("(function(){var e=document.querySelector('[id$=_header_displayName]');" +
		"return e && e.getBoundingClientRect().width>0 && e.textContent.indexOf(" + JSON.stringify(inName) + ")>=0;})()");
}
async function waitForEdit(inName) {
	await page.waitFor("(function(){var e=document.querySelector('[id$=_nameInput]');" +
		"return e && e.getBoundingClientRect().width>0 && e.value===" + JSON.stringify(inName) + ";})()");
}
async function relaunch(inParams) {
	await page.eval("__MOCK__.relaunch(" + JSON.stringify(inParams) + ")");
	await sleep(150);
}
function visible(inSelector) {
	return page.eval("(function(){var e=document.querySelector(" + JSON.stringify(inSelector) + ");" +
		"return !!e && e.getBoundingClientRect().width>0;})()");
}

t.test("launch: a cold launch with a person id shows that person", async function() {
	await open({launchParams: {id: "p-gina"}});
	await waitForDetails("Gina Talk");
});

t.test("launch: a cold launch with a contact id to edit opens its person's edit view", async function() {
	await open({launchParams: {launchType: "editContact", contact: {_id: "c-mary"}}});
	await waitForEdit("Dr. Mary Ann Smith-Jones, PhD");
});

t.test("launch: showPerson on relaunch, and an unknown id does nothing", async function() {
	await open();
	await relaunch({launchType: "showPerson", id: "p-emile"});
	await waitForDetails("Émile Zola");
	await relaunch({id: "no-such-id"});
	await relaunch({launchType: "editContact", person: {_id: "gone"}});
	await sleep(200);
	assert.ok((await banners()).some(function(b) { return /no longer exists/.test(b); }));
	assert.strictEqual(await text("[id$=_header_displayName]"), "Émile Zola");
});

t.test("launch: the same relaunch delivered twice (WAM event and Mojo.relaunch) is handled once", async function() {
	await open();
	await page.eval("(function(){var d={launchType:'showPerson',id:'p-emile'};" +
		"document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:d}));" +
		"document.dispatchEvent(new CustomEvent('webOSRelaunch',{detail:JSON.parse(JSON.stringify(d))}));})()");
	await waitForDetails("Émile Zola");
	var gets = (await lunaCalls("com.palm.db/get")).filter(function(c) { return c.params.ids[0] === "p-emile"; });
	assert.strictEqual(gets.length, 1);
});

t.test("launch: pseudo-card asks first, then opens a new contact with the data", async function() {
	await open();
	await relaunch({launchType: "pseudo-card", contact: {phoneNumbers: [{value: "4151234567"}],
		_kind: "com.palm.person:1", accountId: "++HnY2Qbp2pHNVFT", _id: "evil"}});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_addPrompt]');return e && e.getBoundingClientRect().width>0;})()");
	assert.ok(/4151234567/.test(await text("[id$=_addPrompt]")));
	await shot("launch-prompt");
	await page.tap("[id$=_addNewBtn]");
	await page.waitFor("(function(){var e=document.querySelector(" + JSON.stringify(row("phoneNumbers", 1) + " input") + ");" +
		"return e && e.value==='4151234567' && e.getBoundingClientRect().width>0;})()");
	await page.fill("[id$=_nameInput]", "Caller");
	await save();
	var c = (await lunaCalls("linker/saveNewPersonAndContacts"))[0].params.contacts[0];
	assert.strictEqual(c._kind, "com.palm.contact.palmprofile:1", "the launch cannot pick the kind");
	assert.strictEqual(c.accountId, "++HoXVTTqIccE0m1", "or the account");
	assert.strictEqual(c._id, undefined);
	await waitForDetails("Caller");
});

t.test("launch: newContact with skipPrompt goes straight to the edit view", async function() {
	await open({noWait: true, launchParams: {launchType: "newContact", skipPrompt: true,
		contact: {name: {givenName: "Ada", familyName: "Lovelace"}}}});
	await waitForEdit("Ada Lovelace");
	assert.strictEqual(await visible("[id$=_addPrompt]"), false);
});

t.test("launch: add to existing picks a person and adds the data to it", async function() {
	await open();
	await relaunch({launchType: "addToExisting", contact: {phoneNumbers: [{value: "555 4242", type: "type_work"}],
		emails: [{value: "gina@example.com"}]}});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_personPicker]');return e && e.getBoundingClientRect().width>0;})()");
	await page.fill("[id$=_personPicker] input", "gin");
	await page.waitFor("document.querySelectorAll('[id$=_personPicker] .contacts-item .name').length === 1");
	await shot("launch-picker");
	await page.tapText("[id$=_personPicker] .contacts-item", "Gina Talk");
	await waitForDetails("Gina Talk");
	var c = await record("c-gina");
	assert.deepStrictEqual(c.phoneNumbers, [{value: "555 4242", type: "type_work"}]);
	assert.ok(c.emails.some(function(e) { return e.value === "gina@example.com"; }));
});

t.test("launch: the prompt's Add To Existing goes to the picker; cancel writes nothing", async function() {
	await open();
	await relaunch({launchType: "newContact", contact: {emails: [{value: "x@example.com"}]}});
	await page.tap("[id$=_addToExistingBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_personPicker]');return e && e.getBoundingClientRect().width>0;})()");
	await page.tap("[id$=_personPicker] [id$=_cancelBtn]");
	await sleep(200);
	assert.deepStrictEqual(await lunaCalls("com.palm.db/merge"), []);
	assert.deepStrictEqual(await lunaCalls("linker"), []);
});

var VCARD_ONE = {contacts: [{name: {givenName: "Vera", familyName: "Card"}, emails: [{value: "vera@example.com", type: "type_work"}]}]};
var VCARD_TWO = {contacts: [{name: {givenName: "Uno", familyName: "Card"}}, {name: {givenName: "Dos", familyName: "Card"}}]};

t.test("launch: a vCard of one contact asks, then opens it as a new contact", async function() {
	await open({launchParams: {target: "file:///media/internal/one.vcf"}, vcards: {"file:///media/internal/one.vcf": VCARD_ONE}});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_addPrompt]');return e && e.getBoundingClientRect().width>0;})()");
	assert.ok(/Vera Card/.test(await text("[id$=_addPrompt]")));
	await page.tap("[id$=_addNewBtn]");
	await waitForEdit("Vera Card");
});

t.test("launch: a vCard of several contacts is imported after a question", async function() {
	await open({vcards: {"/media/internal/two.vcf": VCARD_TWO}});
	await relaunch({target: "/media/internal/two.vcf"});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_confirm]');return e && e.getBoundingClientRect().width>0;})()");
	assert.ok(/import 2 contacts/.test(await text("[id$=_confirm]")));
	await page.tap("[id$=_confirm] [id$=_okBtn]");
	await waitForList(15);
	assert.ok((await listNames()).indexOf("Uno Card") >= 0);
	assert.ok((await banners()).some(function(b) { return /2 contacts imported/.test(b); }));
});

t.test("launch: an unreadable vCard says so", async function() {
	await open();
	await relaunch({target: "file:///media/internal/missing.vcf"});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_confirm]');return e && e.getBoundingClientRect().width>0;})()");
	assert.ok(/problem reading/.test(await text("[id$=_confirm]")));
	assert.strictEqual(await visible("[id$=_confirm] [id$=_cancelBtn]"), false);
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
