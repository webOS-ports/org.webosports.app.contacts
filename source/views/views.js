/*global GlobalPersonCollection */

//App
enyo.kind({
    name: "contacts.MainView",
    kind: "FittableRows",
    components: [
        {
            name: "main",
            kind: "enyo.Panels",
            arrangerKind: "enyo.CollapsingArranger",
            draggable: false,
            classes: "app-panels",
            fit: true,
            narrowFit: true, //collapses to one panel only if width < 800px
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
                { kind: "onyx.Button", content: "Add Contact"}
            ]
        },
        {
            kind: "enyo.Signals",
            onbackbutton: "goBack"
        }
    ],
    create: function () {
        this.inherited(arguments);

        this.log("==========> Telling global list to fetch contacts...");
    	var contactsBar = this.$.contactsBar;
        GlobalPersonCollection.fetch({strategy: "merge", orderBy: "sortKey", success: function (collection, opts, records) {
        	contactsBar.refilter();
        }});
    },
    
    showPerson: function (inSender, inEvent) {
        if (inEvent.person) {
            this.$.detailsPanel.setIndex(1);
        } else {
            this.$.detailsPanel.setIndex(0);
        }

        if (enyo.Panels.isScreenNarrow()) {
            this.$.main.setIndex(1);
        }

        this.$.details.setPerson(inEvent.person);
    },
    savePerson: function (inSender, inEvent) {
    	var contactsBar = this.$.contactsBar;
    	inEvent.person.commit({success: function (rec, opts, res) {
        	contactsBar.refilter();   // commit does not always trigger the fetch above    		
    	}});
    },
    
    goBack: function () {
        if (enyo.Panels.isScreenNarrow() && this.$.main.get("index") > 0) {
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
    }
});
