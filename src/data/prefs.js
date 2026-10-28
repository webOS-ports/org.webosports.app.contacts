// prefs.js - the app's preferences record - LuneOS Contacts app
//
// One com.palm.app.contacts.prefs:1 record, as the legacy app kept it
// (ContactsLib.AppPrefs): {listSortOrder, defaultAccountId}. The contacts
// service watches listSortOrder and rewrites every person's sortKey when it
// changes, so the list order follows by itself.

var
    ServiceRequest = require('enyo-webos/ServiceRequest'),
    services = require('./services');

var KIND = "com.palm.app.contacts.prefs:1";
var DEFAULTS = {listSortOrder: "LAST_FIRST", defaultAccountId: ""};

var prefs = {
    SORT_ORDERS: ["FIRST_LAST", "LAST_FIRST", "COMPANY_FIRST_LAST", "COMPANY_LAST_FIRST"],
    record: null,
    waiting: [],
    listeners: [],
    request: null,

    load: function () {
        if (prefs.request) {
            prefs.request.cancel();
        }
        // A watch, so a change made elsewhere (another device through sync) shows.
        var request = prefs.request = new ServiceRequest({service: services.DB, method: "find", subscribe: true});
        request.response(function (inSender, inResponse) {
            if (inResponse.fired) {
                prefs.load();
            } else if (inResponse.results) {
                if (inResponse.results.length === 0) {
                    prefs.create();
                } else {
                    prefs.set(inResponse.results[0]);
                }
            }
        });
        request.error(function (inSender, inError) {
            console.error("prefs: find failed:", inError.errorCode, inError.errorText);
            prefs.set(prefs.record || {});
        });
        request.go({query: {from: KIND, limit: 2}, watch: true});
    },
    create: function () {
        var record = {_kind: KIND, listSortOrder: DEFAULTS.listSortOrder, defaultAccountId: DEFAULTS.defaultAccountId};
        services.call(services.DB, "put", {objects: [record]}, null, function (inError) {
            console.error("prefs: put failed:", inError.errorCode, inError.errorText);
            prefs.set({});
        });
    },
    set: function (inRecord) {
        prefs.record = inRecord;
        var waiting = prefs.waiting;
        prefs.waiting = [];
        waiting.forEach(function (inFn) { inFn(); });
        prefs.listeners.forEach(function (inFn) { inFn(); });
    },
    get: function (inKey) {
        var r = prefs.record || {};
        return r[inKey] !== undefined ? r[inKey] : DEFAULTS[inKey];
    },
    //* Stores a pref; the watch then updates prefs.record.
    put: function (inKey, inValue) {
        if (!prefs.record || !prefs.record._id) {
            return;
        }
        var change = {_id: prefs.record._id};
        change[inKey] = inValue;
        prefs.record[inKey] = inValue;
        services.call(services.DB, "merge", {objects: [change]});
    },
    whenReady: function (inFn) {
        if (prefs.record) {
            inFn();
        } else {
            prefs.waiting.push(inFn);
        }
    },
    onChange: function (inFn) {
        prefs.listeners.push(inFn);
    }
};

if (window.PalmSystem) {
    prefs.load();
}

module.exports = prefs;
