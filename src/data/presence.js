// presence.js - IM buddy presence from tempdb - LuneOS Contacts app
//
// Watches com.palm.imbuddystatus:1 (the base kind every IM connector
// extends) and keeps an index of it (src/util/presence.js). A roster coming
// online changes one buddy at a time and every change fires the watch, so
// reloads are coalesced, and listeners hear only of real changes.

var
    ServiceRequest = require('enyo-webos/ServiceRequest'),
    rules = require('../util/presence');

var TEMPDB = "luna://com.palm.tempdb";
var KIND = "com.palm.imbuddystatus:1";
var COALESCE_MS = 500;

var presence = {
    index: {},
    listeners: [],
    request: null,
    generation: 0,
    timer: null,
    signature: "{}",

    //* (Re)reads every buddy status, following db8's 500-record pages; the first page watches.
    load: function () {
        if (presence.request) {
            presence.request.cancel();
        }
        var generation = ++presence.generation, buddies = [];
        function page(inNext) {
            var watching = !inNext;
            var request = new ServiceRequest({service: TEMPDB, method: "find", subscribe: watching});
            if (watching) {
                presence.request = request;
            }
            request.response(function (inSender, inResponse) {
                if (generation !== presence.generation) {
                    return;
                }
                if (inResponse.fired) {
                    presence.reloadSoon();
                    return;
                }
                buddies = buddies.concat(inResponse.results || []);
                if (inResponse.next) {
                    page(inResponse.next);
                } else {
                    presence.set(rules.index(buddies));
                }
            });
            request.error(function (inSender, inError) {
                // No IM connector installed, or none signed in: no presence to show.
                console.warn("presence: find failed:", inError.errorCode, inError.errorText);
            });
            var query = {from: KIND, select: ["username", "serviceName", "availability"]};
            if (inNext) {
                query.page = inNext;
            }
            request.go(watching ? {query: query, watch: true} : {query: query});
        }
        page(null);
    },
    reloadSoon: function () {
        clearTimeout(presence.timer);
        presence.timer = setTimeout(presence.load, COALESCE_MS);
    },
    set: function (inIndex) {
        var signature = JSON.stringify(inIndex);
        if (signature === presence.signature) {
            return;
        }
        presence.signature = signature;
        presence.index = inIndex;
        presence.listeners.forEach(function (inFn) { inFn(); });
    },
    //* The CSS class for an IM address ({value, type}), "" for none.
    addressClass: function (inIm) {
        return rules.className(rules.ofAddress(presence.index, inIm));
    },
    //* The CSS class for a person record's best IM address, "" for none.
    personClass: function (inPerson) {
        return rules.className(rules.ofPerson(presence.index, inPerson));
    },
    onChange: function (inFn) {
        presence.listeners.push(inFn);
    }
};

if (window.PalmSystem) {
    presence.load();
}

module.exports = presence;
