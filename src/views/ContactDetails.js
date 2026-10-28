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
    Popup = require('onyx/Popup'),
    details = require('../util/details'),
    accounts = require('../data/accounts'),
    services = require('../data/services'),
    $L = require('enyo/i18n').$L;   // no-op placeholder


var Detail = kind({
    name: "Detail",
    kind: Control,
    style: "position: relative",
    events: {
        onSmsTap: ''
    },
    components: [
        // Contact data is text, never markup: it comes from sync accounts, vCards and other apps.
        { tag: "p", name: "value", classes: "value" },
        { tag: "p", name: "label", classes: "label" },
        { name: 'smsBtn', kind: Button, showing: false, style: "position: absolute; right: 0.5em; top: 50%; margin-top: -23px;", ontap: "smsTap", components: [
            {kind: Icon, src: "assets/Icon-messaging-64.png"}
        ]}
    ],
    bindings: [
        {from: "model.value", to: "$.value.content"},
        {from: "model.label", to: "$.label.content", transform: function (label) {
            return $L(label);
        }},
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
        type: "",
        date: "",
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
        // What an IM address can do: chat, and calls when an account can call it.
        {name: "imPopup", kind: Popup, classes: "im-popup", floating: true, modal: true, scrim: true, components: [
            {name: "imChatBtn", kind: Button, content: $L("Chat"), ontap: "imChatTap"},
            {name: "imVoiceBtn", kind: Button, content: $L("Voice Call"), ontap: "imVoiceTap"},
            {name: "imVideoBtn", kind: Button, content: $L("Video Call"), ontap: "imVideoTap"}
        ]},
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
    personChanged: function (oldPerson, newPerson) { //fill details collection.
        this.$.detailsCollection.empty();
        if (!newPerson) {
            return;
        }
        var personId = newPerson.get("_id");
        this.$.detailsCollection.add(details.rows(newPerson.raw()).map(function (inRow) {
            return {
                key: inRow.key,
                type: inRow.type,
                label: inRow.label,
                value: inRow.value,
                date: inRow.date || "",
                personId: personId,
                smsShowing: inRow.sms
            };
        }));
    },

    detailTap: function (inSender, inEvent) {
        var model = inEvent.model, key = model && model.get('key'), url;
        if (!key) {
            return;
        }
        if (key === 'birthday' || key === 'anniversary') {
            var upcoming = details.nextOccurrence(model.get('date'));
            if (upcoming) {
                this.$.applicationManagerLaunchSrvc.send({id: "com.palm.app.calendar", params: {date: upcoming.valueOf()}});
            }
        } else if (key === 'relations') {
            this.doAlterSearch({searchText: model.get('value')});
        } else if (key === 'ims') {
            this.imTap(model, inEvent);
            return;
        } else {
            url = details.target({key: key, value: model.get('value')});
        }
        if (url) {
            this.$.applicationManagerOpenSrvc.send({target: url});
        }
    },
    imTap: function (inModel, inEvent) {
        var actions = details.imActions(inModel.get('type'), accounts.list);
        this.imModel = inModel;
        this.imActions = actions;
        if (actions.length === 1) {
            this.imChatTap();
            return;
        }
        var has = function (inAction) {
            return actions.some(function (inA) { return inA.action === inAction; });
        };
        this.$.imVoiceBtn.set("showing", has("voice"));
        this.$.imVideoBtn.set("showing", has("video"));
        this.$.imPopup.showAtEvent(inEvent);
    },
    imChatTap: function () {
        var model = this.imModel;
        this.$.imPopup.hide();
        var url = model && details.imTarget(model.get('value'), model.get('type'), model.get('personId'));
        if (url) {
            this.$.applicationManagerOpenSrvc.send({target: url});
        } else if (model) {
            services.banner($L("Not an address"));
        }
        return true;
    },
    imVoiceTap: function () {
        this.imCall(false);
        return true;
    },
    imVideoTap: function () {
        this.imCall(true);
        return true;
    },
    // A call to an IM address, through the Phone app, as the legacy app placed Skype calls.
    imCall: function (inVideo) {
        var model = this.imModel, wanted = inVideo ? "video" : "voice";
        var action = (this.imActions || []).filter(function (inA) { return inA.action === wanted; })[0];
        this.$.imPopup.hide();
        if (!model || !action) {
            return;
        }
        var params = {address: model.get('value'), transport: action.transport};
        if (inVideo) {
            params.video = true;
        }
        this.$.applicationManagerLaunchSrvc.send({id: "com.palm.app.phone", params: params});
    },
    smsTap: function (inSender, inModel) {
        var url = details.smsTarget({key: inModel.get('key'), value: inModel.get('value')}, inModel.get('personId'));
        if (url) {
            this.$.applicationManagerOpenSrvc.send({target: url});
        }
    },
    serviceResponse: function (inSender, inEvent) {
        this.log("processId:", inEvent.processId);
    },
    serviceError: function (inSender, inEvent) {
        this.log("errorCode:", inEvent.errorCode, "   errorText:", inEvent.errorText);
        var errMsg;
        if (inEvent.errorText) {
            errMsg = inEvent.errorText;
        } else {
            errMsg = $L("Is there a typo?");
            if (inEvent.errorCode) {
                errMsg += " error code " + inEvent.errorCode;
            }
        }
        services.banner(errMsg);
    }
});
