// accounts.js - account lookup object for LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Collection = require('enyo/Collection'),
    PersonModel = require('./PersonModel'),
    LunaService = require('enyo-webos/LunaService');


var Accounts = kind({
    array: [],   // for Picker
    hash: {},   // for icon lookup

    components: [{
        name: "accountsService",
        kind: LunaService,
        service: "luna://com.palm.service.accounts",
        method: "listAccounts",
        onResponse: "accountsResponse",
        onError:"accountsError",
        mock: !("PalmSystem" in window)
    }],

    create: function () {
        this.inherited(arguments);
        this.$.accountsService.send();
    },

    accountsResponse: function (inSender, inResponse) {
        this.log(inResponse);
        this.array = [];
        this.hash = {};
        inResponse.results.forEach(function (account) {
            account.capabilityProviders.forEach(function (provider) {
                if (provider.capability === "CONTACTS") {
                    var dbkindContact;
                    if (provider.dbkinds) {
                        dbkindContact = provider.dbkinds.contact
                    } else if (provider.db_kinds) {   // Skype, SIM card
                        dbkindContact = provider.db_kinds.contact
                    }
                    this.array.push({
                        content: account.loc_name + (account.username ? " — " + account.username : ""),
                        accountId: account._id,
                        dbkind: dbkindContact,
                        icon32: account.icon.loc_32x32,
                        icon48: account.icon.loc_48x48,
                        icon64: account.icon.loc_64x64
                    });
                    this.hash[account._id] = {icon: account.icon.loc_64x64 || account.icon.loc_48x48 || account.icon.loc_32x32};
                }
            }, this);
        }, this);
        this.array[this.array.length > 1 ? 1 : 0].active = true;
        this.log(this.array, this.hash);
    },
    accountsError: function (inSender, inError) {
        this.error(inError, inError.errorText);
    }

});

module.exports = new Accounts();
