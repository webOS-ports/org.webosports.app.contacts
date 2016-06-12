// ContactDetails.js for LuneOS Contacts app
// Copyright © 2014-2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Control = require('enyo/Control'),
    Model = require('enyo/Model'),
    Collection = require('enyo/Collection'),
    Scroller = require('enyo/Scroller'),
    FittableRows = require('layout/FittableRows'),
    ContactHeader = require('./ContactHeader'),
    DataRepeater = require('enyo/DataRepeater'),
    Binding = require('enyo/Binding'),
    Button = require('onyx/Button'),
    Icon = require('onyx/Icon'),
    LunaService = require('enyo-webos/LunaService'),
    $L = require('enyo/i18n').$L;   // no-op placeholder


var Detail = kind({
    name: "Detail",
    kind: Control,
    style: "position: relative",
    events: {
        onSmsTap: ''
    },
    components: [
        { tag: "p", name: "value", classes: "value", allowHtml: true },
        { tag: "p", name: "label", classes: "label" },
        { name: 'smsBtn', kind: Button, showing: false, style: "position: absolute; right: 0.5em; top: 50%; margin-top: -23px;", ontap: "smsTap", components: [
            {kind: Icon, src: "assets/Icon-messaging-64.png"}
        ]}
    ],
    bindings: [
        {from: "model.value", to: "$.value.content"},
        {from: "model.label", to: "$.label.content"},
        {from: "model.smsShowing", to: "$.smsBtn.showing"}
    ],
    smsTap: function (inSender, inEvent) {
        this.doSmsTap(this.model);
        return true;
    }
});


var DetailsModel = kind({
    name: "DetailsModel",
    kind: Model,
    attributes: {
        value: "",
        label: "",
        key: "",
        personId: "",
        smsShowing: false
    }
});

module.exports = kind({
    name: "ContactDetails",
    kind: Control,
    touch: true,
    classes: "details",
    published: {
        person: null
    },
    events: {
    	onPersonChanged: "",
    	onEdit: "",
        onAlterSearch: ''
    },
    components: [
        {
            kind: Collection,
            name: "detailsCollection",
            model: DetailsModel,
            instanceAllRecords: true
        },
        {
            name: 'applicationManagerOpenSrvc',
            kind: LunaService,
            service: 'luna://com.palm.applicationManager',
            method: 'open',
            onResponse: 'serviceResponse',
            onError: 'serviceError'
        },
        {
            name: 'applicationManagerLaunchSrvc',
            kind: LunaService,
            service: 'luna://com.palm.applicationManager',
            method: 'launch',
            onResponse: 'serviceResponse',
            onError: 'serviceError'
        },
        {
            name: 'telephonySrvc',
            kind: LunaService,
            service: 'luna://com.palm.telephony',
            method: 'dial',
            onResponse: 'serviceResponse',
            onError: 'serviceError'
        },
        { kind: Scroller, touch: true, classes: "enyo-fit", components: [
            {
                name: "container",
                classes: "container",
                components: [
                    {
                        name: "content",
                        classes: "content",
                        kind: FittableRows,
                        components: [
                            { name: "header", kind: ContactHeader},
                            {
                                name: "details",
                                kind: DataRepeater,
                                classes: "group",
                                count: 4,
                                components: [
                                    { kind: Detail, classes: "contacts-item", ontap: 'detailTap', onSmsTap: 'smsTap' }
                                ]
                            }
                        ]
                    }
                ]
            }]
        },
        { name: "editContactBtn", kind: Button, style: "position: absolute; right: 0.5rem; bottom: 0.5rem;", ontap: "doEdit", components: [
            {kind: Icon, src: "assets/btn_edit.png"}
        ]}

    ],
    bindings: [
        //details stuff:
        {from: "person.displayPhoto", to: "$.header.displayPhoto"},
        {from: "person.nickname", to: "$.header.nickname" },
        {from: "person.favorite", to: "$.header.favorite", oneWay: false , transform: function (newFavorite, dir, binding) {
        	// Unfortunately, the xform function is the only one that knows which way the data is flowing.
        	if (dir & Binding.DIRTY_TO) {
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
        if (person.get(key).length > 0) {
            person.get(key).forEach(function (obj) {
                this.$.detailsCollection.add({
                    label: this.getLabelFromType(obj),
                    value: obj.value,
                    key: key,
                    personId: person.get('_id'),
                    smsShowing: key === 'phoneNumbers' && obj.type === 'type_mobile'
                });
            }.bind(this));
        }
    },
    arrayAddresses: function (key, person) {
        if (person.get(key).length > 0) {
            person.get(key).forEach(function (address) {
                this.$.detailsCollection.add({
                    label: address.type === "type_home" ? $L("Home") : $L("Work"),
                    value: this.getAddressValue(address),
                    key: key,
                    personId: person.get('_id')
                });
            }.bind(this));
        }
    },
    notesValues: function (key, person) {
        if (person.get(key).length > 0) {
            person.get(key).forEach(function (note) {
                this.$.detailsCollection.add({
                    label: $L("Note"),
                    value: note.replace(/\r?\n\r?/g, "<br />"),
                    key: key,
                    personId: person.get('_id')
                });
            }.bind(this));
        }
    },
    simpleValue: function (key, person) {
        if (this.person.get(key)) {
            this.$.detailsCollection.add({
                label: key,
                value: person.get(key),
                key: key,
                personId: person.get('_id')
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
                    processingMethods[keysOrdered[i]].call(this, keysOrdered[i], newPerson);
                }
            }
        }
        
    },

    detailTap: function (inSender, inEvent) {
        var url;
        // this.log(inEvent.model.attributes);
        if (inEvent.model.get('key') === 'birthday' || inEvent.model.get('key') === 'anniversary') {
            var upcoming = new Date(inEvent.model.get('value'));
            upcoming.setHours(upcoming.getHours() + 12);   // adjust for midnight
            upcoming.setFullYear((new Date()).getFullYear());
            if (upcoming < Date.now()) {
                upcoming.setFullYear(upcoming.getFullYear() + 1);
            }
            this.log("opening calendar to " + upcoming);

            // The calshow: URL scheme is Apple-specific
            this.$.applicationManagerLaunchSrvc.send({id: "com.palm.app.calendar", params: {date: upcoming.valueOf()}});
        } else if (inEvent.model.get('key') === 'relations') {
            this.doAlterSearch({searchText: inEvent.model.get('value')});
        } else if (inEvent.model.get('key') === 'phoneNumbers') {
            this.log("dialing " + inEvent.model.get('value'));
            this.$.telephonySrvc.send({number: inEvent.model.get('value'), "blockId": false});
        } else {
            switch (inEvent.model.get('key')) {
                case 'emails':
                    url = 'mailto:' + encodeURIComponent(inEvent.model.get('value'));
                    break;
                case 'ims':
                    url = 'im:' + encodeURIComponent(inEvent.model.get('value')) + '?personId=' + inEvent.model.get('personId');
                    break;
                case 'urls':
                    url = inEvent.model.get('value');
                    break;
                case 'addresses':
                    url = 'maploc:' + encodeURIComponent(inEvent.model.get('value'));
                    break;
            }
            if (url) {
                this.log(url);
                this.$.applicationManagerOpenSrvc.send({target: url});
            }
        }
    },
    smsTap: function (inSender, inModel) {
        var url = 'sms:' + encodeURIComponent(inModel.get('value')) + '?personId=' + inModel.get('personId');
        this.log(url);
        this.$.applicationManagerOpenSrvc.send({target: url});
    },
    serviceResponse: function (inSender, inEvent) {
        this.log("processId:", inEvent.processId);
    },
    serviceError: function (inSender, inEvent) {
        this.log(inEvent.errorCode, inEvent.errorText);
        window.PalmSystem.addBannerMessage(inEvent.errorText || $L("Is there a typo?"));
    }
});
