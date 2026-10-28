// db8Source.js - Contacts app for LuneOS
// Copyright © 2013-2016 P. Douglas Reeder <reeder.29@gmail.com> under the MIT License

var
    kind = require('enyo/kind'),
    Source = require('enyo/Source'),
    ServiceRequest = require('enyo-webos/ServiceRequest'),
    utils = require('enyo/utils'),
    Model = require('enyo/Model'),
    Collection = require('enyo/Collection'),
    $L = require('enyo/i18n').$L;


module.exports = kind({
    name: "db8Source",
    kind: Source,
    dbService: "palm://com.palm.db",

    _doRequest: function (method, parameters, success, failure, subscribe) {
        var request = new ServiceRequest({
            service: this.dbService,
            method: method,
            subscribe: !!subscribe,
            resubscribe: !!subscribe
        });
        request.go(parameters);

        request.response(this.generalSuccess.bind(this, success, failure));
        request.error(this.generalFailure.bind(this, failure));
    },
    generalFailure: function (failure, inSender, inError) {
        console.log("db8Source failure:", inSender, " error:", inError);
        var errMsg = this.errorMsgs[inError.errorCode] || $L("Please file a detailed bug report") + " [" + inError.errorCode + "]";
        PalmSystem.addBannerMessage(errMsg, '{ }', "assets/header-icon-contacts.png", "alerts");
        if (failure) {
            failure();
        }
    },
    errorMsgs: {
//        "-985": $L("Please file a detailed bug report") + " (-985)"   // schema validation
    },
    generalSuccess: function (success, failure, inSender, inResponse) {
        console.log("Got success: ", inSender, " did send ", inResponse);
        if (inResponse.returnValue) {
            if (success) {
                if (inResponse.results) {
                    success(inResponse.results); //need to split that up for Models & Collections.
                } else {
                    success(inResponse);
                }
            }
        } else {   // if returnValue is false, would generalSuccess be called?
            if (failure) {
                failure();
            }
        }
    },

    fetch: function(rec, opts) {
        var method,
            subscribe = false,
            parameters;

        if (rec instanceof Model) {
            parameters = {ids: [rec.get(rec.primaryKey)]};
            method = "get";
            this._doRequest(method, parameters, opts.success, opts.fail, subscribe);
        } else {
        	if (opts.ids) {
                parameters = {ids: opts.ids};
                method = "get";
                this._doRequest(method, parameters, opts.success, opts.fail, subscribe);
        	} else {
        		this._fetchFind(rec, opts);
        	}
        }
    },
    /**
		Finds every record of the collection's kind: db8 answers at most 500 a
		page, so the pages are followed by their `next` key and the
		collection gets all of them at once. The first page's query is
		watched; when it fires (any record changed), everything is fetched
		again. An answer to a fetch that a newer one replaced is dropped.
    */
    _fetchFind: function (collection, opts) {
        var query = {
            select: opts.select,
            from: collection.dbKind,
            where: opts.where,
            orderBy: opts.orderBy,
            desc: opts.desc,
            incDel: opts.incDel,
            limit: opts.limit
        };
        // Kept on the collection: one source serves every collection.
        var generation = collection.db8FindGeneration = (collection.db8FindGeneration || 0) + 1;
        var self = this, results = [];

        function current() {
            return generation === collection.db8FindGeneration;
        }
        function done() {
            if (current()) {
                collection.empty();   // replaces all models so sort order is used
                // Only records can be passed to the success callback.
                opts.success(results);
            }
        }
        function nextPage(inPage) {
            var pageQuery = utils.mixin({}, query);
            pageQuery.page = inPage;
            var request = new ServiceRequest({service: self.dbService, method: "find"});
            request.response(function (inSender, inResponse) {
                if (!current()) {
                    return;
                }
                results = results.concat(inResponse.results || []);
                if (inResponse.next) {
                    nextPage(inResponse.next);
                } else {
                    done();
                }
            });
            request.error(self.generalFailure.bind(self, opts.fail));
            request.go({query: pageQuery});
        }

        if (collection.db8Watch) {
            collection.db8Watch.cancel();
        }
        var request = collection.db8Watch = new ServiceRequest({service: this.dbService, method: "find", subscribe: true});
        request.response(function (inSender, inResponse) {
            if (inResponse.fired) {
                if (request === collection.db8Watch) {
                    collection.db8Watch = null;
                    request.cancel();
                    self._fetchFind(collection, opts);
                }
            } else if (inResponse.results && current()) {
                results = inResponse.results;
                if (inResponse.next) {
                    nextPage(inResponse.next);
                } else {
                    done();
                }
            }
        });
        request.error(this.generalFailure.bind(this, opts.fail));
        request.go({query: query, count: false, watch: true});
    },

    commit: function(rec, opts) {
        var objects;

        if (rec instanceof Model) {
            objects = [rec.raw()];
        } else {   // enyo.Collection
            objects = rec.raw();
        }

        var request = new ServiceRequest({ service: this.dbService, method: "merge"});
        request.go({objects: objects});

        request.response(handlePutResponse.bind(this, opts.success, opts.fail));
        request.error(this.generalFailure.bind(this, opts.fail));
        
        function handlePutResponse(success, failure, inSender, inResponse) {
            console.log("commit (merge) handlePutResponse", inResponse);
            var i, j;
        	for (i=0; i<inResponse.results.length; ++i) {
        		for (j=0; j<objects.length; ++j) {
        			if (inResponse.results[i].id === objects[j]._id) {
        				console.log("updating", objects[j], "with", inResponse.results[i]);
        				objects[j]._rev = inResponse.results[i].rev;
        			}
        		}
        	}
        	// Only records can be passed to the success callback.
        	// Never pass anything PalmBus- or DB8-specific.
        	if (rec instanceof Model) {
        		success(objects[0]);
        	} else {   // Collection
        		success(objects);
        	}

        }
    },

    destroy: function(rec, opts) {
        var ids;

        if (rec instanceof Collection) {
            ids = [];
            rec.models.forEach(function (m) {
                ids.push(m.get(m.primaryKey));
            });
        } else {
            ids = [rec.get(rec.primaryKey)];
        }

        this._doRequest("del", {ids: ids}, opts.success, opts.fail);
    },
    find: function(rec, opts) {
        this._doRequest("find", rec, opts.success, opts.fail);
    },
    getIds: function (n, opts) {
        this._doRequest("reserveIds", {count: n || 1}, opts.success, opts.fail);
    }
});
