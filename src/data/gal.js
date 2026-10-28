// gal.js - searching the global address lists - LuneOS Contacts app
//
// Every account with a REMOTECONTACTS provider is asked at once (see
// src/util/gal.js); as the legacy GalService, one that fails is skipped
// and the others still answer. A new search, or cancel(), drops the
// answers of the one before.

var
    services = require('./services'),
    accounts = require('./accounts'),
    rules = require('../util/gal');

var gal = {
    generation: 0,

    //* Whether any account can be searched.
    available: function () {
        return rules.providers(accounts.list).length > 0;
    },
    /**
		Searches for inQuery; inDone({results, failed}) once every account
		has answered, results merged and sorted, failed the number of
		accounts that could not be searched.
    */
    search: function (inQuery, inDone) {
        var generation = ++gal.generation, providers = rules.providers(accounts.list),
            lists = [], failed = 0, waiting = providers.length;
        function answered() {
            if (--waiting === 0 && generation === gal.generation) {
                inDone({results: rules.merge(lists), failed: failed});
            }
        }
        if (!waiting) {
            inDone({results: [], failed: 0});
            return;
        }
        providers.forEach(function (inP) {
            services.call(inP.service, inP.method, {accountId: inP.accountId, query: inQuery, limit: rules.LIMIT},
                function (inResponse) {
                    lists.push(inResponse.results);
                    answered();
                }, function (inError) {
                    console.warn("gal: search of " + inP.accountId + " failed:", inError.errorCode, inError.errorText);
                    failed++;
                    answered();
                });
        });
    },
    cancel: function () {
        gal.generation++;
    }
};

module.exports = gal;
