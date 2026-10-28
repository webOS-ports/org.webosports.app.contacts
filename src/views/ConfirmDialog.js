// ConfirmDialog.js - a question with OK and Cancel - org.webosports.app.contacts

var
    kind = require('enyo/kind'),
    Popup = require('onyx/Popup'),
    Button = require('onyx/Button'),
    $L = require('enyo/i18n').$L;   // no-op placeholder

/**
	ask(message, onOk, okLabel, title) shows the message (as text, never
	markup) and calls onOk when OK is tapped. Without onOk it is a notice
	with one button.
*/
module.exports = kind({
    name: "ConfirmDialog",
    kind: Popup,
    classes: "dialog confirm-dialog",
    centered: true,
    modal: true,
    floating: true,
    scrim: true,
    autoDismiss: false,
    components: [
        {name: "title", classes: "dialog-title", showing: false},
        {name: "message", classes: "dialog-message"},
        {classes: "dialog-buttons", components: [
            {name: "cancelBtn", kind: Button, content: $L("Cancel"), ontap: "cancelTap"},
            {name: "okBtn", kind: Button, classes: "onyx-affirmative", content: $L("OK"), ontap: "okTap"}
        ]}
    ],
    ask: function (inMessage, inOnOk, inOkLabel, inTitle) {
        this.onOk = inOnOk || null;
        this.$.title.set("content", inTitle || "");
        this.$.title.set("showing", !!inTitle);
        this.$.message.set("content", String(inMessage));
        this.$.okBtn.set("content", inOkLabel || $L("OK"));
        this.$.cancelBtn.set("showing", !!inOnOk);
        this.show();
    },
    okTap: function () {
        var onOk = this.onOk;
        this.onOk = null;
        this.hide();
        if (onOk) {
            onOk();
        }
        return true;
    },
    cancelTap: function () {
        this.onOk = null;
        this.hide();
        return true;
    }
});
