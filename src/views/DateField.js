/* DateField.js - a date row's value and its date dialog - org.webosports.app.contacts */

// The legacy edit view's birthday: the row shows the date as text, and a
// tap opens a dialog (BirthdayPicker.js in webOS 3.0.5) with Enyo 1's
// DatePicker - a month, a day and a year pill - a red Remove button, and
// Cancel and Done. The browser's own date input has no picker on the
// device, only its parts to type in.
//
// value is the stored form: "YYYY-MM-DD", "--MM-DD" without a year, or ""
// for none. A stored value that is not a date is shown as it is and kept
// until Done or Remove replaces it.
var
	kind = require('enyo/kind'),
	Control = require('enyo/Control'),
	Option = require('enyo/Option'),
	Popup = require('onyx/Popup'),
	Button = require('onyx/Button'),
	Select = require('./LegacySelect'),
	choose = require('./choose'),
	dateParts = require('../util/dateParts'),
	details = require('../util/details'),
	i18n = require('../i18n'),
	$L = require('enyo/i18n').$L;

// Enyo 1 DatePicker's years.
var MIN_YEAR = 1900, MAX_YEAR = 2099;
// The year picker's value for a date without one (an option's empty
// value would read as its text).
var NO_YEAR = "none";

module.exports = kind({
	name: "DateField",
	kind: Control,
	classes: "date-field",
	published: {
		value: "",
		//* The dialog's title and its Remove button, translated.
		title: "",
		removeText: "",
		disabled: false
	},
	handlers: {
		ontap: "openDialog"
	},
	components: [
		{name: "text", classes: "date-field-text"},
		{name: "dialog", kind: Popup, classes: "legacy-date-dialog", centered: true, modal: true, floating: true,
			scrim: true, autoDismiss: false, components: [
				{name: "dialogTitle", classes: "legacy-dialog-title"},
				{classes: "legacy-date-group", components: [
					{name: "pickers", classes: "legacy-date-pickers"},
					{name: "dateRemoveBtn", kind: Button, classes: "onyx-negative legacy-date-remove", ontap: "removeTap"}
				]},
				{classes: "legacy-dialog-buttons", components: [
					{name: "dateCancelBtn", kind: Button, content: $L("Cancel"), classes: "legacy-button", ontap: "cancelTap"},
					{name: "dateDoneBtn", kind: Button, content: $L("Done"), classes: "legacy-button legacy-button-affirmative",
						ontap: "doneTap"}
				]}
			]}
	],
	create: kind.inherit(function (sup) {
		return function () {
			sup.apply(this, arguments);
			this.order = dateParts.order(i18n.tag);
			this.order.forEach(function (inPart) {
				this.$.pickers.createComponent({name: inPart, kind: Select, picker: true,
					classes: "legacy-date-" + inPart, onchange: "pickerChange"}, {owner: this});
			}, this);
			var month = this.$.month;
			dateParts.monthNames(i18n.tag).forEach(function (inName, inIndex) {
				month.createComponent({kind: Option, content: inName, value: String(inIndex + 1)});
			});
			this.valueChanged();
			this.titleChanged();
			this.removeTextChanged();
		};
	}),
	valueChanged: function () {
		this.$.text.set("content", details.dateText(this.value, i18n.formatDate));
	},
	titleChanged: function () {
		this.$.dialogTitle.set("content", this.title);
	},
	removeTextChanged: function () {
		this.$.dateRemoveBtn.set("content", this.removeText);
	},
	openDialog: function (inSender, inEvent) {
		// Taps in the dialog come up here too.
		var from = inEvent && inEvent.originator;
		if (this.disabled || (from && (from === this.$.dialog || from.isDescendantOf(this.$.dialog)))) {
			return true;
		}
		// The stored date, else today (as the legacy dialog).
		var parts = dateParts.parse(this.value);
		if (!parts) {
			var now = new Date();
			parts = {year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate()};
		}
		this.$.dialog.show();
		this.setupYears(parts.year);
		this.setupDays(parts.year, parts.month, parts.day);
		choose(this.$.month, String(parts.month));
		choose(this.$.year, parts.year === null ? NO_YEAR : String(parts.year));
		return true;
	},
	// 1900-2099; a stored year outside them, and "no year" when the
	// stored date has none, are added so they are kept.
	setupYears: function (inYear) {
		var year = this.$.year, list = [];
		if (inYear === null) {
			list.push({content: "–", value: NO_YEAR});
		}
		var from = Math.min(MIN_YEAR, inYear === null ? MIN_YEAR : inYear);
		var to = Math.max(MAX_YEAR, inYear === null ? MAX_YEAR : inYear);
		for (var y = from; y <= to; y++) {
			list.push({content: String(y), value: String(y)});
		}
		year.destroyClientControls();
		list.forEach(function (inItem) {
			year.createComponent({kind: Option, content: inItem.content, value: inItem.value});
		});
		year.render();
	},
	setupDays: function (inYear, inMonth, inDay) {
		var day = this.$.day, n = dateParts.monthLength(inYear, inMonth);
		day.destroyClientControls();
		for (var d = 1; d <= n; d++) {
			day.createComponent({kind: Option, content: String(d), value: String(d)});
		}
		day.render();
		choose(day, String(Math.min(inDay, n)));
	},
	picked: function () {
		var year = this.$.year.hasNode() ? this.$.year.hasNode().value : NO_YEAR;
		return {
			year: year === NO_YEAR ? null : +year,
			month: +this.$.month.hasNode().value,
			day: +this.$.day.hasNode().value
		};
	},
	// A month or year with fewer days keeps the day in it.
	pickerChange: function (inSender) {
		if (inSender !== this.$.day) {
			var p = this.picked();
			this.setupDays(p.year, p.month, p.day);
		}
		return true;
	},
	doneTap: function () {
		this.$.dialog.hide();
		this.set("value", dateParts.format(this.picked()));
		return true;
	},
	removeTap: function () {
		this.$.dialog.hide();
		this.set("value", "");
		return true;
	},
	cancelTap: function () {
		this.$.dialog.hide();
		return true;
	}
});
