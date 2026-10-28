// accountRules.js - which accounts hold contacts, and which contacts may be
// changed - LuneOS Contacts app
//
// The rules are the legacy contactsui AccountList's: a contact is read-only
// when its account's CONTACTS provider says readOnlyData, when it is a SIM
// service-dialling ("sdn") entry, and, for editing, when its account is
// gone, is the SIM, or the contact is a libpurple buddy.
//
// Pure module: no Enyo, so it is unit tested under Node.

function contactsProvider(inAccount) {
	var providers = (inAccount && inAccount.capabilityProviders) || [];
	for (var i = 0; i < providers.length; i++) {
		if (providers[i].capability === "CONTACTS") {
			return providers[i];
		}
	}
	return null;
}

//* The db8 kind contacts of this account are stored as (dbkinds or db_kinds).
function contactKind(inAccount) {
	var p = contactsProvider(inAccount);
	var kinds = p && (p.dbkinds || p.db_kinds);
	return (kinds && kinds.contact) || "";
}

function byId(inAccounts, inId) {
	for (var i = 0; i < (inAccounts || []).length; i++) {
		if (inAccounts[i]._id === inId) {
			return inAccounts[i];
		}
	}
	return null;
}

//* True when the app must not change or delete this contact.
function isReadOnly(inContact, inAccounts) {
	if (!inContact) {
		return true;
	}
	if (inContact.simEntryType === "sdn") {
		return true;
	}
	if (/^com\.palm\.contact\.libpurple:/.test(inContact._kind || "")) {
		return true;
	}
	var account = byId(inAccounts, inContact.accountId);
	if (!account || account.templateId === "com.palm.sim") {
		return true;
	}
	var provider = contactsProvider(account);
	return !provider || !!provider.readOnlyData;
}

/**
	The accounts a new contact can be created in: a CONTACTS provider that
	is not read-only and is not the SIM, with a contact kind. Each entry is
	{accountId, kind, label, icon, templateId}.
*/
function writableAccounts(inAccounts) {
	return (inAccounts || []).filter(function(inAccount) {
		var p = contactsProvider(inAccount);
		return p && !p.readOnlyData && inAccount.templateId !== "com.palm.sim" && contactKind(inAccount) && !inAccount.beingDeleted;
	}).map(function(inAccount) {
		var name = inAccount.alias || inAccount.loc_name || inAccount.templateId;
		return {
			accountId: inAccount._id,
			kind: contactKind(inAccount),
			label: inAccount.username ? name + " (" + inAccount.username + ")" : name,
			icon: inAccount.icon && (inAccount.icon.loc_32x32 || inAccount.icon.loc_48x48) || "",
			templateId: inAccount.templateId
		};
	});
}

/**
	The account new contacts go to: the defaultAccountId pref when that
	account can still take contacts, else the device's own (palmprofile)
	account, else the first writable one; null when there is none.
*/
function defaultAccount(inAccounts, inDefaultAccountId) {
	var writable = writableAccounts(inAccounts), i;
	for (i = 0; i < writable.length; i++) {
		if (writable[i].accountId === inDefaultAccountId) {
			return writable[i];
		}
	}
	for (i = 0; i < writable.length; i++) {
		if (writable[i].templateId === "com.palm.palmprofile") {
			return writable[i];
		}
	}
	return writable[0] || null;
}

function icon(inAccounts, inAccountId) {
	var a = byId(inAccounts, inAccountId);
	return (a && a.icon && (a.icon.loc_32x32 || a.icon.loc_48x48)) || "";
}

function name(inAccounts, inAccountId) {
	var a = byId(inAccounts, inAccountId);
	return (a && (a.alias || a.loc_name)) || "";
}

/**
	Providers of a capability whose serviceName is inServiceName, e.g. the
	PHONE providers that can call a "type_skype" address. Each entry is
	{account, provider}.
*/
function providersFor(inAccounts, inCapability, inServiceName) {
	var out = [];
	(inAccounts || []).forEach(function(inAccount) {
		(inAccount.capabilityProviders || []).forEach(function(inP) {
			if (inP.capability === inCapability && (!inServiceName || inP.serviceName === inServiceName)) {
				out.push({account: inAccount, provider: inP});
			}
		});
	});
	return out;
}

/**
	The accounts that hold contacts, for the Preferences & Accounts list:
	[{accountId, name, username, icon, templateId, sync}], where sync is
	the CONTACTS provider's sync method, or "" when it has none.
*/
function contactsAccounts(inAccounts) {
	return (inAccounts || []).filter(function(inAccount) {
		return contactsProvider(inAccount) && !inAccount.beingDeleted;
	}).map(function(inAccount) {
		var p = contactsProvider(inAccount), i = inAccount.icon || {};
		return {
			accountId: inAccount._id,
			name: inAccount.alias || inAccount.loc_name || inAccount.templateId || "",
			username: typeof inAccount.username === "string" ? inAccount.username : "",
			icon: i.loc_32x32 || i.loc_48x48 || "",
			templateId: inAccount.templateId || "",
			sync: typeof p.sync === "string" ? p.sync : ""
		};
	});
}

/**
	The activity manager create call that syncs one account now, as the
	legacy Prefs' Sync Now made it; null for an account without a sync
	method.
*/
function syncActivity(inAccount) {
	if (!inAccount || !inAccount.sync) {
		return null;
	}
	return {
		activity: {
			type: {explicit: true, userInitiated: true, background: true},
			name: "'Sync Now' sync for " + inAccount.templateId + ", account " + inAccount.accountId,
			description: "Background sync for account " + inAccount.accountId + " from 'sync now' button",
			callback: {method: inAccount.sync, params: {accountId: inAccount.accountId}}
		},
		start: true
	};
}

module.exports = {
	contactsProvider: contactsProvider, contactKind: contactKind, byId: byId, isReadOnly: isReadOnly,
	writableAccounts: writableAccounts, defaultAccount: defaultAccount, icon: icon, name: name,
	providersFor: providersFor, contactsAccounts: contactsAccounts, syncActivity: syncActivity
};
