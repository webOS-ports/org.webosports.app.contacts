/* MainView.js - main view of org.webosports.app.contacts */

var
	kind = require('enyo/kind'),
	Panels = require('layout/Panels'),
	CardArranger = require('layout/CardArranger'),
	CollapsingArranger = require('layout/CollapsingArranger'),
	Icon = require('onyx/Icon'),
	Image = require('enyo/Image'),
	ContactsBar = require('./ContactsBar'),
	Button = require('onyx/Button'),
	ContactDetails = require('./ContactDetails'),
	Signals = require('enyo/Signals'),
	PersonCollection = require('../data/PersonCollection'),
	EditContact = require('./EditContact'),
	$L = require('enyo/i18n').$L;   // no-op placeholder
require('enyo-luneos');

//App
module.exports = kind({
    name: "MainView",
	kind: Panels,
	arrangerKind: CardArranger,
	draggable: false,
	globalPersonCollection: new PersonCollection({options: {}}),
    components: [
        {
            name: "main",
            kind: Panels,
            arrangerKind: CollapsingArranger,
            draggable: false,
            fit: true,
            components: [
                { style: "width: 38.2%;" /* golden ratio */, components: [
                	{ name: "contactsBar", kind: ContactsBar, classes: "enyo-fit", onSelected: "showPerson" },
                    { name: "addContactBtn", kind: Button, style: "position: absolute; right: 0.5rem; bottom: 0.5rem;", ontap: "showAdd", components: [
                        {kind: Icon, src: "assets/btn_add_contact.png"}
                    ]}
                ]},
                {
                    kind: Panels,
                    name: "detailsPanel",
                    draggable: false,
                    classes: "details",
                    components: [
                        {
                            name: "empty",
                            components: [
                                {
                                    kind: Image,
                                    src: "assets/first-launch-contacts.png",
                                    style: "display: block; margin: auto; padding-top: 30%;"
                                },
                                {
                                    style: "display: block; margin: 10px auto; text-align: center;",
                                    content: $L("Please select a contact on the left to see more information.")
                                }
                            ]
                        },
                        {
							name: "contactDetails",
							kind: ContactDetails,
							fit: true,
							onPersonChanged: "savePerson",
							onEdit: "showEdit",
							onAlterSearch: 'alterSearch'
						}
                    ]
                }
            ]
        },
        {
        	kind: EditContact,
        	onCancel: "hideEdit",
        	onSaved: "editSaved"
        },
        {
            kind: Signals,
			onbackgesture: "goBack",
            onwebOSRelaunch: "processLaunchParam"
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.handleResize();
        
        if (window.PalmSystem) {
        	this.processLaunchParam(null, webOS.window.launchParams());
        }

        this.log("==========> Telling global list to fetch contacts...");
    	var views = this;
		views.$.contactsBar.set('globalPersonCollection', this.globalPersonCollection);

        this.globalPersonCollection.fetch({strategy: "merge", orderBy: "sortKey", success: function (collection, opts, records) {
        	// This function is called whenever persons in the DB change, thanks to the watch.
        	console.log("views fetch complete - now " + collection.length + " items");
        	views.$.contactsBar.refilter();

        	views.selectPendingPerson();
        	var selectedPersonId = views.$.contactDetails.person && views.$.contactDetails.person.get("_id");
        	console.log("selectedPersonId", selectedPersonId);
        	if (selectedPersonId) {
            	var updatedPerson = collection.find(function (model) {
            		return model.get("_id") === selectedPersonId;
            	});
            	console.log("updatedPerson", updatedPerson);
            	if (updatedPerson) {
            		views.$.contactDetails.setPerson(null);
            		views.$.contactDetails.setPerson(updatedPerson);
            	} else {   // person deleted
            		views.$.detailsPanel.setIndex(0);   // empty
            	}
        	}
        }});
    },
    handleResize: function () {
    	// We don't need to call this.inherited(arguments);

    	// TODO: tweak spacing, etc.
    },
    
    showPerson: function (inSender, inEvent) {
        if (inEvent.person) {
            this.$.detailsPanel.setIndex(1);   // ContactDetails
            if (Panels.isScreenNarrow()) {
                this.$.main.setIndex(1);
            }
        } else {
            this.$.detailsPanel.setIndex(0);   // empty
        }

        this.$.contactDetails.setPerson(inEvent.person);
    },
    /** several fields, like favorite, reminder & ringtone, are only in person records */
    savePerson: function (inSender, inEvent) {
    	inEvent.person.commit({success: function (rec, opts, res) {
    		// The fetch above handles updating the UI.
    	}});
    },
    
    showAdd: function (inSender, inEvent) {
    	this.$.editContact.newPerson(null);
    	this.setIndex(1);   // show Edit/Create
	},
    showEdit: function (inSender, inEvent) {
    	this.$.editContact.editPerson(this.$.contactDetails.person);
    	this.setIndex(1);   // show Edit/Create
    },
    hideEdit: function (inSender, inEvent) {
    	this.setIndex(0);   // hide Edit/Create
    },
    /** EditContact saved through the linker; show the person it saved */
    editSaved: function (inSender, inEvent) {
    	this.setIndex(0);
    	this.selectPersonId = inEvent.personId;
    	this.selectPendingPerson();
    	return true;
    },
    /** shows the person of selectPersonId once the list has it */
    selectPendingPerson: function () {
    	var id = this.selectPersonId;
    	var person = id && this.globalPersonCollection.find(function (model) {
    		return model.get("_id") === id;
    	});
    	if (person) {
    		this.selectPersonId = null;
    		this.showPerson(this, {person: person});
    	}
    },

	alterSearch: function (inSender, inEvent) {
		this.$.contactsBar.alterSearch(inEvent.searchText);
		if (Panels.isScreenNarrow() && this.$.main.get("index") > 0) {
			this.$.main.setIndex(0);
		}
	},
    
    goBack: function () {
    	if (this.get("index") > 0) {
    		this.set("index", 0);   // hide Edit/Create
    	} else if (Panels.isScreenNarrow() && this.$.main.get("index") > 0) {
            this.$.main.setIndex(0);
        } else {
        	switch (this.$.main.get("index")) {
        	case 0:
    			this.$.contactsBar.goBack();
    			break;
//        	case 1:
//        		this.log('details panel');
        	}
        }
    },
    
    processLaunchParam: function (inSender, evt) {
        if (!evt || !evt.detail) {
            return;
        }
        var launchParam = evt.detail;
    	this.log(typeof launchParam, launchParam);
    	if (launchParam.launchType === "newContact") {
        	this.$.editContact.newPerson(launchParam.contact || null);
        	this.setIndex(1);
    	}
    }
});
