/* ContactsBar.js - lists of All and Favorite contacts - org.webosports.app.contacts */

var
    kind = require('enyo/kind'),
    FittableRows = require('layout/FittableRows'),
    Toolbar = require('onyx/Toolbar'),
    InputSearchStretch = require('enyo-animated/InputSearchStretch'),
    RadioGroup = require('onyx/RadioGroup'),
    Button = require('onyx/Button'),
    AllPersonCollection = require('../data/AllPersonCollection'),
    presence = require('../data/presence'),
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
        { name: "allContactsList", kind: ContactsList, fit: true, collection: new AllPersonCollection(), ontap: "selectPerson" }
    ],

    bindings: [
        {from: "$.inputSearchStretch.value", to: "$.allContactsList.collection.searchText"},
        {from: "globalPersonCollection", to: "$.allContactsList.collection.globalPersonCollection"}
    ],

    paneChange: function (inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            this.$.allContactsList.collection.set('favorites', inEvent.originator.favorites);
            this.$.addFavoriteBtn.set("showing", !!inEvent.originator.favorites);
            this.resize();
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
