// Preferences.js - Preferences & Accounts - org.webosports.app.contacts
//
// The legacy Prefs scene: the list order, the account new contacts go to,
// the accounts that hold contacts (with how many each has), Add an account
// and Sync Now. Adding and changing an account is the Accounts app's job,
// as in the other LuneOS apps; the legacy in-app AccountsUI has no Enyo 2
// port.

var
	kind = require('enyo/kind'),
	Select = require('enyo/Select'),
	Image = require('enyo/Image'),
	Scroller = require('enyo/Scroller'),
	FittableRows = require('layout/FittableRows'),
	FittableHeaderLayout = require('layout/FittableHeaderLayout'),
	Toolbar = require('onyx/Toolbar'),
	Groupbox = require('onyx/Groupbox'),
	GroupboxHeader = require('onyx/GroupboxHeader'),
	Button = require('onyx/Button'),
	accountRules = require('../util/accountRules'),
	accounts = require('../data/accounts'),
	prefs = require('../data/prefs'),
	services = require('../data/services'),
	choose = require('./choose'),
	AccountRow = require('./AccountRow'),
	$L = require('enyo/i18n').$L;   // no-op placeholder

var SORT_ORDERS = [
	{value: "FIRST_LAST", content: "First name"},
	{value: "LAST_FIRST", content: "Last name"},
	{value: "COMPANY_FIRST_LAST", content: "Company & first name"},
	{value: "COMPANY_LAST_FIRST", content: "Company & last name"}
];

module.exports = kind({
	name: "Preferences",
	kind: FittableRows,
	classes: "prefs",
	events: {
		onDone: ""
	},
	components: [
		{kind: Toolbar, layoutKind: FittableHeaderLayout, components: [
			{kind: Image, src: "assets/header-icon-contacts.png", classes: "prefs-header-icon"},
			{fit: true, classes: "prefs-title", content: $L("Preferences & Accounts")}
		]},
		{kind: Scroller, fit: true, touch: true, horizontal: "hidden", components: [
			{classes: "prefs-main", components: [
				{kind: Groupbox, components: [
					{kind: GroupboxHeader, content: $L("List Order")},
					{classes: "prefs-row", components: [
						{name: "sortOrder", kind: Select, classes: "prefs-select", onchange: "sortOrderChanged",
							components: SORT_ORDERS.map(function (inOrder) {
								return {value: inOrder.value, content: $L(inOrder.content)};
							})}
					]}
				]},
				{kind: Groupbox, components: [
					{kind: GroupboxHeader, content: $L("Default account")},
					{classes: "prefs-row", components: [
						{name: "defaultAccount", kind: Select, classes: "prefs-select", onchange: "defaultAccountChanged"}
					]}
				]},
				{classes: "prefs-footnote", content: $L("New contacts will default to this account")},
				{kind: Groupbox, components: [
					{kind: GroupboxHeader, content: $L("Accounts")},
					{name: "accountList", ontap: "accountTap"}
				]},
				{classes: "flex-row prefs-buttons", components: [
					{name: "addAccountBtn", kind: Button, classes: "flex-auto", content: $L("Add an account"), ontap: "addAccount"},
					{name: "syncNowBtn", kind: Button, classes: "flex-auto", content: $L("Sync Now"), ontap: "syncNow"}
				]}
			]}
		]},
		{kind: Toolbar, layoutKind: FittableHeaderLayout, components: [
			{fit: true},
			{name: "doneBtn", kind: Button, content: $L("Done"), classes: "onyx-affirmative edit-toolbar-button", ontap: "doneTap"},
			{fit: true}
		]}
	],
	create: function () {
		this.inherited(arguments);
		accounts.onChange(this.bindSafely("showAccounts"));
		prefs.onChange(this.bindSafely("showPrefs"));
	},
	//* Shows the current prefs and accounts; the accounts are read again, one may have been added.
	open: function () {
		this.showPrefs();
		this.showAccounts();
		accounts.refresh();
	},
	showPrefs: function () {
		choose(this.$.sortOrder, prefs.get("listSortOrder"));
		this.showDefaultAccount();
	},
	showDefaultAccount: function () {
		var select = this.$.defaultAccount, current = accountRules.defaultAccount(accounts.list, prefs.get("defaultAccountId"));
		select.destroyClientControls();
		accountRules.writableAccounts(accounts.list).forEach(function (inA) {
			select.createComponent({value: inA.accountId, content: inA.label}, {owner: this});
		}, this);
		select.render();
		if (current) {
			choose(select, current.accountId);
		}
	},
	showAccounts: function () {
		var list = this.$.accountList;
		this.showDefaultAccount();
		list.destroyClientControls();
		this.accounts = accountRules.contactsAccounts(accounts.list);
		this.accounts.forEach(function (inA) {
			list.createComponent({kind: AccountRow, account: inA}, {owner: this});
		}, this);
		list.render();
		this.countContacts();
	},
	// How many contacts each account has, as the legacy account view showed.
	countContacts: function () {
		var rows = this.$.accountList.getClientControls();
		rows.forEach(function (inRow) {
			services.call(services.DB, "find", {
				query: {from: "com.palm.contact:1", where: [{prop: "accountId", op: "=", val: inRow.account.accountId}], limit: 1},
				count: true
			}, function (inResponse) {
				if (!inRow.destroyed && typeof inResponse.count === "number") {
					inRow.set("count", inResponse.count);
				}
			}, function (inError) {
				console.error("prefs: counting contacts failed:", inError.errorCode, inError.errorText);
			});
		});
	},
	sortOrderChanged: function () {
		var value = this.$.sortOrder.get("value");
		// The contacts service watches this pref and writes every person's
		// sortKey for the new order; the list follows through its watch.
		if (value && value !== prefs.get("listSortOrder")) {
			prefs.put("listSortOrder", value);
		}
		return true;
	},
	defaultAccountChanged: function () {
		var value = this.$.defaultAccount.get("value");
		if (value && value !== prefs.get("defaultAccountId")) {
			prefs.put("defaultAccountId", value);
		}
		return true;
	},
	accountTap: function (inSender, inEvent) {
		var row = AccountRow.from(inEvent.originator, inSender);
		if (row) {
			accounts.openInApp(row.account.accountId);
		}
		return true;
	},
	addAccount: function () {
		accounts.addInApp();
		return true;
	},
	// Starts each account's sync, as the legacy Sync Now did; a failure is
	// only logged, the sync runs in the background either way.
	syncNow: function () {
		services.banner($L("Syncing Accounts..."));
		(this.accounts || []).forEach(function (inA) {
			var activity = accountRules.syncActivity(inA);
			if (activity) {
				services.call(services.ACTIVITY, "create", activity, null, function (inError) {
					console.error("prefs: sync of " + inA.accountId + " not started:", inError.errorCode, inError.errorText);
				});
			}
		});
		return true;
	},
	doneTap: function () {
		this.doDone();
		return true;
	}
});
