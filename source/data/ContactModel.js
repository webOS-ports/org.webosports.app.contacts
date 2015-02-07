// ContactModel.js

var ContactModel = enyo.kind({
    name: "ContactModel",
    kind: "enyo.Model",
    options: {parse: false},
    source: "db8",
    dbKind: "com.palm.contact:1",
    primaryKey: "remoteId",
    attributes: {
    	// Set to proper sub-kind before committing, for contact linker & Synergy Connector.
//    	_kind: "com.palm.contact:1", 
//    	remoteId: "",
//    	accountId: "",   // must be set before committing
    	name: {},
//    	nickname: "",
//    	birthday: "",
//    	anniversary: "",
//    	gender: "",
//    	note: "",
    	emails: [],
    	urls: [],
    	phoneNumbers: [],
    	ims: [],
    	photos: [],
    	addresses: [],
    	organizations: [],
    	accounts: [],
    	tags: [],
    	customFields: [],
    	relations: []
    }
});

//var ContactCollection = enyo.kind({
//    name: "ContactCollection",
//    kind: "enyo.Collection",
//    model: "ContactModel",
//    options: {strategy:"merge"},
//    source: "db8",
//    dbKind: "com.palm.contact:1"
//});
