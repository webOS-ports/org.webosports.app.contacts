var PersonCollection = enyo.kind({
    name: "PersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    defaultSource: "db8",
    dbKind: "com.palm.person:1"
    //best is to not store this collection... might break things. urgs.
});

var GlobalPersonCollection = new PersonCollection({instanceAllRecords: false});

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
    	searchText: null
    },
    searchTextChanged: function () {
    	this.log(arguments);
    	this.removeAll();
    	this.add(GlobalPersonCollection.filter(function(item) {
    		console.log(item);
    		return true;   // TODO: test against searchText
    	}));
    }
});

var FavoritePersonCollection = enyo.kind({
    name: "FavoritePersonCollection",
    kind: "enyo.Collection",
    model: "PersonModel",
    dbKind: "com.palm.person:1",
    refilter: function () {
    	this.log(arguments);
    	this.removeAll();
    	this.add(GlobalPersonCollection.filter(function(item) {
    		return item.get("favorite");
    	}));
    }
});
