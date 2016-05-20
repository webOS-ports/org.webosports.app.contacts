// FavoritePersonCollection.js for LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Collection = require('enyo/Collection'),
    PersonModel = require('./PersonModel');


module.exports = kind({
    name: "FavoritePersonCollection",
    kind: Collection,
    model: PersonModel,
    dbKind: "com.palm.person:1",
    published: {
        globalPersonCollection: null
    },
    refilter: function () {
        this.log(arguments);
        this.empty();
        this.add(this.globalPersonCollection.filter(function (item) {
            return item.get("favorite");
        }));
    }
});
