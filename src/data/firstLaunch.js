// firstLaunch.js - whether First use has been shown - LuneOS Contacts app
//
// As the legacy Accounts.checkFirstLaunch: a com.palm.firstlaunch:1 record
// with the app's id (the kind com.palm.service.accounts installs, which
// any app may read, create and delete) says First use has been shown.

var
    services = require('./services');

var KIND = "com.palm.firstlaunch:1";
var APP_ID = "com.palm.app.contacts";

var firstLaunch = {
    marked: false,

    /**
		Calls inDone(true) when First use has not been shown yet. Without the
		kind (an error) it is not shown: no record could keep it from showing
		at every launch.
    */
    check: function (inDone) {
        services.call(services.DB, "find", {query: {from: KIND, where: [{prop: "appId", op: "=", val: APP_ID}], limit: 1}},
            function (inResponse) {
                inDone(!(inResponse.results || []).length);
            }, function (inError) {
                console.warn("firstLaunch: find failed:", inError.errorCode, inError.errorText);
                inDone(false);
            });
    },
    //* Records that First use has been shown, once.
    markShown: function () {
        if (firstLaunch.marked) {
            return;
        }
        firstLaunch.marked = true;
        services.call(services.DB, "put", {objects: [{_kind: KIND, appId: APP_ID}]}, null, function (inError) {
            firstLaunch.marked = false;
            console.error("firstLaunch: put failed:", inError.errorCode, inError.errorText);
        });
    }
};

module.exports = firstLaunch;
