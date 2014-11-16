enyo.kind({
    name: "db8Source",
    kind: "enyo.Source",
    dbService: "palm://com.palm.db",

    _doRequest: function (method, parameters, success, failure, subscribe) {
        var request = new enyo.ServiceRequest({
            service: this.dbService,
            method: method,
            subscribe: !!subscribe,
            resubscribe: !!subscribe
        });
        request.go(parameters);

        request.response(this.generalSuccess.bind(this, success, failure));
        request.error(this.generalFailure.bind(this, failure));
    },
    generalFailure: function (failure, inSender, inResponse) {
        console.log("Got failure: ", inSender, " did send ", inResponse);
        if (failure) {
            failure();
        }
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
        } else {
            if (failure) {
                failure();
            }
        }
    },

    fetch: function(rec, opts) {
        var method,
            subscribe = false,
            parameters;
console.log("==> Fetch called...");


        if (rec instanceof enyo.Model) {
            parameters = {ids: [rec.attributes[rec.primaryKey]]};
            method = "get";
        } else {
            //if more than 500 contacts need to implement paging
            //if something changes, need to update collection. TODO: test this!
        	// http://www.openwebosproject.org/docs/developer_reference/data_types/db8#Query
        	var query = {
        		select: opts.select,
        		from: rec.dbKind,
        		where: opts.where,
        		orderBy: opts.orderBy,
        		desc: opts.desc,
        		incDel: opts.incDel,
        		limit: opts.limit,
        		page: opts.page
        	};
            parameters = {query: query, count: true, watch: true};
            console.log("db8Source fetch", rec, opts, parameters);
            subscribe = true;
            method = "find";
        }

console.log("===> Fetching: ", parameters);

        this._doRequest(method, parameters, opts.success, opts.fail, subscribe);
    },
    commit: function(rec, opts) {
        var objects;

        if (rec instanceof enyo.Model) {
            objects = [rec.raw()];
        } else {
            objects = rec.raw();
        }

        this._doRequest("merge", {objects: objects}, opts.success, opts.fail);
    },
    destroy: function(rec, opts) {
        var ids;

        if (rec instanceof enyo.Collection) {
            ids = [];
            rec.records.forEach(function (m) {
                ids.push(m.attributes[m.primaryKey]);
            });
        } else {
            ids = [rec.attributes[rec.primaryKey]];
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
