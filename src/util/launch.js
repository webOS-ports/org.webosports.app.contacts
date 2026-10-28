// launch.js - what a launch or relaunch of the app asks for - LuneOS Contacts app
//
// The launch types are the legacy app's (ContactsApp.handleLaunchParams),
// which other apps (Phone, Messaging, Email, the vCard handler) still send:
//
//   {launchType: "editContact", contact: {_id}} or person: {_id}
//   {launchType: "newContact" | "pseudo-card", contact: {...}, skipPrompt}
//       without skipPrompt: true the user is asked whether to make a new
//       contact or add to an existing one
//   {launchType: "addToExisting", contact: {...}} or person: {...}
//   {launchType: "showPerson", id} or just {id}
//   {target: "file:///.../x.vcf"}   a vCard to import (a local file)
//
// Parameters come from other apps, so nothing is trusted: ids must be
// strings, and a contact template is cut down to the fields a contact has
// (no _id, _kind or accountId: the app decides where a contact goes).
//
// Pure module: no Enyo, so it is unit tested under Node.

var LIST_FIELDS = ["phoneNumbers", "emails", "ims", "addresses", "urls", "relations"];
var NAME_PARTS = ["honorificPrefix", "givenName", "middleName", "familyName", "honorificSuffix"];
var ENTRY_KEYS = ["value", "type", "streetAddress", "locality", "region", "postalCode", "country"];

function isText(inValue) {
	return typeof inValue === "string";
}
function id(inValue) {
	return isText(inValue) && inValue.length > 0 && inValue.length < 200 ? inValue : null;
}

function strings(inObject, inKeys) {
	var out = {};
	inKeys.forEach(function(inK) {
		if (isText(inObject[inK])) {
			out[inK] = inObject[inK];
		}
	});
	return out;
}

/**
	A contact record to start a new contact from, holding only the fields
	of a contact with values of the right type. Takes a contact or a
	person (a person has `organization` and a `notes` array).
*/
function template(inContact) {
	if (!inContact || typeof inContact !== "object" || Array.isArray(inContact)) {
		return {};
	}
	var c = inContact, out = {};
	if (c.name && typeof c.name === "object") {
		out.name = strings(c.name, NAME_PARTS);
	}
	["nickname", "birthday", "anniversary"].forEach(function(inK) {
		if (isText(c[inK])) {
			out[inK] = c[inK];
		}
	});
	var org = (Array.isArray(c.organizations) && c.organizations[0]) || c.organization;
	if (org && typeof org === "object") {
		out.organizations = [strings(org, ["title", "department", "name"])];
	}
	if (isText(c.note)) {
		out.note = c.note;
	} else if (Array.isArray(c.notes)) {
		out.note = c.notes.filter(isText).join("\n\n");
	}
	LIST_FIELDS.forEach(function(inF) {
		if (Array.isArray(c[inF])) {
			out[inF] = c[inF].filter(function(inE) {
				return inE && typeof inE === "object";
			}).map(function(inE) {
				return strings(inE, ENTRY_KEYS);
			});
		}
	});
	return out;
}

/**
	What inParams (an object, or the JSON of one) asks for:
		{action: "edit", id}            id of a person or of one of its contacts
		{action: "new", contact}
		{action: "prompt", contact}     ask: new contact or add to existing
		{action: "addToExisting", contact}
		{action: "show", id}
		{action: "vcard", target}
	or null when there is nothing to do.
*/
function parse(inParams) {
	var p = inParams;
	if (isText(p)) {
		try {
			p = JSON.parse(p);
		} catch (e) {
			return null;
		}
	}
	if (!p || typeof p !== "object") {
		return null;
	}
	var type = p.launchType, target;
	if (type === "editContact") {
		target = id(p.contact && p.contact._id) || id(p.person && p.person._id) || id(p.id);
		return target ? {action: "edit", id: target} : null;
	}
	if (type === "newContact" || type === "pseudo-card") {
		return {action: p.skipPrompt === true ? "new" : "prompt", contact: template(p.contact)};
	}
	if (type === "addToExisting") {
		var c = p.contact || p.person;
		return c && typeof c === "object" ? {action: "addToExisting", contact: template(c)} : null;
	}
	if (id(p.id)) {
		return {action: "show", id: p.id};
	}
	// The contacts service reads the file and says whether it is a vCard.
	if (isText(p.target) && /^(file:\/\/)?\/[^\0]+$/.test(p.target)) {
		return {action: "vcard", target: p.target};
	}
	return null;
}

module.exports = {parse: parse, template: template};
