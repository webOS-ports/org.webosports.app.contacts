/* ContactsBar.js - lists of All and Favorite contacts - org.webosports.app.contacts */
/*global GlobalPersonCollection */

var
    kind = require('enyo/kind'),
    FittableRows = require('layout/FittableRows'),
    Toolbar = require('onyx/Toolbar'),
    RadioGroup = require('onyx/RadioGroup'),
    Panels = require('layout/Panels'),
    CardArranger = require('layout/CardArranger'),
    InputDecorator = require('onyx/InputDecorator'),
    Input = require('onyx/Input'),
    Image = require('enyo/Image'),
    AllPersonCollection = require('../data/AllPersonCollection'),
    FavoritePersonCollection = require('../data/FavoritePersonCollection'),
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
                {
                    name: "tabs",
                    kind: RadioGroup,
                    controlClasses: "onyx-tabbutton",
                    onActivate: "paneChange",
                    components: [
                        { name: "0", content: $L("All"), index: 0, active: true },
                        { name: "1", content: $L("Favourites"), index: 1 }
                    ]
                }
            ]
        },
        {
            name: "panes",
            kind: Panels,
            arrangerKind: CardArranger,
            draggable: false,
            onTransitionFinish: "tabChange",
            margin: 0,
            fit: true,
            components: [
                {
                    name: "main",
                    description: "All",
                    kind: FittableRows,
                    classes: "contacts-list",
                    components: [
                        {
                            kind: InputDecorator,
                            classes: "contacts-search",
                            components: [
                                // When our version of webkit supports type "search", we can get a "recent searches" dropdown for free
                                { name: "searchInput", kind: Input, placeholder: "Search" /*, type: "search", attributes: {results:6, autosave:"contactsSearch"}, style: "font-size: 16px;"*/ },
                                { kind: Image, src: "assets/search-input.png" }
                            ]
                        },
                        { name: "allContactsList", kind: ContactsList, fit: true, collection: new AllPersonCollection(), ontap: "selectPerson" }
                    ]
                },
                //Scroller is going crazy without the FittableRows
                {
                    name: "favourites",
                    description: "Favourites",
                    kind: FittableRows,
                    classes: "contacts-list",
                    components: [
                        { name: "favContactsList", kind: ContactsList, fit: true, collection: new FavoritePersonCollection(), ontap: "selectPerson" }
                    ]
                }
            ]
        }
    ],

    bindings: [
        {from: "$.searchInput.value", to: "$.allContactsList.collection.searchText"},
        {from: "globalPersonCollection", to: "$.allContactsList.collection.globalPersonCollection"},
        {from: "globalPersonCollection", to: "$.favContactsList.collection.globalPersonCollection"}
    ],

    paneChange: function (inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            //Is this okay, without index being published?
            this.$.panes.setIndex(inEvent.originator.index);
        }
    },
    tabChange: function (inSender, inEvent) {
    	if (inEvent.toIndex !== inEvent.fromIndex) {
    		this.$[inEvent.toIndex].setActive(true);
    	}
    },
    
    refilter: function () {
    	var searchText = this.$.allContactsList.collection.get("searchText");
    	// Forces refiltering without changing searchText.
    	this.$.allContactsList.collection.searchTextChanged(searchText, searchText, "searchText");
    	this.$.favContactsList.collection.refilter();
    },

    selectPerson: function (inSender, inEvent) {
        if (!inSender.selected()) {
            inSender.select(inEvent.index);
        }

        this.doSelected({person: inSender.selected()});
    },
    
    goBack: function (inSender, inEvent) {
    	if (this.$.panes.get('index') === 0) {
    		this.$.searchInput.set('value', '');
    	} else {
    		this.$.favContactsList.scrollToIndex(0);
    	}
    }
    
});
