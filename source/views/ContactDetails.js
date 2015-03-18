//Contact Details
enyo.kind({
    name: "Detail",
    components: [
        { tag: "p", name: "value", classes: "value", allowHtml: true },
        { tag: "p", name: "label", classes: "label" }
    ],
    bindings: [
        {from: "model.value", to: "$.value.content"},
        {from: "model.label", to: "$.label.content"}
    ]
});

enyo.kind({
    name: "DetailsModel",
    kind: "enyo.Model",
    attributes: {
        value: "",
        label: ""
    }
});

enyo.kind({
    name: "ContactDetails",
    kind: "Control",
    touch: true,
    classes: "details",
    published: {
        person: null
    },
    events: {
    	onPersonChanged: "",
    	onEdit: ""
    },
    components: [
        {
            kind: "enyo.Collection",
            name: "detailsCollection",
            model: "DetailsModel",
            instanceAllRecords: true
        },
        { kind: "enyo.Scroller", touch: true, classes: "enyo-fit", components: [
            {
                name: "container",
                classes: "container",
                components: [
                    {
                        name: "content",
                        classes: "content",
                        kind: "enyo.FittableRows",
                        components: [
                            { name: "header", kind: "ContactHeader"},
                            {
                                name: "details",
                                kind: "enyo.DataRepeater",
                                classes: "group",
                                count: 4,
                                components: [
                                    { kind: "Detail", classes: "contacts-item" }
                                ]
                            }
                        ]
                    }
                ]
            }]
        },
        { name: "editContactBtn", kind: "onyx.Button", style: "position: absolute; right: 0.5rem; bottom: 0.5rem;", ontap: "doEdit", components: [
            {kind: "onyx.Icon", src: "assets/btn_edit.png"}
        ]}

    ],
    bindings: [
        //details stuff:
        {from: "person.displayPhoto", to: "$.header.displayPhoto"},
        {from: "person.nickname", to: "$.header.nickname" },
        {from: "person.favorite", to: "$.header.favorite", oneWay: false , transform: function (newFavorite, dir, binding) {
        	// Unfortunately, the xform function is the only one that knows which way the data is flowing.
        	if (dir & enyo.Binding.DIRTY_TO) {
        		// Allows person to be updated before firing event.
        		var contactDetails = this;
        		setTimeout(function(){
        			contactDetails.doPersonChanged({person: contactDetails.person});        			
        		}, 0);
        	}
        	return newFavorite;
        } },
        {from: "person.displayName", to: "$.header.displayName"},
        {from: "person.displayOrg", to: "$.header.job"},
        {from: "person.contactIds", to: "$.header.contactIds"}
    ],
    create: function () {
        this.inherited(arguments);

        this.$.details.set("collection", this.$.detailsCollection);
    },
    //TODO: maybe move that somewhere else? Perhaps a computed property?
    //TODO: some localization stuff will play into this, too... hmpf.
    getAddressValue: function (address) {
        var parts = [];
        if (address.streetAddress) {
            parts.push(address.streetAddress);
        }
        if (address.locality || address.postalCode) {
            parts.push(address.locality + " " + address.postalCode);
        }
        if (address.region) {
            parts.push(address.region);
        }
        if (address.country) {
            parts.push(address.country);
        }
        return parts.join("<br />");
    },
    getLabelFromType: function (obj) {
        //this is kind of a hack...
        //assumes that type is of form "type_LABEL", i.e. "type_skype", "type_gtalk", "type_partner", ...
        return typeof obj.type === "string" ? obj.type.substr(5) : "";
    },

    arrayValues: function (key, person) {
        if (person[key].length > 0) {
            person[key].forEach(function (obj) {
                this.$.detailsCollection.add({
                    label: this.getLabelFromType(obj),
                    value: obj.value
                });
            }.bind(this));
        }
    },
    arrayAddresses: function (key, obj) {
        if (obj[key].length > 0) {
            obj[key].forEach(function (address) {
                this.$.detailsCollection.add({
                    label: address.type === "type_home" ? $L("Home") : $L("Work"),
                    value: this.getAddressValue(address)
                });
            }.bind(this));
        }
    },
    notesValues: function (key, obj) {
        if (obj[key].length > 0) {
            obj[key].forEach(function (note) {
                this.$.detailsCollection.add({
                    label: $L("Note"),
                    value: note.replace(/\r?\n\r?/g, "<br />")
                });
            }.bind(this));
        }
    },
    simpleValue: function (key, obj) {
        if (this.person.get(key)) {
            this.$.detailsCollection.add({
                label: key,
                value: obj[key]
            });
        }
    },
    personChanged: function (oldPerson, newPerson) { //fill details collection.
        var keysOrdered = [
            "phoneNumbers",
            "emails",
            "ims",
            "addresses",
            "urls",
            "notes",
            "birthday",
            "anniversary",
            "relations"
        ],
            processingMethods = {
                phoneNumbers: this.arrayValues,
                emails: this.arrayValues,
                ims: this.arrayValues,
                addresses: this.arrayAddresses,
                urls: this.arrayValues,
                notes: this.notesValues,
                birthday: this.simpleValue,
                anniversary: this.simpleValue,
                relations: this.arrayValues
            },
            i;

        if (newPerson) {
            this.$.detailsCollection.empty();

            for (i = 0; i < keysOrdered.length; i += 1) {
                if (newPerson.get(keysOrdered[i])) {
                    processingMethods[keysOrdered[i]].call(this, keysOrdered[i], newPerson.attributes);
                }
            }
        }
        
    }
});
