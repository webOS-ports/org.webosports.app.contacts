enyo.kind({
    name: "ContactCollection",
    kind: "enyo.Collection",
    model: "ContactModel",
    source: "db8",
    dbKind: "com.palm.contact:1"
    //best is to not store this collection... might break things. urgs.
});

var GlobalContactCollection = new ContactCollection();
