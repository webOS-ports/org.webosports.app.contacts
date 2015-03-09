/* views.js - main view of org.webosports.app.contacts */
/*global GlobalPersonCollection */
/*jsl:import ../data/PersonModel.js*/

//App
enyo.kind({
    name: "contacts.MainView",
	kind: "enyo.Panels",
	arrangerKind: "enyo.CardArranger",
	draggable: false,
    components: [
        {
            name: "main",
            kind: "enyo.Panels",
            arrangerKind: "enyo.CollapsingArranger",
            draggable: false,
            fit: true,
            components: [
                { style: "width: 38.2%;" /* golden ratio */, components: [
                	{ name: "contactsBar", kind: "ContactsBar", classes: "enyo-fit", onSelected: "showPerson" },
                    { name: "addContactBtn", kind: "onyx.Button", style: "position: absolute; right: 0.5rem; bottom: 0.5rem;", ontap: "showAdd", components: [
                        {kind: "onyx.Icon", src: "assets/btn_add_contact.png"}
                    ]}
                ]},
                {
                    kind: "enyo.Panels",
                    name: "detailsPanel",
                    draggable: false,
                    classes: "details",
                    components: [
                        {
                            name: "empty",
                            components: [
                                {
                                    kind: "enyo.Image",
                                    src: "assets/first-launch-contacts.png",
                                    style: "display: block; margin: auto; padding-top: 30%;"
                                },
                                {
                                    style: "display: block; margin: 10px auto; text-align: center;",
                                    content: "Please select a contact on the left to see more information."
                                }
                            ]
                        },
                        { name: "contactDetails", kind: "ContactDetails", fit: true, onPersonChanged: "savePerson", onEdit: "showEdit" }
                    ]
                }
            ]
        },
        {
        	kind: "contacts.EditContact",
        	onCancel: "hideEdit",
        	onSave: "saveContact"
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "goBack",
            onrelaunch: "processLaunchParam"
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.handleResize();
        
        if (window.PalmSystem) {
        	this.processLaunchParam(null, JSON.parse(window.PalmSystem.launchParams));
        }

        this.log("==========> Telling global list to fetch contacts...");
    	var views = this;
        GlobalPersonCollection.fetch({strategy: "merge", orderBy: "sortKey", success: function (collection, opts, records) {
        	// This function is called whenever persons in the DB change, thanks to the watch.
        	console.log("views fetch complete - now " + collection.length + " items");
        	views.$.contactsBar.refilter();
        	
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
            if (enyo.Panels.isScreenNarrow()) {
                this.$.main.setIndex(1);
            }
        } else {
            this.$.detailsPanel.setIndex(0);   // empty
        }

        this.$.contactDetails.setPerson(inEvent.person);
    },
    /** several fields, like favorite, reminder & ringtone, are only in person records */
    savePerson: function (inSender, inEvent) {
    	var contactsBar = this.$.contactsBar;
    	inEvent.person.commit({success: function (rec, opts, res) {
    		// The fetch above handles updating the UI.
    	}});
    },
    
    showAdd: function (inSender, inEvent) {
    	this.$.editContact.set("title", $L("New Contact"));
    	this.$.editContact.set("doneLabel", $L("Create"));
    	var oldPerson = new PersonModel();
//    	oldPerson = new PersonModel({
//    		addresses: [{
//    			type: "type_work",
//    			streetAddress: "1 Main St.",
//    			locality: "Orlando",
//    			region: "FL",
//    			country: "USA",
//    			postalCode: "32830"
//    		}],
//            birthday: "1928-11-18",
//            emails: [{type: "type_work", value: "da_mouse@disney.com"}],
//            favorite: true, 
//            ims: [{type: "type_sametime", value: "the_mouse" }],
//            name: {familyName: "Mouse", givenName: "Mickey"},
//    		nickname: "Steamboat Willie",
//            notes: ["Universal's Colony Theater\nLend a Paw\nUb Iwerks"],
//    		organization: {title: "Greeter", department: "Hospitality",  name: "Disney World"},
//    		phoneNumbers: [{type: "type_mobile", value: "407-555-1212"}],
//            ringtone: [],
//            relations: [],
//            ringtone: {},
//            urls: [{value: "http://mickey.disney.com/"}]
//     	});
    	this.$.editContact.set("oldPerson", oldPerson);
    	this.setIndex(1);   // show Edit/Create
	},
    showEdit: function (inSender, inEvent) {
    	this.$.editContact.set("title", $L("Edit Contact"));
    	this.$.editContact.set("doneLabel", $L("Save"));
    	this.$.editContact.set("oldPerson", this.$.contactDetails.person);
    	this.setIndex(1);   // show Edit/Create
    },
    hideEdit: function (inSender, inEvent) {
    	this.setIndex(0);   // hide Edit/Create
    },
    /** the contactlinker will create or update person records */
    saveContact: function (inSender, inEvent) {
//    	this.log("newPerson:", inEvent.newPerson.attributes, inEvent.accountId, inEvent.dbkind);
    	var views = this;
    	var contactIds = inEvent.newPerson.get("contactIds");
    	var contactCollection;
    	
    	if (contactIds.length === 0) {
        	var contact = new ContactModel(inEvent.newPerson.toContactData(inEvent.accountId, inEvent.dbkind));
        	this.log("new contact:", contact);
        	contact.commit();
    	} else {
    		contactCollection = new ContactCollection();
    		contactCollection.fetch({ids: contactIds, success: function (collection, opts, contacts) {
    			views.log("fetched contacts:", contacts, "   collection.length:", collection.length);
    			views.comparePersons(inEvent.oldPerson, inEvent.newPerson, collection, contacts);
    		}});
    	}
    	
    	this.setIndex(0);   // hides edit/create pane
	},
	comparePersons: function (oldPerson, newPerson, collection, contacts) {
		this.log(arguments);
		var changed = false;
		
		// TODO: photos
		
		compareMulti("name", ["honorificPrefix", "givenName", "middleName", "familyName", "honorificSuffix"]);
		
		if (newPerson.get("nickname") !== oldPerson.get("nickname")) {
			copyAttr("nickname");
		}
		
		compareMulti("organization", ["title", "department", "name"]);

		compareMultiArry("phoneNumbers", ["value", "type"]);
		
		compareMultiArry("emails", ["value", "type"]);

		compareMultiArry("ims", ["value", "type"]);
		
		compareMultiArry("addresses", ["streetAddress", "locality", "region", "country", "postalCode", "type"]);

		compareMultiArry("urls", ["value"]);
		
		var newNotes = newPerson.get("notes").join("\n"),
			oldNotes = oldPerson.get("notes").join("\n");
		if (newNotes !== oldNotes) {
			contacts.forEach(function (contact) {
				console.log("updating", contact.get("displayName"), "with", newNotes);
				contact.set("note", newNotes);
			});
			oldPerson.set("notes", enyo.clone(newPerson.get("notes")));
			changed = true;
		}

		if (newPerson.get("birthday") !== oldPerson.get("birthday")) {
			copyAttr("birthday");
		}

		compareMultiArry("relations", ["value", "type"]);
		
		// TODO: ringtone
		
		// not in UI: anniversary, gender

		if (changed) {
			// TODO: commit collection (& implement that in db8Source.js)
			contacts.forEach(function (contact) {
				console.log("committing", contact.get("displayName"));
				contact.commit();
			});
		} else {
			this.log("no differences between old and new person");
		}
		
		function compareMulti(attrName, subattrNames) {
			var newAttr = newPerson.get(attrName);
			var oldAttr = oldPerson.get(attrName);
			for (var j=0; j<subattrNames.length; ++j) {
				if (newAttr[subattrNames[j]] !== oldAttr[subattrNames[j]]) {
					copyAttr(attrName); 
					return;
				}
			}
		}
		
		function compareMultiArry(attrName, subattrNames) {
			var newItems = newPerson.get(attrName);
			var oldItems = oldPerson.get(attrName);
			var i;
			if (newItems.length !== oldItems.length) {
				copyAttr(attrName); 
				return;
			}
			for (i=0; i<newItems.length; ++i) {
				for (var j=0; j<subattrNames.length; ++j) {
    				if (newItems[i][subattrNames[j]] !== oldItems[i][subattrNames[j]]) {
    					copyAttr(attrName); 
    					return;
    				}
				}
			}
		}

		function copyAttr(attrName) {
			var attr = newPerson.get(attrName);
			contacts.forEach(function (contact) {
				console.log("updating", contact.get("displayName"), "with", attrName, attr);
				contact.set(attrName, attr);
			});
			oldPerson.set(attrName, attr);
			changed = true;
		}
	},
    
    goBack: function () {
    	if (this.get("index") > 0) {
    		this.set("index", 0);   // hide Edit/Create
    	} else if (enyo.Panels.isScreenNarrow() && this.$.main.get("index") > 0) {
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
    
    processLaunchParam: function (inSender, launchParam) {
    	this.log(typeof launchParam, launchParam);
    	if (launchParam.launchType === "newContact") {
        	this.$.editContact.set("title", $L("New Contact"));
        	this.$.editContact.set("doneLabel", $L("Create"));
        	var oldPerson = new PersonModel(launchParam.contact);
        	this.$.editContact.set("oldPerson", oldPerson);
        	this.setIndex(1);
    	}
    }
});
