var
    kind = require('enyo/kind'),
    Image = require('enyo/Image'),
    Icon = require('onyx/Icon');


module.exports = kind({
    name: "ContactItem",
    published: {
        icon: {
            src: "",
            showing: false
        }
    },
    bindings: [
        {from: "model.displayName", to: "$.name.content"},
        {from: "model.listPhoto", to: "$.photo.src", transform: function(path) {return path || "assets/bg_icon_img.png";}},
        {from: "model.favorite", to: "$.favCell.showing"}
    ],
    components: [
        //{ name: "profilePicture", kind: Image, src: "assets/bg_icon_img.png" },
        { classes: "icon", components: [
            {
                name: "photo",
                classes: "list-img",
                kind: Image,
                sizing: "cover"
            },
            { classes: "list-mask"}
        ] },
        { name: "name", content: "Name Name", classes: "name" },
        { name: "favCell", classes: "favorite-cell", showing: false, components: [
            { name: "favIcon", classes: "favorite", kind: Icon }
        ]}
    ]
});
