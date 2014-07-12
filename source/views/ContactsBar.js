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
            onTransitionStart: "tabChange",
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
                                { kind: "onyx.Input", placeholder: "Search" },
                                { kind: "Image", src: "assets/search-input.png" }
                            ]
                        },
                        { name: "allContactsList", kind: "ContactsList", fit: true, collection: GlobalPersonCollection, ontap: "selectPerson" }
                    ]
                },
                //Scroller is going crazy without the FittableRows
                {
                    name: "favourites",
                    description: "Favourites",
                    kind: "FittableRows",
                    classes: "contacts-list",
                    components: [
                        { name: "favContactsList", kind: "ContactsList", fit: true, ontap: "selectPerson" }
                    ]
                }
            ]
        }
    ],
    paneChange: function (inSender, inEvent) {
        if (inEvent.originator.getActive()) {
            //Is this okay, without index being published?
            this.$.panes.setIndex(inEvent.originator.index);
        }
    },
    tabChange: function (inSender, inEvent) {
        this.$[inEvent.toIndex].setActive(true);
    },

    selectPerson: function (inSender, inEvent) {
        if (!inSender.selected()) {
            inSender.select(inEvent.index);
        }

        this.doSelected({person: inSender.selected()});
    }
});
