/* ContactsBar.js - lists of All and Favorite contacts - org.webosports.app.contacts */

var
    kind = require('enyo/kind'),
    FittableRows = require('layout/FittableRows'),
    Toolbar = require('onyx/Toolbar'),
    InputSearchStretch = require('enyo-animated/InputSearchStretch'),
    RadioGroup = require('onyx/RadioGroup'),
    Button = require('onyx/Button'),
    Spinner = require('onyx/Spinner'),
    Scroller = require('enyo/Scroller'),
    AllPersonCollection = require('../data/AllPersonCollection'),
    presence = require('../data/presence'),
    accounts = require('../data/accounts'),
    gal = require('../data/gal'),
    galRules = require('../util/gal'),
    PersonModel = require('../data/PersonModel'),
    ContactsList = require('./ContactsList'),
    $L = require('enyo/i18n').$L;


module.exports = kind({
    name: "ContactsBar",
    kind: FittableRows,
    style: "text-align:center;",
    fit: true,
    published: {
        globalPersonCollection: null
    },
    events: {
        onSelected: "",
        onAddFavorite: ""
    },
    components: [
        {
            name: "tabsToolbar",
            kind: Toolbar,
            components: [
                {kind: InputSearchStretch, end:true, targetWidth: 225, placeholder: $L("Search"),
                    onkeydown: 'inputKeydown', components: [
                {
                    name: "tabs",
                    kind: RadioGroup,
                    controlClasses: "luneos-tabbutton",
                    onActivate: "paneChange",
                    components: [
                        { name: "0", content: $L("All"), favorites: false, active: true },
                        { name: "1", content: $L("Favourites"), favorites: true }
                    ]
                }
                ]}
            ]
        },
        // Why the list is empty: no contacts, no favourites, or no match.
        { name: "message", classes: "contacts-list-message", showing: false },
        // On the Favourites tab only, as the legacy list's Add Favorite.
        { name: "addFavoriteBtn", kind: Button, classes: "contacts-add-favorite", content: $L("Add Favorite"),
            showing: false, ontap: "addFavoriteTap" },
        { name: "allContactsList", kind: ContactsList, fit: true, collection: new AllPersonCollection(), ontap: "selectPerson" },
        // While searching All, with an account that has a global address
        // list: search it too, as the legacy list's GAL section.
        { name: "galBox", classes: "gal-box", showing: false, components: [
            { classes: "gal-divider", content: $L("GLOBAL ADDRESS LOOKUP") },
            { classes: "gal-search-row", components: [
                { name: "galSearchBtn", kind: Button, content: $L("Search Exchange"), ontap: "galSearchTap" },
                { name: "galSpinner", kind: Spinner, classes: "onyx-light gal-spinner", showing: false }
            ]},
            { name: "galScroller", kind: Scroller, classes: "gal-results", touch: true, horizontal: "hidden", showing: false,
                components: [{ name: "galList", ontap: "galResultTap" }]},
            { name: "galMessage", classes: "gal-message", showing: false }
        ]}
    ],

    bindings: [
        {from: "$.inputSearchStretch.value", to: "$.allContactsList.collection.searchText"},
        {from: "$.inputSearchStretch.value", to: "searchText"},
        {from: "globalPersonCollection", to: "$.allContactsList.collection.globalPersonCollection"}
    ],

    paneChange: function (inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            this.$.allContactsList.collection.set('favorites', inEvent.originator.favorites);
            this.$.addFavoriteBtn.set("showing", !!inEvent.originator.favorites);
            this.resetGal();
        }
    },

    inputKeydown: function (inSender, inEvent) {
        var code = inEvent.charCode || inEvent.keyCode;
        if (code === 13 || code === 38 || code === 40) {
            inEvent.dispatchTarget.node.blur();
        }
    },

    create: function () {
        this.inherited(arguments);
        var collection = this.$.allContactsList.collection;
        ["add", "remove", "reset"].forEach(function (inEvent) {
            collection.on(inEvent, this.updateMessage, this);
        }, this);
        presence.onChange(this.bindSafely("presenceChanged"));
        accounts.onChange(this.bindSafely("resetGal"));
    },

    // --- global address lookup ---

    searchTextChanged: function () {
        this.resetGal();
    },
    // A new search, another tab or other accounts: earlier results are gone.
    resetGal: function () {
        gal.cancel();
        this.galResults = [];
        this.$.galList.destroyClientControls();
        this.$.galScroller.set("showing", false);
        this.$.galMessage.set("showing", false);
        this.$.galSpinner.set("showing", false);
        this.$.galSearchBtn.set("disabled", false);
        this.$.galBox.set("showing", !!(this.searchText || "").trim() && !this.$.allContactsList.collection.favorites &&
            gal.available());
        this.layoutGal();
    },
    galSearchTap: function () {
        var query = (this.searchText || "").trim();
        if (!query) {
            return true;
        }
        this.$.galSearchBtn.set("disabled", true);
        this.$.galSpinner.set("showing", true);
        gal.search(query, this.bindSafely("showGal"));
        return true;
    },
    showGal: function (inAnswer) {
        var list = this.$.galList, message = galRules.message(inAnswer.results.length);
        this.galResults = inAnswer.results;
        this.$.galSpinner.set("showing", false);
        this.$.galSearchBtn.set("disabled", false);
        list.destroyClientControls();
        inAnswer.results.forEach(function (inResult, inIndex) {
            list.createComponent({classes: "gal-item", content: galRules.displayName(inResult), galIndex: inIndex}, {owner: this});
        }, this);
        list.render();
        this.$.galScroller.set("showing", inAnswer.results.length > 0);
        this.$.galScroller.scrollToTop();
        this.$.galMessage.set("content", message === "none" ? $L("No search results found") :
            message === "tooMany" ? $L("Over 100 results found. Please narrow your search query.") : "");
        this.$.galMessage.set("showing", !!message);
        this.resize();
    },
    // A result opens in the details as a contact of no account: it can be
    // added to the contacts, not changed.
    galResultTap: function (inSender, inEvent) {
        var row = inEvent.originator, result;
        while (row && row !== inSender && row.galIndex === undefined) {
            row = row.parent;
        }
        result = row && this.galResults[row.galIndex];
        if (!result) {
            return true;
        }
        this.$.galList.getClientControls().forEach(function (inRow) {
            inRow.addRemoveClass("selected", inRow === row);
        });
        this.$.allContactsList.deselectAll();
        var record = galRules.person(result);
        record.gal = true;
        record.galContact = galRules.contact(result);
        this.doSelected({person: new PersonModel(record)});
        return true;
    },

    // The rows show IM status: draw them again when it changes.
    presenceChanged: function () {
        if (this.$.allContactsList.hasNode()) {
            this.$.allContactsList.refresh();
        }
    },

    refilter: function () {
        this.loaded = true;   // the persons have been fetched at least once
        this.$.allContactsList.collection.refilter();
        this.updateMessage();
    },

    updateMessage: function () {
        var collection = this.$.allContactsList.collection, message = "";
        if (this.loaded && collection.length === 0) {
            if ((collection.searchText || "").trim()) {
                message = $L("No search results found");
            } else if (collection.favorites) {
                message = $L("No favorites yet");
            } else {
                message = $L("No contacts yet. Tap + to add one.");
            }
        }
        this.$.message.set("content", message);
        this.$.message.set("showing", !!message);
        this.layoutGal();
    },
    // With no match in the list, the global address lookup goes right
    // under the message, not under an empty list.
    layoutGal: function () {
        var list = this.$.allContactsList, hide = this.$.galBox.showing && list.collection.length === 0;
        if (list.showing === hide) {
            list.set("showing", !hide);
            if (!hide) {
                list.refresh();
            }
        }
        this.resize();
    },

    addFavoriteTap: function () {
        this.doAddFavorite();
        return true;
    },

    selectPerson: function (inSender, inEvent) {
        if (!inSender.selected()) {
            inSender.select(inEvent.index);
        }

        this.doSelected({person: inSender.selected()});
    },

    alterSearch: function (newSearchText) {
        this.$.inputSearchStretch.set('value', newSearchText);
        this.$.inputSearchStretch.blur();

        this.$[0].setActive(true);   // tab
        this.$.allContactsList.collection.set('favorites', false);
    },
    
    goBack: function (inSender, inEvent) {
        this.$.inputSearchStretch.set('value', '');
        this.$.inputSearchStretch.blur();

        this.$[0].setActive(true);   // tab
        this.$.allContactsList.collection.set('favorites', false);
    }
    
});
