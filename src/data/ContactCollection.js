// ContactCollection.js for LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Collection = require('enyo/Collection'),
    ContactModel = require('./ContactModel');


module.exports = kind({
    name: "ContactCollection",
    kind: Collection,
    model: ContactModel,
    options: {strategy:"merge"},
    source: "db8",
    dbKind: "com.palm.contact:1"
});
