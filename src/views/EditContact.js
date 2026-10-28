// EditContact.js - Edit or add a contact - org.webosports.app.contacts
// Copyright © 2015-2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License
//
// Edits the contacts behind a person, never the person's merged values:
// src/util/contactEdit.js decides which contact each change goes to, and
// src/data/saveEdit.js writes it.

var
	kind = require('enyo/kind'),
	Control = require('enyo/Control'),
	Select = require('enyo/Select'),
	Option = require('enyo/Option'),
	Image = require('enyo/Image'),
	Scroller = require('enyo/Scroller'),
	FittableRows = require('layout/FittableRows'),
	FittableHeaderLayout = require('layout/FittableHeaderLayout'),
	Toolbar = require('onyx/Toolbar'),
	InputDecorator = require('onyx/InputDecorator'),
	Input = require('onyx/Input'),
	TextArea = require('onyx/TextArea'),
	Groupbox = require('onyx/Groupbox'),
	Button = require('onyx/Button'),
	Popup = require('onyx/Popup'),
	names = require('../util/names'),
	labels = require('../util/labels'),
	accountRules = require('../util/accountRules'),
	contactEdit = require('../util/contactEdit'),
	accounts = require('../data/accounts'),
	prefs = require('../data/prefs'),
	services = require('../data/services'),
	saveEdit = require('../data/saveEdit'),
	$L = require('enyo/i18n').$L;   // no-op placeholder

var ADDRESS_PARTS = [
	{key: "streetAddress", hint: "Street"},
	{key: "locality", hint: "City"},
	{key: "region", hint: "State / region"},
	{key: "postalCode", hint: "Postal code"},
	{key: "country", hint: "Country"}
];

// Selects the option of inValue. Select.set("value") does not work before
// the select is rendered: it falls back to the first option.
function choose(inSelect, inValue) {
	var options = inSelect.getClientControls();
	for (var i = 0; i < options.length; i++) {
		if (options[i].value === inValue) {
			inSelect.set("selected", i);
			return;
		}
	}
}

var FIELD_INFO = {
	phoneNumbers: {hint: "New phone number", inputType: "tel"},
	emails: {hint: "New email address", inputType: "email"},
	ims: {hint: "New IM address", inputType: "text"},
	addresses: {hint: "New address"},
	urls: {hint: "New web address", inputType: "url"},
	relations: {hint: "New relation", inputType: "text"},
	notes: {hint: "New note"}
};

/** One entry of a list field: its inputs, its type, and where it is stored. */
var EditRow = kind({
	name: "EditRow",
	kind: Control,
	classes: "edit-row flex-row",
	published: {
		field: "",
		row: null,              // {contactId, readOnly, entry, original, icon, accountName}
		isNew: false,           // the empty row at the end of a group
		contactChoices: null,   // [{_id, label}] the contacts a new entry can go to
		showAccount: false
	},
	events: {
		onRowStarted: "",
		onRowRemove: ""
	},
	create: function () {
		this.inherited(arguments);
		var field = this.field, row = this.row, entry = row.entry || {}, info = FIELD_INFO[field];
		var disabled = !!row.readOnly;
		this.addRemoveClass("read-only", disabled);
		if (this.showAccount && !this.isNew) {
			this.createComponent({name: "accountIcon", kind: Image, classes: "edit-row-account flex-none",
				src: row.icon || "assets/contacts-by-webos.png", attributes: {title: row.accountName || ""}});
		}
		var inputs = this.createComponent({classes: "flex-auto edit-row-inputs"});
		if (field === "addresses") {
			ADDRESS_PARTS.forEach(function (inPart) {
				inputs.createComponent({kind: InputDecorator, classes: "edit-address-part", components: [
					{name: inPart.key, kind: Input, value: entry[inPart.key] || "", disabled: disabled,
						placeholder: this.isNew && inPart.key === "streetAddress" ? $L(info.hint) : $L(inPart.hint),
						oninput: "inputChanged"}
				]}, {owner: this});
			}, this);
		} else if (field === "notes") {
			inputs.createComponent({kind: InputDecorator, components: [
				{name: "value", kind: TextArea, value: entry.value || "", disabled: disabled, placeholder: $L(info.hint),
					oninput: "inputChanged"}
			]}, {owner: this});
		} else {
			inputs.createComponent({kind: InputDecorator, components: [
				{name: "value", kind: Input, type: info.inputType, value: entry.value || "", disabled: disabled,
					placeholder: $L(info.hint), oninput: "inputChanged"}
			]}, {owner: this});
		}
		if (field !== "notes") {
			var type = entry.type || labels.defaultType(field);
			var types = this.createComponent({name: "type", kind: Select, classes: "edit-row-type flex-none", disabled: disabled});
			labels.choicesFor(field, type).forEach(function (inChoice) {
				types.createComponent({kind: Option, content: $L(inChoice.label), value: inChoice.value});
			});
			choose(types, type);
		}
		if (this.isNew && this.contactChoices && this.contactChoices.length > 1) {
			// Which of the person's contacts a new entry is stored in.
			var target = this.createComponent({name: "target", kind: Select, classes: "edit-row-target flex-none",
				attributes: {title: $L("Save in")}});
			this.contactChoices.forEach(function (inChoice) {
				target.createComponent({kind: Option, content: inChoice.label, value: inChoice._id});
			});
			choose(target, row.contactId || this.contactChoices[0]._id);
		}
		if (!disabled && !this.isNew) {
			this.addRemoveButton();
		}
	},
	addRemoveButton: function () {
		return this.createComponent({name: "remove", kind: Button, classes: "edit-row-remove flex-none", content: "×",
			attributes: {title: $L("Remove"), "aria-label": $L("Remove")}, ontap: "removeTap"});
	},
	inputChanged: function () {
		if (this.isNew) {
			this.isNew = false;
			this.addRemoveButton().render();
			this.doRowStarted();
		}
		return true;
	},
	removeTap: function () {
		this.doRowRemove();
		return true;
	},
	//* The row as edited, in contactEdit's terms.
	getRow: function () {
		var entry = {}, field = this.field;
		if (field === "addresses") {
			ADDRESS_PARTS.forEach(function (inPart) {
				entry[inPart.key] = this.$[inPart.key].get("value");
			}, this);
		} else {
			entry.value = this.$.value.get("value");
		}
		if (this.$.type) {
			entry.type = this.$.type.get("value");
		}
		var contactId = this.$.target ? this.$.target.get("value") : this.row.contactId;
		return {contactId: contactId || null, readOnly: !!this.row.readOnly, entry: entry, original: this.row.original || null};
	}
});

/** A list field: its rows, then an empty row for a new entry. */
var EditGroup = kind({
	name: "EditGroup",
	kind: Groupbox,
	classes: "edit-group",
	published: {
		field: ""
	},
	handlers: {
		onRowStarted: "rowStarted",
		onRowRemove: "rowRemove"
	},
	//* inRows from contactEdit.build(); inContext {showAccount, contactChoices, targetId}
	setRows: function (inRows, inContext) {
		this.context = inContext;
		this.destroyClientControls();
		inRows.forEach(function (inRow) {
			this.addRow(inRow, false);
		}, this);
		this.addEmptyRow();
		this.render();
	},
	addRow: function (inRow, inIsNew) {
		return this.createComponent({kind: EditRow, field: this.field, row: inRow, isNew: inIsNew,
			showAccount: this.context.showAccount, contactChoices: inIsNew ? this.context.contactChoices : null});
	},
	addEmptyRow: function () {
		return this.addRow({contactId: this.context.targetId, readOnly: false, entry: {}, original: null}, true);
	},
	rowStarted: function () {
		// Typing in the empty row made it an entry; a new empty row follows.
		this.addEmptyRow().render();
		return true;
	},
	rowRemove: function (inSender, inEvent) {
		inEvent.originator.destroy();
		return true;
	},
	getRows: function () {
		return this.getClientControls().filter(function (inRow) {
			return !!inRow.getRow;
		}).map(function (inRow) {
			return inRow.getRow();
		});
	}
});

/** the pane that's used for both adding & editing a contact */
module.exports = kind({
	name: "EditContact",
	kind: FittableRows,
	classes: "edit-contact",
	published: {
		title: ""
	},
	events: {
		onCancel: "",
		onSaved: ""     // {personId, isNew}
	},
	components: [
		{name: "topToolbar", kind: Toolbar, layoutKind: FittableHeaderLayout, components: [
			{name: "titleText", fit: true, classes: "edit-title", content: ""},
			{name: "accountBox", classes: "edit-account", showing: false, components: [
				{name: "accountIcon", kind: Image, classes: "edit-account-icon", src: "assets/contacts-by-webos.png"},
				{name: "accountSelect", kind: Select, classes: "edit-account-select", onchange: "accountChanged",
					attributes: {title: $L("Save in")}}
			]}
		]},
		{name: "scroller", kind: Scroller, fit: true, touch: true, horizontal: "hidden", components: [
			{classes: "edit-main", components: [
				{classes: "edit-top flex-row", components: [
					{classes: "avatar flex-none", components: [
						{name: "photo", kind: Image, sizing: "cover", classes: "img", src: "assets/bg_icon_favorite_img.png"},
						{classes: "mask"}
					]},
					{kind: Groupbox, classes: "edit-top-groupbox flex-auto", components: [
						{kind: InputDecorator, classes: "flex-row edit-name-row", components: [
							{name: "nameInput", kind: Input, classes: "flex-auto", placeholder: $L("Name"),
								attributes: {inputmode: "latin-name"}},
							{name: "favoriteBtn", kind: Button, classes: "edit-favorite flex-none", content: "☆",
								ontap: "toggleFavorite", attributes: {title: $L("Favorite"), "aria-pressed": "false"}},
							{name: "nameDetailsBtn", kind: Button, classes: "edit-name-details flex-none", content: "…",
								ontap: "openNameDetails", attributes: {title: $L("Name details")}}
						]},
						{kind: InputDecorator, components: [
							{name: "nicknameInput", kind: Input, placeholder: $L("Nickname"), attributes: {inputmode: "latin-name"}}
						]},
						{kind: InputDecorator, components: [
							{name: "jobTitleInput", kind: Input, placeholder: $L("Job title")}
						]},
						{kind: InputDecorator, components: [
							{name: "departmentInput", kind: Input, placeholder: $L("Department")}
						]},
						{kind: InputDecorator, components: [
							{name: "organizationInput", kind: Input, placeholder: $L("Company")}
						]}
					]}
				]},
				{name: "readOnlyNote", classes: "edit-note", showing: false},
				{name: "phoneNumbersGroup", kind: EditGroup, field: "phoneNumbers"},
				{name: "emailsGroup", kind: EditGroup, field: "emails"},
				{name: "imsGroup", kind: EditGroup, field: "ims"},
				{name: "addressesGroup", kind: EditGroup, field: "addresses"},
				{name: "urlsGroup", kind: EditGroup, field: "urls"},
				{name: "notesGroup", kind: EditGroup, field: "notes"},
				{kind: Groupbox, classes: "edit-dates", components: [
					{kind: InputDecorator, classes: "flex-row", components: [
						{content: $L("Birthday"), classes: "edit-label flex-none"},
						{name: "birthdayInput", kind: Input, type: "date", classes: "flex-auto", placeholder: "YYYY-MM-DD"}
					]},
					{kind: InputDecorator, classes: "flex-row", components: [
						{content: $L("Anniversary"), classes: "edit-label flex-none"},
						{name: "anniversaryInput", kind: Input, type: "date", classes: "flex-auto", placeholder: "YYYY-MM-DD"}
					]}
				]},
				{name: "relationsGroup", kind: EditGroup, field: "relations"},
				{style: "height: 1rem;"}   // the scroller cuts off the last item otherwise
			]}
		]},
		{name: "bottomToolbar", kind: Toolbar, layoutKind: FittableHeaderLayout, components: [
			{name: "cancelBtn", kind: Button, content: $L("Cancel"), classes: "onyx-light edit-toolbar-button", ontap: "cancelTap"},
			{fit: true},
			{name: "doneBtn", kind: Button, content: $L("Save"), classes: "onyx-affirmative edit-toolbar-button", ontap: "doneTap"}
		]},
		{name: "nameDetails", kind: Popup, classes: "edit-name-popup", centered: true, modal: true, floating: true,
			scrim: true, autoDismiss: false, components: [
				{content: $L("Name details"), classes: "edit-popup-title"},
				{kind: Groupbox, components: [
					{kind: InputDecorator, components: [{name: "prefixInput", kind: Input, placeholder: $L("Prefix")}]},
					{kind: InputDecorator, components: [{name: "givenInput", kind: Input, placeholder: $L("First name")}]},
					{kind: InputDecorator, components: [{name: "middleInput", kind: Input, placeholder: $L("Middle name")}]},
					{kind: InputDecorator, components: [{name: "familyInput", kind: Input, placeholder: $L("Last name")}]},
					{kind: InputDecorator, components: [{name: "suffixInput", kind: Input, placeholder: $L("Suffix")}]}
				]},
				{classes: "flex-row edit-popup-buttons", components: [
					{name: "nameDetailsCancel", kind: Button, content: $L("Cancel"), classes: "flex-auto", ontap: "closeNameDetails"},
					{name: "nameDetailsDone", kind: Button, content: $L("Done"), classes: "flex-auto onyx-affirmative", ontap: "saveNameDetails"}
				]}
			]}
	],

	/** Edits an existing person (a PersonModel or a person record). */
	editPerson: function (inPerson) {
		var person = inPerson && inPerson.raw ? inPerson.raw() : inPerson;
		var ids = ((person && person.contactIds) || []).slice();
		this.state = null;
		this.set("title", $L("Edit Contact"));
		this.$.doneBtn.set("content", $L("Save"));
		services.call(services.DB, "get", {ids: ids}, this.bindSafely(function (inResponse) {
			// db8 leaves out ids it has no record for; keep the person's order.
			var byId = {};
			(inResponse.results || []).forEach(function (inC) { byId[inC._id] = inC; });
			var contacts = ids.map(function (inId) { return byId[inId]; }).filter(function (inC) { return !!inC; });
			this.whenReady(this.bindSafely(function () {
				this.start(person, contacts, null);
			}));
		}), this.bindSafely(function (inError) {
			console.error("EditContact: cannot load the contacts:", inError.errorCode, inError.errorText);
			services.banner($L("Cannot load this contact"));
			this.doCancel();
		}));
	},

	/** Creates a new person, optionally starting from a contact record. */
	newPerson: function (inTemplate) {
		this.state = null;
		this.set("title", $L("New Contact"));
		this.$.doneBtn.set("content", $L("Create"));
		this.whenReady(this.bindSafely(function () {
			this.start(null, [], inTemplate || null);
		}));
	},

	whenReady: function (inFn) {
		accounts.whenReady(function () {
			prefs.whenReady(inFn);
		});
	},

	titleChanged: function () {
		this.$.titleText.set("content", this.title);
	},

	start: function (inPerson, inContacts, inTemplate) {
		var photos = (inPerson && inPerson.photos) || {};
		this.$.photo.set("src", photos.bigPhotoPath || photos.squarePhotoPath || "assets/bg_icon_favorite_img.png");
		this.contacts = inContacts;
		this.state = contactEdit.build(inPerson, inContacts, accounts.list, prefs.get("defaultAccountId"), inTemplate);
		this.saving = false;
		this.renderState();
		this.$.scroller.scrollToTop();
	},

	renderState: function () {
		var state = this.state, single = state.single;
		this.editName = JSON.parse(JSON.stringify(single.name));
		this.shownName = names.format(this.editName);
		this.$.nameInput.set("value", this.shownName);
		this.$.nicknameInput.set("value", single.nickname);
		this.$.jobTitleInput.set("value", single.organization.title);
		this.$.departmentInput.set("value", single.organization.department);
		this.$.organizationInput.set("value", single.organization.name);
		this.setDate(this.$.birthdayInput, single.birthday);
		this.setDate(this.$.anniversaryInput, single.anniversary);
		this.favorite = state.favorite;
		this.favoriteChanged();
		this.renderAccountPicker();

		var editable = state.contacts.filter(function (inC) { return !inC.readOnly; });
		var context = {
			showAccount: state.contacts.length > 1,
			targetId: state.targetId,
			contactChoices: editable.map(function (inC) {
				return {_id: inC._id, label: inC.accountName || $L("Contact")};
			})
		};
		var contactsById = {};
		state.contacts.forEach(function (inC) { contactsById[inC._id] = inC; });
		contactEdit.LIST_FIELDS.forEach(function (inField) {
			var rows = state.lists[inField].map(function (inRow) {
				var c = contactsById[inRow.contactId] || {};
				return {contactId: inRow.contactId, readOnly: inRow.readOnly, entry: inRow.entry, original: inRow.original,
					icon: c.icon, accountName: c.accountName};
			});
			this.$[inField + "Group"].setRows(rows, context);
		}, this);

		var note = "";
		if (!state.isNew && !state.targetId) {
			note = $L("This contact's accounts cannot be changed here. Your changes are saved in a new linked profile.");
		} else if (state.contacts.some(function (inC) { return inC.readOnly; })) {
			note = $L("Grayed entries come from accounts that cannot be changed here.");
		}
		this.$.readOnlyNote.set("content", note);
		this.$.readOnlyNote.set("showing", !!note);
	},

	// A stored date that is not a full ISO date (a vCard's "--03-14") is
	// shown as text, so it is kept, not blanked by the date input.
	setDate: function (inInput, inValue) {
		inInput.set("type", !inValue || contactEdit.isValidDate(inValue) ? "date" : "text");
		inInput.set("value", inValue || "");
	},

	renderAccountPicker: function () {
		var state = this.state, select = this.$.accountSelect;
		var writable = state.isNew ? accountRules.writableAccounts(accounts.list) : [];
		this.writable = writable;
		this.$.accountBox.set("showing", writable.length > 0);
		if (!writable.length) {
			return;
		}
		select.destroyClientControls();
		writable.forEach(function (inAccount) {
			select.createComponent({kind: Option, content: inAccount.label, value: inAccount.accountId});
		});
		select.render();
		if (state.newAccount) {
			choose(select, state.newAccount.accountId);
			this.$.accountIcon.set("src", state.newAccount.icon || "assets/contacts-by-webos.png");
		}
	},
	accountChanged: function () {
		var id = this.$.accountSelect.get("value");
		var account = this.writable.filter(function (inA) { return inA.accountId === id; })[0];
		if (account) {
			this.state.newAccount = account;
			this.$.accountIcon.set("src", account.icon || "assets/contacts-by-webos.png");
		}
		return true;
	},

	toggleFavorite: function () {
		this.favorite = !this.favorite;
		this.favoriteChanged();
		return true;
	},
	favoriteChanged: function () {
		this.$.favoriteBtn.addRemoveClass("active", !!this.favorite);
		this.$.favoriteBtn.set("content", this.favorite ? "★" : "☆");
		this.$.favoriteBtn.setAttribute("aria-pressed", this.favorite ? "true" : "false");
	},

	// The name as structured parts: those loaded (or set in the details
	// popup) while the one-line name still shows them, else what it parses to.
	// So an untouched name keeps a middle name the line cannot tell apart.
	currentName: function () {
		var text = this.$.nameInput.get("value") || "";
		if (text.trim() === this.shownName.trim()) {
			return this.editName;
		}
		return names.parse(text);
	},
	openNameDetails: function () {
		var n = this.currentName();
		this.$.prefixInput.set("value", n.honorificPrefix || "");
		this.$.givenInput.set("value", n.givenName || "");
		this.$.middleInput.set("value", n.middleName || "");
		this.$.familyInput.set("value", n.familyName || "");
		this.$.suffixInput.set("value", n.honorificSuffix || "");
		this.$.nameDetails.show();
		return true;
	},
	closeNameDetails: function () {
		this.$.nameDetails.hide();
		return true;
	},
	saveNameDetails: function () {
		this.editName = {
			honorificPrefix: this.$.prefixInput.get("value").trim(),
			givenName: this.$.givenInput.get("value").trim(),
			middleName: this.$.middleInput.get("value").trim(),
			familyName: this.$.familyInput.get("value").trim(),
			honorificSuffix: this.$.suffixInput.get("value").trim()
		};
		this.shownName = names.format(this.editName);
		this.$.nameInput.set("value", this.shownName);
		this.$.nameDetails.hide();
		return true;
	},

	cancelTap: function () {
		this.$.nameDetails.hide();
		this.state = null;
		this.doCancel();
		return true;
	},

	// What the user has in front of them, in contactEdit's terms.
	edited: function () {
		var lists = {};
		contactEdit.LIST_FIELDS.forEach(function (inField) {
			lists[inField] = this.$[inField + "Group"].getRows();
		}, this);
		return {
			favorite: !!this.favorite,
			single: {
				name: this.currentName(),
				nickname: this.$.nicknameInput.get("value") || "",
				organization: {
					title: this.$.jobTitleInput.get("value") || "",
					department: this.$.departmentInput.get("value") || "",
					name: this.$.organizationInput.get("value") || ""
				},
				birthday: this.$.birthdayInput.get("value") || "",
				anniversary: this.$.anniversaryInput.get("value") || ""
			},
			lists: lists
		};
	},

	doneTap: function () {
		if (!this.state || this.saving) {
			return true;
		}
		var state = this.state, edited = this.edited();
		var badDate = ["birthday", "anniversary"].some(function (inKey) {
			var value = edited.single[inKey].trim();
			return value !== state.single[inKey].trim() && !contactEdit.isValidDate(value);
		});
		if (badDate) {
			services.banner($L("Write dates as YYYY-MM-DD"));
			return true;
		}
		var plan = contactEdit.plan(state, this.contacts, edited);
		if (state.isNew && isEmptyContact(plan.create)) {
			services.banner($L("Type a name or a number first"));
			return true;
		}
		this.saving = true;
		this.$.nameDetails.hide();
		saveEdit.run(state, plan, this.bindSafely(function (inPersonId, inError) {
			this.saving = false;
			if (inError) {
				services.banner($L("Could not save the contact") +
					(inError.errorCode !== undefined ? " (" + inError.errorCode + ")" : ""));
				return;
			}
			this.state = null;
			this.doSaved({personId: inPersonId, isNew: state.isNew});
		}));
		return true;
	}
});

//* True when a new contact holds nothing worth saving.
function isEmptyContact(inContact) {
	if (!inContact) {
		return true;
	}
	return !names.format(inContact.name) && !inContact.nickname &&
		!(inContact.organizations && inContact.organizations.length) &&
		contactEdit.LIST_FIELDS.every(function (inF) {
			var v = inContact[inF === "notes" ? "note" : inF];
			return !v || !v.length;
		});
}
