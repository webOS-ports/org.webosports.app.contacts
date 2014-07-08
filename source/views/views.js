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
                { name: "bar", kind: "ContactsBar", onSelected: "showPerson" },
                { name: "details", kind: "ContactDetails", fit: true }
            ]
        },
        {
            name: "BottomToolbar",
            kind: "onyx.Toolbar",
            components: [
                { kind: "onyx.Button", content: "Add Contact"}
            ]
        }
    ],
    create: function () {
        this.inherited(arguments);

this.log("==========> Telling global list to fetch contacts...");
        GlobalPersonCollection.fetch({strategy: "merge"});
    },
    showPerson: function (inSender, inEvent) {
        this.$.details.setPerson(inEvent.person);
    }
});
