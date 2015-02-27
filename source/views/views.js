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
			name: "supermain",
            kind: "FittableRows",
			components: [
		        {
		            name: "main",
		            kind: "enyo.Panels",
		            arrangerKind: "enyo.CollapsingArranger",
		            draggable: false,
		            fit: true,
		            components: [
		                { name: "contactsBar", kind: "ContactsBar", onSelected: "showPerson" },
		                {
		                    kind: "enyo.Panels",
		                    fit: true,
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
		                        { name: "details", kind: "ContactDetails", fit: true, onPersonChanged: "savePerson" }
		                    ]
		                }
		            ]
		        },
		        {
		            name: "BottomToolbar",
		            kind: "onyx.Toolbar",
		            components: [
		                { kind: "onyx.Button", content: $L("Add Contact"), ontap: "showAdd"}
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
        
        if (window.PalmSystem) {
        	this.processLaunchParam(null, JSON.parse(window.PalmSystem.launchParams));
        }

        this.log("==========> Telling global list to fetch contacts...");
    	var contactsBar = this.$.contactsBar;
        GlobalPersonCollection.fetch({strategy: "merge", orderBy: "sortKey", success: function (collection, opts, records) {
        	// This function is called whenever persons in the DB change, thanks to the watch.
        	console.log("views fetch complete - now " + collection.length + " items");
        	contactsBar.refilter();
        }});
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

        this.$.details.setPerson(inEvent.person);
    },
    /** several fields, like favorite, reminder & ringtone, are only in person records */
    savePerson: function (inSender, inEvent) {
    	var contactsBar = this.$.contactsBar;
    	inEvent.person.commit({success: function (rec, opts, res) {
    		// The fetch above handles updating the UI.
    	}});
    },
    
    showAdd: function (inSender, inEvent) {
    	this.$.editContact.set("title", $L("Create New Contact"));
    	var person = new PersonModel();
//    	person = new PersonModel({
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
    	this.$.editContact.set("person", person);
    	this.setIndex(1);   // show Edit/Create
	},
    hideEdit: function (inSender, inEvent) {
    	this.setIndex(0);   // hide Edit/Create
    },
    /** the contactlinker will create or update person records */
    saveContact: function (inSender, inEvent) {
//    	this.log("person:", inEvent.person.attributes, inEvent.accountId, inEvent.dbkind);
    	
    	var contact = new ContactModel(inEvent.person.toContactData(inEvent.accountId, inEvent.dbkind));
    	this.log("contact:", contact);
    	contact.commit();
    	
    	this.setIndex(0);   // hides edit/create pane
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
        	this.$.editContact.set("title", $L("Create New Contact"));
        	var person = new PersonModel(launchParam.contact);
        	this.$.editContact.set("person", person);
        	this.setIndex(1);
    	}
    }
});
