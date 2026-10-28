// accounts.js - the accounts that hold contacts, for icons, pickers and
// read-only rules - LuneOS Contacts app
// Copyright © 2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    services = require('./services');

/**
	The account list from com.palm.service.accounts/listAccounts.
		accounts.list          the raw accounts ([] until loaded)
		accounts.hash[id]      {icon} for a contact's account
		accounts.whenReady(fn) runs fn once the list is loaded (at once if it is)
		accounts.refresh()     reloads it (an account may have been added)
		accounts.onChange(fn)  runs fn after every load
*/
var accounts = {
    list: [],
    hash: {},
    loaded: false,
    waiting: [],
    listeners: [],

    refresh: function () {
        services.call("luna://com.palm.service.accounts", "listAccounts", {}, function (inResponse) {
            accounts.set(inResponse.results || []);
        }, function (inError) {
            console.error("listAccounts failed:", inError.errorCode, inError.errorText);
            accounts.set(accounts.list);
        });
    },
    set: function (inList) {
        accounts.list = inList;
        accounts.hash = {};
        inList.forEach(function (inAccount) {
            var icon = inAccount.icon || {};
            accounts.hash[inAccount._id] = {icon: icon.loc_64x64 || icon.loc_48x48 || icon.loc_32x32 || ""};
        });
        accounts.loaded = true;
        var waiting = accounts.waiting;
        accounts.waiting = [];
        waiting.forEach(function (inFn) { inFn(accounts.list); });
        accounts.listeners.forEach(function (inFn) { inFn(accounts.list); });
    },
    whenReady: function (inFn) {
        if (accounts.loaded) {
            inFn(accounts.list);
        } else {
            accounts.waiting.push(inFn);
        }
    },
    onChange: function (inFn) {
        accounts.listeners.push(inFn);
    }
};

if (window.PalmSystem) {
    accounts.refresh();
}

module.exports = accounts;
