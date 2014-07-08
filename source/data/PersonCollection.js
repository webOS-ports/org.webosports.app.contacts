enyo.kind({
    name: "PersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    defaultSource: "db8",
    dbKind: "com.palm.person:1"
    //best is to not store this collection... might break things. urgs.
});

var GlobalPersonCollection = new PersonCollection({instanceAllRecords: false});
