// AllPersonCollection.js for LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Collection = require('enyo/Collection'),
    PersonModel = require('./PersonModel'),
    prefs = require('./prefs'),
    names = require('../util/names'),
    search = require('../util/search');


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
    dividers: null,

    favoritesChanged: function () {
        this.refilter.apply(this, arguments);
    },
    searchTextChanged: function () {
        this.refilter.apply(this, arguments);
    },
    refilter: function () {
        var favorites = this.favorites, excludeId = this.excludeId, searchText = this.searchText || "";
        this.empty();
        if (!this.globalPersonCollection) {
            return;
        }
        var found = this.globalPersonCollection.filter(function (item) {
            if (favorites && !item.get("favorite")) {
                return false;
            }
            if (excludeId && item.get("_id") === excludeId) {
                return false;
            }
            return search.matches(item.get("allSearchTerms"), item.get("searchDigits"), searchText);
        });
        // Which rows start a divider (the legacy list's letter dividers): by
        // the model's euid, as models are shared with the other lists.
        var dividers = {}, last = null, order = prefs.get("listSortOrder");
        found.forEach(function (item) {
            var text = names.dividerText(item.attributes, order);
            if (text !== last) {
                dividers[item.euid] = text;
                last = text;
            }
        });
        this.dividers = dividers;
        this.add(found);
    }
});
