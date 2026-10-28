var
    kind = require('enyo/kind'),
    FittableRows = require('layout/FittableRows'),
    FittableColumns = require('layout/FittableColumns'),
    Image = require('enyo/Image'),
    Icon = require('onyx/Icon'),
    Button = require('onyx/Button'),
    ToggleIconButton = require('onyx/ToggleIconButton'),
    Drawer = require('enyo/Drawer'),
    persons = require('../data/persons'),
    accounts = require('../data/accounts'),
    profiles = require('../util/profiles'),
    $L = require('enyo/i18n').$L;   // no-op placeholder


module.exports = kind({
    name: "ContactHeader",
    kind: FittableRows,
    classes: "header",
    published: {
    	displayPhoto: "",
        displayName: "",
        nickname: "",
        job: "",
        favorite: "",
        contactIds: ""
    },
    events: {
        onProfileTap: "",     // {contactId}
        onLinkProfiles: ""
    },
    bindings: [
        { from: "displayPhoto", to: "$.photo.src", transform: function(path) {return path || "assets/bg_icon_favorite_img.png" ;} },
        { from: "favorite", to: "$.favourite.value", oneWay: false},
        { from: "displayName", to: "$.displayName.content"},
        { from: "nickname", to: "$.nickname.content", transform: function(path) {return path ? "“" + path + "”" : "";} },
        { from: "job", to: "$.job.content"}
    ],
    components: [
        {
            kind: FittableColumns,
            fit: true,
            classes: "headerCard",
            components: [
                //{ name: "profilePicture", kind: Image },
                {
                    classes: "avatar",
                    components: [
                        { kind: Image, name: "photo", sizing: "cover", classes: "img" },
                        { classes: "mask"}
                    ]
                },
                {
                    classes: "nameinfo",
                    fit: true,
                    components: [
                        { classes: "buttonBar", components: [
                            {name: "favourite", kind: ToggleIconButton, classes: "favorite", src: "assets/bg_details_favorite.png"}
                        ]},
                        { name: "displayName", classes: "name" },
                        { name: "nickname", classes: "nickname" },
                        { name: "job", classes: "position" },
                        {
	                        name: "profilesButton",
	                        kind: Button,
	                        classes: "profiles-button",
		                    ontap: "openProfilesDrwr",
		                    components: [
		                        {name: "profilesCount", content: "x Linked Profiles"},
		                        {name: "profilesIndicator", kind: Icon, src: "assets/btn_linked_profiles.png", classes: "profilesIndicator", style: "width: 13px; height: 20px; margin-left: 7px;"}
		                    ]
	                    }
                    ]
                }
            ]
        },
        {
            name: "profilesDrwr",
            kind: Drawer,
            open: false,
            classes: "profiles",
            components: [
                {name: "profilesList", ontap: "profileTap"},
                {name: "linkProfile", classes: "profile-link-more", content: $L("Link More Profiles..."), ontap: "linkMoreProfiles"}
            ]
        }
    ],
    
    contactIdsChanged: function () {
        var count = Array.isArray(this.contactIds) ? this.contactIds.length : 0;
        this.$.profilesCount.set("content", count === 1 ? $L("1 profile") :
            $L("{count} linked profiles").replace("{count}", count));
        // Another person, or this one linked or unlinked: show its profiles.
        if (this.$.profilesDrwr.open) {
            this.loadProfiles();
        } else {
            this.$.profilesList.destroyClientControls();
        }
    },
    openProfilesDrwr: function () {
        var open = !this.$.profilesDrwr.open;
        if (open) {
            this.loadProfiles();
        }
        this.$.profilesDrwr.setOpen(open);
        this.$.profilesIndicator.addRemoveClass("active", open);
        return true;
    },
    // One row per linked contact, the primary first.
    loadProfiles: function () {
        var generation = this.profilesGeneration = (this.profilesGeneration || 0) + 1;
        var ids = Array.isArray(this.contactIds) ? this.contactIds : [];
        persons.contactsOf({contactIds: ids}, this.bindSafely(function (inContacts) {
            accounts.whenReady(this.bindSafely(function () {
                if (generation !== this.profilesGeneration) {
                    return;
                }
                var list = this.$.profilesList;
                list.destroyClientControls();
                profiles.rows(inContacts, accounts.list).forEach(function (inRow) {
                    list.createComponent({classes: "profile-row flex-row", contactId: inRow.contactId, components: [
                        {kind: Image, classes: "profile-account-icon flex-none", src: inRow.icon || "assets/header-icon-contacts.png"},
                        {classes: "flex-auto profile-text", components: [
                            {classes: "profile-name", content: inRow.name || $L("[No Name Available]")},
                            {classes: "profile-account", content: inRow.accountName +
                                (inRow.primary && ids.length > 1 ? " · " + $L("Primary") : "")}
                        ]}
                    ]}, {owner: this});
                }, this);
                list.render();
            }));
        }), function (inError) {
            console.error("ContactHeader: cannot load the profiles:", inError.errorCode, inError.errorText);
        });
    },
    profileTap: function (inSender, inEvent) {
        var row = inEvent.originator;
        while (row && row !== inSender && !row.contactId) {
            row = row.parent;
        }
        if (row && row.contactId) {
            this.doProfileTap({contactId: row.contactId});
        }
        return true;
    },
    linkMoreProfiles: function () {
        this.doLinkProfiles();
        return true;
    }
});
