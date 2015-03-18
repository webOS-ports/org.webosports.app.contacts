/*jsl:import ../data/ContactModel.js */

enyo.kind({
    name: "ContactHeader",
    kind: "enyo.FittableRows",
    classes: "header",
    published: {
    	displayPhoto: "",
        displayName: "",
        nickname: "",
        job: "",
        favorite: "",
        contactIds: ""
    },
    bindings: [
        // Quotes are needed to work around a bug in Black Eye when using sizing "cover".
        // The should not be needed (and are not needed in Safari 7.1).
        { from: "displayPhoto", to: "$.photo.src", transform: function(path) {return "'" + (path || "assets/bg_icon_favorite_img.png") + "'" ;} },
        { from: "favorite", to: "$.favourite.value", oneWay: false},
        { from: "displayName", to: "$.displayName.content"},
        { from: "nickname", to: "$.nickname.content", transform: function(path) {return path ? "“" + path + "”" : "";} },
        { from: "job", to: "$.job.content"},
        { from: "contactIds", to: "$.profilesCount.content", transform: function (ids) {
        	this.$.profilesRptr.collection.empty();
            this.$.profilesDrwr.setOpen(false);
            this.$.profilesIndicator.removeClass("active", this.$.profilesDrwr.open);
            // end side effects
            // TODO: internationalize this
            if (! (ids instanceof Array)) { ids = []; }
            return ids.length === 1 ? $L("1 profile")  : ids.length + $L(" linked profiles");
        }}
    ],
    components: [
        {
            kind: "enyo.FittableColumns",
            fit: true,
            classes: "headerCard",
            components: [
                //{ name: "profilePicture", kind: "enyo.Image" },
                {
                    classes: "avatar",
                    components: [
                        { kind: "enyo.Image", name: "photo", sizing: "cover", classes: "img" },
                        { classes: "mask"}
                    ]
                },
                {
                    classes: "nameinfo",
                    fit: true,
                    components: [
                        { classes: "buttonBar", components: [
                            {name: "favourite", kind: "onyx.ToggleIconButton", classes: "favorite", src: "assets/bg_details_favorite.png"}
                        ]},
                        { name: "displayName", classes: "name" },
                        { name: "nickname", classes: "nickname" },
                        { name: "job", classes: "position" },
                        {
	                        name: "profilesButton",
	                        kind: "onyx.Button",
	                        classes: "profiles-button",
		                    ontap: "openProfilesDrwr",
		                    components: [
		                        {name: "profilesCount", content: "x Linked Profiles"},
		                        {name: "profilesIndicator", kind: "onyx.Icon", src: "assets/btn_linked_profiles.png", classes: "profilesIndicator", style: "width: 13px; height: 20px; margin-left: 7px;"}
		                    ]
	                    }
                    ]
                }
            ]
        },
        {
            name: "profilesDrwr",
            kind: "enyo.Drawer",
            open: false,
            classes: "profiles",
            components: [
                {
                    name: "profilesRptr",
                    kind: "enyo.DataRepeater",
                    collection: new ContactCollection(),
                    components: [{
                    	classes: "flex-row",
                    	ontap: "showProfileDialog",
                    	components: [
               	            { classes: "icon", components: [
                                { name: "profilePhoto", classes: "flex-none list-img", kind: "enyo.Image", sizing: "cover" },
                                { classes: "list-mask"}
                            ] },
                        	{name: "profileDisplayName", classes: "flex-auto", content: ""},
                        	{name: "profileAccountIcn", kind: "enyo.Image", sizing: "cover", classes: "flex-none", style: "width: 48px; height: 48px;", src: ""}
                    	],
                    	bindings: [
                       	    {from: "model.listPhoto", to: "$.profilePhoto.src", transform: function(path) {return "'" + (path || "assets/bg_icon_favorite_img.png") + "'" ;}},
                    	    {from: "model.displayName", to: "$.profileDisplayName.content"},
                    	    {from: "model.accountIcon", to: "$.profileAccountIcn.src"}
                    	]
                    }]
                },
                {name: "linkProfile", content: "Link More Profiles...", style: "margin-left: 8px; line-height: 54px;", ontap: "linkMoreProfiles"}
            ]
        }
    ],
    
    openProfilesDrwr: function () {
    	if (this.$.profilesRptr.collection.length === 0) {
        	this.$.profilesRptr.collection.fetch({ids: this.contactIds});
    	}

    	this.$.profilesDrwr.setOpen(!this.$.profilesDrwr.open);
        this.$.profilesIndicator.addRemoveClass("active", this.$.profilesDrwr.open);
    },
    showProfileDialog: function (inSender, inEvent) {
		window.PalmSystem.addBannerMessage($L("Profile dialog not yet implemented"));
    },
    linkMoreProfiles: function (inSender, inEvent) {
		window.PalmSystem.addBannerMessage($L("Manual linking not yet implemented"));
    }
});
