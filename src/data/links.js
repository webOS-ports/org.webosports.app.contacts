// links.js - a person's linked profiles - LuneOS Contacts app
//
// What the legacy LinkDetails dialog and "Link More Profiles" did:
// unlink a contact into a person of its own, make a contact the primary,
// delete one profile, link another person in. Linking goes through the
// contacts linker, which also remembers manual links and unlinks so the
// autolinker does not undo them.
//
// Every function calls inDone(error), error null on success.

var
    services = require('./services');

function finish(inDone, inWhat) {
    return {
        ok: function () { inDone(null); },
        fail: function (inError) {
            var error = inError || {};
            console.error("links." + inWhat + " failed:", error.errorCode, error.errorText);
            inDone(error);
        }
    };
}

//* The contact leaves the person and becomes a person of its own.
function unlink(inPersonId, inContactId, inDone) {
    var f = finish(inDone, "unlink");
    services.call(services.LINKER, "manualUnlink", {personToRemoveLinkFrom: inPersonId, contactToRemoveFromPerson: inContactId},
        f.ok, f.fail);
}

//* The contacts of person inOtherPersonId join person inPersonId.
function link(inPersonId, inOtherPersonId, inDone) {
    var f = finish(inDone, "link");
    services.call(services.LINKER, "manualLink", {personToLinkTo: inPersonId, personToLink: inOtherPersonId}, f.ok, f.fail);
}

/**
	The contact goes first in the person's contactIds, as the legacy
	Person.setContactWithIdAsPrimary did. The linker rebuilds a person only
	when one of its contacts changes, so the contact is touched after.
*/
function makePrimary(inPersonId, inContactId, inDone) {
    var f = finish(inDone, "makePrimary");
    services.call(services.DB, "get", {ids: [inPersonId]}, function (inResponse) {
        var person = (inResponse.results || [])[0], ids = person && person.contactIds;
        if (!Array.isArray(ids) || ids.indexOf(inContactId) < 0) {
            f.fail({errorText: "contact " + inContactId + " is not in person " + inPersonId});
            return;
        }
        ids = [inContactId].concat(ids.filter(function (inId) { return inId !== inContactId; }));
        services.call(services.DB, "merge", {objects: [{_id: inPersonId, contactIds: ids}]}, function () {
            services.call(services.DB, "merge", {objects: [{_id: inContactId}]}, f.ok, f.fail);
        }, f.fail);
    }, f.fail);
}

//* Deletes one contact; the linker takes it out of its person.
function remove(inContactId, inDone) {
    var f = finish(inDone, "remove");
    services.call(services.DB, "del", {ids: [inContactId]}, f.ok, f.fail);
}

module.exports = {unlink: unlink, link: link, makePrimary: makePrimary, remove: remove};
