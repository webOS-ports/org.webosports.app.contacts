// ContactModel.js

var ContactModel = enyo.kind({
    name: "ContactModel",
    kind: "enyo.Model",
    options: {parse: false},
    source: "db8",
    dbKind: "com.palm.contact:1",
    primaryKey: "remoteId",
    attributes: {
    	// Set to proper sub-kind before committing, for contactlinker & Synergy Connector.
    	_kind: "com.palm.contact.palmprofile:1", 
//    	remoteId: "",
    	// TODO: comment out here, after account picker is functional, so if it's not set, an error occurs
    	accountId: "",
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
