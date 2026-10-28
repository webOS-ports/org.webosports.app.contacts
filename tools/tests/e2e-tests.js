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
	inOptions: {data, launchParams, width, height, luna, vcards, gal, acg, delay, firstLaunch, locale}
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
		gal: o.gal || {},
		acg: o.acg || ACG,
		delay: o.delay || 0,
		firstLaunch: !!o.firstLaunch,
		locale: o.locale || ""
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

t.test("list: Add Favorite on the Favourites tab offers the others, and makes the pick a favourite", async function() {
	await open();
	assert.strictEqual(await visible("[id$=_addFavoriteBtn]"), false, "not on the All tab");
	await page.tapText("[id$=_contactsBar_tabs] *", "Favourites");
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length === 2");
	assert.strictEqual(await visible("[id$=_addFavoriteBtn]"), true);
	await page.tap("[id$=_addFavoriteBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_personPicker]');return e && e.getBoundingClientRect().width>0;})()");
	var offered = await page.eval("(function(){var c=contactsApp.view.$.personPicker.$.list.collection,o=[];" +
		"for(var i=0;i<c.length;i++){o.push(c.at(i).get('displayName'));}return o;})()");
	assert.strictEqual(offered.length, 11, offered.join(", "));
	assert.ok(offered.indexOf("Anna van der Berg") < 0 && offered.indexOf("Émile Zola") < 0, "favourites are not offered");
	await page.fill("[id$=_personPicker] input", "gina");
	await page.waitFor("document.querySelectorAll('[id$=_personPicker] .contacts-item .name').length === 1");
	await page.tapText("[id$=_personPicker] .contacts-item", "Gina Talk");
	await page.waitFor("document.querySelectorAll('[id*=_allContactsList] .contacts-item .name').length === 3");
	assert.deepStrictEqual((await lunaCalls("service.contacts/favoritePerson")).map(function(c) { return c.params; }),
		[{personId: "p-gina"}]);
	assert.deepStrictEqual((await listNames()).sort(), ["Anna van der Berg", "Gina Talk", "Émile Zola"]);
	// The picker's other uses still offer everyone.
	await page.tapText("[id$=_contactsBar_tabs] *", "All");
	assert.strictEqual(await visible("[id$=_addFavoriteBtn]"), false);
	await relaunch({launchType: "addToExisting", contact: {emails: [{value: "x@example.com"}]}});
	await page.waitFor("(function(){var e=document.querySelector('[id$=_personPicker]');return e && e.getBoundingClientRect().width>0;})()");
	assert.strictEqual(await page.eval("contactsApp.view.$.personPicker.$.list.collection.length"), 13);
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

t.test("details and list: IM presence shows, and follows the connectors", async function() {
	await open();
	await page.eval("__MOCK__.setBuddies([" +
		"{username: 'Cowboy_Bob', serviceName: 'type_skype', availability: 4}," +
		"{username: 'anna.vdberg', serviceName: 'type_skype', availability: 2}," +
		"{username: 'anna.vdberg', serviceName: 'type_skype', availability: 0}])");
	function rowStatus(inName) {
		return page.eval("(function(){var r=Array.prototype.filter.call(document.querySelectorAll('[id*=_allContactsList] .contacts-item')," +
			"function(e){return e.querySelector('.name').textContent===" + JSON.stringify(inName) + ";})[0];" +
			"var s=r&&r.querySelector('.im-status');return s&&s.getBoundingClientRect().width>0?s.className:'';})()");
	}
	await scrollToPerson("Anna van der Berg");
	await page.waitFor("(function(){return Array.prototype.some.call(document.querySelectorAll('[id*=_allContactsList] .im-status')," +
		"function(e){return /status-available/.test(e.className)&&e.getBoundingClientRect().width>0;});})()");
	assert.ok(/status-available/.test(await rowStatus("Anna van der Berg")), "the best of the address's statuses");
	assert.strictEqual(await rowStatus("Oscar Other"), "", "no IM address, no status");

	await tapPerson("Anna van der Berg");
	var imStatus = "(function(){var r=Array.prototype.filter.call(document.querySelectorAll('[id$=_contactDetails] .contacts-item')," +
		"function(e){return e.querySelector('.value').textContent==='anna.vdberg';})[0];" +
		"var s=r&&r.querySelector('.im-status');return s&&s.getBoundingClientRect().width>0?s.className:'';})()";
	await page.waitFor("/status-available/.test(" + imStatus + ")");
	await shot("details-presence");
	// The connector reports a change: the details and the list follow.
	await page.eval("__MOCK__.setBuddies([{username: 'anna.vdberg', serviceName: 'type_skype', availability: 4}])");
	await page.waitFor("/status-offline/.test(" + imStatus + ")");
	await page.waitFor("/status-offline/.test(" + "(function(){var r=Array.prototype.filter.call(document.querySelectorAll('[id*=_allContactsList] .contacts-item')," +
		"function(e){return e.querySelector('.name').textContent==='Anna van der Berg';})[0];var s=r&&r.querySelector('.im-status');return s?s.className:'';})()" + ")");
	// No connector data: nothing shown.
	await page.eval("__MOCK__.setBuddies([])");
	await page.waitFor("(" + imStatus + ")===''");
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
	// The details slide in first (on a narrow screen, the whole card), and
	// a card just left (after a save) has to have slid away.
	await page.waitFor("contactsApp.view.$.cards.get('index') === 0 && !contactsApp.view.$.cards.transitionPoints.length && " +
		"!contactsApp.view.$.main.transitionPoints.length && " +
		"!contactsApp.view.$.detailsPanel.transitionPoints.length && (function(){" +
		"var r=document.querySelector('[id$=_editContactBtn]').getBoundingClientRect();" +
		"return r.width>0 && r.left>=0 && r.right<=window.innerWidth;})()");
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

t.test("edit: Remove Photo clears the photo on Save, and Cancel keeps it", async function() {
	await open();
	await openEdit("Anna van der Berg");
	assert.strictEqual(await visible("[id$=_removePhotoBtn]"), true);
	await page.tap("[id$=_removePhotoBtn]");
	assert.strictEqual(await visible("[id$=_removePhotoBtn]"), false);
	await shot("edit-photo-removed");
	await page.tap("[id$=_editContact_cancelBtn]");
	await waitForMainCard();
	assert.strictEqual((await record("c-anna-palm")).photos.length, 1, "cancel writes nothing");

	await openEdit("Anna van der Berg");
	await page.tap("[id$=_removePhotoBtn]");
	await save();
	await page.waitFor("(function(){var p=__MOCK__.db.byId('c-anna-palm');return p.photos.length===0;})()");
	await page.waitFor("(function(){var p=__MOCK__.db.byId('p-anna');return !p.photos.bigPhotoPath && !p.photos.listPhotoPath;})()");
	assert.deepStrictEqual((await record("c-anna-goog")).photos, undefined, "other contacts untouched");
});

t.test("edit: no Remove Photo without a photo the edit may change", async function() {
	await open();
	await openEdit("Mary Ann Smith-Jones");
	assert.strictEqual(await visible("[id$=_removePhotoBtn]"), false);
	await page.tap("[id$=_editContact_cancelBtn]");
	await waitForMainCard();
	await page.tap("[id$=_addContactBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_nameInput]');return e && e.getBoundingClientRect().width>0;})()");
	assert.strictEqual(await visible("[id$=_removePhotoBtn]"), false);
});

// --- linked profiles ---------------------------------------------------

//* [name, account line] of each profile in the open drawer.
function profileRows() {
	return page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_contactDetails] .profile-row'),function(e){" +
		"return [e.querySelector('.profile-name').textContent, e.querySelector('.profile-account').textContent];})");
}
async function openProfiles(inCount) {
	await page.tap("[id$=_profilesButton]");
	await page.waitFor("document.querySelectorAll('[id$=_contactDetails] .profile-row').length === " + inCount);
	await sleep(400);   // the drawer opens
}
async function tapProfile(inText) {
	await page.tapText("[id$=_contactDetails] .profile-row", inText);
	await page.waitFor("(function(){var e=document.querySelector('[id$=_profilePopup]');return e && e.getBoundingClientRect().width>0;})()");
	return {
		title: await text("[id$=_profileTitle]"),
		primary: await visible("[id$=_primaryBtn]"),
		remove: await visible("[id$=_removeProfileBtn]")
	};
}

t.test("profiles: the drawer lists the linked profiles, the primary first", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	assert.strictEqual(await text("[id$=_profilesCount]"), "3 linked profiles");
	await openProfiles(3);
	assert.deepStrictEqual(await profileRows(), [["Anna van der Berg", "LuneOS Account · Primary"],
		["Anna van der Berg", "Acme"], ["Anna van der Berg", "Skype"]]);
	assert.deepStrictEqual(await tapProfile("Skype"), {title: "Anna van der Berg (Skype)", primary: true, remove: false},
		"a read-only profile can not be deleted");
	await page.tap("[id$=_profileCancelBtn]");
	assert.deepStrictEqual(await tapProfile("Primary"), {title: "Anna van der Berg (LuneOS Account)", primary: false, remove: true});
	await shot("profiles");
	await page.tap("[id$=_profileCancelBtn]");
	await sleep(200);
	assert.deepStrictEqual(await lunaCalls("linker/manual"), []);
});

t.test("profiles: a person of one profile offers nothing to do to it", async function() {
	await open();
	await tapPerson("Mary Ann Smith-Jones");
	assert.strictEqual(await text("[id$=_profilesCount]"), "1 profile");
	await openProfiles(1);
	await page.tapText("[id$=_contactDetails] .profile-row", "LuneOS Account");
	await sleep(300);
	assert.strictEqual(await visible("[id$=_profilePopup]"), false);
});

t.test("profiles: unlink makes the profile a person of its own", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	await openProfiles(3);
	await tapProfile("Skype");
	await page.tap("[id$=_unlinkBtn]");
	await page.waitFor("document.querySelectorAll('[id$=_contactDetails] .profile-row').length === 2");
	assert.deepStrictEqual((await lunaCalls("linker/manualUnlink")).map(function(c) { return c.params; }),
		[{personToRemoveLinkFrom: "p-anna", contactToRemoveFromPerson: "c-anna-skype"}]);
	assert.strictEqual(await text("[id$=_profilesCount]"), "2 linked profiles");
	await page.waitFor("contactsApp.view.globalPersonCollection.length === 14");
});

t.test("profiles: set as primary puts the profile first", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	await openProfiles(3);
	await tapProfile("Acme");
	await page.tap("[id$=_primaryBtn]");
	await page.waitFor("Array.prototype.some.call(document.querySelectorAll('[id$=_contactDetails] .profile-row .profile-account')," +
		"function(e){return e.textContent==='Acme · Primary';})");
	assert.deepStrictEqual((await record("p-anna")).contactIds, ["c-anna-goog", "c-anna-palm", "c-anna-skype"]);
	assert.deepStrictEqual((await profileRows()).map(function(r) { return r[1]; }), ["Acme · Primary", "LuneOS Account", "Skype"]);
});

t.test("profiles: the person takes its name from the new primary", async function() {
	var d = data();
	d.contacts.forEach(function(c) {
		if (c._id === "c-anna-skype") {
			c.name = {givenName: "Annie", familyName: "van der Berg"};
		}
	});
	await open({data: d});
	await tapPerson("Anna van der Berg");
	await openProfiles(3);
	await tapProfile("Skype");
	await page.tap("[id$=_primaryBtn]");
	// The linker rebuilds a person when a contact changes, not when contactIds do.
	await waitForDetails("Annie van der Berg");
	assert.ok((await listNames()).indexOf("Annie van der Berg") >= 0);
});

t.test("profiles: delete this profile deletes that contact only", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	await openProfiles(3);
	await tapProfile("Acme");
	await page.tap("[id$=_removeProfileBtn]");
	await page.waitFor("document.querySelectorAll('[id$=_contactDetails] .profile-row').length === 2");
	assert.deepStrictEqual(await dbDeletes(), [["c-anna-goog"]]);
	assert.deepStrictEqual((await record("p-anna")).contactIds, ["c-anna-palm", "c-anna-skype"]);
});

t.test("profiles: Link More Profiles links a picked person in, never the person itself", async function() {
	await open();
	await tapPerson("Anna van der Berg");
	await openProfiles(3);
	await page.tap("[id$=_linkProfile]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_personPicker]');return e && e.getBoundingClientRect().width>0;})()");
	assert.ok(/Link which contact to Anna van der Berg\?/.test(await text("[id$=_personPicker] .dialog-title")));
	await page.fill("[id$=_personPicker] input", "anna");
	await page.waitFor("document.querySelectorAll('[id$=_personPicker] .contacts-item .name').length === 1");
	assert.deepStrictEqual(await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_personPicker] .contacts-item .name'),function(e){return e.textContent;})"),
		["Anna Berg"], "the person itself is not offered");
	await page.tapText("[id$=_personPicker] .contacts-item", "Anna Berg");
	await page.waitFor("document.querySelectorAll('[id$=_contactDetails] .profile-row').length === 4");
	assert.deepStrictEqual((await lunaCalls("linker/manualLink")).map(function(c) { return c.params; }),
		[{personToLinkTo: "p-anna", personToLink: "p-anna2"}]);
	assert.deepStrictEqual((await record("p-anna")).contactIds, ["c-anna-palm", "c-anna-goog", "c-anna-skype", "c-anna2"]);
	await page.waitFor("contactsApp.view.globalPersonCollection.length === 12");
	// The add-to-existing flow is not confused with it afterwards.
	assert.deepStrictEqual(await lunaCalls("com.palm.db/merge"), []);
});

// --- delete ------------------------------------------------------------

async function tapDelete() {
	await page.eval("(function(){var v=contactsApp.view.$.editContact;v.$.scroller.scrollToControl(v.$.deleteBtn);})()");
	await sleep(300);
	await page.tap("[id$=_editContact_deleteBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_deleteConfirm]');return e && e.getBoundingClientRect().width>0;})()");
	return {
		message: await text("[id$=_deleteConfirm] .dialog-message"),
		ok: await text("[id$=_deleteConfirm] [id$=_okBtn]"),
		cancel: await visible("[id$=_deleteConfirm] [id$=_cancelBtn]")
	};
}
function dbDeletes() {
	return lunaCalls("com.palm.db/del").then(function(inCalls) { return inCalls.map(function(c) { return c.params.ids; }); });
}

t.test("delete: a person of writable contacts is deleted after a question, cancel keeps it", async function() {
	await open();
	await openEdit("Mary Ann Smith-Jones");
	var dialog = await tapDelete();
	assert.deepStrictEqual(dialog, {message: "Delete Dr. Mary Ann Smith-Jones, PhD?", ok: "Delete", cancel: true});
	await page.tap("[id$=_deleteConfirm] [id$=_cancelBtn]");
	await sleep(200);
	assert.deepStrictEqual(await dbDeletes(), []);
	assert.ok(await record("c-mary"));

	await tapDelete();
	await page.tap("[id$=_deleteConfirm] [id$=_okBtn]");
	await waitForMainCard();
	await page.waitFor("contactsApp.view.globalPersonCollection.length === 12");
	assert.deepStrictEqual(await dbDeletes(), [["c-mary"]]);
	assert.strictEqual(await record("c-mary"), null);
	assert.strictEqual(await record("p-mary"), null, "the linker drops the empty person");
	assert.strictEqual(await page.eval("contactsApp.view.$.detailsPanel.index"), 0, "details show nothing");
	assert.ok((await listNames()).every(function(n) { return n.indexOf("Mary") < 0; }));
});

t.test("delete: on a narrow screen, deleting goes back to the list", async function() {
	await open({width: 480, height: 800});
	await openEdit("Mary Ann Smith-Jones");
	await tapDelete();
	await page.tap("[id$=_deleteConfirm] [id$=_okBtn]");
	await page.waitFor("contactsApp.view.globalPersonCollection.length === 12");
	await page.waitFor("contactsApp.view.$.main.index === 0 && contactsApp.view.$.cards.index === 0");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_inputSearchStretch_input]');" +
		"var r=e&&e.getBoundingClientRect();return r && r.width>0 && r.left>=0 && r.left<480;})()");
});

t.test("delete: read-only profiles stay, the others go after saying so", async function() {
	await open();
	await openEdit("Anna van der Berg");
	var dialog = await tapDelete();
	assert.deepStrictEqual(dialog, {message: "Skype profiles cannot be deleted. Delete all other profiles?",
		ok: "Delete other profiles", cancel: true});
	await shot("delete-confirm");
	await page.tap("[id$=_deleteConfirm] [id$=_okBtn]");
	await waitForMainCard();
	assert.deepStrictEqual(await dbDeletes(), [["c-anna-palm", "c-anna-goog"]]);
	assert.ok(await record("c-anna-skype"));
	assert.deepStrictEqual((await record("p-anna")).contactIds, ["c-anna-skype"]);
	await waitForDetails("Anna");
});

t.test("delete: a person of read-only contacts only can not be deleted", async function() {
	await open();
	await openEdit("Bob Cowboy");
	assert.deepStrictEqual(await tapDelete(), {message: "Skype profiles cannot be deleted.", ok: "OK", cancel: false});
	await page.tap("[id$=_deleteConfirm] [id$=_okBtn]");
	await sleep(200);
	assert.deepStrictEqual(await dbDeletes(), []);
	assert.ok(await visible("[id$=_editContact_doneBtn]"), "still editing");
});

t.test("delete: a person left without contacts is deleted through the linker", async function() {
	var d = data();
	d.persons.push({_id: "p-orphan", favorite: false, contactIds: ["c-orphan"]});
	d.contacts.push({_id: "c-orphan", _kind: "com.palm.contact.palmprofile:1", accountId: PALM, name: {givenName: "Orphan", familyName: "Annie"}});
	await open({data: d});
	await openEdit("Orphan Annie");
	// The contact goes elsewhere (a sync) while the person is being edited.
	await page.eval("__MOCK__.db.remove('c-orphan')");
	await page.eval("contactsApp.view.$.editContact.contacts = []");
	var dialog = await tapDelete();
	assert.strictEqual(dialog.ok, "Delete");
	await page.tap("[id$=_deleteConfirm] [id$=_okBtn]");
	await waitForMainCard();
	var calls = await lunaCalls("deleteOrphanedPerson");
	assert.deepStrictEqual(calls.map(function(c) { return c.params; }), [{personId: "p-orphan"}]);
	assert.strictEqual(await record("p-orphan"), null);
	assert.deepStrictEqual(await dbDeletes(), []);
});

t.test("delete: a new contact has no Delete", async function() {
	await open();
	await page.tap("[id$=_addContactBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_nameInput]');return e && e.getBoundingClientRect().width>0;})()");
	assert.strictEqual(await visible("[id$=_editContact_deleteBtn]"), false);
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

// --- preferences -------------------------------------------------------

var GOOGLE = "++HqVF6BEhSPSfq0", PALM = "++HoXVTTqIccE0m1", SIM = "++HoXVohVCoSQNS7", SKYPE = "++HnY2Qbp2pHNVFT";

// The status bar's app name: WAM relaunches with palm-command
// "open-app-menu", and enyo-luneos turns that into a menubutton event.
async function menuButton() {
	await page.eval("__MOCK__.relaunch({'palm-command': 'open-app-menu'}); document.dispatchEvent(new Event('menubutton'))");
}
async function openPrefs() {
	await menuButton();
	await page.waitFor("(function(){var e=document.querySelector('[id$=_prefsMenuItem]');return e && e.getBoundingClientRect().width>0;})()");
	await page.tap("[id$=_prefsMenuItem]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_preferences] [id$=_doneBtn]');" +
		"return e && e.getBoundingClientRect().width>0 && e.getBoundingClientRect().left>=0 && e.getBoundingClientRect().left<1024;})()");
	await page.waitFor("document.querySelectorAll('[id$=_preferences] .prefs-account').length > 0");
}
async function closePrefs() {
	await page.tap("[id$=_preferences] [id$=_doneBtn]");
	await waitForMainCard();
}
function waitForMainCard() {
	return page.waitFor("(function(){var e=document.querySelector('[id$=_inputSearchStretch_input]');" +
		"var r=e&&e.getBoundingClientRect();return r && r.width>0 && r.left>=0 && r.left<1024;})() && !contactsApp.view.$.cards.transitionPoints.length");
}
function prefsRecord() {
	return page.eval("JSON.parse(JSON.stringify(__MOCK__.db.all('com.palm.app.contacts.prefs:1')[0] || null))");
}
function accountRows() {
	return page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_preferences] .prefs-account'), function(e){" +
		"return [e.querySelector('.prefs-account-name').textContent, e.querySelector('.prefs-account-count').textContent];})");
}

t.test("prefs: the app menu opens Preferences & Accounts, a second tap closes it, Done goes back", async function() {
	await open();
	await menuButton();
	await page.waitFor("(function(){var e=document.querySelector('[id$=_prefsMenuItem]');return e && e.getBoundingClientRect().width>0;})()");
	await menuButton();
	await page.waitFor("(function(){var e=document.querySelector('[id$=_prefsMenuItem]');return !e || e.getBoundingClientRect().width===0;})()");
	await openPrefs();
	assert.strictEqual(await page.eval("document.querySelector('[id$=_sortOrder]').value"), "LAST_FIRST");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_defaultAccount]').value"), PALM);
	// The default account offers only the accounts new contacts can go to.
	assert.deepStrictEqual(await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_defaultAccount] option'),function(o){return o.value;}).sort()"),
		[GOOGLE, PALM].sort());
	await page.waitFor("Array.prototype.every.call(document.querySelectorAll('[id$=_preferences] .prefs-account-count'),function(e){return e.textContent;})");
	var rows = await accountRows();
	assert.deepStrictEqual(rows.slice().sort(), [["Acme", "4 contacts"], ["LuneOS Account", "8 contacts"],
		["SIM", "1 contact"], ["Skype", "2 contacts"]], JSON.stringify(rows));
	await shot("prefs");
	await closePrefs();
	// The relaunch for the menu is not a launch request.
	assert.strictEqual((await lunaCalls("com.palm.db/put")).length, 0);
});

t.test("prefs: back closes Preferences", async function() {
	await open();
	await openPrefs();
	await page.eval("document.dispatchEvent(new Event('backgesture'))");
	await waitForMainCard();
});

t.test("prefs: the list order is stored, and the list and its dividers follow it", async function() {
	await open();
	await openPrefs();
	await selectValue("[id$=_sortOrder]", "FIRST_LAST");
	await page.waitFor("(function(){var p=__MOCK__.db.all('com.palm.app.contacts.prefs:1')[0];return p && p.listSortOrder==='FIRST_LAST';})()");
	await closePrefs();
	// The contacts service writes the sort keys for the new order; the list follows.
	await page.waitFor("(function(){var c=contactsApp.view.$.contactsBar.$.allContactsList.collection;" +
		"return c.length===13 && c.at(0).get('displayName')==='Anna Berg' && c.at(1).get('displayName')==='Anna van der Berg';})()");
	var groups = await listGroups(), all = JSON.stringify(groups);
	var under = {}, current = "";
	groups.forEach(function(g) { current = g[1] || current; under[g[0]] = current; });
	assert.strictEqual(under["Zoë Ångström"], "Z", all);
	assert.strictEqual(under["Émile Zola"], "E", all);
	assert.strictEqual(under["Bob Cowboy"], "B", all);

	await openPrefs();
	await selectValue("[id$=_sortOrder]", "COMPANY_LAST_FIRST");
	await closePrefs();
	await page.waitFor("(function(){var c=contactsApp.view.$.contactsBar.$.allContactsList.collection;" +
		"return c.length===13 && c.at(0).get('displayName')==='Anna van der Berg';})()");
	groups = await listGroups();
	all = JSON.stringify(groups);
	under = {};
	groups.forEach(function(g) { current = g[1] || current; under[g[0]] = current; });
	assert.strictEqual(under["Anna van der Berg"], "A", "company Acme: " + all);
	assert.strictEqual(under["Globex Corporation"], "G", all);
	assert.strictEqual(under["Bob Cowboy"], "#", "no company: " + all);
	assert.strictEqual((await prefsRecord()).listSortOrder, "COMPANY_LAST_FIRST");
	await shot("prefs-company-order");
});

t.test("prefs: the default account is stored and new contacts go there", async function() {
	await open();
	await openPrefs();
	await selectValue("[id$=_defaultAccount]", GOOGLE);
	await page.waitFor("(function(){var p=__MOCK__.db.all('com.palm.app.contacts.prefs:1')[0];return p && p.defaultAccountId===" +
		JSON.stringify(GOOGLE) + ";})()");
	await closePrefs();
	await page.tap("[id$=_addContactBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_accountSelect]');return e && e.getBoundingClientRect().width>0;})()");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_accountSelect]').value"), GOOGLE);
});

t.test("prefs: accounts open in the Accounts app; Sync Now starts each account's sync", async function() {
	await open();
	await openPrefs();
	await page.tapText("[id$=_preferences] .prefs-account", "Acme");
	await page.tap("[id$=_addAccountBtn]");
	var launches = (await lunaCalls("applicationManager/launch")).map(function(c) { return c.params; });
	assert.deepStrictEqual(launches, [
		{id: "com.palm.app.accounts", params: {accountId: GOOGLE, capability: "CONTACTS"}},
		{id: "com.palm.app.accounts", params: {capability: "CONTACTS", launchType: "add"}}
	]);
	await page.tap("[id$=_syncNowBtn]");
	await sleep(200);
	var syncs = (await lunaCalls("activitymanager/create")).map(function(c) { return c.params.activity.callback; });
	assert.deepStrictEqual(syncs.sort(function(a, b) { return a.method < b.method ? -1 : 1; }), [
		{method: "palm://com.palm.service.contacts.google/sync", params: {accountId: GOOGLE}},
		{method: "palm://com.palm.service.contacts.sim/sync", params: {accountId: SIM}},
		{method: "palm://com.palm.skype/sync", params: {accountId: SKYPE}}
	]);
	assert.ok((await banners()).some(function(b) { return /Syncing/.test(JSON.stringify(b)); }));
});

t.test("prefs: an account added in the Accounts app shows when Preferences opens again", async function() {
	await open();
	await openPrefs();
	assert.strictEqual((await accountRows()).length, 4);
	await closePrefs();
	var added = data().accounts.concat([{_id: "acct-new", templateId: "com.example.carddav", alias: "CardDAV", username: "me@example.org",
		capabilityProviders: [{capability: "CONTACTS", id: "com.example.carddav.contacts", sync: "palm://com.example.carddav/sync",
			dbkinds: {contact: "com.example.carddav.contact:1"}}]}]);
	await page.eval("__MOCK__.setAccounts(" + JSON.stringify(added) + ")");
	await openPrefs();
	await page.waitFor("document.querySelectorAll('[id$=_preferences] .prefs-account').length === 5");
	await page.waitFor("Array.prototype.some.call(document.querySelectorAll('[id$=_preferences] .prefs-account'),function(e){return e.textContent.indexOf('0 contacts')>=0;})");
});

// --- first use ---------------------------------------------------------

function waitForFirstLaunch() {
	return page.waitFor("contactsApp.view.$.cards.getActive() === contactsApp.view.$.firstLaunch && " +
		"!contactsApp.view.$.cards.transitionPoints.length && " +
		"(function(){var e=document.querySelector('[id$=_firstLaunch] [id$=_doneBtn]');var r=e&&e.getBoundingClientRect();" +
		"return r && r.width>0 && r.left>=0 && r.left<1024;})()");
}
function firstLaunchView() {
	return page.eval("(function(){var v=contactsApp.view.$.firstLaunch.$;return {title: v.title.content, welcome: v.welcome.content, " +
		"existing: v.existing.showing && v.existing.hasNode().getBoundingClientRect().height > 0, " +
		"rows: Array.prototype.map.call(document.querySelectorAll('.first-launch .prefs-account-name'),function(e){return e.textContent;})};})()");
}
function firstLaunchRecords() {
	return page.eval("__MOCK__.db.all('com.palm.firstlaunch:1').map(function(r){return r.appId;})");
}
function launches() {
	return page.eval("__MOCK__.calls.filter(function(c){return /applicationManager\\/launch$/.test(c.url);}).map(function(c){return c.params;})");
}

t.test("first use: shown at the first launch, lists the accounts, and Done remembers it", async function() {
	await open({firstLaunch: true, noWait: true});
	await waitForFirstLaunch();
	var v = await firstLaunchView();
	assert.strictEqual(v.title, "Your contacts accounts");
	assert.strictEqual(v.welcome, "Get started with your existing accounts:");
	assert.strictEqual(v.existing, true);
	assert.strictEqual(v.rows.length, 3, "the contacts accounts but the device's own: " + v.rows);
	assert.ok(v.rows.indexOf("Acme") >= 0 && v.rows.indexOf("Skype") >= 0, v.rows.join());
	await shot("first-launch-accounts");
	assert.deepStrictEqual(await firstLaunchRecords(), [], "not remembered before Done");
	await menuButton();
	await sleep(300);
	assert.strictEqual(await visible("[id$=_prefsMenuItem]"), false, "no app menu over First use");
	await page.tap("[id$=_firstLaunch] [id$=_doneBtn]");
	await waitForMainCard();
	await waitForList();
	assert.deepStrictEqual(await firstLaunchRecords(), ["com.palm.app.contacts"]);
	assert.strictEqual((await lunaCalls("com.palm.db/put")).filter(function(c) {
		return c.params.objects[0]._kind === "com.palm.firstlaunch:1";
	}).length, 1);
});

t.test("first use: a new device is welcomed; Add an Account opens the Accounts app, the account shows on return", async function() {
	var d = data();
	d.accounts = d.accounts.filter(function(inA) { return inA.templateId === "com.palm.palmprofile"; });
	await open({data: d, firstLaunch: true, noWait: true});
	await waitForFirstLaunch();
	var v = await firstLaunchView();
	assert.deepStrictEqual(v, {title: "Welcome!", welcome: "To get started, set up a Contacts account", existing: false, rows: []});
	await shot("first-launch-welcome");
	await page.tap("[id$=_firstLaunch] [id$=_addAccountBtn]");
	await sleep(150);
	assert.deepStrictEqual(await launches(), [{id: "com.palm.app.accounts", params: {capability: "CONTACTS", launchType: "add"}}]);
	// Back from the Accounts app with a Google account.
	await page.eval("__MOCK__.setAccounts(" + JSON.stringify(data().accounts) + "); document.dispatchEvent(new Event('activate'))");
	await page.waitFor("document.querySelectorAll('.first-launch .prefs-account').length === 3");
	v = await firstLaunchView();
	assert.strictEqual(v.title, "Your contacts accounts");
	assert.strictEqual(v.existing, true);
	await page.eval("Array.prototype.filter.call(document.querySelectorAll('.first-launch .prefs-account'),function(e){" +
		"return e.textContent.indexOf('Acme')>=0;})[0].setAttribute('data-acme','1')");
	await page.tap(".first-launch [data-acme] .prefs-account-name");
	await sleep(150);
	assert.deepStrictEqual((await launches()).pop(), {id: "com.palm.app.accounts", params: {accountId: GOOGLE, capability: "CONTACTS"}});
	assert.strictEqual(await page.eval("contactsApp.view.$.cards.getActive() === contactsApp.view.$.firstLaunch"), true);
});

t.test("first use: back leaves it for good; not over another app's launch, nor once shown", async function() {
	await open({firstLaunch: true, noWait: true});
	await waitForFirstLaunch();
	await page.eval("document.dispatchEvent(new Event('backgesture'))");
	await waitForMainCard();
	assert.deepStrictEqual(await firstLaunchRecords(), ["com.palm.app.contacts"]);

	await open({firstLaunch: true, noWait: true, launchParams: {id: "p-anna"}});
	await waitForDetails("Anna");
	await sleep(300);
	assert.strictEqual(await page.eval("contactsApp.view.$.cards.get('index')"), 0, "the person, not First use");
	assert.deepStrictEqual(await firstLaunchRecords(), []);

	await open();
	await sleep(300);
	assert.strictEqual(await page.eval("contactsApp.view.$.cards.get('index')"), 0);
	assert.strictEqual((await lunaCalls("com.palm.db/find")).filter(function(c) {
		return c.params.query.from === "com.palm.firstlaunch:1";
	}).length, 1, "checked once");
});

// --- global address lookup ---------------------------------------------

// An Exchange account as the legacy com.palm.eas template had it: its
// REMOTECONTACTS provider names the GAL query.
var EAS_ACCOUNT = {_id: "acct-eas", templateId: "com.palm.eas", alias: "Exchange", username: "me@corp.example",
	capabilityProviders: [{capability: "REMOTECONTACTS", id: "com.palm.eas.remotecontacts",
		implementation: "palm://com.palm.eas/", query: "palm://com.palm.eas/queryGal"}]};
// What the legacy EasGalContactAdapter wrote for an entry.
var GAL_ENTRIES = [
	{displayName: "Berg, Annelies", givenName: "Annelies", familyName: "Berg", companyName: "Acme", jobTitle: "Lawyer",
		phoneNumbers: [{value: "+31 20 555 0300", type: "type_work"}, {value: "+31 6 5550 0301", type: "type_mobile"}],
		emails: [{value: "annelies.berg@corp.example", type: "type_work"}],
		addresses: [{value: "Damrak 1, 1012 LG Amsterdam", type: "type_work"}]},
	{displayName: "Annex Meeting Room", emails: [{value: "annex@corp.example", type: "type_work"}]},
	{displayName: "Zander Zee", givenName: "Zander", familyName: "Zee", emails: [{value: "zz@corp.example", type: "type_work"}]}
];
// com.palm.eas has no ACG table on LuneOS yet (see the test below), and
// org.example.gal is made up: let them through here.
function galAcg() {
	return {groups: ACG.groups, granted: ACG.granted, exempt: ["^luna://com\\.palm\\.eas/", "^luna://org\\.example\\.gal/"]};
}
async function openGal(inOptions) {
	var d = data(), o = inOptions || {};
	d.accounts = d.accounts.concat(o.accounts || [EAS_ACCOUNT]);
	await open({data: d, gal: o.gal || {"acct-eas": GAL_ENTRIES}, acg: galAcg(), luna: o.luna});
}
function galShowing() {
	return visible("[id$=_galSearchBtn]");
}
function galItems() {
	return page.eval("Array.prototype.map.call(document.querySelectorAll('.gal-item'),function(e){return e.textContent;})");
}
function galMessage() {
	return page.eval("(function(){var e=document.querySelector('.gal-message');" +
		"return e && e.getBoundingClientRect().height>0 ? e.textContent : '';})()");
}

t.test("gal: searching All offers the global address list; a result shows read-only and can be added", async function() {
	await openGal();
	assert.strictEqual(await galShowing(), false, "not without a search");
	await search("anne", 0);
	assert.strictEqual(await galShowing(), true);
	await page.tapText("[id$=_tabs] .onyx-radiobutton", "Favourites");
	await sleep(200);
	assert.strictEqual(await galShowing(), false, "not on Favourites");
	await page.tapText("[id$=_tabs] .onyx-radiobutton", "All");
	await page.waitFor("document.querySelector('[id$=_galSearchBtn]').getBoundingClientRect().width > 0");
	await page.tap("[id$=_galSearchBtn]");
	await page.waitFor("document.querySelectorAll('.gal-item').length === 2");
	assert.deepStrictEqual(await galItems(), ["Annex Meeting Room", "Berg, Annelies"], "sorted by name");
	assert.deepStrictEqual((await lunaCalls("com.palm.eas/queryGal")).map(function(c) { return c.params; }),
		[{accountId: "acct-eas", query: "anne", limit: 100}]);
	assert.strictEqual(await galMessage(), "");
	await shot("gal-results");

	await page.tapText(".gal-item", "Berg, Annelies");
	await waitForDetails("Annelies Berg");
	assert.strictEqual(await text("[id$=_header_job]"), "Lawyer, Acme");
	var rows = await detailRows();
	assert.ok(rows.some(function(r) { return r[0] === "Work" && r[1] === "+31 20 555 0300"; }), JSON.stringify(rows));
	assert.ok(rows.some(function(r) { return r[0] === "Mobile" && r[1] === "+31 6 5550 0301"; }));
	assert.ok(rows.some(function(r) { return r[1] === "annelies.berg@corp.example"; }));
	assert.ok(rows.some(function(r) { return r[1] === "Damrak 1, 1012 LG Amsterdam"; }));
	assert.strictEqual(await visible("[id$=_editContactBtn]"), false, "no edit");
	assert.strictEqual(await visible("[id$=_header_favourite]"), false, "no favourite");
	assert.strictEqual(await visible("[id$=_header_profilesButton]"), false, "no linked profiles");
	assert.strictEqual(await visible("[id$=_addToContactsBtn]"), true);
	await shot("gal-details");

	await page.tap("[id$=_addToContactsBtn]");
	await page.waitFor("(function(){var e=document.querySelector('[id$=_addPrompt]');return e && e.getBoundingClientRect().width>0;})()");
	await page.tap("[id$=_addNewBtn]");
	await waitForEdit("Annelies Berg");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_organizationInput]').value"), "Acme");
	await save();
	var c = (await lunaCalls("linker/saveNewPersonAndContacts"))[0].params.contacts[0];
	assert.deepStrictEqual([c.name.givenName, c.name.familyName], ["Annelies", "Berg"]);
	assert.deepStrictEqual(c.phoneNumbers.map(function(p) { return p.value; }), ["+31 20 555 0300", "+31 6 5550 0301"]);
	assert.strictEqual(c.emails[0].value, "annelies.berg@corp.example");
	assert.strictEqual(c.organizations[0].name, "Acme");
	await waitForDetails("Annelies Berg");
	assert.strictEqual(await visible("[id$=_editContactBtn]"), true, "now a contact of the device");
	assert.strictEqual(await visible("[id$=_addToContactsBtn]"), false);
});

t.test("gal: none found, over 100, a failing account skipped, and a new search drops the old results", async function() {
	var many = [];
	for (var i = 0; i < 120; i++) {
		many.push({displayName: "Anne " + (1000 + i), emails: [{value: "ann" + i + "@big.example", type: "type_work"}]});
	}
	var other = {_id: "acct-other", templateId: "org.example.gal", alias: "Directory",
		capabilityProviders: [{capability: "REMOTECONTACTS", query: "palm://org.example.gal/query"}]};
	await openGal({accounts: [EAS_ACCOUNT, other], gal: {"acct-eas": many},
		luna: {"luna://org.example.gal/query": {error: {errorCode: -1, errorText: "offline"}}}});
	await search("anne", 0);
	await page.tap("[id$=_galSearchBtn]");
	await page.waitFor("document.querySelectorAll('.gal-item').length === 100");
	assert.strictEqual(await galMessage(), "Over 100 results found. Please narrow your search query.");
	assert.strictEqual((await lunaCalls("org.example.gal/query")).length, 1, "the other account was asked too");

	await search("annq", 0);
	assert.deepStrictEqual(await galItems(), [], "a new search drops the old results");
	assert.strictEqual(await galMessage(), "");
	await page.tap("[id$=_galSearchBtn]");
	await page.waitFor("(function(){var e=document.querySelector('.gal-message');return e && e.textContent.length > 0;})()");
	assert.strictEqual(await galMessage(), "No search results found");

	// An answer that comes after the search changed is not shown.
	await page.eval("__MOCK__.set('luna://com.palm.eas/queryGal', {json: {results: [{displayName: 'Late Larry'}]}, delay: 500})");
	await page.tap("[id$=_galSearchBtn]");
	await search("anne", 0);
	await sleep(800);
	assert.deepStrictEqual(await galItems(), []);
	assert.strictEqual(await galMessage(), "");
	assert.strictEqual(await visible(".gal-spinner"), false);
});

t.test("gal: no section without an account that has one; LuneOS's hub has no ACG group for com.palm.eas yet", async function() {
	await open();
	await search("anne", 0);
	assert.strictEqual(await galShowing(), false);

	// With the device's ACG tables the query is refused: whoever packages
	// mojomail-eas gives com.palm.eas/queryGal an ACG group, and this app
	// asks for it in appinfo.json; this test then fails, as a reminder.
	var d = data();
	d.accounts = d.accounts.concat([EAS_ACCOUNT]);
	await open({data: d, gal: {"acct-eas": GAL_ENTRIES}});
	await search("anne", 0);
	await page.tap("[id$=_galSearchBtn]");
	await page.waitFor("(function(){var e=document.querySelector('.gal-message');return e && e.textContent.length > 0;})()");
	assert.strictEqual(await galMessage(), "No search results found", "a refused account is skipped");
	var calls = await page.eval("__MOCK__.calls.filter(function(c){return /com\\.palm\\.eas\\/queryGal/.test(c.url);}).map(function(c){return c.acg;})");
	assert.deepStrictEqual(calls, ["unknown"]);
	await page.eval("__MOCK__.calls.forEach(function(c){if(/com\\.palm\\.eas\\//.test(c.url)){c.acg='expected-denial: '+c.acg;}})");
});

// --- localisation ------------------------------------------------------

function resourceFetches() {
	return page.eval("performance.getEntriesByType('resource').map(function(e){return e.name;})" +
		".filter(function(n){return /\\/resources\\//.test(n);}).map(function(n){return n.replace(/^.*\\/resources\\//, '');})");
}

t.test("localisation: German strings, labels and dates, from resources/de", async function() {
	await open({locale: "de_de"});
	assert.deepStrictEqual(await resourceFetches(), ["de/strings.json"]);
	assert.deepStrictEqual(await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_tabs] .onyx-radiobutton')," +
		"function(e){return e.textContent;})"), ["Alle", "Favoriten"]);
	assert.strictEqual(await page.eval("document.querySelector('[id$=_inputSearchStretch_input]').placeholder"), "Suchen");
	await tapPerson("Anna van der Berg");
	var rows = await detailRows();
	assert.ok(rows.some(function(r) { return r[0] === "Geburtstag" && r[1] === "14. März 1980"; }), JSON.stringify(rows));
	assert.ok(rows.some(function(r) { return r[0] === "Handy"; }), JSON.stringify(rows));
	await shot("details-de");
	await openEdit("Anna van der Berg");
	assert.strictEqual(await text("[id$=_editContact] [id$=_doneBtn]"), "Speichern");
	assert.strictEqual(await page.eval("document.querySelector('[id$=_nameInput]').placeholder"), "Name");
	await shot("edit-de");
});

t.test("localisation: a language without strings stays English, and fetches nothing", async function() {
	await open({locale: "nl-NL"});
	assert.deepStrictEqual(await resourceFetches(), []);
	assert.deepStrictEqual(await page.eval("Array.prototype.map.call(document.querySelectorAll('[id$=_tabs] .onyx-radiobutton')," +
		"function(e){return e.textContent;})"), ["All", "Favourites"]);
	await tapPerson("Anna van der Berg");
	assert.ok((await detailRows()).some(function(r) { return r[0] === "Birthday" && r[1] === "March 14, 1980"; }));
	await open({locale: "fr-FR"});
	await tapPerson("Anna van der Berg");
	assert.ok((await detailRows()).some(function(r) { return r[0] === "Anniversaire" && r[1] === "14 mars 1980"; }),
		JSON.stringify(await detailRows()));
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
