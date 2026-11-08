// AddToContactsPrompt.js - "Add New Contact" or "Add To Existing", for
// contact data another app hands over (a vCard from Messaging, an address
// from Email): what it is - the name and every number, address and so on
// in it, as the details view lists them - then what to do with it
// - org.webosports.app.contacts

var
    kind = require('enyo/kind'),
    Popup = require('onyx/Popup'),
    Button = require('onyx/Button'),
    details = require('../util/details'),
    i18n = require('../i18n'),
    $L = require('enyo/i18n').$L;

module.exports = kind({
    name: "AddToContactsPrompt",
    kind: Popup,
    classes: "dialog add-to-contacts",
    centered: true,
    modal: true,
    floating: true,
    scrim: true,
    autoDismiss: false,
    events: {
        onAddNew: "",           // {contact}
        onAddToExisting: ""     // {contact}
    },
    components: [
        {classes: "dialog-title", content: $L("Add to Contacts")},
        {name: "summary", classes: "dialog-message add-to-contacts-name"},
        {name: "rows", classes: "add-to-contacts-rows", allowHtml: true},
        {classes: "dialog-buttons dialog-buttons-stacked", components: [
            {name: "addNewBtn", kind: Button, classes: "onyx-affirmative", content: $L("Add New Contact"), ontap: "addNewTap"},
            {name: "addToExistingBtn", kind: Button, content: $L("Add To Existing"), ontap: "addToExistingTap"},
            {name: "cancelBtn", kind: Button, content: $L("Cancel"), ontap: "cancelTap"}
        ]}
    ],
    //* inContact: a template from launch.template()
    ask: function (inContact) {
        this.contact = inContact || {};
        var card = details.card(this.contact, i18n.formatDate);
        this.$.summary.set("content", card.title);
        this.$.rows.set("content", card.rows.map(function (inRow) {
            return '<div class="add-to-contacts-row"><div class="add-to-contacts-label">' + escape(inRow.label) +
                '</div><div class="add-to-contacts-value">' + escape(inRow.value).replace(/\n/g, "<br>") + '</div></div>';
        }).join(""));
        this.$.rows.set("showing", card.rows.length > 0);
        this.show();
    },
    addNewTap: function () {
        this.hide();
        this.doAddNew({contact: this.contact});
        return true;
    },
    addToExistingTap: function () {
        this.hide();
        this.doAddToExisting({contact: this.contact});
        return true;
    },
    cancelTap: function () {
        this.hide();
        return true;
    }
});

function escape(inText) {
    return String(inText).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
