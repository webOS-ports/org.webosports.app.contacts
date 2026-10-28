// PersonModel.js for LuneOS Contacts app
/*jsl:import ContactModel.js*/

var
    kind = require('enyo/kind'),
    Model = require('enyo/Model'),
    ComputedSupport = require('enyo/ComputedSupport'),
    names = require('../util/names'),
    search = require('../util/search'),
    $L = require('enyo/i18n').$L;   // no-op placeholder

module.exports = kind({
    name: "PersonModel",
    kind: Model,
    options: {parse: true},
    source: "db8",
    dbKind: "com.palm.person:1",
    primaryKey: "_id",
    mixins: [ComputedSupport],
    // Not cached: Model.set() emits "change" but does not notify observers,
    // so a cached value would never be recomputed when a fetch merges in a
    // changed record (a person renamed by a sync kept its old name).
    computed: {
        listPhoto: ["photos"],
        displayPhoto: ["photos"],
        displayName: ["name", "nickname", "organization", "emails", "ims", "phoneNumbers"],
        displayOrg: ["organization"]
    },
    attributes: {
        _kind: "com.palm.person:1",
//    	launcherId: "",
//    	favorite: false,
        contactIds: [],
        sortKey: "",   // required by DB8 schema
        name: {},
        names: [],
        birthday: "",
        nickname: "",
        addresses: [],
        organization: {department: "", name: "", title: ""},
        searchTerms: [],
        emails: [],
        ims: [],
        phoneNumbers: [],
        photos: {},
        relations: [],
        notes: [],
        urls: [],
        reminder: "",
        ringtone: {name: "", location: ""}
    },
    // Only these listed properties are saved to DB8.
    // It may not matter whether undocumented fields are included here, so long as records are merged.
    includeKeys: ["_id", "_rev", "_kind", "_sync", "_del", "_ignoreId",
        "launcherId", "favorite", "contactIds", "sortKey", "name", "names", "nickname",
        "organization", "searchTerms", "emails", "phoneNumbers", "ims", "photos",
        "addresses", "urls", "notes", "birthday", "anniversary",
        "gender", "relations", "reminder", "ringtone"],

    parse: function (data) {
        if (!data || "returnValue" in data) {
            return undefined;
        }   // appears to be a raw DB8 response, rather than a record

        try {   // limits the damage of DB8 records that don't follow the schema
            data.allSearchTerms = search.terms(data);
            data.searchDigits = search.digits(data);
        } catch (err) {
            console.error("PersonModel parse:", err);
            data.allSearchTerms = [];
            data.searchDigits = [];
        }
        return data;
    },

    listPhoto: function () {
        if (!this.get("photos")) {
            return "";
        }
        return this.get("photos").squarePhotoPath || this.get("photos").bigPhotoPath || "";
    },

    displayPhoto: function () {
        if (!this.get("photos")) {
            return "";
        }
        return this.get("photos").bigPhotoPath || this.get("photos").squarePhotoPath || "";
    },

    /** the full name, else nickname, company, email, IM or number: see names.displayName */
    displayName: function () {
        return names.displayName(this.attributes) || $L("[No Name Available]");
    },

    displayOrg: function () {
        var result = "",
            org = this.get("organization") || {};

        if (org.title) {
            result += org.title;
        }
        if (org.department) {
            if (result) {
                result += ", ";
            }
            result += org.department;
        }
        if (org.name) {
            if (result) {
                result += ", ";
            }
            result += org.name;
        }

        return result;
    }

});
