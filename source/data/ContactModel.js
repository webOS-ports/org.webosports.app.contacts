// ContactModel.js
/*jsl:import ../app.js*/

// TODO: refactor as enyo.RelationalModel when that gets documented; Contacts need to be related to accounts.

var ContactModel = enyo.kind({
    name: "ContactModel",
    kind: "enyo.Model",
    options: {parse: false},
    source: "db8",
    dbKind: "com.palm.contact:1",
    primaryKey: "_id",   // models care about DB8, not anything back of that
    attributes: {
    	// Set to proper sub-kind before committing, for contact linker & Synergy Connector.
//    	_kind: "com.palm.contact:1", 
//    	remoteId: "",
    	accountId: "",   // must be set before committing
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
    },
    computed: [
        {method: "displayName", path: ["name", "nickname", "organization", "emails", "ims"], cached: true},
        {method: "listPhoto", path: ["photos"], cached: true},
        {method: "accountIcon", path: ["accountId"], cached: true}
    ],
    displayName: function () {
//    	console.log("contact model displayName", this.get("name"));
    	
        var displayName = "",
        name = this.get("name"),
        organizations = this.get("organizations"),
        emails = this.get("emails"),
        ims = this.get("ims"),
        i;

        if (name.honorificPrefix) {
            displayName += name.honorificPrefix + " ";
        }
        if (name.givenName) {
            displayName += name.givenName + " ";
        }
        if (name.middleName) {
            displayName += name.middleName + " ";
        }
        if (name.familyName) {
            displayName += name.familyName;
        }
        if (name.honorificSuffix) {
            if (name.honorificSuffix.charAt(1) === " ") { //handle ", PhD" case.
                displayName += name.honorificSuffix;
            } else {
                displayName += ", " + name.honorificSuffix;
            }
        }
        displayName = displayName.trim();
    
        if (!displayName) {
            displayName = this.get("nickname");
        }
    
        if (!displayName) {
            for (i = 0; i < organizations.length; i += 1) {
                displayName = organizations[i].title;
                if (displayName && organizations[i].name) {
                    displayName += ", ";
                }
                displayName += organizations[i].name;
                if (displayName) { break; }
            }
        }
    
        if (!displayName) {
            for (i = 0; i < emails.length; i += 1) {
                displayName = emails[i].value;
                if (displayName) {
                    break;
                }
            }
        }
    
        if (!displayName) {
            for (i = 0; i < ims.length; i += 1) {
                displayName = ims[i].value;
                if (displayName) {
                    break;
                }
            }
        }
    
        if (!displayName) {
            displayName = $L("[No Name Available]");
        }
    
        return displayName.trim();
    },
    listPhoto: function () {
    	var photos = this.get("photos");
    	var p, photoFld;
    	for (p=0; p<photos.length; ++p) {
    		photoFld = photos[p];
    		if (photoFld.primary && photoFld.localPath) {
//    	    	console.log("contact model listPhoto:", photos, "   primary photoFld.localPath", photoFld.localPath);
    			return photoFld.localPath;
    		}
    	}
    	for (p=0; p<photos.length; ++p) {
    		photoFld = photos[p];
    		if (photoFld.localPath) {
//    	    	console.log("contact model listPhoto:", photos, "   photoFld.localPath", photoFld.localPath);
    			return photoFld.localPath;
    		}
    	}
    	for (p=0; p<photos.length; ++p) {
    		photoFld = photos[p];
    		if (photoFld.value) {
//    	    	console.log("contact model listPhoto:", photos, "   photoFld.value", photoFld.value);
    			return photoFld.value;
    		}
    	}
//    	console.log("contact model listPhoto:", photos, "[none]" );
    	return "";
    },
    accountIcon: function () {
    	var account = accountsHash[this.get("accountId")];
//    	console.log("contact model accountIcon", this.get("accountId"), account);
    	return account ? account.icon : "assets/contacts-by-webos.png";
    }
});

var ContactCollection = enyo.kind({
    name: "ContactCollection",
    kind: "enyo.Collection",
    model: "ContactModel",
    options: {strategy:"merge"},
    source: "db8",
    dbKind: "com.palm.contact:1"
});
