// AllPersonCollection.js for LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Collection = require('enyo/Collection'),
    PersonModel = require('./PersonModel');


/* For Enyo 2.4, we use the strategy of loading all records into
 * GlobalPersonCollection, and manually filtering into a source-less Collection
 * for each DataList.
 * When Enyo 2.5 is released, we can do essentially the same thing using enyo.ProgressiveFilter
 */
module.exports = kind({
    name: "AllPersonCollection",
    kind: Collection,
    model: PersonModel,
    dbKind: "com.palm.person:1",
    published: {
        globalPersonCollection: null,
        favorites: false,
        searchText: "",
        excludeId: ""   // a person left out (the one a picker links to)
    },
    create: function () {
        this.log(arguments);
        this.inherited(arguments);
    },
    favoritesChanged: function () {
        this.refilter.apply(this, arguments);
    },
    searchTextChanged: function () {
        this.refilter.apply(this, arguments);
    },
    refilter: function () {
        var favorites = this.favorites, excludeId = this.excludeId;
        var searchText = this.searchText.trim().toLowerCase();
        var searchLength = searchText.length;
        this.empty();
        this.add(this.globalPersonCollection.filter(function (item) {
            var i, allSearchTerms;
            try {
                if (favorites && ! item.get("favorite")) {
                    return false;
                }
                if (excludeId && item.get("_id") === excludeId) {
                    return false;
                }
                allSearchTerms = item.get("allSearchTerms") || [""];
                for (i = 0; i < allSearchTerms.length; ++i) {
                    if (allSearchTerms[i].slice(0, searchLength) === searchText) {
                        return true;
                    }
                }
            } catch (err) {
                console.error(err);
            }
            return false;
        }));
        this.log(this.get("length"), "records match", '"' + searchText + '" ' + favorites);
    }
});
