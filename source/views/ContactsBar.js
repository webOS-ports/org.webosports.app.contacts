/* ContactsBar.js - lists of All and Favorite contacts - org.webosports.app.contacts */
/*global GlobalPersonCollection */

enyo.kind({
    name: "ContactsBar",
    kind: "FittableRows",
    style: "text-align:center;",
    fit: true,
    events: {
        onSelected: ""
    },
    components: [
        {
            name: "tabsToolbar",
            kind: "onyx.Toolbar",
            components: [
                {
                    name: "tabs",
                    kind: "onyx.RadioGroup",
                    controlClasses: "onyx-tabbutton",
                    onActivate: "paneChange",
                    components: [
                        { name: "0", content: "All", index: 0, active: true },
                        { name: "1", content: "Favourites", index: 1 }
                    ]
                }
            ]
        },
        {
            name: "panes",
            kind: "enyo.Panels",
            arrangerKind: "enyo.LeftRightArranger",
            onTransitionFinish: "tabChange",
            margin: 0,
            fit: true,
            components: [
                {
                    name: "main",
                    description: "All",
                    kind: "FittableRows",
                    classes: "contacts-list",
                    components: [
                        {
                            kind: "onyx.InputDecorator",
                            classes: "contacts-search",
                            components: [
                                // When our version of webkit supports type "search", we can get a "recent searches" dropdown for free
                                { name: "searchInput", kind: "onyx.Input", placeholder: "Search" /*, type: "search", attributes: {results:6, autosave:"contactsSearch"}, style: "font-size: 16px;"*/ },
                                { kind: "Image", src: "assets/search-input.png" }
                            ]
                        },
                        { name: "allContactsList", kind: "ContactsList", fit: true, collection: new AllPersonCollection(), ontap: "selectPerson" }
                    ]
                },
                //Scroller is going crazy without the FittableRows
                {
                    name: "favourites",
                    description: "Favourites",
                    kind: "FittableRows",
                    classes: "contacts-list",
                    components: [
                        { name: "favContactsList", kind: "ContactsList", fit: true, collection: new FavoritePersonCollection(), ontap: "selectPerson" }
                    ]
                }
            ]
        }
    ],

    bindings: [
        {from: ".$.searchInput.value", to: ".$.allContactsList.collection.searchText"}
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
    
    refilter: function (inSender, inEvent) {
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
