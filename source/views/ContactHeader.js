enyo.kind({
    name: "ContactHeader",
    kind: "enyo.FittableRows",
    classes: "header",
    components: [
        {
            kind: "enyo.FittableColumns",
            fit: true,
            components: [
                //{ name: "profilePicture", kind: "enyo.Image" },
                {
                    classes: "avatar",
                    components: [
                        { name: "photo", classes: "img" },
                        { classes: "mask"}
                    ]
                },
                {
                    classes: "nameinfo",
                    fit: true,
                    components: [
                        { name: "name", classes: "name", content: "Joey Joe" },
                        { name: "nickname", classes: "nickname", content: "JoJo" },
                        { name: "job", classes: "position", content: "Joer, Job" }
                    ]
                },
                {
                    kind: "enyo.FittableRows",
                    style: "text-align: right",
                    components: [
                        {
                            name: "favourite",
                            kind: "onyx.ToggleIconButton",
                            classes: "favorite",
                            src: "assets/bg_details_favorite.png"
                        },
                        { fit: true },
                        {
                            name: "profilesButton",
                            classes: "profiles-button",
                            kind: "onyx.Button",
                            ontap: "openProfilesList",
                            content: "2 Profiles"
                        }
                    ]
                }
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
