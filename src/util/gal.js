// gal.js - global address lookup (GAL) - LuneOS Contacts app
//
// As the legacy GalService: an account whose REMOTECONTACTS capability
// provider names a "query" method (Exchange's palm://com.palm.eas/queryGal)
// is searched with {accountId, query, limit} and answers {results, count,
// total}. Each result is what the legacy mojomail-eas EasGalContactAdapter
// wrote: {displayName, givenName, familyName, companyName, jobTitle,
// phoneNumbers, emails, addresses}, the lists of {value, type}, an address
// one free-form value.
//
// Pure module: no Enyo, so it is unit tested under Node.

var LIMIT = 100;   // the legacy query's, and the most it says it shows

function text(inValue) {
	return typeof inValue === "string" ? inValue.trim() : "";
}

/**
	The accounts that can be searched: [{accountId, service, method}], the
	query a luna:// service and its method. Accounts being deleted, and
	queries that are no bus address, are left out.
*/
function providers(inAccounts) {
	var out = [];
	(Array.isArray(inAccounts) ? inAccounts : []).forEach(function(inAccount) {
		if (!inAccount || !inAccount._id || inAccount.beingDeleted || !Array.isArray(inAccount.capabilityProviders)) {
			return;
		}
		inAccount.capabilityProviders.forEach(function(inP) {
			var m = inP && inP.capability === "REMOTECONTACTS" &&
				/^(?:palm|luna):\/\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_\/]+)$/.exec(text(inP.query));
			if (m) {
				out.push({accountId: inAccount._id, service: "luna://" + m[1], method: m[2]});
			}
		});
	});
	return out;
}

function entries(inList, inAddress) {
	return (Array.isArray(inList) ? inList : []).map(function(inE) {
		var value = text(typeof inE === "string" ? inE : inE && inE.value);
		var type = text(inE && inE.type) || "type_work";
		if (!value) {
			return null;
		}
		return inAddress ? {streetAddress: value, type: type} : {value: value, type: type};
	}).filter(function(inE) { return inE; });
}

//* The name a result is listed by: its displayName, else its name parts, else its first email.
function displayName(inResult) {
	var r = inResult || {};
	return text(r.displayName) || [text(r.givenName), text(r.familyName)].filter(function(inP) { return inP; }).join(" ") ||
		(entries(r.emails)[0] || {}).value || "";
}

/**
	The results of every account, as one list sorted by name (the legacy
	sort). Anything that is not a result, or has no name to list it by,
	is left out.
*/
function merge(inLists) {
	var out = [];
	(Array.isArray(inLists) ? inLists : []).forEach(function(inList) {
		(Array.isArray(inList) ? inList : []).forEach(function(inR) {
			if (inR && typeof inR === "object" && !Array.isArray(inR) && displayName(inR)) {
				out.push(inR);
			}
		});
	});
	return out.sort(function(inA, inB) {
		return displayName(inA).localeCompare(displayName(inB));
	});
}

/**
	A result as a contact record: what details show, and what Add to
	Contacts starts from. A result without name parts is named by its
	displayName.
*/
function contact(inResult) {
	var r = inResult || {}, c = {}, given = text(r.givenName), family = text(r.familyName);
	if (given || family) {
		c.name = {givenName: given, familyName: family};
	} else if (text(r.displayName)) {
		c.name = {givenName: text(r.displayName), familyName: ""};
	}
	if (text(r.companyName) || text(r.jobTitle)) {
		c.organizations = [{name: text(r.companyName), title: text(r.jobTitle)}];
	}
	c.phoneNumbers = entries(r.phoneNumbers);
	c.emails = entries(r.emails);
	c.addresses = entries(r.addresses, true);
	return c;
}

/**
	A result as a person record, for the details view: a contact's fields,
	the organization as a person has it.
*/
function person(inResult) {
	var p = contact(inResult);
	p.organization = (p.organizations || [])[0] || {};
	delete p.organizations;
	return p;
}

//* What the list says under inCount results: "none", "tooMany" (the limit was hit), or "".
function message(inCount) {
	if (inCount === 0) {
		return "none";
	}
	return inCount >= LIMIT ? "tooMany" : "";
}

module.exports = {LIMIT: LIMIT, providers: providers, displayName: displayName, merge: merge, contact: contact, person: person,
	message: message};
