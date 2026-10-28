// AccountRow.js - one account that holds contacts - LuneOS Contacts app
//
// A row of Preferences' and First use's account lists: icon, name,
// username and, when counted, how many contacts the account has.

var
	kind = require('enyo/kind'),
	Image = require('enyo/Image'),
	$L = require('enyo/i18n').$L;

var AccountRow = module.exports = kind({
	name: "AccountRow",
	classes: "prefs-account flex-row",
	published: {
		account: null,   // an accountRules.contactsAccounts entry
		count: null
	},
	components: [
		{name: "icon", kind: Image, classes: "prefs-account-icon flex-none"},
		{classes: "flex-auto prefs-account-text", components: [
			{name: "name", classes: "prefs-account-name"},
			{name: "username", classes: "prefs-account-username"}
		]},
		{name: "count", classes: "prefs-account-count flex-none"}
	],
	create: function () {
		this.inherited(arguments);
		var a = this.account;
		this.$.icon.set("src", a.icon || "assets/header-icon-contacts.png");
		this.$.name.set("content", a.name);
		this.$.username.set("content", a.username);
		this.$.username.set("showing", !!a.username);
		this.countChanged();
	},
	countChanged: function () {
		this.$.count.set("content", typeof this.count === "number" ?
			(this.count === 1 ? $L("1 contact") : $L("{count} contacts").replace("{count}", this.count)) : "");
	}
});

//* The AccountRow a tap in inList landed in, from the event's originator; null for none.
AccountRow.from = function (inOriginator, inList) {
	var row = inOriginator;
	while (row && row !== inList && !(row instanceof AccountRow)) {
		row = row.parent;
	}
	return row instanceof AccountRow ? row : null;
};
