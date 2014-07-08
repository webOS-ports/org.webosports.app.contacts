//Contact Details
enyo.kind({
    name: "Detail",
    components: [
        { tag: "p", name: "value", classes: "value", content: "joe@dude.com" },
        { tag: "p", name: "label", classes: "label", content: "Work Email" }
    ]
});

enyo.kind({
    name: "ContactDetails",
    kind: "enyo.Scroller",
    classes: "details",
    components: [
        {
            name: "container",
            classes: "container",
            components: [
                {
                    name: "content",
                    classes: "content",
                    components: [
                        { name: "header", kind: "ContactHeader" },
                        {
                            name: "details",
                            kind: "enyo.Repeater",
                            classes: "group",
                            count: 4,
                            components: [
                                { name: "contactDetail", kind: "Detail", classes: "contacts-item" }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
});
