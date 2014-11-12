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
        numProfiles: ""
    },
    bindings: [
        // transform is needed to work around a bug in Black Eye when using sizing "cover".
        // It should not be needed (and is not needed in Safari 7.1).
        { from: ".displayPhoto", to: ".$.photo.src", transform: function(path) {return "'" + path + "'";} },
        { from: ".displayName", to: ".$.displayName.content"},
        { from: ".nickname", to: ".$.nickname.content" },
        { from: ".job", to: ".$.job.content"}
    ],
    components: [
        {
            kind: "enyo.FittableColumns",
            fit: true,
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
                        { name: "job", classes: "position" }
                    ]
                },
//                {
//                    kind: "enyo.FittableRows",
//                    style: "text-align: right",
//                    components: [
//                        {
//                            //TODO: how to make this yellow??
//                            name: "favourite",
//                            kind: "onyx.ToggleIconButton",
//                            classes: "favorite",
//                            src: "assets/bg_details_favorite.png"
//                        },
//                        { fit: true },
//                        {
//                            name: "profilesButton",
//                            classes: "profiles-button",
//                            kind: "onyx.Button",
//                            ontap: "openProfilesList",
//                            showing: false,
//                            content: "2 Profiles"
//                        }
//                    ]
//                }
            ]
        },
        {
            name: "profiles",
            kind: "onyx.Drawer",
            open: false,
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
        this.$.profiles.setOpen(!this.$.profiles.open);
        this.$.profilesButton.addRemoveClass("active", this.$.profiles.open);
    }
});
