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
    	var self = this;
        this.inherited(arguments);

        this.log("==========> Telling global list to fetch contacts...");
        GlobalPersonCollection.fetch({strategy: "merge", orderBy: "sortKey", success: function (collection, opts, records) {
        	self.$.contactsBar.refilterFavorites();
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
    	inEvent.person.commit();
    	this.$.contactsBar.refilterFavorites();   // commit does not always trigger the fetch above
    },
    
    goBack: function () {
        if (enyo.Panels.isScreenNarrow()) {
            this.$.main.setIndex(0);
        }
    }
});
