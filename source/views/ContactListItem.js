enyo.kind({
    name: "ContactItem",
    published: {
        icon: {
            src: "",
            showing: false
        }
    },
    bindings: [
        {from: ".model.displayName", to: ".$.name.content"},
        {from: ".model.photoURI", to: ".$.photo.src"},
        {from: ".model.favorite", to: ".$.favIcon.showing"}
    ],
    components: [
        //{ name: "profilePicture", kind: "Image", src: "assets/bg_icon_img.png" },
        { classes: "icon", components: [
            {
                name: "photo",
                classes: "img",
                kind: "enyo.Image",
                sizing: "constrain"
            },
            { classes: "mask"}
        ] },
        { name: "name", content: "Name Name", classes: "name" },
        { name: "favIcon", classes: "favorite", kind: "onyx.Icon", showing: false }
    ]
});
