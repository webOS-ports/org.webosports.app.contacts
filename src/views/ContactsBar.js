/* ContactsBar.js - lists of All and Favorite contacts - org.webosports.app.contacts */

var
    kind = require('enyo/kind'),
    FittableRows = require('layout/FittableRows'),
    Toolbar = require('onyx/Toolbar'),
    InputSearchStretch = require('enyo-animated/InputSearchStretch'),
    RadioGroup = require('onyx/RadioGroup'),
    Panels = require('layout/Panels'),
    CardArranger = require('layout/CardArranger'),
    InputDecorator = require('onyx/InputDecorator'),
    Input = require('onyx/Input'),
    Image = require('enyo/Image'),
    AllPersonCollection = require('../data/AllPersonCollection'),
    ContactsList = require('./ContactsList'),
    $L = require('enyo/i18n').$L;   // no-op placeholder


module.exports = kind({
    name: "ContactsBar",
    kind: FittableRows,
    style: "text-align:center;",
    fit: true,
    published: {
        globalPersonCollection: null
    },
    events: {
        onSelected: ""
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
        { name: "allContactsList", kind: ContactsList, fit: true, collection: new AllPersonCollection(), ontap: "selectPerson" }
    ],

    bindings: [
        {from: "$.inputSearchStretch.value", to: "$.allContactsList.collection.searchText"},
        {from: "globalPersonCollection", to: "$.allContactsList.collection.globalPersonCollection"}
    ],

    paneChange: function (inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            this.$.allContactsList.collection.set('favorites', inEvent.originator.favorites);
        }
    },

    inputKeydown: function (inSender, inEvent) {
        var code = inEvent.charCode || inEvent.keyCode;
        if (code === 13 || code === 38 || code === 40) {
            inEvent.dispatchTarget.node.blur();
        }
    },

    refilter: function () {
    	var searchText = this.$.allContactsList.collection.get("searchText");
    	// Forces refiltering without changing searchText.
    	this.$.allContactsList.collection.searchTextChanged(searchText, searchText, "searchText");
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
