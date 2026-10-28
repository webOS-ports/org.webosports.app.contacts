// PersonPicker.js - pick a person from a searchable list - org.webosports.app.contacts

var
    kind = require('enyo/kind'),
    Popup = require('onyx/Popup'),
    Button = require('onyx/Button'),
    InputDecorator = require('onyx/InputDecorator'),
    Input = require('onyx/Input'),
    FittableRows = require('layout/FittableRows'),
    AllPersonCollection = require('../data/AllPersonCollection'),
    ContactsList = require('./ContactsList'),
    $L = require('enyo/i18n').$L;

/**
	pick(title, globalPersonCollection, excludeId, nonFavorites) opens the
	list, without the person excludeId and, with nonFavorites, without
	favourites; tapping a
	person sends onPicked {person} (a PersonModel) and closes it.
*/
module.exports = kind({
    name: "PersonPicker",
    kind: Popup,
    classes: "dialog person-picker",
    centered: true,
    modal: true,
    floating: true,
    scrim: true,
    autoDismiss: false,
    events: {
        onPicked: ""
    },
    components: [
        {kind: FittableRows, classes: "enyo-fit person-picker-rows", components: [
            {name: "title", classes: "dialog-title"},
            {kind: InputDecorator, classes: "person-picker-search", components: [
                {name: "search", kind: Input, placeholder: $L("Search"), oninput: "searchChanged"}
            ]},
            {name: "list", kind: ContactsList, fit: true, ontap: "personTap"},
            {classes: "dialog-buttons", components: [
                {name: "cancelBtn", kind: Button, content: $L("Cancel"), ontap: "cancelTap"}
            ]}
        ]}
    ],
    create: function () {
        this.inherited(arguments);
        this.$.list.set("collection", new AllPersonCollection());
    },
    pick: function (inTitle, inGlobalPersonCollection, inExcludeId, inNonFavorites) {
        var collection = this.$.list.collection;
        this.$.title.set("content", inTitle);
        this.$.search.set("value", "");
        collection.set("globalPersonCollection", inGlobalPersonCollection);
        collection.set("excludeId", inExcludeId || "");
        collection.set("nonFavorites", !!inNonFavorites);
        collection.set("searchText", "");
        collection.refilter();
        this.show();
        // A DataList measures its rows when shown.
        this.$.list.reset();
    },
    searchChanged: function () {
        this.$.list.collection.set("searchText", this.$.search.get("value") || "");
        return true;
    },
    personTap: function (inSender, inEvent) {
        var person = inEvent.model;
        if (person) {
            this.hide();
            this.doPicked({person: person});
        }
        return true;
    },
    cancelTap: function () {
        this.hide();
        return true;
    }
});
