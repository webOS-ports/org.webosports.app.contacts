enyo.kind({
    name: "PersonModel",
    kind: "enyo.Model",
    defaultSource: "db8",
    dbKind: "com.palm.person:1",
    primaryKey: "_id",
    mixins: [enyo.ComputedSupport],
    computed: {
        displayPhoto: ["photos", {cached: true}],
        displayName: ["name", "nickname", "organization", "emails", "ims", "phoneNumbers", {cached: true}],
        displayOrg: ["organization"],
        photoURI: [ "photos", {cached: true}]
    },
    defaults: {
        name: {},
        nickname: "",
        organization: {},
        emails: [],
        ims: [],
        phoneNumbers: []
    },

    parse: function (data) {
        return data;
    },

    displayPhoto: function () {
        console.log("displayPhoto | ", this.attributes.photos);
        if (! this.attributes.photos) return "";
        return this.attributes.photos.bigPhotoPath || this.attributes.photos.squarePhotoPath || "";
    },

    /*
     * Tries to build a display name. Fields are used in the following order:
     * 1. name = prefix + given + middle + familiy + suffix
     * 2. nickname
     * 3. organization
     * 4. emails
     * 5. ims
     * 6. phonenumbers
     * If nothing works a generic string is returned.
     */
    displayName: function () {
        var displayName = "",
            name = this.name || this.attributes.name || {},
            org = this.organization || this.attributes.organization || {},
            emails = this.emails || this.attributes.emails || {},
            ims = this.ims || this.attributes.ims || {},
            phoneNumbers = this.phoneNumbers || this.attributes.phoneNumbers || {},
            i;

        //TODO: get display properties from options..
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
                displayName += " " + name.honorificSuffix;
            }
        }
        displayName = displayName.trim();

        if (!displayName) {
            displayName = this.nickname || this.attributes.nickname;
        }

        if (!displayName) {
            displayName = org.title;
            if (displayName && org.name) {
                displayName += ", ";
            }
            displayName += org.name;
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
            for (i = 0; i < phoneNumbers.length; i += 1) {
                displayName = phoneNumbers[i].value;
                if (displayName) {
                    break;
                }
            }
        }

        if (!displayName) {
            displayName = "[No Name Available]";
        }

        console.log("displayName: ", displayName, " for ", this.attributes);
        return displayName.trim();
    },

    displayOrg: function () {
        var result = "",
            org = this.organization || this.attributes.organization || {};

        if (org.title) {
        	result += org.title;
        }
        if (result && org.name) {
            result += ", ";
        }
        if (org.name) {
        	result += org.name;
        }

        return result;
    },

    photoURI: function () {
        var photos = this.photos || this.attributes.photos || {};
//        console.log("Returning ", "file://" + photos.squarePhotoPath);
        return photos.squarePhotoPath ? "file://" + photos.squarePhotoPath : "";
    }
});
