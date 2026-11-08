/* SearchField.js - the search row under the list's tabs - org.webosports.app.contacts */

// The legacy list's search: a full-width row of its own under the tabs,
// with the magnifier at its right end (contactsui's .contacts-search).
var
	kind = require('enyo/kind'),
	Control = require('enyo/Control'),
	Input = require('enyo/Input');

module.exports = kind({
	name: "SearchField",
	kind: Control,
	classes: "contacts-search",
	published: {
		placeholder: "",
		value: ""
	},
	bindings: [
		{from: "placeholder", to: "$.input.placeholder"},
		{from: "value", to: "$.input.value", oneWay: false}
	],
	components: [
		{name: "input", kind: Input, classes: "contacts-search-input", attributes: {autocomplete: "off"}},
		// The magnifier while empty; with text, the legacy clear button.
		{name: "icon", classes: "contacts-search-icon"},
		{name: "clear", classes: "contacts-search-clear", showing: false, ontap: "clearTap"}
	],
	valueChanged: function () {
		var empty = !this.value;
		this.$.icon.set("showing", empty);
		this.$.clear.set("showing", !empty);
	},
	clearTap: function () {
		this.set("value", "");
		return true;
	},
	focus: function () {
		this.$.input.focus();
	},
	blur: function () {
		this.$.input.blur();
	}
});
