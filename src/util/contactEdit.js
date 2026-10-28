// contactEdit.js - what an edit of a person writes, and to which contact -
// LuneOS Contacts app
//
// A person is the linker's merge of its contacts (one per account). An edit
// must change the contacts, never the merge, and only the ones the app may
// change. This follows the legacy Edit scene:
//   - Entries of the list fields (phone numbers, emails, ...) belong to the
//     contact they came from. An entry of a read-only contact (Skype, a SIM
//     sdn entry, ...) is shown but cannot be changed or removed; a new entry
//     goes to the contact the user picks, by default the target (below).
//   - The single fields (name, nickname, organization, birthday,
//     anniversary) are written to the target: the primary contact (the first
//     of the person's contactIds, whose values the person shows) when it may
//     be changed, else the first linked contact that may. Writing them to a
//     contact that is not the primary also makes it the primary, so the
//     person shows what was typed.
//   - When no linked contact may be changed, a new contact in the default
//     account is created for the changes and linked to the person, as the
//     legacy ensureSelectedContactIsEditable did.
//   - Only what changed is written; an untouched edit writes nothing.
//
// Pure module: no Enyo, so it is unit tested under Node.

var names = require("./names");
var accountRules = require("./accountRules");
var labels = require("./labels");

var LIST_FIELDS = ["phoneNumbers", "emails", "ims", "addresses", "urls", "relations", "notes"];
var ADDRESS_PARTS = ["streetAddress", "locality", "region", "postalCode", "country"];

function clone(inValue) {
	return inValue === undefined ? undefined : JSON.parse(JSON.stringify(inValue));
}
function str(inValue) {
	return typeof inValue === "string" ? inValue : (inValue === undefined || inValue === null ? "" : String(inValue));
}

// The entries of a contact for a list field; notes are the contact's one
// note string.
function entriesOf(inContact, inField) {
	if (inField === "notes") {
		return str(inContact.note).trim() ? [{value: str(inContact.note)}] : [];
	}
	return (inContact[inField] || []).filter(function(inE) { return inE && typeof inE === "object"; });
}

function isBlank(inField, inEntry) {
	if (inField === "addresses") {
		return ADDRESS_PARTS.every(function(inP) { return !str(inEntry[inP]).trim(); });
	}
	return !str(inEntry.value).trim();
}

// What the user can see and change of an entry.
function visible(inField, inEntry) {
	if (inField === "addresses") {
		var out = {type: str(inEntry.type)};
		ADDRESS_PARTS.forEach(function(inP) { out[inP] = str(inEntry[inP]).trim(); });
		return out;
	}
	if (inField === "notes") {
		return {value: str(inEntry.value).replace(/\s+$/, "")};
	}
	return {value: str(inEntry.value).trim(), type: str(inEntry.type)};
}
function sameEntry(inField, inA, inB) {
	return JSON.stringify(visible(inField, inA)) === JSON.stringify(visible(inField, inB));
}

/**
	The edit state of a person: what the edit view shows.
		inPerson    the person record (null for a new person)
		inContacts  its contacts, in contactIds order (missing ones left out)
		inAccounts  the accounts (com.palm.service.accounts/listAccounts)
		inDefaultAccountId  the defaultAccountId pref
		inTemplate  for a new person: a contact record to start from (the
		            launch parameter of another app, a vCard), or null
*/
function build(inPerson, inContacts, inAccounts, inDefaultAccountId, inTemplate) {
	var contacts = (inContacts || []).filter(function(inC) { return !!inC; });
	var isNew = !inPerson || !contacts.length;
	var state = {
		isNew: isNew,
		personId: inPerson ? inPerson._id : null,
		favorite: !!(inPerson && inPerson.favorite),
		contacts: [],
		primaryId: null,
		targetId: null,
		newAccount: accountRules.defaultAccount(inAccounts, inDefaultAccountId),
		single: {},
		lists: {}
	};
	if (isNew) {
		var t = inTemplate || {};
		state.single = singleOf(t);
		LIST_FIELDS.forEach(function(inF) {
			state.lists[inF] = entriesOf(t, inF).map(function(inE) {
				return {contactId: null, readOnly: false, entry: clone(inE)};
			});
		});
		return state;
	}

	contacts.forEach(function(inC) {
		state.contacts.push({
			_id: inC._id,
			accountId: inC.accountId,
			readOnly: accountRules.isReadOnly(inC, inAccounts),
			icon: accountRules.icon(inAccounts, inC.accountId),
			accountName: accountRules.name(inAccounts, inC.accountId)
		});
	});
	state.primaryId = contacts[0]._id;
	for (var i = 0; i < state.contacts.length; i++) {
		if (!state.contacts[i].readOnly) {
			state.targetId = state.contacts[i]._id;
			break;
		}
	}
	// What the person shows: the primary's values, else the first contact
	// that has one (the linker's rule).
	state.single = singleOf(merged(contacts));
	LIST_FIELDS.forEach(function(inF) {
		state.lists[inF] = [];
		contacts.forEach(function(inC, inIndex) {
			entriesOf(inC, inF).forEach(function(inE) {
				state.lists[inF].push({contactId: inC._id, readOnly: state.contacts[inIndex].readOnly, entry: clone(inE),
					original: clone(inE)});
			});
		});
	});
	return state;
}

function hasName(inName) {
	return !!(inName && (str(inName.givenName) || str(inName.familyName) || str(inName.middleName)));
}

// The single values a person shows, from its contacts in order.
function merged(inContacts) {
	var out = {name: {}, nickname: "", organizations: [], birthday: "", anniversary: ""};
	inContacts.forEach(function(inC) {
		if (!hasName(out.name) && hasName(inC.name)) {
			out.name = inC.name;
		}
		out.nickname = out.nickname || str(inC.nickname);
		if (!out.organizations.length && inC.organizations && inC.organizations[0]) {
			out.organizations = inC.organizations;
		}
		out.birthday = out.birthday || str(inC.birthday);
		out.anniversary = out.anniversary || str(inC.anniversary);
	});
	return out;
}

function singleOf(inContact) {
	var org = (inContact.organizations && inContact.organizations[0]) || inContact.organization || {};
	var n = inContact.name || {};
	return {
		name: {
			honorificPrefix: str(n.honorificPrefix), givenName: str(n.givenName), middleName: str(n.middleName),
			familyName: str(n.familyName), honorificSuffix: str(n.honorificSuffix)
		},
		nickname: str(inContact.nickname),
		organization: {title: str(org.title), department: str(org.department), name: str(org.name)},
		birthday: str(inContact.birthday),
		anniversary: str(inContact.anniversary)
	};
}

function singleChanged(inBefore, inAfter, inKey) {
	if (inKey === "name") {
		return !names.equal(inBefore.name, inAfter.name);
	}
	if (inKey === "organization") {
		return ["title", "department", "name"].some(function(inK) {
			return str(inBefore.organization[inK]).trim() !== str(inAfter.organization[inK]).trim();
		});
	}
	return str(inBefore[inKey]).trim() !== str(inAfter[inKey]).trim();
}

var SINGLE_KEYS = ["name", "nickname", "organization", "birthday", "anniversary"];

// Writes single values into a contact record (all of inKeys).
function applySingle(ioContact, inSingle, inKeys) {
	inKeys.forEach(function(inK) {
		if (inK === "name") {
			ioContact.name = clone(inSingle.name);
			Object.keys(ioContact.name).forEach(function(inP) { ioContact.name[inP] = str(ioContact.name[inP]).trim(); });
		} else if (inK === "organization") {
			var orgs = clone(ioContact.organizations) || [];
			var org = orgs[0] || {};
			org.title = str(inSingle.organization.title).trim();
			org.department = str(inSingle.organization.department).trim();
			org.name = str(inSingle.organization.name).trim();
			if (org.title || org.department || org.name || orgs.length) {
				orgs[0] = org;
			}
			if (!org.title && !org.department && !org.name) {
				orgs.shift();
			}
			ioContact.organizations = orgs;
		} else {
			ioContact[inK] = str(inSingle[inK]).trim();
		}
	});
}

// The value a contact's list field gets from rows that belong to it.
function listValue(inField, inRows, inOriginal) {
	var entries = inRows.filter(function(inR) { return !isBlank(inField, inR.entry); }).map(function(inR) {
		var e = clone(inR.entry);
		if (inField !== "notes") {
			// Find the stored entry this row was made from, to keep its _id,
			// primary flag and so on; a changed value loses its stale
			// normalizedValue, which the services recompute.
			var orig = inR.original;
			if (orig) {
				var keep = clone(orig);
				var vis = visible(inField, e);
				Object.keys(vis).forEach(function(inK) { keep[inK] = vis[inK]; });
				if (str(orig.value) !== vis.value && keep.normalizedValue !== undefined) {
					delete keep.normalizedValue;
				}
				return keep;
			}
			var fresh = visible(inField, e);
			if (!fresh.type) {
				fresh.type = labels.defaultType(inField);
			}
			return fresh;
		}
		return visible(inField, e);
	});
	if (inField === "notes") {
		return entries.map(function(inE) { return inE.value; }).join("\n\n");
	}
	return entries;
}

function sameList(inField, inA, inB) {
	if (inField === "notes") {
		return str(inA).replace(/\s+$/, "") === str(inB).replace(/\s+$/, "");
	}
	if (inA.length !== inB.length) {
		return false;
	}
	for (var i = 0; i < inA.length; i++) {
		if (!sameEntry(inField, inA[i], inB[i])) {
			return false;
		}
	}
	return true;
}

function contactField(inField) {
	return inField === "notes" ? "note" : inField;
}

/**
	What to write for an edit.
		inState     from build()
		inContacts  the same contacts build() was given
		inEdited    {favorite, single: {...like state.single}, lists: {field: [row]}}
		            rows are {contactId, entry, original}: contactId null means
		            the target; original is the entry the row was built from
	Returns
		{create: contact record | null,   a new contact to save
		 updates: [{_id, fields}],         merges into existing contacts
		 favorite: true/false | undefined, when it changed
		 makePrimary: contact id | "new" | null}
*/
function plan(inState, inContacts, inEdited) {
	var result = {create: null, updates: [], favorite: undefined, makePrimary: null};
	var byId = {};
	(inContacts || []).forEach(function(inC) { byId[inC._id] = inC; });
	var readOnly = {};
	inState.contacts.forEach(function(inC) { readOnly[inC._id] = inC.readOnly; });

	if (!!inEdited.favorite !== inState.favorite) {
		result.favorite = !!inEdited.favorite;
	}

	var changedSingles = SINGLE_KEYS.filter(function(inK) { return singleChanged(inState.single, inEdited.single, inK); });
	var target = inState.targetId;
	var newContact = null;

	function ensureNew() {
		if (!newContact) {
			var account = inState.newAccount;
			newContact = {_kind: account ? account.kind : "com.palm.contact.palmprofile:1",
				accountId: account ? account.accountId : ""};
		}
		return newContact;
	}

	// Rows by the contact they go to; a new row goes to its picked contact,
	// else the target, else the new contact.
	var rowsFor = {};
	LIST_FIELDS.forEach(function(inF) {
		(inEdited.lists[inF] || []).forEach(function(inRow) {
			var id = inRow.contactId || target || "new";
			if (id !== "new" && readOnly[id]) {
				return;   // read-only entries stay as they are
			}
			if (id === "new" && isBlank(inF, inRow.entry)) {
				return;   // an empty row is no reason to create a contact
			}
			((rowsFor[id] = rowsFor[id] || {})[inF] = rowsFor[id][inF] || []).push(inRow);
		});
	});

	if (inState.isNew) {
		var c = ensureNew();
		applySingle(c, inEdited.single, SINGLE_KEYS);
		if (!c.organizations.length) {
			delete c.organizations;
		}
		LIST_FIELDS.forEach(function(inF) {
			var v = listValue(inF, (rowsFor["new"] || {})[inF] || [], null);
			if (inF === "notes" ? v : v.length) {
				c[contactField(inF)] = v;
			}
		});
		["nickname", "birthday", "anniversary"].forEach(function(inK) {
			if (!c[inK]) {
				delete c[inK];
			}
		});
		result.create = c;
		result.favorite = !!inEdited.favorite;
		return result;
	}

	// The list fields of each changeable contact.
	Object.keys(rowsFor).forEach(function(inId) {
		if (inId === "new") {
			return;
		}
		var contact = byId[inId], fields = {};
		LIST_FIELDS.forEach(function(inF) {
			var rows = rowsFor[inId][inF];
			if (!rows) {
				return;
			}
			var before = inF === "notes" ? str(contact.note) : entriesOf(contact, inF);
			var after = listValue(inF, rows, before);
			if (!sameList(inF, before, after)) {
				fields[contactField(inF)] = after;
			}
		});
		if (Object.keys(fields).length) {
			result.updates.push({_id: inId, fields: fields});
		}
	});
	// Fields whose every row was removed: the contact had entries, the edit has none left for it.
	inState.contacts.forEach(function(inC) {
		if (inC.readOnly) {
			return;
		}
		var contact = byId[inC._id];
		LIST_FIELDS.forEach(function(inF) {
			var had = inF === "notes" ? !!str(contact.note).trim() : entriesOf(contact, inF).length > 0;
			var rows = (rowsFor[inC._id] || {})[inF];
			if (had && !rows) {
				var u = updateFor(result, inC._id);
				u.fields[contactField(inF)] = inF === "notes" ? "" : [];
			}
		});
	});

	if (changedSingles.length) {
		if (target) {
			var u = updateFor(result, target);
			// Becoming the primary, it takes all of what the person showed.
			applySingle(u.fields, inEdited.single, target === inState.primaryId ? changedSingles : SINGLE_KEYS);
			if (target !== inState.primaryId) {
				result.makePrimary = target;
			}
		} else {
			applySingle(ensureNew(), inEdited.single, SINGLE_KEYS);
			result.makePrimary = "new";
		}
	}
	if (rowsFor["new"]) {
		var nc = ensureNew();
		if (!nc.name) {
			// So the linker and the user can tell what this contact is.
			applySingle(nc, inEdited.single, ["name"]);
		}
		LIST_FIELDS.forEach(function(inF) {
			var v = listValue(inF, rowsFor["new"][inF] || [], null);
			if (inF === "notes" ? v : v.length) {
				nc[contactField(inF)] = v;
			}
		});
	}
	result.create = newContact;
	result.updates = result.updates.filter(function(inU) { return Object.keys(inU.fields).length; });
	return result;
}

function updateFor(ioResult, inId) {
	for (var i = 0; i < ioResult.updates.length; i++) {
		if (ioResult.updates[i]._id === inId) {
			return ioResult.updates[i];
		}
	}
	var u = {_id: inId, fields: {}};
	ioResult.updates.push(u);
	return u;
}

//* An ISO date "YYYY-MM-DD", or "" (both are fine to store).
function isValidDate(inValue) {
	var v = str(inValue).trim();
	if (!v) {
		return true;
	}
	var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) {
		return false;
	}
	var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
	return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

module.exports = {build: build, plan: plan, isValidDate: isValidDate, LIST_FIELDS: LIST_FIELDS, entriesOf: entriesOf};
