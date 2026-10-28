// AddToContactsPrompt.js - "Add New Contact" or "Add To Existing", for
// contact data another app hands over - org.webosports.app.contacts

var
    kind = require('enyo/kind'),
    Popup = require('onyx/Popup'),
    Button = require('onyx/Button'),
    names = require('../util/names'),
    $L = require('enyo/i18n').$L;   // no-op placeholder

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
        {name: "summary", classes: "dialog-message"},
        {classes: "dialog-buttons dialog-buttons-stacked", components: [
            {name: "addNewBtn", kind: Button, classes: "onyx-affirmative", content: $L("Add New Contact"), ontap: "addNewTap"},
            {name: "addToExistingBtn", kind: Button, content: $L("Add To Existing"), ontap: "addToExistingTap"},
            {name: "cancelBtn", kind: Button, content: $L("Cancel"), ontap: "cancelTap"}
        ]}
    ],
    //* inContact: a template from launch.template()
    ask: function (inContact) {
        this.contact = inContact || {};
        this.$.summary.set("content", summary(this.contact));
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

// What the data is, in one line: the name, else the first number or address.
function summary(inContact) {
    var text = names.format(inContact.name);
    ["phoneNumbers", "emails", "ims", "urls"].forEach(function (inField) {
        if (!text && inContact[inField] && inContact[inField][0]) {
            text = inContact[inField][0].value || "";
        }
    });
    return text;
}
