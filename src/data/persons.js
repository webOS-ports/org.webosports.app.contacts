// persons.js - finding person records - LuneOS Contacts app

var
    services = require('./services');

var PERSON = "com.palm.person:1";

/**
	The person of inId, which may be a person's id or the id of one of
	its contacts (other apps pass either). inDone(person) gets the person
	record, or null when there is none.
*/
function find(inId, inDone) {
    if (typeof inId !== "string" || !inId) {
        inDone(null);
        return;
    }
    services.call(services.DB, "get", {ids: [inId]}, function (inResponse) {
        var record = (inResponse.results || [])[0];
        if (!record) {
            inDone(null);
        } else if (record._kind === PERSON) {
            inDone(record);
        } else if (/^com\.palm\.contact[.:]/.test(record._kind || "")) {
            services.call(services.DB, "find", {query: {from: PERSON, where: [{prop: "contactIds", op: "=", val: inId}], limit: 1}},
                function (inFound) {
                    inDone((inFound.results || [])[0] || null);
                }, function () {
                    inDone(null);
                });
        } else {
            inDone(null);
        }
    }, function () {
        inDone(null);
    });
}

/**
	The contacts of inPerson, in its contactIds order (ids db8 has no
	record for are left out). inDone(contacts) or inFail(error).
*/
function contactsOf(inPerson, inDone, inFail) {
    var ids = ((inPerson && inPerson.contactIds) || []).slice();
    services.call(services.DB, "get", {ids: ids}, function (inResponse) {
        var byId = {};
        (inResponse.results || []).forEach(function (inC) { byId[inC._id] = inC; });
        inDone(ids.map(function (inId) { return byId[inId]; }).filter(function (inC) { return !!inC; }));
    }, inFail);
}

module.exports = {find: find, contactsOf: contactsOf, PERSON: PERSON};
