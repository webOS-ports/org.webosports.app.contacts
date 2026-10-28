/*
	Unit tests of the pure helpers in src/util/ (no browser needed).

		node tools/tests/unit-tests.js
		TEST_FILTER=names node tools/tests/unit-tests.js
*/
var fs = require("fs");
var path = require("path");
var t = require("./lib/harness.js");
var assert = t.assert;

var SRC = path.resolve(__dirname, "..", "..", "src", "util");
var names = require(path.join(SRC, "names.js"));
var labels = require(path.join(SRC, "labels.js"));
var accountRules = require(path.join(SRC, "accountRules.js"));
var contactEdit = require(path.join(SRC, "contactEdit.js"));
var launch = require(path.join(SRC, "launch.js"));
var details = require(path.join(SRC, "details.js"));
var search = require(path.join(SRC, "search.js"));
var profiles = require(path.join(SRC, "profiles.js"));
var presence = require(path.join(SRC, "presence.js"));
var l10n = require(path.join(SRC, "l10n.js"));
var gal = require(path.join(SRC, "gal.js"));

var ROOT = path.resolve(__dirname, "..", "..");
var DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "mock", "db8-data.json"), "utf8"));
var ACCOUNTS = JSON.parse(fs.readFileSync(path.join(ROOT, "mock", "com.palm.service.accounts", "listAccounts.json"), "utf8")).results;
var PALM = "++HoXVTTqIccE0m1", GOOGLE = "++HqVF6BEhSPSfq0";

function contact(inId) {
	return JSON.parse(JSON.stringify(DATA.contacts.filter(function(inC) { return inC._id === inId; })[0]));
}
function person(inId) {
	return JSON.parse(JSON.stringify(DATA.persons.filter(function(inP) { return inP._id === inId; })[0]));
}
function contactsOf(inPersonId) {
	return person(inPersonId).contactIds.map(contact);
}
// What the edit view hands back when the user changed nothing.
function untouched(inState) {
	return JSON.parse(JSON.stringify({favorite: inState.favorite, single: inState.single, lists: inState.lists}));
}

// --- names -------------------------------------------------------------

function parsed(inText) {
	var n = names.parse(inText);
	return [n.honorificPrefix, n.givenName, n.middleName, n.familyName, n.honorificSuffix];
}

t.test("names: given, middle and family name", function() {
	assert.deepStrictEqual(parsed("Mary Ann Smith"), ["", "Mary", "Ann", "Smith", ""]);
	assert.deepStrictEqual(parsed("  John   Paul  George  Ringo "), ["", "John", "Paul George", "Ringo", ""]);
});
t.test("names: one word is a given name, unless it has a title", function() {
	assert.deepStrictEqual(parsed("Anna"), ["", "Anna", "", "", ""]);
	assert.deepStrictEqual(parsed("Dr. Roberts"), ["Dr.", "", "", "Roberts", ""]);
});
t.test("names: particles stay with the family name", function() {
	assert.deepStrictEqual(parsed("Anna van der Berg"), ["", "Anna", "", "van der Berg", ""]);
	assert.deepStrictEqual(parsed("Herman van Hazendonk"), ["", "Herman", "", "van Hazendonk", ""]);
	assert.deepStrictEqual(parsed("Ludwig van Beethoven"), ["", "Ludwig", "", "van Beethoven", ""]);
	assert.deepStrictEqual(parsed("Maria de la Cruz"), ["", "Maria", "", "de la Cruz", ""]);
	assert.deepStrictEqual(parsed("Zoë Maria van der Ångström"), ["", "Zoë", "Maria", "van der Ångström", ""]);
	// A capitalised "Van" at the start is a given name.
	assert.deepStrictEqual(parsed("Van Morrison"), ["", "Van", "", "Morrison", ""]);
});
t.test("names: titles and suffixes", function() {
	assert.deepStrictEqual(parsed("Dr. Mary Ann Smith-Jones, PhD"), ["Dr.", "Mary", "Ann", "Smith-Jones", "PhD"]);
	assert.deepStrictEqual(parsed("Prof. Dr. Hans-Peter von Weizsäcker Jr."), ["Prof. Dr.", "Hans-Peter", "", "von Weizsäcker", "Jr."]);
	assert.deepStrictEqual(parsed("Martin Luther King, Jr."), ["", "Martin", "Luther", "King", "Jr."]);
	assert.deepStrictEqual(parsed("Mevr. Els de Vries"), ["Mevr.", "Els", "", "de Vries", ""]);
});
t.test("names: family name first with a comma", function() {
	assert.deepStrictEqual(parsed("Smith, John Paul"), ["", "John", "Paul", "Smith", ""]);
	assert.deepStrictEqual(parsed("van der Berg, Anna"), ["", "Anna", "", "van der Berg", ""]);
});
t.test("names: conjunctions keep couples together", function() {
	assert.deepStrictEqual(parsed("John and Mary Smith"), ["", "John and Mary", "", "Smith", ""]);
});
t.test("names: CJK names are family name first, without spaces", function() {
	assert.deepStrictEqual(parsed("李小龙"), ["", "小龙", "", "李", ""]);
	assert.deepStrictEqual(parsed("李 小龙"), ["", "小龙", "", "李", ""]);
	assert.strictEqual(names.format({givenName: "小龙", familyName: "李"}), "李小龙");
});
t.test("names: format puts the parts back, and round trips", function() {
	assert.strictEqual(names.format({honorificPrefix: "Dr.", givenName: "Mary", middleName: "Ann", familyName: "Smith-Jones",
		honorificSuffix: "PhD"}), "Dr. Mary Ann Smith-Jones, PhD");
	assert.strictEqual(names.format({givenName: "Ann", honorificSuffix: ", Esq."}), "Ann, Esq.");
	assert.strictEqual(names.format({}), "");
	assert.strictEqual(names.format(null), "");
	["Dr. Mary Ann Smith-Jones, PhD", "Anna van der Berg", "John Paul Smith", "Anna", "Dr. Roberts"].forEach(function(inText) {
		assert.strictEqual(names.format(names.parse(inText)), inText);
	});
});
t.test("names: bad input does not throw", function() {
	[undefined, null, "", "   ", ",", ", ,", "Dr.", "and", 42, {}].forEach(function(inValue) {
		names.parse(inValue);
		names.format(inValue);
	});
	assert.deepStrictEqual(parsed(","), ["", "", "", "", ""]);
	assert.deepStrictEqual(parsed("Dr."), ["", "Dr.", "", "", ""], "a lone title is kept as the name");
});
t.test("names: equal ignores missing parts and outer spaces", function() {
	assert.ok(names.equal({givenName: "Anna", familyName: ""}, {givenName: " Anna"}));
	assert.ok(!names.equal({givenName: "Anna"}, {givenName: "Anna", middleName: "M"}));
});

// --- labels ------------------------------------------------------------

t.test("labels: known, unknown and custom types", function() {
	assert.strictEqual(labels.label("phoneNumbers", "type_work_fax"), "Work fax");
	assert.strictEqual(labels.label("phoneNumbers", "type_satellite"), "Satellite");
	assert.strictEqual(labels.label("urls", "type_custom", "Band page"), "Band page");
	assert.strictEqual(labels.label("emails", undefined), "Other");
});
t.test("labels: a picker offers the entry's own type too", function() {
	var choices = labels.choicesFor("phoneNumbers", "type_car").map(function(inC) { return inC.value; });
	assert.strictEqual(choices[0], "type_car");
	assert.ok(choices.indexOf("type_mobile") > 0);
	assert.strictEqual(labels.choicesFor("emails", "type_home").length, 3);
});

// --- accountRules ------------------------------------------------------

t.test("accountRules: read-only contacts", function() {
	assert.strictEqual(accountRules.isReadOnly(contact("c-anna-palm"), ACCOUNTS), false);
	assert.strictEqual(accountRules.isReadOnly(contact("c-anna-goog"), ACCOUNTS), false);
	assert.strictEqual(accountRules.isReadOnly(contact("c-anna-skype"), ACCOUNTS), true, "readOnlyData provider");
	assert.strictEqual(accountRules.isReadOnly(contact("c-sim"), ACCOUNTS), true, "SIM sdn entry");
	assert.strictEqual(accountRules.isReadOnly({accountId: "gone", _kind: "com.palm.contact.google:1"}, ACCOUNTS), true, "no account");
	assert.strictEqual(accountRules.isReadOnly({accountId: PALM, _kind: "com.palm.contact.libpurple:1"}, ACCOUNTS), true, "libpurple");
	assert.strictEqual(accountRules.isReadOnly(null, ACCOUNTS), true);
});
t.test("accountRules: accounts new contacts can go to", function() {
	var w = accountRules.writableAccounts(ACCOUNTS).map(function(inA) { return inA.templateId; }).sort();
	assert.deepStrictEqual(w, ["com.palm.google", "com.palm.palmprofile"]);
	assert.strictEqual(accountRules.writableAccounts(ACCOUNTS).filter(function(inA) { return inA.accountId === GOOGLE; })[0].kind,
		"com.palm.contact.google:1");
});
t.test("accountRules: default account is the pref, else palmprofile, else the first writable", function() {
	assert.strictEqual(accountRules.defaultAccount(ACCOUNTS, GOOGLE).accountId, GOOGLE);
	assert.strictEqual(accountRules.defaultAccount(ACCOUNTS, "").accountId, PALM);
	assert.strictEqual(accountRules.defaultAccount(ACCOUNTS, "++HnY2Qbp2pHNVFT").accountId, PALM, "read-only pref falls back");
	var noPalm = ACCOUNTS.filter(function(inA) { return inA.templateId !== "com.palm.palmprofile"; });
	assert.strictEqual(accountRules.defaultAccount(noPalm, "").accountId, GOOGLE);
	assert.strictEqual(accountRules.defaultAccount([], ""), null);
});
t.test("accountRules: providers that can call an IM address", function() {
	assert.strictEqual(accountRules.providersFor(ACCOUNTS, "PHONE", "type_skype").length, 1);
	assert.strictEqual(accountRules.providersFor(ACCOUNTS, "PHONE", "type_aim").length, 0);
	assert.strictEqual(accountRules.providersFor(ACCOUNTS, "MESSAGING", "type_gtalk").length, 1);
});
t.test("accountRules: the accounts listed in Preferences, and their Sync Now activity", function() {
	var list = accountRules.contactsAccounts(ACCOUNTS);
	assert.deepStrictEqual(list.map(function(inA) { return inA.templateId; }).sort(),
		["com.palm.google", "com.palm.palmprofile", "com.palm.sim", "com.palm.skype"], "accounts without CONTACTS are left out");
	var google = list.filter(function(inA) { return inA.accountId === GOOGLE; })[0];
	assert.strictEqual(google.sync, "palm://com.palm.service.contacts.google/sync");
	assert.deepStrictEqual(accountRules.syncActivity(google).activity.callback,
		{method: "palm://com.palm.service.contacts.google/sync", params: {accountId: GOOGLE}});
	assert.strictEqual(accountRules.syncActivity(google).start, true);
	var palm = list.filter(function(inA) { return inA.accountId === PALM; })[0];
	assert.strictEqual(palm.sync, "");
	assert.strictEqual(accountRules.syncActivity(palm), null, "nothing to sync");
	var deleting = JSON.parse(JSON.stringify(ACCOUNTS));
	deleting[0].beingDeleted = true;
	assert.strictEqual(accountRules.contactsAccounts(deleting).length, list.length - 1);
	assert.deepStrictEqual(accountRules.contactsAccounts([{_id: "x", capabilityProviders: [{capability: "CONTACTS", sync: 5}]}]),
		[{accountId: "x", name: "", username: "", icon: "", templateId: "", sync: ""}]);
	assert.deepStrictEqual(accountRules.contactsAccounts(null), []);
});
t.test("accountRules: First use lists the contacts accounts but the device's own", function() {
	assert.deepStrictEqual(accountRules.firstLaunchAccounts(ACCOUNTS).map(function(inA) { return inA.templateId; }).sort(),
		["com.palm.google", "com.palm.sim", "com.palm.skype"]);
	var palmOnly = ACCOUNTS.filter(function(inA) { return inA.templateId === "com.palm.palmprofile"; });
	assert.strictEqual(palmOnly.length, 1);
	assert.deepStrictEqual(accountRules.firstLaunchAccounts(palmOnly), [], "a new device: nothing set up yet");
	assert.deepStrictEqual(accountRules.firstLaunchAccounts(undefined), []);
});
t.test("accountRules: deleting a person deletes its writable contacts only", function() {
	assert.deepStrictEqual(accountRules.deletePlan(contactsOf("p-mary"), ACCOUNTS), {action: "all", ids: ["c-mary"]});
	assert.deepStrictEqual(accountRules.deletePlan(contactsOf("p-anna"), ACCOUNTS),
		{action: "others", ids: ["c-anna-palm", "c-anna-goog"], readOnlyName: "Skype"});
	assert.deepStrictEqual(accountRules.deletePlan(contactsOf("p-bob"), ACCOUNTS), {action: "none", ids: [], readOnlyName: "Skype"});
	assert.deepStrictEqual(accountRules.deletePlan(contactsOf("p-sim"), ACCOUNTS), {action: "none", ids: [], readOnlyName: "SIM"});
	assert.deepStrictEqual(accountRules.deletePlan([], ACCOUNTS), {action: "orphan", ids: []});
	assert.deepStrictEqual(accountRules.deletePlan([null, {}], ACCOUNTS), {action: "orphan", ids: []});
	assert.deepStrictEqual(accountRules.deletePlan([{_id: "x", accountId: "gone"}], ACCOUNTS),
		{action: "none", ids: [], readOnlyName: ""});
});

// --- global address lookup ---------------------------------------------

var EAS = {_id: "acct-eas", templateId: "com.palm.eas", capabilityProviders: [
	{capability: "CONTACTS", id: "com.palm.eas.contacts", query: "palm://com.palm.eas/notGal"},
	{capability: "REMOTECONTACTS", id: "com.palm.eas.remotecontacts", query: "palm://com.palm.eas/queryGal"}]};

t.test("gal: the accounts that can be searched, from their REMOTECONTACTS query", function() {
	assert.deepStrictEqual(gal.providers(ACCOUNTS), [], "the mock accounts have none");
	assert.deepStrictEqual(gal.providers(ACCOUNTS.concat([EAS])), [{accountId: "acct-eas", service: "luna://com.palm.eas", method: "queryGal"}]);
	var luna = JSON.parse(JSON.stringify(EAS));
	luna.capabilityProviders[1].query = "luna://org.example.gal/directory/find";
	assert.deepStrictEqual(gal.providers([luna]), [{accountId: "acct-eas", service: "luna://org.example.gal", method: "directory/find"}]);
	["", "queryGal", "palm://com.palm.eas/", "javascript:alert(1)", "palm://com.palm.eas/queryGal?x=1", 5, null].forEach(function(inQuery) {
		var a = JSON.parse(JSON.stringify(EAS));
		a.capabilityProviders[1].query = inQuery;
		assert.deepStrictEqual(gal.providers([a]), [], JSON.stringify(inQuery));
	});
	var gone = JSON.parse(JSON.stringify(EAS));
	gone.beingDeleted = true;
	assert.deepStrictEqual(gal.providers([gone, null, {}, {_id: "x", capabilityProviders: "no"}]), []);
	assert.deepStrictEqual(gal.providers(undefined), []);
});
t.test("gal: the results of every account as one list by name, nameless ones left out", function() {
	var merged = gal.merge([
		[{displayName: "Zed Zimmer"}, {givenName: "Anna", familyName: "Berg"}, null, "x", [], {}],
		[{emails: [{value: "bob@corp.example"}]}, {displayName: "  "}],
		"not a list"
	]);
	assert.deepStrictEqual(merged.map(gal.displayName), ["Anna Berg", "bob@corp.example", "Zed Zimmer"]);
	assert.deepStrictEqual(gal.merge(null), []);
});
t.test("gal: a result as a contact, and as a person for the details", function() {
	var r = {displayName: "Berg, Anna", givenName: "Anna", familyName: "Berg", companyName: "Acme", jobTitle: "Engineer",
		phoneNumbers: [{value: "+31 20 555 0101", type: "type_mobile"}, {value: " ", type: "type_home"}, {value: "+31 20 555 0199"}],
		emails: [{value: "anna.berg@acme.example", type: "type_work"}],
		addresses: [{value: "Damrak 1\n1012 LG Amsterdam", type: "type_work"}, "Rokin 2"]};
	assert.deepStrictEqual(gal.contact(r), {
		name: {givenName: "Anna", familyName: "Berg"},
		organizations: [{name: "Acme", title: "Engineer"}],
		phoneNumbers: [{value: "+31 20 555 0101", type: "type_mobile"}, {value: "+31 20 555 0199", type: "type_work"}],
		emails: [{value: "anna.berg@acme.example", type: "type_work"}],
		addresses: [{streetAddress: "Damrak 1\n1012 LG Amsterdam", type: "type_work"}, {streetAddress: "Rokin 2", type: "type_work"}]
	});
	var p = gal.person(r);
	assert.deepStrictEqual(p.organization, {name: "Acme", title: "Engineer"});
	assert.strictEqual(p.organizations, undefined);
	assert.deepStrictEqual(gal.contact({displayName: "Conference Room 3"}).name, {givenName: "Conference Room 3", familyName: ""});
	assert.deepStrictEqual(gal.contact({phoneNumbers: "x", emails: [null, 5]}), {phoneNumbers: [], emails: [], addresses: []});
	assert.deepStrictEqual(gal.person({}).organization, {});
	// What Add to Contacts starts from keeps all of it.
	var template = launch.template(gal.contact(r));
	assert.deepStrictEqual(template.name, {givenName: "Anna", familyName: "Berg"});
	assert.strictEqual(template.phoneNumbers.length, 2);
	assert.strictEqual(template.organizations[0].name, "Acme");
});
t.test("gal: what the list says under the results", function() {
	assert.strictEqual(gal.message(0), "none");
	assert.strictEqual(gal.message(1), "");
	assert.strictEqual(gal.message(99), "");
	assert.strictEqual(gal.message(100), "tooMany");
	assert.strictEqual(gal.LIMIT, 100);
});

// --- localisation ------------------------------------------------------

t.test("l10n: the language and Intl tag of a locale in either form", function() {
	[["de_de", "de", "de-DE"], ["de-DE", "de", "de-DE"], ["fr", "fr", "fr"], ["es-419", "es", "es"],
		["zh-Hant-TW", "zh", "zh-TW"], [" IT_it ", "it", "it-IT"], ["", "", ""], [null, "", ""], ["1234", "", ""]].forEach(function(inCase) {
		assert.strictEqual(l10n.language(inCase[0]), inCase[1], JSON.stringify(inCase[0]));
		assert.strictEqual(l10n.tag(inCase[0]), inCase[2], JSON.stringify(inCase[0]));
	});
});
t.test("l10n: a table translates what it has, and leaves the rest", function() {
	var tr = l10n.translator({"Done": "Fertig", "Empty": "", "constructor": 5});
	assert.strictEqual(tr("Done"), "Fertig");
	assert.strictEqual(tr("Cancel"), "Cancel");
	assert.strictEqual(tr("Empty"), "Empty", "an empty translation is no translation");
	assert.strictEqual(tr("constructor"), "constructor");
	assert.strictEqual(tr("toString"), "toString", "not the prototype's");
	assert.strictEqual(l10n.translator(null)("Done"), "Done");
	assert.deepStrictEqual(l10n.placeholders("{type} and {count} {count}"), ["{count}", "{count}", "{type}"]);
});
t.test("l10n: every language has every string the app translates, placeholders kept", function() {
	var r = require(path.join(ROOT, "tools", "i18n", "keys.js")).keys(ROOT);
	assert.deepStrictEqual(r.problems, [], "$L takes string literals");
	assert.ok(r.keys.length > 150, "found " + r.keys.length);
	assert.ok(r.keys.indexOf("Mobile") >= 0 && r.keys.indexOf("Birthday") >= 0 && r.keys.indexOf("City") >= 0,
		"type labels, detail labels and hints are in");
	["de", "es", "fr", "it"].forEach(function(inLang) {
		var table = JSON.parse(fs.readFileSync(path.join(ROOT, "resources", inLang, "strings.json"), "utf8"));
		assert.deepStrictEqual(r.keys.filter(function(inK) { return !table.hasOwnProperty(inK); }), [], inLang + ": missing");
		assert.deepStrictEqual(Object.keys(table).filter(function(inK) { return r.keys.indexOf(inK) < 0; }), [], inLang + ": stale");
		r.keys.forEach(function(inK) {
			assert.ok(typeof table[inK] === "string" && table[inK].trim() === table[inK] && table[inK], inLang + ": " + inK);
			assert.deepStrictEqual(l10n.placeholders(table[inK]), l10n.placeholders(inK), inLang + ": " + inK);
		});
	});
});
t.test("l10n: each language's appinfo.json overrides only keys appinfo.json has, with the same type", function() {
	// SAM applies resources/<language>/appinfo.json over appinfo.json, and
	// skips a key the root lacks or has with another type.
	var root = JSON.parse(fs.readFileSync(path.join(ROOT, "appinfo.json"), "utf8"));
	["de", "es", "fr", "it"].forEach(function(inLang) {
		var local = JSON.parse(fs.readFileSync(path.join(ROOT, "resources", inLang, "appinfo.json"), "utf8"));
		assert.ok(typeof local.title === "string" && local.title, inLang);
		Object.keys(local).forEach(function(inKey) {
			assert.ok(root.hasOwnProperty(inKey) && typeof root[inKey] === typeof local[inKey], inLang + ": " + inKey);
		});
	});
});
t.test("appinfo: the app is trusted, so WAM lets it load the account icons", function() {
	// Accounts' icons are under /usr/palm/public/accounts/; WAM blocks file
	// URLs outside an app's own folder unless its trustLevel is "trusted".
	var root = JSON.parse(fs.readFileSync(path.join(ROOT, "appinfo.json"), "utf8"));
	assert.strictEqual(root.trustLevel, "trusted");
});

/*
	The coverage of Prelude-Medium.ttf, LuneOS's UI font (fc-query on the
	device). "Helvetica Neue", "Nimbus Sans L" and Arial all fall back to
	it there, and no other font covers more of what the app shows, so a
	character outside it is drawn as an empty box. Desktop Chromium has
	other fonts and hides that.
*/
var PRELUDE = "20-7e a0-131 134-148 14a-17f 192 1fa-1ff 218-21b 237 2c6-2c7 2c9 2d8-2dd 384-38a 38c 38e-3a1 3a3-3ce " +
	"401-40c 40e-44f 451-45c 45e-45f 490-491 1e02-1e03 1e0a-1e0b 1e1e-1e1f 1e40-1e41 1e56-1e57 1e60-1e61 1e6a-1e6b " +
	"1e80-1e85 1ef2-1ef3 2002-200b 2011 2013-2015 2018-201a 201c-201e 2020-2022 2026 2030 2032-2033 2039-203a 203c " +
	"203e 2044 2074 207f 20a3-20a4 20a7 20ac 2105 2113 2116 2122 2126 212e 215c-215e 2202 2206 220f 2211-2212 2215 " +
	"2219-221a 221e 222b 2248 2260 2264-2265 25ca fb01-fb02";
t.test("fonts: every character in the views and translations is in the device font", function() {
	var ranges = PRELUDE.split(" ").map(function(inR) {
		var ends = inR.split("-").map(function(inH) { return parseInt(inH, 16); });
		return [ends[0], ends[ends.length - 1]];
	});
	function covered(inCode) {
		return inCode === 9 || inCode === 10 || inCode === 13 ||
			ranges.some(function(inR) { return inCode >= inR[0] && inCode <= inR[1]; });
	}
	var files = fs.readdirSync(path.join(ROOT, "src", "views")).map(function(inF) { return path.join("src", "views", inF); });
	fs.readdirSync(path.join(ROOT, "resources")).forEach(function(inLang) {
		files.push(path.join("resources", inLang, "strings.json"), path.join("resources", inLang, "appinfo.json"));
	});
	files.forEach(function(inFile) {
		var missing = Array.from(fs.readFileSync(path.join(ROOT, inFile), "utf8")).filter(function(inC) {
			return !covered(inC.codePointAt(0));
		});
		assert.deepStrictEqual(missing, [], inFile);
	});
});
t.test("details: dates in another language's format", function() {
	var de = function(inY, inM, inD) { return inD + "." + inM + "." + (inY === null ? "" : inY); };
	assert.strictEqual(details.dateText("1980-03-14", de), "14.3.1980");
	assert.strictEqual(details.dateText("--07-04", de), "4.7.");
	assert.strictEqual(details.dateText("1980-03-14"), "March 14, 1980");
	assert.strictEqual(details.dateText("someday", de), "someday");
	var rows = details.rows({birthday: "1980-03-14", anniversary: "--07-04"}, de);
	assert.deepStrictEqual(rows.map(function(inR) { return [inR.label, inR.value]; }), [["Birthday", "14.3.1980"], ["Anniversary", "4.7."]]);
});

// --- presence ----------------------------------------------------------

t.test("presence: an address shows its most online status, a person its best address", function() {
	var idx = presence.index([
		{username: "Cowboy_Bob", serviceName: "type_skype", availability: 4},
		{username: "cowboy_bob", serviceName: "type_skype", availability: 2},
		{username: "anna.vdberg", serviceName: "type_skype", availability: 0},
		{username: "anna.vdberg", serviceName: "type_gtalk", availability: 4},
		{username: "", serviceName: "type_skype", availability: 0},
		{username: "x", serviceName: "type_skype", availability: "0"},
		null
	]);
	assert.deepStrictEqual(idx, {"type_skype|cowboy_bob": 2, "type_skype|anna.vdberg": 0, "type_gtalk|anna.vdberg": 4});
	assert.strictEqual(presence.ofAddress(idx, {value: "COWBOY_BOB", type: "type_skype"}), 2, "case ignored");
	assert.strictEqual(presence.ofAddress(idx, {value: "anna.vdberg", type: "type_aim"}), 6, "another service");
	assert.strictEqual(presence.ofAddress(idx, {value: 5, type: "type_skype"}), 6);
	assert.strictEqual(presence.ofPerson(idx, {ims: [{value: "anna.vdberg", type: "type_gtalk"},
		{value: "anna.vdberg", type: "type_skype"}]}), 0);
	assert.strictEqual(presence.ofPerson(idx, {ims: "junk"}), 6);
	assert.strictEqual(presence.ofPerson(idx, null), 6);
});
t.test("presence: status classes as the legacy app, mobile counts as available", function() {
	assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, undefined].map(presence.className),
		["status-available", "status-available", "status-busy", "status-offline", "status-offline", "", "", ""]);
});

// --- profiles ----------------------------------------------------------

t.test("profiles: one row per linked contact, the first the primary", function() {
	var rows = profiles.rows(contactsOf("p-anna"), ACCOUNTS);
	assert.deepStrictEqual(rows.map(function(r) { return [r.contactId, r.accountName, r.readOnly, r.primary]; }), [
		["c-anna-palm", "LuneOS Account", false, true],
		["c-anna-goog", "Acme", false, false],
		["c-anna-skype", "Skype", true, false]
	]);
	assert.strictEqual(rows[0].name, "Anna van der Berg");
	assert.ok(rows[1].icon, "account icon");
	assert.strictEqual(profiles.rows([{_id: "x", organizations: [{name: "Initech"}]}], ACCOUNTS)[0].name, "Initech");
	assert.deepStrictEqual(profiles.rows(null, ACCOUNTS), []);
});
t.test("profiles: what may be done to a linked profile", function() {
	var anna = person("p-anna").contactIds;
	var none = {unlink: false, primary: false, remove: false};
	assert.deepStrictEqual(profiles.actions(anna, contact("c-anna-palm"), ACCOUNTS), {unlink: true, primary: false, remove: true},
		"the primary");
	assert.deepStrictEqual(profiles.actions(anna, contact("c-anna-goog"), ACCOUNTS), {unlink: true, primary: true, remove: true});
	assert.deepStrictEqual(profiles.actions(anna, contact("c-anna-skype"), ACCOUNTS), {unlink: true, primary: true, remove: false},
		"read-only");
	assert.deepStrictEqual(profiles.actions(["c-mary"], contact("c-mary"), ACCOUNTS), none, "a single profile");
	assert.deepStrictEqual(profiles.actions(anna, contact("c-mary"), ACCOUNTS), none, "not this person's");
	assert.deepStrictEqual(profiles.actions(null, null, ACCOUNTS), none);
});

// --- contactEdit -------------------------------------------------------

t.test("contactEdit: removing the photo clears it on the contacts that may be changed", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	assert.strictEqual(contactEdit.canRemovePhoto(state, cs), true);
	var edited = untouched(state);
	edited.removePhoto = true;
	var p = contactEdit.plan(state, cs, edited);
	assert.deepStrictEqual(p.updates, [{_id: "c-anna-palm", fields: {photos: []}}]);
	assert.strictEqual(p.create, null);
	// A read-only contact's photo can not be removed.
	var skype = cs.map(function(c) { return JSON.parse(JSON.stringify(c)); });
	skype.forEach(function(c) { c.photos = c._id === "c-anna-skype" ? [{localPath: "/x.jpg", type: "type_big"}] : []; });
	var state2 = contactEdit.build(person("p-anna"), skype, ACCOUNTS, "");
	assert.strictEqual(contactEdit.canRemovePhoto(state2, skype), false);
	var e2 = untouched(state2);
	e2.removePhoto = true;
	assert.deepStrictEqual(contactEdit.plan(state2, skype, e2).updates, []);
	// No photo, nothing to remove; a new contact has none either.
	var mary = contactsOf("p-mary");
	assert.strictEqual(contactEdit.canRemovePhoto(contactEdit.build(person("p-mary"), mary, ACCOUNTS, ""), mary), false);
	assert.strictEqual(contactEdit.canRemovePhoto(contactEdit.build(null, [], ACCOUNTS, ""), []), false);
});
t.test("contactEdit: an untouched edit writes nothing", function() {
	["p-anna", "p-mary", "p-bob", "p-sim", "p-hostile", "p-oscar", "p-li"].forEach(function(inId) {
		var cs = contactsOf(inId);
		var state = contactEdit.build(person(inId), cs, ACCOUNTS, "");
		var p = contactEdit.plan(state, cs, untouched(state));
		assert.deepStrictEqual(p, {create: null, updates: [], favorite: undefined, makePrimary: null}, inId);
	});
});
t.test("contactEdit: the target is the primary when it may be changed", function() {
	var state = contactEdit.build(person("p-anna"), contactsOf("p-anna"), ACCOUNTS, "");
	assert.strictEqual(state.primaryId, "c-anna-palm");
	assert.strictEqual(state.targetId, "c-anna-palm");
	assert.deepStrictEqual(state.contacts.map(function(inC) { return inC.readOnly; }), [false, false, true]);
});
t.test("contactEdit: a changed nickname goes to the primary only", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	var e = untouched(state);
	e.single.nickname = "Annie";
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p.updates, [{_id: "c-anna-palm", fields: {nickname: "Annie"}}]);
	assert.strictEqual(p.create, null);
});
t.test("contactEdit: the organization is written as organizations[0]", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	assert.deepStrictEqual(state.single.organization, {title: "Engineer", department: "R&D", name: "Acme"});
	var e = untouched(state);
	e.single.organization.title = "Architect";
	var p = contactEdit.plan(state, cs, e);
	assert.strictEqual(p.updates.length, 1);
	assert.strictEqual(p.updates[0]._id, "c-anna-palm");
	assert.ok(!("organization" in p.updates[0].fields));
	assert.deepStrictEqual(p.updates[0].fields.organizations, [{title: "Architect", department: "R&D", name: "Acme"}]);
});
t.test("contactEdit: an entry is changed in the contact it came from", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	var e = untouched(state);
	var work = e.lists.phoneNumbers.filter(function(inR) { return inR.contactId === "c-anna-goog"; })[0];
	work.entry.value = "+31 20 555 0200";
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p.updates, [{_id: "c-anna-goog", fields: {phoneNumbers: [{value: "+31 20 555 0200", type: "type_work"}]}}]);
});
t.test("contactEdit: entries of read-only contacts are never written", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	var e = untouched(state);
	e.lists.ims = [];   // even when the view drops them
	e.lists.ims.push({contactId: "c-anna-skype", entry: {value: "hacked", type: "type_skype"}});
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p.updates, []);
});
t.test("contactEdit: a new entry goes to the target, or the picked contact", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	var e = untouched(state);
	e.lists.emails.push({contactId: null, entry: {value: "new@example.com", type: "type_other"}});
	e.lists.urls.push({contactId: "c-anna-goog", entry: {value: "https://anna.example"}});
	var p = contactEdit.plan(state, cs, e);
	var palm = p.updates.filter(function(inU) { return inU._id === "c-anna-palm"; })[0];
	var goog = p.updates.filter(function(inU) { return inU._id === "c-anna-goog"; })[0];
	assert.deepStrictEqual(palm.fields, {emails: [{value: "anna@example.com", type: "type_home"}, {value: "new@example.com", type: "type_other"}]});
	assert.deepStrictEqual(goog.fields, {urls: [{value: "https://anna.example", type: "type_homepage"}]});
});
t.test("contactEdit: removing an entry removes it from its contact only", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, "");
	var e = untouched(state);
	e.lists.emails = e.lists.emails.filter(function(inR) { return inR.contactId !== "c-anna-goog"; });
	e.lists.notes = [];
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p.updates.sort(function(a, b) { return a._id < b._id ? -1 : 1; }), [
		{_id: "c-anna-goog", fields: {emails: []}},
		{_id: "c-anna-palm", fields: {note: ""}}
	]);
});
t.test("contactEdit: a changed value drops its stale normalizedValue, keeps the rest", function() {
	var c = contact("c-mary");
	c.phoneNumbers[0]._id = "e1";
	c.phoneNumbers[0].normalizedValue = "5551234567";
	c.phoneNumbers[0].primary = true;
	var state = contactEdit.build({_id: "p", contactIds: ["c-mary"]}, [c], ACCOUNTS, "");
	var e = untouched(state);
	e.lists.phoneNumbers[0].entry.value = "555 999";
	var p = contactEdit.plan(state, [c], e);
	assert.deepStrictEqual(p.updates[0].fields.phoneNumbers[0], {_id: "e1", value: "555 999", type: "type_main", primary: true});
});
t.test("contactEdit: with only read-only contacts, a new contact takes the change", function() {
	var cs = contactsOf("p-bob");
	var state = contactEdit.build(person("p-bob"), cs, ACCOUNTS, "");
	assert.strictEqual(state.targetId, null);
	var e = untouched(state);
	e.single.nickname = "Cowboy";
	e.lists.phoneNumbers.push({contactId: null, entry: {value: "555 0000", type: "type_mobile"}});
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p.updates, []);
	assert.strictEqual(p.makePrimary, "new");
	assert.strictEqual(p.create.accountId, PALM);
	assert.strictEqual(p.create._kind, "com.palm.contact.palmprofile:1");
	assert.strictEqual(p.create.name.familyName, "Cowboy");
	assert.strictEqual(p.create.nickname, "Cowboy");
	assert.deepStrictEqual(p.create.phoneNumbers, [{value: "555 0000", type: "type_mobile"}]);
});
t.test("contactEdit: with only read-only contacts, the empty new rows create nothing", function() {
	var cs = contactsOf("p-bob");
	var state = contactEdit.build(person("p-bob"), cs, ACCOUNTS, "");
	var e = untouched(state);
	contactEdit.LIST_FIELDS.forEach(function(inF) {
		e.lists[inF].push({contactId: null, entry: inF === "addresses" ? {streetAddress: ""} : {value: ""}});
	});
	var p = contactEdit.plan(state, cs, e);
	assert.deepStrictEqual(p, {create: null, updates: [], favorite: undefined, makePrimary: null});
});
t.test("contactEdit: a single change to a non-primary target makes it primary, with what was shown", function() {
	// Skype (read-only) first: the palm contact is the target but not the primary.
	var cs = [contact("c-anna-skype"), contact("c-anna-palm")];
	var state = contactEdit.build({_id: "p", contactIds: ["c-anna-skype", "c-anna-palm"]}, cs, ACCOUNTS, "");
	assert.strictEqual(state.targetId, "c-anna-palm");
	var e = untouched(state);
	e.single.birthday = "1981-03-14";
	var p = contactEdit.plan(state, cs, e);
	assert.strictEqual(p.makePrimary, "c-anna-palm");
	assert.strictEqual(p.updates[0].fields.birthday, "1981-03-14");
	assert.ok(p.updates[0].fields.name, "takes the shown name too");
});
t.test("contactEdit: a new person from a template", function() {
	var state = contactEdit.build(null, [], ACCOUNTS, GOOGLE, {name: {givenName: "Neo"}, phoneNumbers: [{value: "101", type: "type_work"}]});
	assert.ok(state.isNew);
	var e = untouched(state);
	e.favorite = true;
	e.lists.emails.push({contactId: null, entry: {value: "neo@example.com"}});
	e.lists.notes.push({contactId: null, entry: {value: "The One"}});
	var p = contactEdit.plan(state, [], e);
	assert.strictEqual(p.favorite, true);
	assert.deepStrictEqual(p.create, {_kind: "com.palm.contact.google:1", accountId: GOOGLE,
		name: {honorificPrefix: "", givenName: "Neo", middleName: "", familyName: "", honorificSuffix: ""},
		phoneNumbers: [{value: "101", type: "type_work"}], emails: [{value: "neo@example.com", type: "type_home"}],
		note: "The One"});
});
t.test("contactEdit: blank rows are dropped", function() {
	var state = contactEdit.build(null, [], ACCOUNTS, "");
	var e = untouched(state);
	e.single.name.givenName = "X";
	e.lists.phoneNumbers.push({contactId: null, entry: {value: "   ", type: "type_mobile"}});
	e.lists.addresses.push({contactId: null, entry: {streetAddress: " ", locality: "", type: "type_home"}});
	var p = contactEdit.plan(state, [], e);
	assert.ok(!("phoneNumbers" in p.create));
	assert.ok(!("addresses" in p.create));
});
t.test("contactEdit: dates", function() {
	assert.ok(contactEdit.isValidDate("1980-03-14"));
	assert.ok(contactEdit.isValidDate(""));
	assert.ok(contactEdit.isValidDate("2024-02-29"));
	assert.ok(!contactEdit.isValidDate("2023-02-29"));
	assert.ok(!contactEdit.isValidDate("14-03-1980"));
	assert.ok(!contactEdit.isValidDate("1980-13-01"));
});

t.test("contactEdit: add to existing puts new entries in the default account's contact, skips known ones", function() {
	var cs = contactsOf("p-anna");
	var state = contactEdit.build(person("p-anna"), cs, ACCOUNTS, GOOGLE);
	var e = contactEdit.addData(state, {name: {givenName: "Someone", familyName: "Else"}, nickname: "Annie",
		phoneNumbers: [{value: "+31 20 555 0101", type: "type_work"}, {value: "555 7777", type: "type_mobile"}],
		emails: [{value: "ANNA@example.com"}], notes: "ignored: not a contact field"}, GOOGLE);
	var p = contactEdit.plan(state, cs, e);
	assert.strictEqual(p.create, null);
	assert.strictEqual(p.updates.length, 2, JSON.stringify(p.updates));
	var goog = p.updates.filter(function(u) { return u._id === "c-anna-goog"; })[0];
	assert.deepStrictEqual(goog.fields.phoneNumbers.map(function(n) { return n.value; }), ["+31 20 555 0199", "555 7777"]);
	assert.ok(!goog.fields.emails, "a known address, in other case, is not added again");
	// Anna had no nickname: it is taken, and goes to the target as single values do. Her name stays.
	var palm = p.updates.filter(function(u) { return u._id === "c-anna-palm"; })[0];
	assert.deepStrictEqual(palm.fields, {nickname: "Annie"});
});
t.test("contactEdit: add to existing with only read-only contacts makes a linked contact", function() {
	var cs = contactsOf("p-bob");
	var state = contactEdit.build(person("p-bob"), cs, ACCOUNTS, "");
	var p = contactEdit.plan(state, cs, contactEdit.addData(state, {phoneNumbers: [{value: "1"}]}, ""));
	assert.deepStrictEqual(p.updates, []);
	assert.deepStrictEqual(p.create.phoneNumbers, [{value: "1", type: "type_mobile"}]);
	assert.strictEqual(p.create.name.familyName, "Cowboy");
});

// --- launch ------------------------------------------------------------

t.test("launch: the legacy launch types", function() {
	assert.deepStrictEqual(launch.parse({launchType: "editContact", contact: {_id: "c1"}}), {action: "edit", id: "c1"});
	assert.deepStrictEqual(launch.parse({launchType: "editContact", person: {_id: "p1"}}), {action: "edit", id: "p1"});
	assert.deepStrictEqual(launch.parse({launchType: "pseudo-card", contact: {phoneNumbers: [{value: "1"}]}}),
		{action: "prompt", contact: {phoneNumbers: [{value: "1"}]}});
	assert.strictEqual(launch.parse({launchType: "newContact", contact: {}, skipPrompt: true}).action, "new");
	assert.strictEqual(launch.parse({launchType: "newContact", contact: {}, skipPrompt: "true"}).action, "prompt");
	assert.strictEqual(launch.parse({launchType: "addToExisting", person: {name: {givenName: "A"}}}).action, "addToExisting");
	assert.deepStrictEqual(launch.parse({launchType: "showPerson", id: "p1"}), {action: "show", id: "p1"});
	assert.deepStrictEqual(launch.parse({id: "p1"}), {action: "show", id: "p1"});
	assert.deepStrictEqual(launch.parse('{"id":"p1"}'), {action: "show", id: "p1"});
	assert.deepStrictEqual(launch.parse({target: "file:///media/internal/a.vcf"}), {action: "vcard", target: "file:///media/internal/a.vcf"});
});
t.test("launch: nothing to do, or nonsense", function() {
	[undefined, null, {}, "", "{", "[]", 7, {launchType: "editContact"}, {launchType: "editContact", contact: {_id: 5}},
		{id: {}}, {id: ""}, {target: "http://evil.example/x.vcf"}, {target: "x.vcf"}, {launchType: "addToExisting"},
		{"palm-command": "open-app-menu"}].forEach(function(inP) {
		assert.strictEqual(launch.parse(inP), null, JSON.stringify(inP));
	});
});
t.test("launch: a template keeps only contact fields of the right types", function() {
	var t = launch.template({_id: "x", _kind: "com.palm.person:1", accountId: "a", _rev: 3,
		name: {givenName: "A", familyName: 7, bogus: "b"}, nickname: ["n"], organization: {name: "Org", evil: {}},
		notes: ["one", 2, "two"], phoneNumbers: [{value: "1", type: "type_work", _id: "e", normalizedValue: "x"}, "junk", null],
		emails: "nope", photos: [{localPath: "/etc/passwd"}]});
	assert.deepStrictEqual(t, {name: {givenName: "A"}, organizations: [{name: "Org"}], note: "one\n\ntwo",
		phoneNumbers: [{value: "1", type: "type_work"}]});
	assert.deepStrictEqual(launch.template([1]), {});
	assert.deepStrictEqual(launch.template("x"), {});
});

// --- details -----------------------------------------------------------

t.test("details: addresses have no 'undefined' and no markup", function() {
	assert.strictEqual(details.addressText({streetAddress: "1 Main St.", locality: "Springfield", region: "IL", postalCode: "62701",
		country: "USA"}), "1 Main St.\n62701 Springfield\nIL\nUSA");
	assert.strictEqual(details.addressText({locality: "Utrecht"}), "Utrecht");
	assert.strictEqual(details.addressText({postalCode: "1234 AB"}), "1234 AB");
	assert.strictEqual(details.addressText({streetAddress: 5, locality: null}), "5");
	assert.strictEqual(details.addressText(undefined), "");
});
t.test("details: rows and labels", function() {
	var rows = details.rows({
		phoneNumbers: [{value: "555 1", type: "type_mobile"}, {value: "555 2", type: "type_work_fax"}, {value: "", type: "type_home"},
			{value: "555 3", type: "type_custom_thing"}],
		addresses: [{streetAddress: "x", type: "type_other"}],
		notes: ["line one\nline two  ", "  "],
		birthday: "1980-03-14", anniversary: "--07-04",
		relations: [{value: "Pieter", type: "type_spouse"}],
		ims: [null, "junk", {value: "a@b", type: "type_jabber"}]
	});
	assert.deepStrictEqual(rows.map(function(r) { return [r.key, r.label, r.value, r.sms]; }), [
		["phoneNumbers", "Mobile", "555 1", true],
		["phoneNumbers", "Work fax", "555 2", false],
		["phoneNumbers", "Custom thing", "555 3", true],
		["ims", "Jabber / XMPP", "a@b", false],
		["addresses", "Other", "x", false],
		["notes", "Note", "line one\nline two", false],
		["birthday", "Birthday", "March 14, 1980", false],
		["anniversary", "Anniversary", "July 4", false],
		["relations", "Spouse", "Pieter", false]
	]);
});
t.test("details: links are built from allowed schemes only", function() {
	function tgt(key, value) { return details.target({key: key, value: value}); }
	assert.strictEqual(tgt("phoneNumbers", "+31 (20) 555-0101 ext"), "tel:%2B31205550101");
	assert.strictEqual(tgt("phoneNumbers", "no digits"), null);
	assert.strictEqual(tgt("emails", "anna@example.com"), "mailto:anna@example.com");
	assert.strictEqual(tgt("emails", "a@b.c?subject=x&body=<script>"), null);
	assert.strictEqual(tgt("emails", "not an address"), null);
	assert.strictEqual(tgt("urls", "www.example.org"), "http://www.example.org");
	assert.strictEqual(tgt("urls", "https://example.org/a?b#c"), "https://example.org/a?b#c");
	assert.strictEqual(tgt("urls", "javascript:window.__xss=1"), null);
	assert.strictEqual(tgt("urls", "JavaScript:alert(1)"), null);
	assert.strictEqual(tgt("urls", "data:text/html,<script>"), null);
	assert.strictEqual(tgt("urls", "file:///etc/passwd"), null);
	assert.strictEqual(tgt("urls", "http://"), null);
	assert.strictEqual(tgt("urls", "example"), null);
	assert.strictEqual(tgt("addresses", "1 Main St.\nSpringfield"), "maploc:1%20Main%20St.%2C%20Springfield");
	assert.strictEqual(tgt("notes", "x"), null);
	assert.strictEqual(details.smsTarget({key: "phoneNumbers", value: "555 1"}, "p 1"), "sms:5551?personId=p%201");
	assert.strictEqual(details.smsTarget({key: "emails", value: "a@b"}, "p"), null);
});
t.test("details: the next birthday", function() {
	var now = new Date(2026, 9, 28, 9);
	assert.strictEqual(details.nextOccurrence("1980-03-14", now).getTime(), new Date(2027, 2, 14, 12).getTime());
	assert.strictEqual(details.nextOccurrence("1980-12-01", now).getTime(), new Date(2026, 11, 1, 12).getTime());
	assert.strictEqual(details.nextOccurrence("1990-10-28", now).getTime(), new Date(2026, 9, 28, 12).getTime(), "today");
	assert.strictEqual(details.nextOccurrence("--07-04", now).getTime(), new Date(2027, 6, 4, 12).getTime());
	assert.strictEqual(details.nextOccurrence("2000-02-29", new Date(2027, 0, 1)).getTime(), new Date(2027, 2, 1, 12).getTime());
	assert.strictEqual(details.nextOccurrence("someday", now), null);
	assert.strictEqual(details.nextOccurrence("1980-13-01", now), null);
});

t.test("details: what an IM address offers depends on the accounts", function() {
	assert.deepStrictEqual(details.imActions("type_skype", ACCOUNTS), [{action: "chat", transport: ""},
		{action: "voice", transport: "com.palm.skype"}]);
	assert.deepStrictEqual(details.imActions("type_gtalk", ACCOUNTS), [{action: "chat", transport: ""}]);
	assert.deepStrictEqual(details.imActions("", ACCOUNTS), [{action: "chat", transport: ""}]);
	var withVideo = JSON.parse(JSON.stringify(ACCOUNTS));
	withVideo.forEach(function(a) {
		(a.capabilityProviders || []).forEach(function(p) {
			if (p.capability === "PHONE") {
				p.videoFormat = "both";
			}
		});
	});
	assert.deepStrictEqual(details.imActions("type_skype", withVideo).map(function(a) { return a.action; }), ["chat", "voice", "video"]);
	assert.deepStrictEqual(details.imActions("type_skype", []), [{action: "chat", transport: ""}]);
});
t.test("details: im: links", function() {
	assert.strictEqual(details.imTarget("anna.vdberg", "type_skype", "p-anna"), "im:anna.vdberg?personId=p-anna&type=skype");
	assert.strictEqual(details.imTarget("gina@gmail.com", "type_gtalk", "p 1"), "im:gina@gmail.com?personId=p%201&type=gtalk");
	assert.strictEqual(details.imTarget("x&y=1", "type_other", "p"), "im:x%26y%3D1?personId=p");
	assert.strictEqual(details.imTarget("a@b@c", "type_jabber", "p"), null);
	assert.strictEqual(details.imTarget("  ", "type_jabber", "p"), null);
});

t.test("names: display names, as the legacy app made them", function() {
	assert.strictEqual(names.displayName({name: {givenName: "小龙", familyName: "李"}}), "李小龙");
	assert.strictEqual(names.displayName({name: {honorificPrefix: "Dr.", givenName: "Mary", middleName: "Ann", familyName: "Smith-Jones",
		honorificSuffix: "PhD"}}), "Dr. Mary Ann Smith-Jones, PhD");
	assert.strictEqual(names.displayName({name: {}, nickname: "Annie"}), "Annie");
	assert.strictEqual(names.displayName({organization: {name: "Globex"}}), "Globex");
	assert.strictEqual(names.displayName({organization: {title: "CEO", name: "Globex"}}), "CEO, Globex");
	assert.strictEqual(names.displayName({organization: {title: "CEO"}}), "CEO");
	assert.strictEqual(names.displayName({emails: [{value: ""}, {value: "a@b"}]}), "a@b");
	assert.strictEqual(names.displayName({phoneNumbers: [{value: "555"}]}), "555");
	assert.strictEqual(names.displayName({organization: "junk", emails: "junk"}), "");
	assert.strictEqual(names.displayName(null), "");
});
t.test("names: list dividers", function() {
	assert.strictEqual(names.dividerText({sortKey: "berg\tanna"}, "LAST_FIRST"), "B");
	assert.strictEqual(names.dividerText({sortKey: "émile\tzola"}, "FIRST_LAST"), "E");
	assert.strictEqual(names.dividerText({sortKey: "\ufad7555"}, "LAST_FIRST"), "#");
	assert.strictEqual(names.dividerText({sortKey: "\ufad7\ufad7"}, "LAST_FIRST"), "#");
	assert.strictEqual(names.dividerText({sortKey: ""}, "LAST_FIRST"), "#");
	assert.strictEqual(names.dividerText({sortKey: "李\t小龙"}, "LAST_FIRST"), "李");
	assert.strictEqual(names.dividerText({sortKey: "acme\tberg", organization: {name: "Acme"}}, "COMPANY_LAST_FIRST"), "A");
	assert.strictEqual(names.dividerText({sortKey: "\ufad7\ufad7\tberg", organization: {}}, "COMPANY_LAST_FIRST"), "#");
});

// --- search ------------------------------------------------------------

function finds(inPerson, inQuery) {
	return search.matches(search.terms(inPerson), search.digits(inPerson), inQuery);
}
t.test("search: word starts, without case or accents, every word", function() {
	var zoe = {name: {givenName: "Zoë", familyName: "Ångström"}};
	assert.ok(finds(zoe, "zoe"));
	assert.ok(finds(zoe, "ANGST"));
	assert.ok(finds(zoe, "zo ang"));
	assert.ok(!finds(zoe, "zoe smith"));
	assert.ok(!finds(zoe, "oe"));
	var anna = {names: [{givenName: "Anna", familyName: "van der Berg"}], nickname: "Annie B", organization: {name: "Acme Corp"},
		emails: [{value: "anna.berg@acme.example"}], ims: [{value: "anna.vdberg"}]};
	["berg", "anna berg", "van der", "annie", "acme", "corp", "vdberg"].forEach(function(q) {
		assert.ok(finds(anna, q), q);
	});
	assert.ok(!finds(anna, "example"), "the domain of an address is not a name");
	assert.ok(finds({name: {givenName: "小龙", familyName: "李"}}, "李小"));
	assert.ok(finds({name: {givenName: "小龙", familyName: "李"}}, "小龙"));
	assert.ok(finds({}, ""));
	assert.ok(finds({}, "   "));
	assert.ok(!finds({}, "x"));
});
t.test("search: digits find phone numbers", function() {
	var mary = {phoneNumbers: [{value: "(555) 123-4567"}, {value: null}]};
	assert.ok(finds(mary, "1234"));
	assert.ok(finds(mary, "555 123"));
	assert.ok(!finds(mary, "12"), "too short to search numbers");
	assert.ok(!finds(mary, "999"));
	assert.deepStrictEqual(search.digits(mary), ["5551234567"]);
});

t.run();
