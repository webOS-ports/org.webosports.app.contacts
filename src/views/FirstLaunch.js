// FirstLaunch.js - First use - LuneOS Contacts app
//
// The legacy contactsFirstUse (the Accounts framework's firstLaunchView):
// shown the first time the app runs, it lists the accounts that already
// hold contacts and offers to add one. With none but the device's own it
// welcomes and asks to set one up. Adding and opening an account is the
// Accounts app's job; the list follows when the app comes back to the
// front (MainView calls refresh()). Until open() the card is never seen,
// and builds nothing.

var
	kind = require('enyo/kind'),
	Image = require('enyo/Image'),
	Scroller = require('enyo/Scroller'),
	FittableRows = require('layout/FittableRows'),
	FittableHeaderLayout = require('layout/FittableHeaderLayout'),
	Toolbar = require('onyx/Toolbar'),
	Groupbox = require('onyx/Groupbox'),
	Button = require('onyx/Button'),
	accountRules = require('../util/accountRules'),
	accounts = require('../data/accounts'),
	AccountRow = require('./AccountRow'),
	$L = require('enyo/i18n').$L;   // no-op placeholder

module.exports = kind({
	name: "FirstLaunch",
	kind: FittableRows,
	classes: "prefs first-launch",
	events: {
		onDone: ""
	},
	components: [
		{kind: Toolbar, layoutKind: FittableHeaderLayout, components: [
			{kind: Image, src: "assets/header-icon-contacts.png", classes: "prefs-header-icon"},
			{name: "title", fit: true, classes: "prefs-title"}
		]},
		{kind: Scroller, fit: true, touch: true, horizontal: "hidden", components: [
			{classes: "prefs-main first-launch-main", components: [
				{kind: Image, src: "assets/first-launch-contacts.png", classes: "first-launch-image"},
				{name: "welcome", classes: "first-launch-text"},
				{name: "existing", components: [
					{kind: Groupbox, components: [
						{name: "accountList", ontap: "accountTap"}
					]},
					{classes: "first-launch-text", content: $L("Or add a new account:")}
				]},
				{name: "addAccountBtn", kind: Button, classes: "first-launch-add", content: $L("Add an Account"), ontap: "addAccount"}
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
	},
	open: function () {
		this.opened = true;
		this.showAccounts();
		this.refresh();
	},
	//* Reads the accounts again: one may have been added in the Accounts app.
	refresh: function () {
		accounts.refresh();
	},
	showAccounts: function () {
		if (!this.opened) {
			return;
		}
		var list = this.$.accountList, existing = accountRules.firstLaunchAccounts(accounts.list);
		this.$.title.set("content", existing.length ? $L("Your contacts accounts") : $L("Welcome!"));
		this.$.welcome.set("content", existing.length ? $L("Get started with your existing accounts:") :
			$L("To get started, set up a Contacts account"));
		this.$.existing.set("showing", existing.length > 0);
		list.destroyClientControls();
		existing.forEach(function (inA) {
			list.createComponent({kind: AccountRow, account: inA}, {owner: this});
		}, this);
		if (list.hasNode()) {
			list.render();
		}
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
	doneTap: function () {
		this.doDone();
		return true;
	}
});
