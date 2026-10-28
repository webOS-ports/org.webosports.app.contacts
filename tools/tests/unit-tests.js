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

// --- contactEdit -------------------------------------------------------

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

t.run();
