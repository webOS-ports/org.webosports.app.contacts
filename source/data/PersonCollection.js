var PersonCollection = enyo.kind({
    name: "PersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    source: "db8",
    dbKind: "com.palm.person:1"
    //best is to not store this collection... might break things. urgs.
});

// TODO: this should be a property of the contacts.Application component (accessible as this.app) or the contacts namespace
var GlobalPersonCollection = new PersonCollection({options: {}});

/* For Enyo 2.4, we use the strategy of loading all records into
 * GlobalPersonCollection, and manually filtering into a source-less Collection
 * for each DataList.
 * When Enyo 2.5 is released, we can do essentially the same thing using enyo.ProgressiveFilter
 */
var AllPersonCollection = enyo.kind({
    name: "AllPersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    dbKind: "com.palm.person:1",
    published: {
    	searchText: ""
    },
    searchTextChanged: function () {
    	var searchText = this.searchText.trim().toLowerCase();
    	var searchLength = searchText.length;
    	this.empty();
    	this.add(GlobalPersonCollection.filter(function(item) {
    		var i, allSearchTerms, name;
    		try {
	    		allSearchTerms = item.get("allSearchTerms") || [""];
	    		for (i=0; i<allSearchTerms.length; ++i) {
	    			if (allSearchTerms[i].slice(0, searchLength) === searchText) { return true;}
	    		}
    		} catch (err) {
    			console.error(err);
    		}
    		return false;
    	}));
    	this.log(this.get("length"), "records match", '"' + searchText + '"');
    }
});

var FavoritePersonCollection = enyo.kind({
    name: "FavoritePersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    dbKind: "com.palm.person:1",
    refilter: function () {
    	this.log(arguments);
    	this.empty();
    	this.add(GlobalPersonCollection.filter(function(item) {
    		return item.get("favorite");
    	}));
    }
});
