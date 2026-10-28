// profiles.js - the linked profiles of a person, and what may be done to
// each - LuneOS Contacts app
//
// The rules are the legacy LinkDetails dialog's: a person of one profile
// offers nothing; the primary profile cannot be made primary; a read-only
// profile cannot be deleted, only unlinked.
//
// Pure module: no Enyo, so it is unit tested under Node.

var
	names = require('./names'),
	accountRules = require('./accountRules');

/**
	One row per contact, in the person's order (the first is the primary):
	[{contactId, name, accountName, icon, readOnly, primary}].
*/
function rows(inContacts, inAccounts) {
	return (inContacts || []).filter(function(inC) { return inC && inC._id; }).map(function(inC, inIndex) {
		var orgs = Array.isArray(inC.organizations) ? inC.organizations : [];
		return {
			contactId: inC._id,
			name: names.displayName({name: inC.name, nickname: inC.nickname, organization: orgs[0],
				emails: inC.emails, ims: inC.ims, phoneNumbers: inC.phoneNumbers}),
			accountName: accountRules.name(inAccounts, inC.accountId),
			icon: accountRules.icon(inAccounts, inC.accountId),
			readOnly: accountRules.isReadOnly(inC, inAccounts),
			primary: inIndex === 0
		};
	});
}

/**
	What may be done to the profile inContact of a person whose contacts
	are inContactIds: {unlink, primary, remove}, all false when the person
	has fewer than two.
*/
function actions(inContactIds, inContact, inAccounts) {
	var ids = Array.isArray(inContactIds) ? inContactIds : [];
	if (ids.length < 2 || !inContact || ids.indexOf(inContact._id) < 0) {
		return {unlink: false, primary: false, remove: false};
	}
	return {
		unlink: true,
		primary: ids[0] !== inContact._id,
		remove: !accountRules.isReadOnly(inContact, inAccounts)
	};
}

module.exports = {rows: rows, actions: actions};
