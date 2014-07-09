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
    published: {
        person: {},
        name: {},
        organization: {}
    },
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
    ],
    bindings: [
        //easy stuff:
        {from: ".person.nickname", to: ".$.header.nickname" },
        {from: ".person.favorite", to: ".$.header.favorite" },

        //first make observable parst from supparts:
        {from: ".person.name", to: ".name"},
        //{from: ".person.organization", to: ".organization"},

        {from: ".combinedName", to: ".$.header.name"}
        //{from: ".organization.title", to: ".$.header.job"}
    ],
    computed: {
        combinedName: [".name.familyName", ".name.givenName", ".name.honorificPrefix", ".name.honorificSuffix", ".name.middleName"]
    },
    observers: [
        {path: "person.name", method: "nameWatch"}
    ],

    personChanged: function () {
        this.log("New person: ", this.person);
    },
    nameChanged: function () {
        this.name = new enyo.Object(this.name);
        this.log("Name changed: ", this.name);
    },
    combinedName: function () {
        this.log("combinedName requested!");
        var displayName = "";
        if (this.name.honorificPrefix) {
            displayName += this.name.honorificPrefix + " ";
        }
        if (this.name.givenName) {
            displayName += this.name.givenName + " ";
        }
        if (this.name.middleName) {
            displayName += this.name.middleName + " ";
        }
        if (this.name.familyName) {
            displayName += this.name.familyName;
        }
        if (this.name.honorificSuffix) {
            if (this.name.honorificSuffix.charAt(1) === " ") { //handle ", PhD" case.
                displayName += this.name.honorificSuffix;
            } else {
                displayName += " " + this.name.honorificSuffix;
            }
        }
        displayName = displayName.trim();
        return displayName;
    }
});
