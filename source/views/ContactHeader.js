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
        { from: ".displayPhoto", to: ".$.photo.src", transform: function(path) {return "'" + (path || "assets/bg_icon_favorite_img.png") + "'" ;} },
        { from: ".favorite", to: ".$.favourite.value", oneWay: false},
        { from: ".displayName", to: ".$.displayName.content"},
        { from: ".nickname", to: ".$.nickname.content", transform: function(path) {return path ? "“" + path + "”" : "";} },
        { from: ".job", to: ".$.job.content"},
        { from: ".contactIds", to: ".$.profilesCount.content", transform: function (ids) {
            this.$.profiles.setOpen(false);
            this.$.profilesIndicator.removeClass("active", this.$.profiles.open);
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
		                    ontap: "openProfilesList",
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
            name: "profiles",
            kind: "enyo.Drawer",
            open: false,
            classes: "profiles",
            components: [
                {
                    name: "profilesList",
                    kind: "enyo.List",
                    components: [
                        { name: "profile", kind: "ContactItem" }
                    ]
                },
                { name: "linkProfile", content: "Link More Profiles..." }
            ]
        }
    ],

    openProfilesList: function () {
        // TODO: fetch records before opening
        // consider fetching records when contactIds is set
        this.$.profiles.setOpen(!this.$.profiles.open);
        this.$.profilesIndicator.addRemoveClass("active", this.$.profiles.open);
    }
});
