// saveEdit.js - carries out what contactEdit.plan() decided - LuneOS Contacts app
//
// The steps, each after the one before succeeded:
//   - a new person: the linker's saveNewPersonAndContacts, with the
//     favourite flag on the person;
//   - else: a new contact (the person's contacts may all be read-only) is
//     saved as its own person and linked into this one with manualLink;
//   - a contact that must become the primary goes first in the person's
//     contactIds, as the legacy Person.setContactWithIdAsPrimary did;
//   - the changed contacts are merged; the linker's watch on contacts then
//     rebuilds the person from them, in contactIds order;
//   - the favourite flag goes through the contacts service, as in the
//     legacy app (favoritePerson / unfavoritePerson).

var
    services = require('./services');

function noop() {}

/**
	inState and inPlan are contactEdit's. inDone(personId, error) is
	called once: personId is the saved person, error is the failed call's
	{errorCode, errorText}.
*/
function run(inState, inPlan, inDone) {
    var steps = [], personId = inState.personId;

    function fail(inError) {
        var error = inError || {};
        console.error("saveEdit failed:", error.errorCode, error.errorText);
        inDone(null, error);
    }
    function next() {
        var step = steps.shift();
        if (step) {
            step();
        } else {
            inDone(personId, null);
        }
    }
    function call(inService, inMethod, inParams, inThen) {
        services.call(inService, inMethod, inParams, function (inResponse) {
            (inThen || noop)(inResponse);
            next();
        }, fail);
    }

    if (inState.isNew) {
        steps.push(function () {
            call(services.LINKER, "saveNewPersonAndContacts", {person: {favorite: !!inPlan.favorite}, contacts: [inPlan.create]},
                function (inResponse) {
                    personId = inResponse.person && inResponse.person._id;
                });
        });
        steps.push(function () {
            if (!personId) {
                fail({errorText: "saveNewPersonAndContacts returned no person"});
                return;
            }
            next();
        });
        next();
        return;
    }

    var newContactId = null, primaryId = inPlan.makePrimary;
    if (inPlan.create) {
        var linkedPersonId = null;
        steps.push(function () {
            call(services.LINKER, "saveNewPersonAndContacts", {person: {}, contacts: [inPlan.create]}, function (inResponse) {
                linkedPersonId = inResponse.person && inResponse.person._id;
                newContactId = inResponse.contacts && inResponse.contacts[0] && inResponse.contacts[0]._id;
            });
        });
        steps.push(function () {
            if (!linkedPersonId) {
                fail({errorText: "saveNewPersonAndContacts returned no person"});
                return;
            }
            call(services.LINKER, "manualLink", {personToLinkTo: personId, personToLink: linkedPersonId});
        });
    }
    if (primaryId) {
        steps.push(function () {
            var id = primaryId === "new" ? newContactId : primaryId;
            services.call(services.DB, "get", {ids: [personId]}, function (inResponse) {
                var person = (inResponse.results || [])[0];
                if (!person || !id || (person.contactIds || []).indexOf(id) < 0) {
                    fail({errorText: "cannot make " + id + " the primary contact"});
                    return;
                }
                var ids = [id].concat(person.contactIds.filter(function (inId) { return inId !== id; }));
                call(services.DB, "merge", {objects: [{_id: personId, contactIds: ids}]});
            }, fail);
        });
    }
    var updates = inPlan.updates.slice();
    if (primaryId === "new") {
        // Nothing else may change a contact, and the linker rebuilds the
        // person only when one does: touch the new primary.
        steps.push(function () {
            call(services.DB, "merge", {objects: [{_id: newContactId}]});
        });
    }
    if (updates.length) {
        steps.push(function () {
            call(services.DB, "merge", {objects: updates.map(function (inU) {
                var o = JSON.parse(JSON.stringify(inU.fields));
                o._id = inU._id;
                return o;
            })});
        });
    }
    if (inPlan.favorite !== undefined) {
        steps.push(function () {
            call(services.CONTACTS, inPlan.favorite ? "favoritePerson" : "unfavoritePerson", {personId: personId});
        });
    }
    next();
}

module.exports = {run: run};
