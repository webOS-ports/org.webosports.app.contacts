// services.js - one-shot luna service calls - LuneOS Contacts app

var
    ServiceRequest = require('enyo-webos/ServiceRequest'),
    $L = require('enyo/i18n').$L;   // no-op placeholder

/**
	Calls a luna method once. inSuccess(response) runs when returnValue is
	true; otherwise inFailure(error) runs, and without an inFailure the error
	is shown in a banner and logged.
	Returns the request, so a caller can cancel it.

		services.call("luna://com.palm.db", "merge", {objects: [...]}, function (inResponse) {...});
*/
function call(inService, inMethod, inParams, inSuccess, inFailure) {
    var request = new ServiceRequest({service: inService, method: inMethod});
    var fail = function (inError) {
        var error = inError || {};
        if (inFailure) {
            inFailure(error);
        } else {
            console.error(inService + "/" + inMethod + " failed:", error.errorCode, error.errorText);
            banner($L("Could not save your change") + (error.errorCode !== undefined ? " (" + error.errorCode + ")" : ""));
        }
    };
    request.response(function (inSender, inResponse) {
        if (inResponse && inResponse.returnValue === false) {
            fail(inResponse);
        } else if (inSuccess) {
            inSuccess(inResponse || {});
        }
    });
    request.error(function (inSender, inError) {
        fail(inError);
    });
    request.go(inParams || {});
    return request;
}

//* A banner message; quietly nothing without PalmSystem.
function banner(inText) {
    if (window.PalmSystem && window.PalmSystem.addBannerMessage) {
        window.PalmSystem.addBannerMessage(String(inText), "{}", "assets/header-icon-contacts.png", "alerts");
    }
}

module.exports = {call: call, banner: banner, DB: "luna://com.palm.db", LINKER: "luna://com.palm.service.contacts.linker",
    CONTACTS: "luna://com.palm.service.contacts", APPMANAGER: "luna://com.palm.applicationManager"};
