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
	AddToContactsPrompt = require('./AddToContactsPrompt'),
	PersonPicker = require('./PersonPicker'),
	ConfirmDialog = require('./ConfirmDialog'),
	Preferences = require('./Preferences'),
	Menu = require('onyx/Menu'),
	MenuItem = require('onyx/MenuItem'),
	launch = require('../util/launch'),
	persons = require('../data/persons'),
	saveEdit = require('../data/saveEdit'),
	links = require('../data/links'),
	services = require('../data/services'),
	$L = require('enyo/i18n').$L;   // no-op placeholder
require('enyo-luneos');

// The cards (list and details, or the edit view) are a Panels of their
// own: a popup inside a Panels would be one of its panels, and hidden by
// every transition.
module.exports = kind({
    name: "MainView",
	classes: "enyo-fit",
	globalPersonCollection: new PersonCollection({options: {}}),
    components: [
        {name: "cards", kind: Panels, arrangerKind: CardArranger, draggable: false, classes: "enyo-fit", components: [
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
							onLinkProfiles: "linkProfiles",
							onAlterSearch: 'alterSearch'
						}
                    ]
                }
            ]
        },
        {
        	kind: EditContact,
        	onCancel: "hideEdit",
        	onSaved: "editSaved",
        	onDeleted: "editDeleted"
        },
        {name: "preferences", kind: Preferences, onDone: "closePreferences"}
        ]},
        // The app menu opens from the app's name in the status bar, under it:
        // the top left corner. onyx's floating Menu places itself against
        // the control that opened it, and stays invisible without one.
        {name: "appMenuAnchor", style: "position: absolute; top: 0; left: 0; width: 0; height: 0;"},
        {name: "appMenu", kind: Menu, floating: true, components: [
            {name: "prefsMenuItem", kind: MenuItem, content: $L("Preferences & Accounts"), ontap: "openPreferences"}
        ]},
        {name: "addPrompt", kind: AddToContactsPrompt, onAddNew: "promptAddNew", onAddToExisting: "promptAddToExisting"},
        {name: "personPicker", kind: PersonPicker, onPicked: "personPicked"},
        {name: "confirm", kind: ConfirmDialog},
        {
            kind: Signals,
			onbackgesture: "goBack",
            onwebOSRelaunch: "relaunch",
            // A tap on the app's name in the status bar relaunches the app
            // with palm-command "open-app-menu", which enyo-luneos passes on
            // as menubutton.
            onmenubutton: "toggleAppMenu"
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.handleResize();
        
        if (window.PalmSystem) {
        	this.handleLaunch(webOS.window.launchParams());
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
    	this.$.cards.setIndex(1);   // show Edit/Create
	},
    showEdit: function (inSender, inEvent) {
    	this.$.editContact.editPerson(this.$.contactDetails.person);
    	this.$.cards.setIndex(1);   // show Edit/Create
    },
    hideEdit: function (inSender, inEvent) {
    	this.$.cards.setIndex(0);   // hide Edit/Create
    },
    /** EditContact saved through the linker; show the person it saved */
    editSaved: function (inSender, inEvent) {
    	this.$.cards.setIndex(0);
    	this.selectPersonId = inEvent.personId;
    	this.selectPendingPerson();
    	return true;
    },
    /** EditContact deleted the person, or only its writable contacts */
    editDeleted: function (inSender, inEvent) {
    	this.$.cards.setIndex(0);
    	if (inEvent.gone) {
    		// The list's watch empties the details once the person is gone;
    		// a narrow screen goes back to the list, not to empty details.
    		this.selectPersonId = null;
    		if (Panels.isScreenNarrow()) {
    			this.$.main.setIndex(0);
    		}
    	} else {
    		this.selectPersonId = inEvent.personId;
    		this.selectPendingPerson();
    	}
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
    
    // enyo-webos and enyo-luneos both pass the menubutton event on, so
    // each tap arrives twice: the same event is one tap.
    toggleAppMenu: function (inSender, inEvent) {
    	if (inEvent && inEvent === this.lastMenuEvent) {
    		return true;
    	}
    	this.lastMenuEvent = inEvent;
    	if (this.$.appMenu.showing) {
    		this.$.appMenu.hide();
    	} else {
    		this.$.appMenu.requestMenuShow(this, {activator: this.$.appMenuAnchor});
    	}
    	return true;
    },
    openPreferences: function () {
    	this.$.appMenu.hide();
    	this.$.preferences.open();
    	this.$.cards.setIndex(2);
    	return true;
    },
    closePreferences: function () {
    	this.$.cards.setIndex(0);
    	return true;
    },

    goBack: function () {
    	if (this.$.appMenu.showing) {
    		this.$.appMenu.hide();
    	} else if (this.$.cards.get("index") > 0) {
    		this.$.cards.set("index", 0);   // hide Edit/Create
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
    
    /**
		A launch while running: the event's detail holds the launch
		parameters. WAM sends the event and also calls Mojo.relaunch(), which
		enyo-luneos turns into a second event: the same parameters again
		within a second are the same relaunch.
    */
    relaunch: function (inSender, inEvent) {
    	var params = inEvent && inEvent.detail, key, now = Date.now();
    	try {
    		key = JSON.stringify(params);
    	} catch (e) {
    		return;
    	}
    	if (key === this.lastRelaunch && now - this.lastRelaunchTime < 1000) {
    		return;
    	}
    	this.lastRelaunch = key;
    	this.lastRelaunchTime = now;
    	this.handleLaunch(params);
    },
    /** what another app (or the launcher) asks for; see src/util/launch.js */
    handleLaunch: function (inParams) {
    	var what = launch.parse(inParams);
    	if (!what) {
    		return;
    	}
    	this.log(what.action);
    	this.$.addPrompt.hide();
    	this.$.personPicker.hide();
    	this.$.confirm.hide();
    	switch (what.action) {
    	case "show":
    		persons.find(what.id, this.bindSafely(function (inPerson) {
    			if (inPerson) {
    				this.$.cards.setIndex(0);
    				this.selectPersonId = inPerson._id;
    				this.selectPendingPerson();
    			}
    		}));
    		break;
    	case "edit":
    		persons.find(what.id, this.bindSafely(function (inPerson) {
    			if (!inPerson) {
    				services.banner($L("This contact no longer exists"));
    				return;
    			}
    			this.selectPersonId = inPerson._id;
    			this.selectPendingPerson();
    			this.$.editContact.editPerson(inPerson);
    			this.$.cards.setIndex(1);
    		}));
    		break;
    	case "new":
    		this.promptAddNew(this, {contact: what.contact});
    		break;
    	case "prompt":
    		this.$.addPrompt.ask(what.contact);
    		break;
    	case "addToExisting":
    		this.promptAddToExisting(this, {contact: what.contact});
    		break;
    	case "vcard":
    		this.importVCard(what.target);
    		break;
    	}
    },
    promptAddNew: function (inSender, inEvent) {
    	this.$.editContact.newPerson(inEvent.contact);
    	this.$.cards.setIndex(1);
    	return true;
    },
    // "Link More Profiles": pick another person, whose contacts join this one.
    linkProfiles: function () {
    	var person = this.$.contactDetails.person;
    	if (!person) {
    		return true;
    	}
    	this.contactToAdd = null;
    	this.linkTo = person.get("_id");
    	this.$.personPicker.pick($L("Link which contact to {name}?").replace("{name}", person.get("displayName")),
    		this.globalPersonCollection, this.linkTo);
    	return true;
    },
    promptAddToExisting: function (inSender, inEvent) {
    	this.linkTo = null;
    	this.contactToAdd = inEvent.contact;
    	this.$.cards.setIndex(0);
    	this.$.personPicker.pick($L("Add to which contact?"), this.globalPersonCollection, "");
    	return true;
    },
    personPicked: function (inSender, inEvent) {
    	var template = this.contactToAdd, linkTo = this.linkTo;
    	this.contactToAdd = null;
    	this.linkTo = null;
    	if (linkTo) {
    		if (inEvent.person.get("_id") !== linkTo) {
    			links.link(linkTo, inEvent.person.get("_id"), this.bindSafely(function (inError) {
    				if (inError) {
    					services.banner($L("Could not link the contacts") +
    						(inError.errorCode !== undefined ? " (" + inError.errorCode + ")" : ""));
    				}
    			}));
    		}
    		return true;
    	}
    	if (!template) {
    		return true;
    	}
    	saveEdit.addToPerson(inEvent.person.raw(), template, this.bindSafely(function (inPersonId, inError) {
    		if (inError) {
    			services.banner($L("Could not save the contact") +
    				(inError.errorCode !== undefined ? " (" + inError.errorCode + ")" : ""));
    			return;
    		}
    		this.selectPersonId = inPersonId;
    		this.selectPendingPerson();
    	}));
    	return true;
    },
    /**
		A vCard file, as the legacy VCardHelper did: one contact opens as a
		new contact (asking first), several are imported after a question.
    */
    importVCard: function (inTarget) {
    	var fail = this.bindSafely(function () {
    		this.$.confirm.ask($L("There was a problem reading this vCard."), null, $L("OK"), $L("Import vCard"));
    	});
    	services.call(services.CONTACTS, "countVCardContacts", {filePath: inTarget}, this.bindSafely(function (inResponse) {
    		var count = inResponse.count;
    		if (typeof count !== "number" || count < 1) {
    			fail();
    		} else if (count === 1) {
    			services.call(services.CONTACTS, "readVCard", {filePath: inTarget}, this.bindSafely(function (inRead) {
    				var contact = inRead.contacts && inRead.contacts[0];
    				if (contact) {
    					this.$.addPrompt.ask(launch.template(contact));
    				} else {
    					fail();
    				}
    			}), fail);
    		} else {
    			var question = $L("Would you like to import {count} contacts? This could take a few minutes.").replace("{count}", count);
    			this.$.confirm.ask(question, this.bindSafely(function () {
    				services.banner($L("Importing vCard..."));
    				services.call(services.CONTACTS, "importVCard", {filePath: inTarget}, function () {
    					services.banner($L("{count} contacts imported").replace("{count}", count));
    				}, function (inError) {
    					// Logged only: the legacy app saw this fail after contacts were imported.
    					console.error("importVCard failed:", inError.errorCode, inError.errorText);
    				});
    			}), $L("Import"), $L("Import vCard"));
    		}
    	}), fail);
    }
});
