var
    kind = require('enyo/kind'),
    Image = require('enyo/Image'),
    Icon = require('onyx/Icon'),
    presence = require('../data/presence');


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
        // The letter divider above the first person of a group; which rows
        // have one is the list collection's `dividers` (AllPersonCollection).
        { name: "divider", classes: "list-divider", showing: false },
        { classes: "contacts-item-row", components: [
            { classes: "icon", components: [
                {
                    name: "photo",
                    classes: "list-img",
                    kind: Image,
                    sizing: "cover"
                },
                { classes: "list-mask"}
            ] },
            { name: "name", content: "", classes: "name" },
            // The best IM status of the person's addresses, as the legacy list.
            { name: "status", classes: "im-status flex-none", showing: false },
            { name: "favCell", classes: "favorite-cell", showing: false, components: [
                { name: "favIcon", classes: "favorite", kind: Icon }
            ]}
        ]}
    ],
    // A DataList tears a row down and renders it again whenever it shows
    // it, and a row whose model changed hears of it after that: between
    // the two, the divider is always the current one.
    teardownRender: function () {
        this.inherited(arguments);
        this.updateDivider();
        this.updatePresence();
    },
    modelChanged: function () {
        this.updateDivider();
        this.updatePresence();
    },
    updatePresence: function () {
        var cls = this.model ? presence.personClass(this.model.attributes) : "";
        if (this.presenceClass) {
            this.$.status.removeClass(this.presenceClass);
        }
        this.presenceClass = cls;
        if (cls) {
            this.$.status.addClass(cls);
        }
        this.$.status.set("showing", !!cls);
    },
    updateDivider: function () {
        var list = this.parent;
        while (list && !list.collection) {
            list = list.parent;
        }
        var dividers = list && list.collection && list.collection.dividers;
        var text = (this.model && dividers && dividers[this.model.euid]) || "";
        this.$.divider.set("content", text);
        this.$.divider.set("showing", !!text);
    }
});
