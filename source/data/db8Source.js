enyo.kind({
    name: "db8Source",
    kind: "enyo.Source",
    dbService: "com.palm.db",

    fetch: function(rec, opts) {
        var method,
            subscribe = false,
            options,
            request;
this.log("Fetch called...");


        if (rec instanceof enyo.Model) {
            options = {ids: [rec.attributes[rec.primaryKey]]};
            method = "get";
        } else {
            //if more than 500 contacts need to implement paging
            //if something changes, need to update collection. TODO: test this!
            options = {query: {from: rec.dbKind}, count: true, watch: true};
            subscribe = true;
            method = "find";
        }

this.log("Fetching: ", options);
        request = new enyo.ServiceRequest({
            service: this.dbService,
            method: method,
            subscribe: subscribe,
            resubscribe: subscribe
        });
        request.go(options);

        request.response(opts.success);
        request.error(opts.fail);
    },
    commit: function(rec, opts) {
        var objects, request;

        if (rec instanceof enyo.Model) {
            objects = [rec.raw()];
        } else {
            objects = rec.raw();
        }

        request = new enyo.ServiceRequest({
            service: this.dbService,
            method: "merge"
        });
        request.go({objects: objects});

        request.response(opts.success);
        request.error(opts.fail);
    },
    destroy: function(rec, opts) {
        var ids,
            request;

        if (rec instanceof enyo.Collection) {
            ids = [];
            rec.records.forEach(function (m) {
                ids.push(m.attributes[m.primaryKey]);
            });
        } else {
            ids = [rec.attributes[rec.primaryKey]];
        }

        request = new enyo.ServiceRequest({
            service: this.dbService,
            method: "del"
        });
        request.go({ids: ids});

        request.response(opts.success);
        request.error(opts.fail);
    },
    find: function(rec, opts) {
        var request = new enyo.ServiceRequest({
            service: this.dbService,
            method: "find"
        });
        request.go(rec);

        request.response(opts.success);
        request.error(opts.fail);
    }
});
enyo.store.addSources({db8: "db8Source"});
