var
	kind = require('enyo/kind'),
	Collection = require('enyo/Collection'),
    PersonModel = require('./PersonModel');


module.exports = kind({
    name: "PersonCollection",
    kind: Collection,
    model: PersonModel,
    source: "db8",
    dbKind: "com.palm.person:1"
    //best is to not store this collection... might break things. urgs.
});


