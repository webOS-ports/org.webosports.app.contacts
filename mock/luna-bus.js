/*
	In-page mock of the LuneOS runtime and the services the Contacts app
	talks to, so the app runs its device code paths in a desktop browser.

	It is a development asset: `enyo pack` copies it into dev builds only,
	and nothing in src/ refers to it.
	  - Desktop: tools/build.sh writes dist/debug.html, which loads this file
	    before the libraries. Open debug.html in Chromium.
	  - Tests: tools/tests/e2e-tests.js injects it before any page script,
	    preceded by `window.__MOCK_CONFIG__ = {...}`.

	What it fakes
	  - window.PalmSystem and window.PalmServiceBridge (what enyo-webos's
	    ServiceRequest talks to).
	  - com.palm.db: find (where/orderBy/desc/limit/page, watch), get, put,
	    merge, del, with kind inheritance (com.palm.contact.google:1 is a
	    com.palm.contact:1), the schema types of the person and contact kinds
	    (-986 on a mismatch) and the app's kind permissions: it may not delete
	    com.palm.person:1 records (-3963), as on a device.
	  - com.palm.tempdb: find, for IM buddy status.
	  - com.palm.service.contacts.linker: rebuilds a person from its contacts
	    whenever a contact changes (as the linker's db watch does), and
	    saveNewPersonAndContacts, manualLink, manualUnlink, deleteOrphanedPerson.
	  - com.palm.service.contacts: sortKey upkeep when the list order pref
	    changes (sortOrderChanged), and the vCard methods, answered from
	    config.vcards.
	  - com.palm.service.accounts/listAccounts, com.palm.applicationManager
	    open/launch, com.webos.service.activitymanager/create: recorded and
	    answered.
	  - ls-hubd's ACG check, when config.acg is given (see the weather app's
	    tools/tests for the same scheme).

	Config (window.__MOCK_CONFIG__, all optional)
	  data: {accounts: [...], contacts: [...], persons: [{_id, favorite, contactIds}], prefs: {...}}
	                   default: mock/db8-data.json and
	                   mock/com.palm.service.accounts/listAccounts.json, loaded
	                   synchronously
	  launchParams: {...}
	  vcards: {"/path.vcf": {contacts: [...]}}
	  luna: {"luna://svc/method": rule}   overrides, rule = {json} | {error} | {delay} | {never}
	  delay: ms        answer every call this late (default 0)
	  acg: {groups, granted, exempt}
	  persist: true    keep the database in sessionStorage across reloads

	window.__MOCK__ exposes
	  calls      [{kind, url, params, acg}] in call order
	  db         the database: db.all(kind), db.byId(id)
	  relaunch(params), set(url, rule)
	  editContact(id, fields)   a change "from a sync", outside the app
*/
(function() {
	"use strict";
	var config = window.__MOCK_CONFIG__ || {};
	var calls = [];
	var mock = window.__MOCK__ = {calls: calls, config: config};

	function clone(inValue) {
		return inValue === undefined ? undefined : JSON.parse(JSON.stringify(inValue));
	}
	function loadJson(inUrl) {
		var xhr = new XMLHttpRequest();
		xhr.open("GET", inUrl, false);
		xhr.send();
		if (xhr.status !== 200 && xhr.status !== 0) {
			throw new Error("luna-bus: cannot load " + inUrl);
		}
		return JSON.parse(xhr.responseText);
	}
	function isArray(inValue) {
		return Object.prototype.toString.call(inValue) === "[object Array]";
	}

	var CALLER = "com.palm.app.contacts";

	// --- data ------------------------------------------------------------

	var data = config.data;
	if (!data) {
		data = loadJson("mock/db8-data.json");
		data.accounts = loadJson("mock/com.palm.service.accounts/listAccounts.json").results;
	}
	if (config.persist) {
		try {
			var saved = window.sessionStorage.getItem("__lunaBusDb");
			if (saved) {
				data = JSON.parse(saved);
			}
		} catch (e) {}
	}
	var accounts = clone(data.accounts || []);

	// --- database --------------------------------------------------------

	// Parent kinds, for kinds that extend another one.
	var kindParents = {
		"com.palm.contact.palmprofile:1": "com.palm.contact:1",
		"com.palm.contact.google:1": "com.palm.contact:1",
		"com.palm.contact.sim:1": "com.palm.contact:1",
		"com.palm.contact.skypem:1": "com.palm.contact:1",
		"com.palm.contact.libpurple:1": "com.palm.contact:1",
		"com.palm.contact.eas:1": "com.palm.contact:1"
	};
	// The declared property types of the linker's kinds (db/kinds/ in
	// app-services). db8 refuses a record whose property has another type.
	var schemas = {
		"com.palm.contact:1": {
			remoteId: "string", accountId: "string", name: "object", nickname: "string", birthday: "string",
			anniversary: "string", gender: "string", note: "string", phoneNumbers: "array", emails: "array",
			ims: "array", urls: "array", photos: "array", addresses: "array", organizations: "array",
			accounts: "array", tags: "array", customFields: "array", relations: "array"
		},
		"com.palm.person:1": {
			launcherId: "string", favorite: "boolean", contactIds: "array", sortKey: "string", name: "object",
			names: "array", nickname: "string", organization: "object", relevance: "object", searchTerms: "array",
			emails: "array", phoneNumbers: "array", ims: "array", photos: "object", addresses: "array", urls: "array",
			notes: "array", birthday: "string", anniversary: "string", gender: "string", relations: "array",
			reminder: "string", ringtone: "object"
		}
	};
	// What the app may do to each kind (db/permissions/ in app-services).
	var appPermissions = {
		"com.palm.person:1": {read: true, create: true, update: true, "delete": false},
		"com.palm.contact:1": {read: true, create: true, update: true, "delete": true},
		"com.palm.app.contacts.prefs:1": {read: true, create: true, update: true, "delete": true}
	};

	var records = {};
	var nextId = 1000;
	var rev = 1;

	function rootKind(inKind) {
		while (kindParents[inKind]) {
			inKind = kindParents[inKind];
		}
		return inKind;
	}
	function isKindOf(inKind, inAncestor) {
		for (var k = inKind; k; k = kindParents[k]) {
			if (k === inAncestor) {
				return true;
			}
		}
		return false;
	}
	function typeOf(inValue) {
		if (isArray(inValue)) {
			return "array";
		}
		return inValue === null ? "null" : typeof inValue;
	}
	function validate(inRecord) {
		var schema = schemas[rootKind(inRecord._kind)];
		if (!schema) {
			return null;
		}
		for (var prop in schema) {
			if (schema.hasOwnProperty(prop) && inRecord[prop] !== undefined && typeOf(inRecord[prop]) !== schema[prop]) {
				return "invalid value for property '" + prop + "' (expected " + schema[prop] + ", got " + typeOf(inRecord[prop]) + ")";
			}
		}
		return null;
	}
	function allowed(inKind, inOperation, inCaller) {
		if (inCaller !== CALLER) {
			return true;
		}
		var perms = appPermissions[rootKind(inKind)];
		return !perms || perms[inOperation];
	}

	var db = mock.db = {
		all: function(inKind) {
			var out = [];
			for (var id in records) {
				if (records.hasOwnProperty(id) && (!inKind || isKindOf(records[id]._kind, inKind))) {
					out.push(records[id]);
				}
			}
			return out;
		},
		byId: function(inId) {
			return records[inId];
		},
		newId: function() {
			return "mock" + (nextId++).toString(36);
		},
		// Low-level write, no permission check: what the services do.
		store: function(inRecord) {
			if (!inRecord._id) {
				inRecord._id = db.newId();
			}
			inRecord._rev = ++rev;
			records[inRecord._id] = inRecord;
			return inRecord;
		},
		remove: function(inId) {
			delete records[inId];
			rev++;
		}
	};

	function propValue(inRecord, inProp) {
		var parts = inProp.split("."), value = inRecord;
		for (var i = 0; i < parts.length && value !== undefined; i++) {
			if (isArray(value)) {
				var next = [];
				for (var j = 0; j < value.length; j++) {
					if (value[j] && value[j][parts[i]] !== undefined) {
						next.push(value[j][parts[i]]);
					}
				}
				value = next;
			} else {
				value = value === null ? undefined : value[parts[i]];
			}
		}
		return value;
	}
	function matchOne(inValue, inOp, inWanted) {
		var wanted = isArray(inWanted) ? inWanted : [inWanted];
		return wanted.some(function(inW) {
			switch (inOp) {
			case "=": return inValue === inW;
			case "!=": return inValue !== inW;
			case "<": return inValue < inW;
			case "<=": return inValue <= inW;
			case ">": return inValue > inW;
			case ">=": return inValue >= inW;
			case "%": return typeof inValue === "string" && inValue.indexOf(inW) === 0;
			case "?": return typeof inValue === "string" && inValue.toLowerCase().indexOf(String(inW).toLowerCase()) >= 0;
			default: throw new Error("luna-bus: unsupported op " + inOp);
			}
		});
	}
	function matches(inRecord, inWhere) {
		return (inWhere || []).every(function(inClause) {
			var value = propValue(inRecord, inClause.prop);
			if (isArray(value)) {
				return value.some(function(inV) { return matchOne(inV, inClause.op, inClause.val); });
			}
			if (value === undefined && inClause.op === "=" && inClause.val === undefined) {
				return true;
			}
			return matchOne(value, inClause.op, inClause.val);
		});
	}
	function find(inQuery) {
		var found = db.all(inQuery.from).filter(function(inR) {
			return !inR._del && matches(inR, inQuery.where);
		});
		if (inQuery.orderBy) {
			found.sort(function(a, b) {
				var x = propValue(a, inQuery.orderBy), y = propValue(b, inQuery.orderBy);
				x = x === undefined ? "" : x;
				y = y === undefined ? "" : y;
				return x < y ? -1 : x > y ? 1 : (a._id < b._id ? -1 : 1);
			});
		}
		if (inQuery.desc) {
			found.reverse();
		}
		// db8 answers at most 500 records a page, and hands back a key for the next one.
		var limit = Math.min(inQuery.limit || 500, 500);
		var start = inQuery.page ? parseInt(inQuery.page, 10) : 0;
		var page = found.slice(start, start + limit);
		var result = {results: page.map(clone)};
		if (start + limit < found.length) {
			result.next = String(start + limit);
		}
		if (inQuery.select) {
			result.results = result.results.map(function(inR) {
				var out = {};
				inQuery.select.forEach(function(inP) { out[inP] = inR[inP]; });
				return out;
			});
		}
		return {result: result, count: found.length};
	}

	// --- watches ---------------------------------------------------------

	var watches = [];
	function fireWatches(inKinds) {
		var fire = watches.filter(function(inW) {
			return inKinds.some(function(inK) { return isKindOf(inK, inW.kind); });
		});
		watches = watches.filter(function(inW) { return fire.indexOf(inW) < 0; });
		fire.forEach(function(inW) {
			setTimeout(function() { inW.send({json: {fired: true}}); }, 0);
		});
		if (config.persist) {
			try {
				window.sessionStorage.setItem("__lunaBusDb", JSON.stringify(dump()));
			} catch (e) {}
		}
	}
	function dump() {
		var persons = db.all("com.palm.person:1").map(function(inP) {
			return {_id: inP._id, favorite: inP.favorite, contactIds: inP.contactIds};
		});
		var prefs = db.all("com.palm.app.contacts.prefs:1")[0];
		return {accounts: accounts, contacts: db.all("com.palm.contact:1").map(clone), persons: persons, prefs: prefs};
	}

	// --- linker ----------------------------------------------------------

	var linker = mock.linker = {};

	function sortOrder() {
		var p = db.all("com.palm.app.contacts.prefs:1")[0];
		return (p && p.listSortOrder) || "LAST_FIRST";
	}
	// The sort key the contacts service writes (SortKey in the contacts
	// framework): names lowercased, tab separated; company first for the
	// COMPANY_ orders. A person without the needed parts sorts last.
	function sortKeyFor(inPerson) {
		var order = sortOrder(), name = inPerson.name || {}, org = (inPerson.organization || {}).name || "";
		var given = (name.givenName || "").toLowerCase(), family = (name.familyName || "").toLowerCase();
		var names = /FIRST_LAST$/.test(order) ? [given, family] : [family, given];
		if (/^COMPANY/.test(order)) {
			names.unshift(org.toLowerCase());
		}
		var key = names.filter(function(inN) { return inN; }).join("\t");
		if (!key) {
			key = (inPerson.nickname || org || (inPerson.emails[0] || {}).value || "").toLowerCase();
		}
		return key || "￿";
	}
	function sameValue(a, b) {
		return String(a.value || "").toLowerCase().replace(/[\s()\-.]/g, "") === String(b.value || "").toLowerCase().replace(/[\s()\-.]/g, "");
	}
	function pushUnique(ioList, inItems, inEqual) {
		(inItems || []).forEach(function(inItem) {
			if (!ioList.some(function(inHave) { return inEqual(inHave, inItem); })) {
				ioList.push(clone(inItem));
			}
		});
	}
	function hasName(inName) {
		return inName && (inName.givenName || inName.familyName || inName.middleName);
	}

	// Rebuilds a person's fields from its contacts, in contactIds order: the
	// first contact (the primary) wins for single values.
	linker.rebuild = function(inPerson) {
		var contacts = (inPerson.contactIds || []).map(db.byId).filter(function(inC) { return !!inC; });
		inPerson.contactIds = contacts.map(function(inC) { return inC._id; });
		var p = inPerson;
		p.name = {};
		p.names = [];
		p.nickname = "";
		p.organization = {};
		p.birthday = "";
		p.anniversary = "";
		p.notes = [];
		["phoneNumbers", "emails", "ims", "addresses", "urls", "relations"].forEach(function(inF) { p[inF] = []; });
		p.photos = {};
		contacts.forEach(function(c) {
			if (hasName(c.name)) {
				p.names.push(clone(c.name));
				if (!hasName(p.name)) {
					p.name = clone(c.name);
				}
			}
			p.nickname = p.nickname || c.nickname || "";
			if (!p.organization.name && !p.organization.title && c.organizations && c.organizations[0]) {
				p.organization = clone(c.organizations[0]);
			}
			p.birthday = p.birthday || c.birthday || "";
			p.anniversary = p.anniversary || c.anniversary || "";
			if (c.note) {
				p.notes.push(c.note);
			}
			pushUnique(p.phoneNumbers, c.phoneNumbers, sameValue);
			pushUnique(p.emails, c.emails, sameValue);
			pushUnique(p.ims, c.ims, sameValue);
			pushUnique(p.urls, c.urls, sameValue);
			pushUnique(p.relations, c.relations, function(a, b) { return a.value === b.value && a.type === b.type; });
			pushUnique(p.addresses, c.addresses, function(a, b) {
				return ["streetAddress", "locality", "region", "postalCode", "country"].every(function(k) {
					return (a[k] || "") === (b[k] || "");
				});
			});
			var photo = (c.photos || []).filter(function(inPh) { return inPh.localPath || inPh.value; })[0];
			if (photo && !p.photos.bigPhotoPath) {
				p.photos = {bigPhotoPath: photo.localPath || photo.value, squarePhotoPath: photo.localPath || photo.value,
					listPhotoPath: photo.localPath || photo.value, contactId: c._id, accountId: c.accountId};
			}
		});
		var terms = {};
		p.names.forEach(function(n) {
			var g = (n.givenName || "").toLowerCase(), f = (n.familyName || "").toLowerCase();
			if (f) {
				terms[f + g] = true;
				if (g) {
					terms[g.charAt(0) + f] = true;
				}
			}
		});
		p.searchTerms = Object.keys(terms);
		p.sortKey = sortKeyFor(p);
		if (p.favorite === undefined) {
			p.favorite = false;
		}
		return p;
	};
	linker.personOf = function(inContactId) {
		return db.all("com.palm.person:1").filter(function(inP) {
			return (inP.contactIds || []).indexOf(inContactId) >= 0;
		})[0];
	};
	// What the linker's watch on com.palm.contact:1 does after a write.
	linker.relink = function(inContactIds) {
		var touched = {};
		inContactIds.forEach(function(inId) {
			var person = linker.personOf(inId);
			if (!person && db.byId(inId)) {
				person = db.store({_kind: "com.palm.person:1", favorite: false, contactIds: [inId]});
			}
			if (person) {
				touched[person._id] = person;
			}
		});
		for (var id in touched) {
			if (touched.hasOwnProperty(id)) {
				var person = linker.rebuild(touched[id]);
				if (!person.contactIds.length) {
					db.remove(person._id);
				} else {
					db.store(person);
				}
			}
		}
	};
	linker.resort = function() {
		db.all("com.palm.person:1").forEach(function(inP) {
			inP.sortKey = sortKeyFor(inP);
			db.store(inP);
		});
	};

	// --- services --------------------------------------------------------

	function ok(inJson) {
		return {json: inJson || {}};
	}
	function fail(inCode, inText) {
		return {error: {errorCode: inCode, errorText: inText}};
	}
	function kindsOf(inObjects) {
		return inObjects.map(function(inO) { return inO._kind; });
	}

	// Each handler is (params, send, caller, bridge) -> rule, or undefined
	// when it answers through send itself (subscriptions).
	var services = {
		"luna://com.palm.db/find": function(inParams, inSend, inCaller, inBridge) {
			var q = inParams.query || {};
			if (!q.from) {
				return fail(-986, "db: 'from' is required");
			}
			if (!allowed(q.from, "read", CALLER)) {
				return fail(-3963, "db: permission denied");
			}
			var r = find(q);
			if (inParams.count) {
				r.result.count = r.count;
			}
			if (inParams.watch) {
				watches.push({kind: q.from, send: inSend, bridge: inBridge});
			}
			return ok(r.result);
		},
		"luna://com.palm.db/get": function(inParams) {
			return ok({results: (inParams.ids || []).map(function(inId) {
				return records[inId] && !records[inId]._del ? clone(records[inId]) : undefined;
			}).filter(function(inR) { return !!inR; })});
		},
		"luna://com.palm.db/put": function(inParams) {
			return write(inParams.objects || [], false);
		},
		"luna://com.palm.db/merge": function(inParams) {
			if (inParams.query) {
				var ids = find(inParams.query).result.results.map(function(inR) { return inR._id; });
				var objects = ids.map(function(inId) {
					var o = clone(inParams.props);
					o._id = inId;
					return o;
				});
				var r = write(objects, true);
				return r.error ? r : ok({count: objects.length});
			}
			return write(inParams.objects || [], true);
		},
		"luna://com.palm.db/del": function(inParams) {
			var ids = inParams.ids || find(inParams.query || {}).result.results.map(function(inR) { return inR._id; });
			var gone = ids.map(function(inId) { return records[inId]; }).filter(function(inR) { return !!inR; });
			for (var i = 0; i < gone.length; i++) {
				if (!allowed(gone[i]._kind, "delete", CALLER)) {
					return fail(-3963, "db: permission denied");
				}
			}
			gone.forEach(function(inR) { db.remove(inR._id); });
			var contactIds = gone.filter(function(inR) { return isKindOf(inR._kind, "com.palm.contact:1"); })
				.map(function(inR) { return inR._id; });
			if (contactIds.length) {
				// A deleted contact leaves its person; an empty person goes.
				db.all("com.palm.person:1").forEach(function(inP) {
					if (inP.contactIds.some(function(inId) { return contactIds.indexOf(inId) >= 0; })) {
						linker.rebuild(inP);
						if (inP.contactIds.length) {
							db.store(inP);
						} else {
							db.remove(inP._id);
						}
					}
				});
			}
			fireWatches(kindsOf(gone).concat(contactIds.length ? ["com.palm.person:1"] : []));
			return ok({results: gone.map(function(inR) { return {id: inR._id, rev: rev}; })});
		},
		"luna://com.palm.tempdb/find": function(inParams, inSend, inCaller, inBridge) {
			if (inParams.watch) {
				watches.push({kind: (inParams.query || {}).from, send: inSend, bridge: inBridge});
			}
			return ok({results: clone((config.tempdb || {})[(inParams.query || {}).from] || [])});
		},

		"luna://com.palm.service.accounts/listAccounts": function() {
			return ok({results: clone(accounts)});
		},

		"luna://com.palm.service.contacts.linker/saveNewPersonAndContacts": function(inParams) {
			var contacts = (inParams.contacts || []).map(function(inC) {
				var c = clone(inC);
				delete c._id;
				var err = validate(c);
				if (err) {
					throw {code: -986, text: err};
				}
				return db.store(c);
			});
			var person = clone(inParams.person || {});
			person._kind = "com.palm.person:1";
			delete person._id;
			person.contactIds = contacts.map(function(inC) { return inC._id; });
			person = db.store(linker.rebuild(person));
			fireWatches(["com.palm.contact:1", "com.palm.person:1"]);
			return ok({person: clone(person), contacts: contacts.map(clone)});
		},
		"luna://com.palm.service.contacts.linker/manualLink": function(inParams) {
			var to = db.byId(inParams.personToLinkTo), from = db.byId(inParams.personToLink);
			if (!to || !from) {
				return fail(-1, "manualLink: no such person");
			}
			to.contactIds = to.contactIds.concat(from.contactIds.filter(function(inId) {
				return to.contactIds.indexOf(inId) < 0;
			}));
			to.favorite = to.favorite || from.favorite;
			db.remove(from._id);
			db.store(linker.rebuild(to));
			fireWatches(["com.palm.person:1"]);
			return ok({});
		},
		"luna://com.palm.service.contacts.linker/manualUnlink": function(inParams) {
			var person = db.byId(inParams.personToRemoveLinkFrom), id = inParams.contactToRemoveFromPerson;
			if (!person || person.contactIds.indexOf(id) < 0) {
				return fail(-1, "manualUnlink: contact not in person");
			}
			person.contactIds = person.contactIds.filter(function(inId) { return inId !== id; });
			db.store(linker.rebuild(person));
			db.store(linker.rebuild({_kind: "com.palm.person:1", favorite: false, contactIds: [id]}));
			fireWatches(["com.palm.person:1"]);
			return ok({});
		},
		"luna://com.palm.service.contacts.linker/deleteOrphanedPerson": function(inParams) {
			var person = db.byId(inParams.personId);
			if (person && person.contactIds.filter(db.byId).length === 0) {
				db.remove(person._id);
				fireWatches(["com.palm.person:1"]);
			}
			return ok({});
		},

		"luna://com.palm.service.contacts/favoritePerson": function(inParams) {
			return setFavorite(inParams.personId, true);
		},
		"luna://com.palm.service.contacts/unfavoritePerson": function(inParams) {
			return setFavorite(inParams.personId, false);
		},

		"luna://com.palm.service.contacts/countVCardContacts": function(inParams) {
			var v = (config.vcards || {})[inParams.filePath];
			return v ? ok({count: v.contacts.length}) : fail(-1, "cannot read " + inParams.filePath);
		},
		"luna://com.palm.service.contacts/readVCard": function(inParams) {
			var v = (config.vcards || {})[inParams.filePath];
			return v ? ok({contacts: clone(v.contacts)}) : fail(-1, "cannot read " + inParams.filePath);
		},
		"luna://com.palm.service.contacts/importVCard": function(inParams) {
			var v = (config.vcards || {})[inParams.filePath];
			if (!v) {
				return fail(-1, "cannot read " + inParams.filePath);
			}
			var palm = accounts.filter(function(inA) { return inA.templateId === "com.palm.palmprofile"; })[0];
			var ids = v.contacts.map(function(inC) {
				var c = clone(inC);
				c._kind = "com.palm.contact.palmprofile:1";
				c.accountId = palm ? palm._id : "";
				return db.store(c)._id;
			});
			linker.relink(ids);
			fireWatches(["com.palm.contact:1", "com.palm.person:1"]);
			return ok({});
		},

		"luna://com.palm.applicationManager/open": function() {
			return ok({processId: "mock"});
		},
		"luna://com.palm.applicationManager/launch": function() {
			return ok({processId: "mock"});
		},
		"luna://com.webos.service.activitymanager/create": function() {
			return ok({activityId: nextId++});
		}
	};

	function setFavorite(inPersonId, inFavorite) {
		var person = db.byId(inPersonId);
		if (!person || !isKindOf(person._kind, "com.palm.person:1")) {
			return fail(-1, "no such person");
		}
		person.favorite = inFavorite;
		db.store(person);
		fireWatches(["com.palm.person:1"]);
		return ok({});
	}

	function write(inObjects, inMerge) {
		var out = [], kinds = [], contactIds = [], i, o, old, rec, err;
		for (i = 0; i < inObjects.length; i++) {
			o = inObjects[i];
			old = o._id ? records[o._id] : undefined;
			if (inMerge && !old) {
				return fail(-3970, "db: record not found");
			}
			rec = inMerge ? Object.assign(clone(old), clone(o)) : clone(o);
			if (!rec._kind) {
				return fail(-3970, "db: kind not registered");
			}
			if (!allowed(rec._kind, old ? "update" : "create", CALLER)) {
				return fail(-3963, "db: permission denied");
			}
			err = validate(rec);
			if (err) {
				return fail(-986, err);
			}
		}
		for (i = 0; i < inObjects.length; i++) {
			o = inObjects[i];
			old = o._id ? records[o._id] : undefined;
			rec = db.store(inMerge ? Object.assign(clone(old), clone(o)) : clone(o));
			out.push({id: rec._id, rev: rec._rev});
			kinds.push(rec._kind);
			if (isKindOf(rec._kind, "com.palm.contact:1")) {
				contactIds.push(rec._id);
			}
			if (rec._kind === "com.palm.app.contacts.prefs:1") {
				// The contacts service's sortOrderChanged activity.
				linker.resort();
				kinds.push("com.palm.person:1");
			}
		}
		if (contactIds.length) {
			linker.relink(contactIds);
			kinds.push("com.palm.person:1");
		}
		fireWatches(kinds);
		return ok({results: out});
	}

	// --- seeding ---------------------------------------------------------

	(data.contacts || []).forEach(function(inC) {
		db.store(clone(inC));
	});
	(data.persons || []).forEach(function(inP) {
		db.store(linker.rebuild({_id: inP._id, _kind: "com.palm.person:1", favorite: !!inP.favorite,
			contactIds: clone(inP.contactIds)}));
	});
	// Contacts the data puts in no person get one each, as the linker would.
	linker.relink(db.all("com.palm.contact:1").map(function(inC) { return inC._id; }));
	if (data.prefs) {
		db.store(Object.assign({_kind: "com.palm.app.contacts.prefs:1"}, clone(data.prefs)));
		linker.resort();
	}

	// --- ACG -------------------------------------------------------------

	function checkAcg(inUrl) {
		var acg = config.acg;
		if (!acg) {
			return {allowed: true, result: "unchecked"};
		}
		var key = inUrl.replace(/^luna:\/\//, "").replace(/\/+$/, "");
		if ((acg.exempt || []).some(function(inRe) { return new RegExp(inRe).test(inUrl); })) {
			return {allowed: true, result: "exempt"};
		}
		var groups = [];
		for (var g in acg.groups) {
			if (acg.groups.hasOwnProperty(g) && acg.groups[g].some(function(inEntry) {
				return inEntry === key || (inEntry.slice(-1) === "*" && key.indexOf(inEntry.slice(0, -1)) === 0);
			})) {
				groups.push(g);
			}
		}
		if (!groups.length) {
			return {allowed: false, result: "unknown"};
		}
		var granted = groups.some(function(inGroup) { return (acg.granted || []).indexOf(inGroup) >= 0; });
		return {allowed: granted, result: granted ? "granted" : "denied: needs one of " + groups.join(", ")};
	}

	// --- PalmSystem and the bus -------------------------------------------

	var palm = {
		identifier: CALLER + " 0",
		launchParams: JSON.stringify(config.launchParams || {}),
		deviceInfo: JSON.stringify({modelName: "Mock", platformVersion: "LuneOS mock",
			screenWidth: window.innerWidth, screenHeight: window.innerHeight, keyboardType: "QWERTY"}),
		locale: "en_us",
		localeRegion: "us",
		phoneRegion: "us",
		timeFormat: "HH24",
		isActivated: true,
		screenOrientation: "up",
		windowOrientation: "up",
		stageReady: function() { calls.push({kind: "palm", url: "stageReady"}); },
		activate: function() {},
		deactivate: function() {},
		setWindowProperties: function() {},
		setWindowOrientation: function() {},
		enableFullScreenMode: function() {},
		addBannerMessage: function(inText) {
			calls.push({kind: "palm", url: "addBannerMessage", params: inText});
			return 1;
		},
		removeBannerMessage: function() {},
		clearBannerMessages: function() {},
		addNewContentIndicator: function() { return 1; },
		removeNewContentIndicator: function() {},
		paste: function() {}
	};
	for (var p in config.palmSystem || {}) {
		if (config.palmSystem.hasOwnProperty(p)) {
			palm[p] = config.palmSystem[p];
		}
	}
	window.PalmSystem = palm;

	window.PalmServiceBridge = function() {
		this.cancelled = false;
	};
	window.PalmServiceBridge.prototype.call = function(inUrl, inParams) {
		var self = this, params = {};
		try {
			params = JSON.parse(inParams || "{}");
		} catch (e) {}
		var url = inUrl.replace(/^palm:\/\//, "luna://").replace(/\/+$/, "");
		var override = (config.luna || {})[url];
		var acg = checkAcg(url);
		var entry = {kind: "luna", url: url, params: params, acg: acg.result};
		calls.push(entry);
		var send = function(inRule) {
			if (inRule.never) {
				return;
			}
			setTimeout(function() {
				if (self.cancelled || !self.onservicecallback) {
					return;
				}
				var body = inRule.error ? Object.assign({returnValue: false}, inRule.error) :
					Object.assign({returnValue: true}, clone(inRule.json) || {});
				self.onservicecallback(JSON.stringify(body));
			}, (inRule.delay || 0) + (config.delay || 0));
		};
		if (!acg.allowed) {
			// What ls-hubd answers for a method the app has no group for.
			send(fail(-1, "Denied method call \"" + url.replace(/^.*\//, "") + "\" for category \"/\""));
			return;
		}
		if (override) {
			send(override);
			return;
		}
		var handler = services[url];
		if (!handler) {
			entry.unmocked = true;
			send({error: {errorCode: -1, errorText: "Unknown service (mock has no rule for " + url + ")"}});
			return;
		}
		var rule;
		try {
			rule = handler(params, send, CALLER, self);
		} catch (e) {
			rule = e && e.code ? fail(e.code, e.text) : fail(-1, String(e));
		}
		if (rule) {
			send(rule);
		}
	};
	window.PalmServiceBridge.prototype.cancel = function() {
		var self = this;
		this.cancelled = true;
		watches = watches.filter(function(inW) { return inW.bridge !== self; });
	};

	mock.relaunch = function(inParams) {
		palm.launchParams = JSON.stringify(inParams || {});
		if (window.Mojo && window.Mojo.relaunch) {
			window.Mojo.relaunch();
		}
	};
	mock.set = function(inUrl, inRule) {
		(config.luna = config.luna || {})[inUrl] = inRule;
	};
	// A change made by a sync or another app, while Contacts is open.
	mock.editContact = function(inId, inFields) {
		var c = Object.assign(db.byId(inId), clone(inFields));
		db.store(c);
		linker.relink([inId]);
		fireWatches([c._kind, "com.palm.person:1"]);
	};
	mock.setAccounts = function(inAccounts) {
		accounts = clone(inAccounts);
	};
})();
