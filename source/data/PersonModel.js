enyo.kind({
    name: "PersonModel",
    kind: "enyo.Model",
    defaultSource: "db8",
    dbKind: "com.palm.person:1",
    primaryKey: "_id",
    mixins: [enyo.ComputedSupport],
    computed: {
        displayName: ["name", "nickname", "organization", "emails", "ims", "phoneNumbers", {cached: true}],
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

        console.log("Returning ", displayName, " for ", this.attributes);
        return displayName.trim();
    },

    photoURI: function () {
        var photos = this.photos || this.attributes.photos || {};
        console.log("Returning ", photos.squarePhotoPath);
        return photos.squarePhotoPath;
    }
});
